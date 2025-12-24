import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"
import { checkPermission } from "@/lib/access-control-service"
import { createAuditLog } from "@/lib/audit-service"

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/roles/[id] - Get role details
// PATCH /api/roles/[id] - Update role (admin only)
// DELETE /api/roles/[id] - Delete role (admin only, non-system roles)

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await getSupabaseServerClient()

        const { data: role, error } = await supabase
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
            .eq("id", id)
            .single()

        if (error || !role) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 })
        }

        const roleWithPermissions = {
            ...role,
            permissions: (role.role_permissions || [])
                .map((rp: any) => rp.permissions)
                .filter(Boolean)
        }

        return NextResponse.json({ role: roleWithPermissions })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get role" },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const hasPermission = await checkPermission(user.id, "manage_roles")
        if (!hasPermission) {
            return NextResponse.json(
                { error: "You do not have permission to update roles" },
                { status: 403 }
            )
        }

        const supabase = await getSupabaseServerClient()

        // Check if role exists and is not system role
        const { data: existing } = await supabase
            .from("roles")
            .select("id, name, is_system_role")
            .eq("id", id)
            .single()

        if (!existing) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 })
        }

        if (existing.is_system_role) {
            return NextResponse.json(
                { error: "System roles cannot be modified" },
                { status: 403 }
            )
        }

        const body = await request.json()
        const updateData: any = {}

        if (body.name !== undefined) {
            updateData.name = body.name.trim()
        }
        if (body.description !== undefined) {
            updateData.description = body.description?.trim() || null
        }

        const { data: role, error } = await supabase
            .from("roles")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        await createAuditLog({
            user_id: user.id,
            action_type: "role_updated",
            resource_type: "roles",
            resource_id: role.id,
            resource_name: role.name,
            description: `Updated role: ${role.name}`,
            old_value: JSON.stringify(existing),
            new_value: JSON.stringify(role),
            status: "success"
        })

        return NextResponse.json({ role })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update role" },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const hasPermission = await checkPermission(user.id, "manage_roles")
        if (!hasPermission) {
            return NextResponse.json(
                { error: "You do not have permission to delete roles" },
                { status: 403 }
            )
        }

        const supabase = await getSupabaseServerClient()

        // Check if role exists and is not system role
        const { data: existing } = await supabase
            .from("roles")
            .select("id, name, is_system_role")
            .eq("id", id)
            .single()

        if (!existing) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 })
        }

        if (existing.is_system_role) {
            return NextResponse.json(
                { error: "System roles cannot be deleted" },
                { status: 403 }
            )
        }

        // Check if role is assigned to any users
        const { count } = await supabase
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("role_id", id)

        if (count && count > 0) {
            return NextResponse.json(
                { error: `Cannot delete role: ${count} user(s) still have this role assigned` },
                { status: 400 }
            )
        }

        const { error } = await supabase.from("roles").delete().eq("id", id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        await createAuditLog({
            user_id: user.id,
            action_type: "role_deleted",
            resource_type: "roles",
            resource_id: id,
            resource_name: existing.name,
            description: `Deleted role: ${existing.name}`,
            status: "success"
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete role" },
            { status: 500 }
        )
    }
}
