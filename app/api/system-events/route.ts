import { getSystemEvents, logSystemEvent } from "@/lib/enhanced-audit-service"
import { checkPermission } from "@/lib/access-control-service"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId || !(await checkPermission(userId, "view_logs"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get("severity")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const events = await getSystemEvents({
      severity: severity || undefined,
      limit,
    })

    return NextResponse.json({ events }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch events" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventType, severity, description, eventData } = body

    // Only system can create events
    const result = await logSystemEvent(eventType, severity, description, eventData)

    return NextResponse.json({ event: result }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create event" },
      { status: 400 },
    )
  }
}
