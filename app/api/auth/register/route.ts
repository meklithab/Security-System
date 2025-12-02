import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { hashPassword, generateSecureToken } from "@/lib/auth-utils"
import { createAuditLog } from "@/lib/audit-service"


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, fullName, password, department } = body
    if (!email || !fullName || !password || !department) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Check if user exists
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single()
    if (existingUser) return NextResponse.json({ error: "User already exists" }, { status: 400 })

    // Hash password
    const passwordHash = await hashPassword(password)

    // Insert user
    const { data: newUser, error } = await supabase.from("users").insert([{
      email,
      full_name: fullName,
      password_hash: passwordHash,
      department,
      is_active: true
    }]).select().single()
    if (error) throw new Error(error.message)

    const userId = newUser.id

    // Assign default role (Employee)
    const { data: role } = await supabase.from("roles").select("id").eq("name", "Employee").single()
    if (role) await supabase.from("user_roles").insert([{ user_id: userId, role_id: role.id }])

    // Assign default MAC classification (Internal)
// Assign default MAC classification (Public)
const { data: classification } = await supabase
  .from("data_classifications")
  .select("id")
  .eq("name", "Public")
  .single()

if (classification) {
  await supabase.from("user_clearance_levels").insert({
    user_id: userId,
    classification_id: classification.id,
    assigned_by: null, // no admin assigning
    reason: "Automatic public clearance for new employee"
  })
}

    // Save ABAC attributes
    await supabase.from("abac_attributes").insert([
      { user_id: userId, attribute_name: "department", attribute_value: department },
      { user_id: userId, attribute_name: "status", attribute_value: "active" },
    ])

    // Generate email verification token
    const token = generateSecureToken()
    await supabase.from("email_verification_tokens").insert([{ user_id: userId, token, expires_at: new Date(Date.now() + 24*60*60000).toISOString() }])

    // Audit log
    await createAuditLog({
      user_id: userId,
      action_type: "user_registration",
      description: `User registered: ${email}`,
      resource_type: "users",
      resource_name: fullName
    })

    return NextResponse.json({ success: true, message: "Registration successful. Please verify your email.", userId })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Registration failed" }, { status: 400 })
  }
}
