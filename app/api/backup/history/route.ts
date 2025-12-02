import { getBackupHistory } from "@/lib/backup-service"
import { checkPermission } from "@/lib/access-control-service"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId || !(await checkPermission(userId, "manage_access"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const backups = await getBackupHistory(limit)

    return NextResponse.json({ backups }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch backups" },
      { status: 500 },
    )
  }
}
