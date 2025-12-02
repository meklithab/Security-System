import { createBackup } from "@/lib/backup-service"
import { checkPermission } from "@/lib/access-control-service"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId || !(await checkPermission(userId, "manage_access"))) {
      return NextResponse.json({ error: "Unauthorized - admin access required" }, { status: 403 })
    }

    const backup = await createBackup()

    return NextResponse.json(
      {
        success: true,
        backup,
        message: "Backup created successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup creation failed" },
      { status: 500 },
    )
  }
}
