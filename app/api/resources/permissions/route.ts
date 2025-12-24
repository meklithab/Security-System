import { type NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth-helpers"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import {
    grantResourcePermission,
    revokeResourcePermission,
} from "@/lib/access-control-service"

// GET /api/resources/permissions -> Get users and roles for permission granting
// POST /api/resources/permissions -> grant permission (DAC)
// DELETE /api/resources/permissions -> revoke permission (DAC)

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const supabase = await getSupabaseServerClient()

        // Get all users (for granting permissions to)
        const { data: users } = await supabase
            .from("users")
            .select("id, email, full_name")
            .neq("id", user.id)
            .order("full_name")

        // Get all roles (for granting permissions to)
        const { data: roles } = await supabase
            .from("roles")
            .select("id, name")
            .order("name")

        // Get resources owned by current user
        const { data: ownedResources } = await supabase
            .from("resources")
            .select("id, name, resource_type")
            .eq("owner_id", user.id)
            .order("name")

        return NextResponse.json({
            users: users || [],
            roles: roles || [],
            ownedResources: ownedResources || []
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get data" },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const body = await request.json()
        const {
            resourceId,
            grantedToUserId = null,
            grantedToRoleId = null,
            canView,
            canEdit,
            canDelete,
            canShare,
            reason,
        } = body

        if (!resourceId) {
            return NextResponse.json({ error: "resourceId is required" }, { status: 400 })
        }

        if (!grantedToUserId && !grantedToRoleId) {
            return NextResponse.json({ error: "Either grantedToUserId or grantedToRoleId is required" }, { status: 400 })
        }

        const permission = await grantResourcePermission(
            resourceId,
            grantedToUserId,
            grantedToRoleId,
            user.id,
            { canView, canEdit, canDelete, canShare },
            reason,
        )

        return NextResponse.json({ permission }, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to grant permission" },
            { status: 500 },
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const resourceId = searchParams.get("resourceId")
        const permissionId = searchParams.get("permissionId")

        if (!resourceId || !permissionId) {
            return NextResponse.json({ error: "resourceId and permissionId are required" }, { status: 400 })
        }

        await revokeResourcePermission(resourceId, permissionId, user.id)

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to revoke permission" },
            { status: 500 },
        )
    }
}


