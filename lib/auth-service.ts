import { getSupabaseServerClient } from "./supabase-server";
import { verifyPassword, generateOTP, hashOTP, generateSecureToken } from "./auth-utils";
import { createAuditLog } from "./audit-service";
import { sendOTPEmail } from "./email-service";

type LoginResult =
  | { requiresMFA: true; userId: string; mfaMethod: string }
  | { requiresMFA: false; user: any; sessionToken: string };

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_TTL_HOURS = 8;
const OTP_TTL_MINUTES = 5;

export async function loginUser(email: string, password: string, ipAddress: string): Promise<LoginResult> {
  const supabase = await getSupabaseServerClient();

  // 1️⃣ Fetch user
  const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single();
  if (error || !user) {
    await createAuditLog({
      action_type: "login_failed",
      description: `Login failed for unknown email ${email}`,
      resource_type: "auth",
      ip_address: ipAddress,
      status: "failed",
    });
    throw new Error("Invalid email or password");
  }

  const now = new Date();

  // 2️⃣ Check lockout
  if (user.account_locked_until && new Date(user.account_locked_until) > now) {
    await createAuditLog({
      user_id: user.id,
      action_type: "login_locked",
      description: "Login attempt while account is locked",
      resource_type: "auth",
      ip_address: ipAddress,
      status: "blocked",
    });
    throw new Error("Account is temporarily locked due to multiple failed attempts.");
  }

  // 3️⃣ Verify password
  const passwordOk = await verifyPassword(password, user.password_hash);
  if (!passwordOk) {
    const failedAttempts = (user.failed_login_attempts || 0) + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

    await supabase.from("users").update({
      failed_login_attempts: failedAttempts,
      account_locked_until: shouldLock ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000).toISOString() : null,
    }).eq("id", user.id);

    await createAuditLog({
      user_id: user.id,
      action_type: "login_failed",
      description: `Invalid password. Failed attempts: ${failedAttempts}`,
      resource_type: "auth",
      ip_address: ipAddress,
      status: shouldLock ? "locked" : "failed",
    });

    if (shouldLock) throw new Error("Too many failed attempts. Your account has been locked temporarily.");
    throw new Error("Invalid email or password");
  }

  // 4️⃣ Reset failed attempts
  await supabase.from("users").update({
    failed_login_attempts: 0,
    account_locked_until: null,
    last_login: now.toISOString(),
  }).eq("id", user.id);

  // 5️⃣ Fetch roles for user
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const rolesArray = userRoles?.map((r: any) => r.roles.name) || [];

  // 6️⃣ MFA check
  if (user.mfa_enabled) {
    // Send OTP automatically when MFA is required
    await sendOTP(user.id, (user.mfa_method || "email") as "email" | "sms");

    await createAuditLog({
      user_id: user.id,
      action_type: "login_mfa_required",
      description: `MFA required using method ${user.mfa_method || "email"}`,
      resource_type: "auth",
      ip_address: ipAddress,
      status: "pending",
    });

    return {
      requiresMFA: true,
      userId: user.id,
      mfaMethod: user.mfa_method || "email",
    };
  }

  // 7️⃣ Create session (no MFA)
  const sessionToken = generateSecureToken();
  await supabase.from("sessions").insert([{
    user_id: user.id,
    session_token: sessionToken,
    ip_address: ipAddress,
    user_agent: "browser",
    expires_at: new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
  }]);

  await createAuditLog({
    user_id: user.id,
    action_type: "login_success",
    description: "User logged in successfully (no MFA required)",
    resource_type: "auth",
    ip_address: ipAddress,
    status: "success",
  });

  // 8️⃣ Return user with roles
  return {
    requiresMFA: false,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      department: user.department,
      roles: rolesArray,
    },
    sessionToken,
  };
}

// Send OTP to user
export async function sendOTP(userId: string, method: "email" | "sms" = "email"): Promise<void> {
  const supabase = await getSupabaseServerClient();

  // Get user
  const { data: user, error } = await supabase
    .from("users")
    .select("email, full_name, phone_number")
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new Error("User not found");
  }

  // Generate OTP
  const otp = generateOTP();
  const otpHash = hashOTP(otp);

  // Save OTP to database
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await supabase.from("otp_tokens").insert([
    {
      user_id: userId,
      token_hash: otpHash,
      otp_type: method,
      expires_at: expiresAt.toISOString(),
    },
  ]);

  // Send OTP via email
  if (method === "email") {
    await sendOTPEmail(user.email, otp, user.full_name);
  } else if (method === "sms") {
    // TODO: Implement SMS sending (Twilio, AWS SNS, etc.)
    console.log(`📱 SMS OTP for ${user.phone_number}: ${otp}`);
  }

  // Log OTP sent
  await createAuditLog({
    user_id: userId,
    action_type: "otp_sent",
    description: `OTP sent via ${method}`,
    status: "success",
  });
}

// Verify OTP and complete login
export async function verifyOTPAndLogin(
  userId: string,
  otp: string,
  ipAddress: string
): Promise<{ user: any; sessionToken: string }> {
  const supabase = await getSupabaseServerClient();
  const otpHash = hashOTP(otp);

  // Get latest unused OTP
  const { data: otpRecord, error: otpError } = await supabase
    .from("otp_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("token_hash", otpHash)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (otpError || !otpRecord) {
    await createAuditLog({
      user_id: userId,
      action_type: "otp_verification_failed",
      description: "Invalid or expired OTP",
      status: "denied",
      ip_address: ipAddress,
    });
    throw new Error("Invalid or expired OTP");
  }

  // Mark OTP as used
  await supabase.from("otp_tokens").update({ used: true }).eq("id", otpRecord.id);

  // Get user
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, email, full_name, department")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    throw new Error("User not found");
  }

  // Get user roles
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const rolesArray = userRoles?.map((r: any) => r.roles.name) || [];

  // Create session
  const sessionToken = generateSecureToken();
  await supabase.from("sessions").insert([
    {
      user_id: userId,
      session_token: sessionToken,
      ip_address: ipAddress,
      user_agent: "browser",
      expires_at: new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
    },
  ]);

  await createAuditLog({
    user_id: userId,
    action_type: "mfa_verified",
    description: "Multi-factor authentication verified successfully",
    status: "success",
    ip_address: ipAddress,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      department: user.department,
      roles: rolesArray,
    },
    sessionToken,
  };
}
