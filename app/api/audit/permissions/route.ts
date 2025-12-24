import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"

// GET /api/audit/permissions -> Get permission change logs
// Supports filtering by resourceId, userId, and date range

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const resourceId = searchParams.get("resourceId")
        const userId = searchParams.get("userId")
        const startDate = searchParams.get("startDate")
        const endDate = searchParams.get("endDate")
        const limit = parseInt(searchParams.get("limit") || "50", 10)

        const supabase = await getSupabaseServerClient()

        // Check if user is admin or resource owner
        const { data: userRoles } = await supabase
            .from("user_roles")
            .select("roles(name)")
            .eq("user_id", user.id)

        const isAdmin = (userRoles || []).some(
            (ur: any) => ur.roles?.name === "System Admin"
        )

        // If filtering by resource, verify ownership
        if (resourceId && !isAdmin) {
            const { data: resource } = await supabase
                .from("resources")
                .select("owner_id")
                .eq("id", resourceId)
                .single()

            if (!resource || resource.owner_id !== user.id) {
                return NextResponse.json(
                    { error: "You can only view logs for resources you own" },
                    { status: 403 }
                )
            }
        }

        // Build query for permission-related audit logs
        let query = supabase
            .from("audit_logs")
            .select(`
                id,
                user_id,
                action_type,
                resource_type,
                resource_id,
                resource_name,
                description,
                status,
                ip_address,
                created_at,
                is_encrypted,
                actor:users!user_id(id, email, full_name)
            `)
            .in("action_type", [
                "permission_granted",
                "permission_revoked",
                "INSERT_RESOURCE_PERMISSION",
                "UPDATE_RESOURCE_PERMISSION",
                "DELETE_RESOURCE_PERMISSION"
            ])
            .order("created_at", { ascending: false })

        if (resourceId) {
            query = query.eq("resource_id", resourceId)
        }

        if (userId) {
            query = query.eq("user_id", userId)
        }

        if (startDate) {
            query = query.gte("created_at", startDate)
        }

        if (endDate) {
            query = query.lte("created_at", endDate)
        }

        query = query.limit(limit)

        const { data: logs, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Decrypt descriptions if encrypted (base64 decode)
        const decryptedLogs = (logs || []).map((log: any) => {
            let description = log.description || ""
            if (log.is_encrypted && log.description) {
                try {
                    description = Buffer.from(log.description, "base64").toString()
                } catch {
                    description = log.description
                }
            }
            return { ...log, description }
        })

        return NextResponse.json({ logs: decryptedLogs })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get permission logs" },
            { status: 500 }
        )
    }
}
