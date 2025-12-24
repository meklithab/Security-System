import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"
import { checkPermission } from "@/lib/access-control-service"
import {
    createRoleChangeRequest,
    approveRoleChangeRequest,
    rejectRoleChangeRequest,
    getRoleChangeRequests
} from "@/lib/role-management-service"

// GET /api/role-requests - List role change requests
// POST /api/role-requests - Create new role change request

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await getSupabaseServerClient()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get("status") || undefined
        const limit = parseInt(searchParams.get("limit") || "50", 10)

        // Check if user is admin
        const isAdmin = await checkPermission(user.id, "manage_roles")

        // Build query
        let query = supabase
            .from("role_change_requests")
            .select(`
                id,
                requested_by,
                requested_for,
                from_role_id,
                to_role_id,
                reason,
                status,
                reviewed_by,
                review_notes,
                created_at,
                reviewed_at,
                requester:users!requested_by(id, email, full_name),
                target_user:users!requested_for(id, email, full_name),
                from_role:roles!from_role_id(id, name),
                to_role:roles!to_role_id(id, name),
                reviewer:users!reviewed_by(id, email, full_name)
            `)
            .order("created_at", { ascending: false })

        // Non-admins can only see their own requests
        if (!isAdmin) {
            query = query.or(`requested_by.eq.${user.id},requested_for.eq.${user.id}`)
        }

        if (status) {
            query = query.eq("status", status)
        }

        query = query.limit(limit)

        const { data: requests, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            requests: requests || [],
            isAdmin
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get requests" },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { requestedForUserId, toRoleId, reason } = body

        // Users can request for themselves, or if they're admin, for others
        const targetUserId = requestedForUserId || user.id

        if (targetUserId !== user.id) {
            const isAdmin = await checkPermission(user.id, "manage_roles")
            if (!isAdmin) {
                return NextResponse.json(
                    { error: "You can only request role changes for yourself" },
                    { status: 403 }
                )
            }
        }

        if (!toRoleId) {
            return NextResponse.json({ error: "Target role is required" }, { status: 400 })
        }

        if (!reason || reason.trim().length === 0) {
            return NextResponse.json({ error: "Reason is required" }, { status: 400 })
        }

        const roleRequest = await createRoleChangeRequest(
            user.id,
            targetUserId,
            toRoleId,
            reason.trim()
        )

        return NextResponse.json({ request: roleRequest }, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create request" },
            { status: 500 }
        )
    }
}
