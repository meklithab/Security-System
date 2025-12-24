import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"
import { checkPermission } from "@/lib/access-control-service"
import { createAuditLog } from "@/lib/audit-service"

// GET /api/roles - List all roles with their permissions
// POST /api/roles - Create new role (admin only)

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await getSupabaseServerClient()

        // Get all roles with their permissions
        const { data: roles, error } = await supabase
            .from("roles")
            .select(`
                id,
                name,
                description,
                is_system_role,
                created_at,
                role_permissions(
                    permissions(id, name, description, resource, action)
                )
            `)
            .order("name")

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Flatten permissions for easier frontend use
        const rolesWithPermissions = (roles || []).map((role: any) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystemRole: role.is_system_role,
            createdAt: role.created_at,
            permissions: (role.role_permissions || [])
                .map((rp: any) => rp.permissions)
                .filter(Boolean)
        }))

        return NextResponse.json({ roles: rolesWithPermissions })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get roles" },
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

        // Check admin permission
        const hasPermission = await checkPermission(user.id, "manage_roles")
        if (!hasPermission) {
            return NextResponse.json(
                { error: "You do not have permission to create roles" },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { name, description } = body

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: "Role name is required" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()

        const { data: role, error } = await supabase
            .from("roles")
            .insert([{
                name: name.trim(),
                description: description?.trim() || null,
                is_system_role: false
            }])
            .select()
            .single()

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "Role with this name already exists" }, { status: 409 })
            }
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        await createAuditLog({
            user_id: user.id,
            action_type: "role_created",
            resource_type: "roles",
            resource_id: role.id,
            resource_name: role.name,
            description: `Created role: ${role.name}`,
            status: "success"
        })

        return NextResponse.json({ role }, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create role" },
            { status: 500 }
        )
    }
}
