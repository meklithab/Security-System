import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"

// GET /api/resources/[id]/permissions -> Get all permissions for a resource (owner only)
// This endpoint allows resource owners to view who has access to their resources

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id: resourceId } = await params
        const supabase = await getSupabaseServerClient()

        // Verify resource exists and user is owner or admin
        const { data: resource, error: resourceError } = await supabase
            .from("resources")
            .select("id, name, owner_id")
            .eq("id", resourceId)
            .single()

        if (resourceError || !resource) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 })
        }

        // Check if user is owner or System Admin
        const { data: userRoles } = await supabase
            .from("user_roles")
            .select("roles(name)")
            .eq("user_id", user.id)

        const isAdmin = (userRoles || []).some(
            (ur: any) => ur.roles?.name === "System Admin"
        )

        if (resource.owner_id !== user.id && !isAdmin) {
            return NextResponse.json(
                { error: "Only resource owner can view permissions" },
                { status: 403 }
            )
        }

        // Get all permissions for this resource with user/role details
        const { data: permissions, error: permError } = await supabase
            .from("resource_permissions")
            .select(`
                id,
                granted_to_user_id,
                granted_to_role_id,
                can_view,
                can_edit,
                can_delete,
                can_share,
                granted_at,
                granted_by,
                reason,
                granted_to_user:users!granted_to_user_id(id, email, full_name),
                granted_to_role:roles!granted_to_role_id(id, name),
                granted_by_user:users!granted_by(id, email, full_name)
            `)
            .eq("resource_id", resourceId)
            .order("granted_at", { ascending: false })

        if (permError) {
            return NextResponse.json({ error: permError.message }, { status: 500 })
        }

        return NextResponse.json({
            resource: {
                id: resource.id,
                name: resource.name,
                isOwner: resource.owner_id === user.id
            },
            permissions: permissions || []
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get permissions" },
            { status: 500 }
        )
    }
}
