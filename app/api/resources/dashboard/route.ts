import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"

type RoleName = "System Admin" | "Manager" | "Employee" | string

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await getSupabaseServerClient()

        // Determine primary role
        const { data: roleRows } = await supabase
            .from("user_roles")
            .select("roles(name), role_id")
            .eq("user_id", user.id)

        const roles: RoleName[] = (roleRows || []).map((r: any) => r.roles?.name).filter(Boolean)
        const roleIds: string[] = (roleRows || []).map((r: any) => r.role_id).filter(Boolean)
        const primaryRole: RoleName = (roles[0] as RoleName) || "Employee"

        // Load resources with classification + owner metadata
        const { data: resources, error } = await supabase
            .from("resources")
            .select(
                `
        id,
        name,
        resource_type,
        description,
        created_at,
        owner_id,
        data_classifications!inner(name, level),
        users!resources_owner_id_fkey(full_name, email)
      `,
            )
            .order("created_at", { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Get all DAC permissions granted to this user (directly or via role)
        const { data: userDacPerms } = await supabase
            .from("resource_permissions")
            .select("resource_id, can_view, can_edit, can_delete, can_share")
            .eq("granted_to_user_id", user.id)

        const { data: roleDacPerms } = roleIds.length > 0
            ? await supabase
                .from("resource_permissions")
                .select("resource_id, can_view, can_edit, can_delete, can_share")
                .in("granted_to_role_id", roleIds)
            : { data: [] }

        // Create a map of resource_id -> permissions
        const dacPermMap = new Map<string, { can_view: boolean; can_edit: boolean; can_delete: boolean; can_share: boolean }>()

        const allDacPerms = [...(userDacPerms || []), ...(roleDacPerms || [])]
        for (const perm of allDacPerms) {
            const existing = dacPermMap.get(perm.resource_id)
            if (existing) {
                // Merge permissions (OR logic - any permission grants access)
                dacPermMap.set(perm.resource_id, {
                    can_view: existing.can_view || perm.can_view,
                    can_edit: existing.can_edit || perm.can_edit,
                    can_delete: existing.can_delete || perm.can_delete,
                    can_share: existing.can_share || perm.can_share,
                })
            } else {
                dacPermMap.set(perm.resource_id, {
                    can_view: perm.can_view,
                    can_edit: perm.can_edit,
                    can_delete: perm.can_delete,
                    can_share: perm.can_share,
                })
            }
        }

        // Role-based visibility by classification name + DAC permissions
        const visible = (resources || []).filter((r: any) => {
            const classificationName = r.data_classifications?.name as string | undefined
            const ownerId = r.owner_id as string
            const resourceId = r.id as string

            if (!classificationName) return false

            // Owner always sees their resources
            if (ownerId === user.id) return true

            // System Admin sees everything
            if (primaryRole === "System Admin") return true

            // Check DAC: if user has view permission, they can see it
            const dacPerm = dacPermMap.get(resourceId)
            if (dacPerm?.can_view) return true

            // Fall back to role-based MAC visibility
            if (primaryRole === "Manager") {
                return classificationName === "Public" || classificationName === "Internal"
            }

            // Employees: Public only
            return classificationName === "Public"
        })

        const documents = visible.map((r: any) => {
            const classificationName = r.data_classifications?.name as string
            const ownerId = r.owner_id as string
            const resourceId = r.id as string

            const isOwner = ownerId === user.id
            const isAdmin = primaryRole === "System Admin"

            // Get DAC permissions for this resource
            const dacPerm = dacPermMap.get(resourceId)

            // Calculate effective permissions
            // Owner and Admin have full access
            // Others get permissions based on DAC
            const canView = isOwner || isAdmin || (dacPerm?.can_view ?? false)
            const canEdit = isOwner || isAdmin || (dacPerm?.can_edit ?? false)
            const canDelete = isOwner || isAdmin || (dacPerm?.can_delete ?? false)
            const canShare = isOwner || (dacPerm?.can_share ?? false)
            const canChangeClassification = isAdmin

            return {
                id: resourceId,
                name: r.name as string,
                type: r.resource_type as string,
                description: (r.description as string | null) ?? "",
                classification: classificationName,
                createdAt: r.created_at as string,
                ownerName: (r.users?.full_name as string | null) ?? "",
                ownerEmail: (r.users?.email as string | null) ?? "",
                isOwner,
                canView,
                canEdit,
                canDelete,
                canShare,
                canChangeClassification,
            }
        })

        // Expose classifications for admin (for e.g. classification change UI)
        const { data: classifications } = await supabase
            .from("data_classifications")
            .select("id, name, level")
            .order("level", { ascending: true })

        return NextResponse.json(
            {
                role: primaryRole,
                userId: user.id,
                documents,
                classifications: classifications || [],
            },
            { status: 200 },
        )
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to load documents" },
            { status: 500 },
        )
    }
}
