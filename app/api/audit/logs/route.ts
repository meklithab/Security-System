import { getAuditLogs, exportAuditLogs } from "@/lib/enhanced-audit-service"
import { checkPermission } from "@/lib/access-control-service"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-helpers"

const MAX_LIMIT = 500

export async function GET(request: NextRequest) {
  try {
    // Get current user (simplified - implement proper auth check)
    const headerUserId = request.headers.get("x-user-id")
    const sessionUser = headerUserId ? null : await getCurrentUser()
    const userId = headerUserId || sessionUser?.id

    if (!userId || !(await checkPermission(userId, "view_logs"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = (searchParams.get("format") as "csv" | "json") || "json"
    const actionTypeParam = searchParams.get("actionType")
    const statusParam = searchParams.get("status")
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "100", 10)
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_LIMIT) : 100

    // Treat "all" as no filter
    const actionType = actionTypeParam === "all" ? undefined : actionTypeParam || undefined
    const status = statusParam === "all" ? undefined : statusParam || undefined

    if (format === "csv" || format === "json") {
      const csv = await exportAuditLogs(format, {
        actionType,
        status,
        limit,
      })

      const headers = new Headers()
      if (format === "csv") {
        headers.set("Content-Type", "text/csv")
        headers.set("Content-Disposition", "attachment; filename=audit-logs.csv")
      } else {
        headers.set("Content-Type", "application/json")
        headers.set("Content-Disposition", "attachment; filename=audit-logs.json")
      }

      return new NextResponse(csv, { headers })
    }

    const { logs, total } = await getAuditLogs({
      actionType,
      status,
      limit,
    })

    const availableActions = Array.from(
      new Set(logs.map((log: { action_type?: string | null }) => log.action_type).filter(Boolean)),
    ).sort()
    const availableStatuses = Array.from(
      new Set(logs.map((log: { status?: string | null }) => log.status).filter(Boolean)),
    ).sort()

    return NextResponse.json({ logs, total, availableActions, availableStatuses }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 },
    )
  }
}
