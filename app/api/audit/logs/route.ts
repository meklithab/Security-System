import { getAuditLogs, exportAuditLogs } from "@/lib/enhanced-audit-service"
import { checkPermission } from "@/lib/access-control-service"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()

    // Get current user (simplified - implement proper auth check)
    const userId = request.headers.get("x-user-id")

    if (!userId || !(await checkPermission(userId, "view_logs"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = (searchParams.get("format") as "csv" | "json") || "json"
    const actionType = searchParams.get("actionType")
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    if (format === "csv" || format === "json") {
      const csv = await exportAuditLogs(format, {
        actionType: actionType || undefined,
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
      actionType: actionType || undefined,
      limit,
    })

    return NextResponse.json({ logs, total }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 },
    )
  }
}
