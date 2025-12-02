import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createAuditLog } from "@/lib/audit-service"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get("token")

        if (!token) {
            return NextResponse.json({ error: "Missing verification token" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()
        const nowIso = new Date().toISOString()

        // Lookup token
        const { data: tokenRow, error: tokenError } = await supabase
            .from("email_verification_tokens")
            .select("id, user_id, expires_at, used")
            .eq("token", token)
            .single()

        if (tokenError || !tokenRow) {
            return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 })
        }

        if (tokenRow.used || new Date(tokenRow.expires_at) < new Date(nowIso)) {
            return NextResponse.json({ error: "Verification token has expired or already been used" }, { status: 400 })
        }

        const userId = tokenRow.user_id as string

        // Mark user as verified
        const { error: userError } = await supabase
            .from("users")
            .update({ email_verified: true, updated_at: nowIso })
            .eq("id", userId)

        if (userError) {
            return NextResponse.json({ error: "Failed to verify email" }, { status: 500 })
        }

        // Mark token as used
        await supabase
            .from("email_verification_tokens")
            .update({ used: true, verified_at: nowIso })
            .eq("id", tokenRow.id)

        // Audit log
        await createAuditLog({
            user_id: userId,
            action_type: "email_verified",
            description: "User verified email address via verification link",
            resource_type: "users",
            status: "success",
        })

        return NextResponse.json({ success: true, message: "Email verified successfully" }, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to verify email" },
            { status: 500 },
        )
    }
}


