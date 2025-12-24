import { type NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth-helpers"
import {
    approveRoleChangeRequest,
    rejectRoleChangeRequest
} from "@/lib/role-management-service"

interface RouteParams {
    params: Promise<{ id: string }>
}

// PATCH /api/role-requests/[id] - Approve or reject a role change request

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { action, reviewNotes } = body

        if (action !== "approve" && action !== "reject") {
            return NextResponse.json(
                { error: "Action must be 'approve' or 'reject'" },
                { status: 400 }
            )
        }

        if (action === "approve") {
            await approveRoleChangeRequest(id, user.id, reviewNotes)
        } else {
            if (!reviewNotes || reviewNotes.trim().length === 0) {
                return NextResponse.json(
                    { error: "Reason is required when rejecting" },
                    { status: 400 }
                )
            }
            await rejectRoleChangeRequest(id, user.id, reviewNotes.trim())
        }

        return NextResponse.json({
            success: true,
            message: action === "approve" ? "Request approved" : "Request rejected"
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process request" },
            { status: 500 }
        )
    }
}
