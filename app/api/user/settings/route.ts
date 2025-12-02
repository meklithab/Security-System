import { getCurrentUser } from "@/lib/auth-helpers"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createAuditLog } from "@/lib/audit-service"
import { hashPassword, verifyPassword, validatePassword } from "@/lib/auth-utils"
import { type NextRequest, NextResponse } from "next/server"

// GET - Get user security settings (MFA status, etc.)
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await getSupabaseServerClient()

        // Get full user data including MFA settings
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("mfa_enabled, mfa_method, last_password_change")
            .eq("id", user.id)
            .single()

        if (userError) {
            return NextResponse.json(
                { error: "Failed to fetch security settings" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            mfaEnabled: userData.mfa_enabled || false,
            mfaMethod: userData.mfa_method || null,
            lastPasswordChange: userData.last_password_change || null,
        }, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch settings" },
            { status: 500 }
        )
    }
}

// PUT - Update security settings (password change, MFA enable/disable)
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { action, currentPassword, newPassword, confirmPassword, mfaMethod } = body

        const supabase = await getSupabaseServerClient()

        if (action === "change_password") {
            // Validate input
            if (!currentPassword || !newPassword || !confirmPassword) {
                return NextResponse.json(
                    { error: "All password fields are required" },
                    { status: 400 }
                )
            }

            if (newPassword !== confirmPassword) {
                return NextResponse.json(
                    { error: "New password and confirm password do not match" },
                    { status: 400 }
                )
            }

            // Get user's current password hash
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("password_hash")
                .eq("id", user.id)
                .single()

            if (userError || !userData) {
                return NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                )
            }

            // Verify current password
            const passwordMatch = await verifyPassword(currentPassword, userData.password_hash)
            if (!passwordMatch) {
                await createAuditLog({
                    user_id: user.id,
                    action_type: "password_change_failed",
                    description: "Password change failed: incorrect current password",
                    status: "denied",
                })
                return NextResponse.json(
                    { error: "Current password is incorrect" },
                    { status: 400 }
                )
            }

            // Validate new password
            const validation = validatePassword(newPassword)
            if (!validation.isValid) {
                return NextResponse.json(
                    { error: `Password requirements not met: ${validation.errors.join(", ")}` },
                    { status: 400 }
                )
            }

            // Check password history (prevent reusing last 3 passwords)
            const { data: passwordHistory } = await supabase
                .from("password_history")
                .select("password_hash")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(3)

            if (passwordHistory) {
                for (const history of passwordHistory) {
                    const isReused = await verifyPassword(newPassword, history.password_hash)
                    if (isReused) {
                        return NextResponse.json(
                            { error: "You cannot reuse one of your last 3 passwords" },
                            { status: 400 }
                        )
                    }
                }
            }

            // Hash new password
            const newPasswordHash = await hashPassword(newPassword)

            // Update password
            const { error: updateError } = await supabase
                .from("users")
                .update({
                    password_hash: newPasswordHash,
                    last_password_change: new Date().toISOString(),
                    failed_login_attempts: 0, // Reset failed attempts on password change
                    account_locked_until: null,
                })
                .eq("id", user.id)

            if (updateError) {
                return NextResponse.json(
                    { error: "Failed to update password" },
                    { status: 500 }
                )
            }

            // Save to password history
            await supabase.from("password_history").insert([
                {
                    user_id: user.id,
                    password_hash: newPasswordHash,
                },
            ])

            // Log password change
            await createAuditLog({
                user_id: user.id,
                action_type: "password_changed",
                description: "User changed their password",
                status: "success",
            })

            return NextResponse.json(
                { message: "Password changed successfully" },
                { status: 200 }
            )
        }

        if (action === "enable_mfa") {
            if (!mfaMethod || (mfaMethod !== "email" && mfaMethod !== "sms")) {
                return NextResponse.json(
                    { error: "Invalid MFA method. Supported: email, sms" },
                    { status: 400 }
                )
            }

            // Update user MFA settings
            const { error: updateError } = await supabase
                .from("users")
                .update({
                    mfa_enabled: true,
                    mfa_method: mfaMethod,
                })
                .eq("id", user.id)

            if (updateError) {
                return NextResponse.json(
                    { error: "Failed to enable MFA" },
                    { status: 500 }
                )
            }

            // Log MFA enable
            await createAuditLog({
                user_id: user.id,
                action_type: "mfa_enabled",
                description: `MFA enabled using ${mfaMethod}`,
                status: "success",
            })

            return NextResponse.json(
                { message: "MFA enabled successfully", mfaEnabled: true, mfaMethod },
                { status: 200 }
            )
        }

        if (action === "disable_mfa") {
            // Verify current password before disabling MFA
            if (!currentPassword) {
                return NextResponse.json(
                    { error: "Current password is required to disable MFA" },
                    { status: 400 }
                )
            }

            // Get user's password hash
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("password_hash")
                .eq("id", user.id)
                .single()

            if (userError || !userData) {
                return NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                )
            }

            // Verify password
            const passwordMatch = await verifyPassword(currentPassword, userData.password_hash)
            if (!passwordMatch) {
                await createAuditLog({
                    user_id: user.id,
                    action_type: "mfa_disable_failed",
                    description: "MFA disable failed: incorrect password",
                    status: "denied",
                })
                return NextResponse.json(
                    { error: "Current password is incorrect" },
                    { status: 400 }
                )
            }

            // Disable MFA
            const { error: updateError } = await supabase
                .from("users")
                .update({
                    mfa_enabled: false,
                    mfa_method: null,
                })
                .eq("id", user.id)

            if (updateError) {
                return NextResponse.json(
                    { error: "Failed to disable MFA" },
                    { status: 500 }
                )
            }

            // Log MFA disable
            await createAuditLog({
                user_id: user.id,
                action_type: "mfa_disabled",
                description: "MFA disabled by user",
                status: "success",
            })

            return NextResponse.json(
                { message: "MFA disabled successfully", mfaEnabled: false },
                { status: 200 }
            )
        }

        return NextResponse.json(
            { error: "Invalid action. Supported: change_password, enable_mfa, disable_mfa" },
            { status: 400 }
        )
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update settings" },
            { status: 500 }
        )
    }
}

