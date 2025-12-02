import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"
import { checkAccess } from "@/lib/access-control-service"
import { logActivity } from "@/lib/enhanced-audit-service"

// params is now a Promise in Next.js 13 App Router
interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = await getSupabaseServerClient()
    const { data: resource, error } = await supabase.from("resources").select("*").eq("id", id).single()

    if (error || !resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 })

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined
    const access = await checkAccess(user.id, id, "view", ipAddress)
    if (!access.allowed) return NextResponse.json({ error: access.reason || "Access denied" }, { status: 403 })

    return NextResponse.json({ resource }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load resource" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = await getSupabaseServerClient()
    const { data: existing } = await supabase.from("resources").select("*").eq("id", id).single()
    if (!existing) return NextResponse.json({ error: "Resource not found" }, { status: 404 })

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined
    const access = await checkAccess(user.id, id, "edit", ipAddress)
    if (!access.allowed) return NextResponse.json({ error: access.reason || "Access denied" }, { status: 403 })

    const body = await request.json()
    const { data: updated, error } = await supabase.from("resources").update(body).eq("id", id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity({
      user_id: user.id,
      action_type: "resource_updated",
      resource_type: updated.resource_type,
      resource_id: updated.id,
      resource_name: updated.name,
      description: `Updated resource ${updated.name}`,
      old_value: JSON.stringify(existing),
      new_value: JSON.stringify(updated),
      status: "success",
    })

    return NextResponse.json({ resource: updated }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update resource" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = await getSupabaseServerClient()
    const { data: existing } = await supabase.from("resources").select("*").eq("id", id).single()
    if (!existing) return NextResponse.json({ error: "Resource not found" }, { status: 404 })

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined
    const access = await checkAccess(user.id, id, "delete", ipAddress)
    if (!access.allowed) return NextResponse.json({ error: access.reason || "Access denied" }, { status: 403 })

    const { error } = await supabase.from("resources").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity({
      user_id: user.id,
      action_type: "resource_deleted",
      resource_type: existing.resource_type,
      resource_id: existing.id,
      resource_name: existing.name,
      description: `Deleted resource ${existing.name}`,
      old_value: JSON.stringify(existing),
      status: "success",
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete resource" },
      { status: 500 },
    )
  }
}
