import { type NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth-helpers"
import {
    grantResourcePermission,
    revokeResourcePermission,
} from "@/lib/access-control-service"

// POST /api/resources/permissions -> grant permission (DAC)
// DELETE /api/resources/permissions -> revoke permission (DAC)

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


