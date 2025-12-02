import { type NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth-helpers"
import { checkPermission } from "@/lib/access-control-service"
import { getAuditLogs } from "@/lib/enhanced-audit-service"

const MAX_LIMIT = 200

export async function GET(request: NextRequest) {
    try {
        const headerUserId = request.headers.get("x-user-id")
        const sessionUser = headerUserId ? null : await getCurrentUser()
        const userId = headerUserId || sessionUser?.id

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const parsedLimit = Number.parseInt(searchParams.get("limit") || "50", 10)
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_LIMIT) : 50
        const actionType = searchParams.get("actionType") || undefined
        const status = searchParams.get("status") || undefined
        const days = Number.parseInt(searchParams.get("days") || "30", 10)
        const scope = searchParams.get("scope") || "self"

        const startDate = Number.isFinite(days) && days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined

        // Admins can request scope=all to see all activity
        let effectiveUserId: string | undefined = userId
        if (scope === "all") {
            const canViewLogs = await checkPermission(userId, "view_logs")
            if (canViewLogs) {
                effectiveUserId = undefined
            }
        }

        const { logs, total } = await getAuditLogs({
            userId: effectiveUserId,
            actionType: actionType === "all" ? undefined : actionType,
            status: status === "all" ? undefined : status,
            startDate,
            limit,
        })

        const availableActions = Array.from(new Set(logs.map((log: { action_type: any }) => log.action_type).filter(Boolean))).sort()
        const availableStatuses = Array.from(new Set(logs.map((log: { status: any }) => log.status).filter(Boolean))).sort()

        return NextResponse.json(
            {
                logs,
                total,
                availableActions,
                availableStatuses,
            },
            { status: 200 },
        )
    } catch (error) {
        console.error("Failed to fetch user activity:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to load activity" },
            { status: 500 },
        )
    }
}
