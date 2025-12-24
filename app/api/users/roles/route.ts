import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"
import { checkPermission, assignRoleToUser, revokeRoleFromUser } from "@/lib/access-control-service"

// GET /api/users/roles - List users with their roles
// POST /api/users/roles - Assign role to user (admin only)
// DELETE /api/users/roles - Remove role from user (admin only)

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await getSupabaseServerClient()
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get("limit") || "100", 10)

        // Get all users with their roles
        const { data: users, error } = await supabase
            .from("users")
            .select(`
                id,
                email,
                full_name,
                department,
                is_active,
                user_roles(
                    id,
                    role_id,
                    assigned_at,
                    roles(id, name, description)
                )
            `)
            .eq("is_active", true)
            .order("full_name")
            .limit(limit)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Format response
        const usersWithRoles = (users || []).map((u: any) => ({
            id: u.id,
            email: u.email,
            fullName: u.full_name,
            department: u.department,
            isActive: u.is_active,
            roles: (u.user_roles || []).map((ur: any) => ({
                assignmentId: ur.id,
                roleId: ur.role_id,
                roleName: ur.roles?.name,
                roleDescription: ur.roles?.description,
                assignedAt: ur.assigned_at
            }))
        }))

        // Check if current user is admin
        const isAdmin = await checkPermission(user.id, "manage_roles")

        return NextResponse.json({
            users: usersWithRoles,
            isAdmin
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get users" },
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
        const { userId, roleId } = body

        if (!userId || !roleId) {
            return NextResponse.json(
                { error: "userId and roleId are required" },
                { status: 400 }
            )
        }

        const assignment = await assignRoleToUser(userId, roleId, user.id)

        return NextResponse.json({ assignment }, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to assign role" },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("userId")
        const roleId = searchParams.get("roleId")

        if (!userId || !roleId) {
            return NextResponse.json(
                { error: "userId and roleId are required" },
                { status: 400 }
            )
        }

        await revokeRoleFromUser(userId, roleId, user.id)

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to revoke role" },
            { status: 500 }
        )
    }
}
