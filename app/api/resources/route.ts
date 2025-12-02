import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"
import { checkAccess } from "@/lib/access-control-service"
import { logActivity } from "@/lib/enhanced-audit-service"

// GET /api/resources  -> list resources current user can view
// POST /api/resources -> create new resource owned by current user

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await getSupabaseServerClient()
        const { searchParams } = new URL(request.url)
        const limit = Number.parseInt(searchParams.get("limit") || "50", 10)

        const { data: allResources, error } = await supabase
            .from("resources")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(Number.isFinite(limit) && limit > 0 ? limit : 50)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined

        const withAccess = await Promise.all(
            (allResources || []).map(async (resource) => {
                const access = await checkAccess(user.id, resource.id as string, "view", ipAddress)
                return access.allowed ? resource : null
            }),
        )

        const visibleResources = withAccess.filter(Boolean)

        return NextResponse.json({ resources: visibleResources }, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to load resources" },
            { status: 500 },
        )
    }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const supabase = await getSupabaseServerClient()

    // -------------------------
    // Determine primary role
    // -------------------------
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id)

    const roles: string[] = (roleRows || []).map((r: any) => r.roles?.name).filter(Boolean)
    const primaryRole = roles[0] || "Employee"

    // -------------------------
    // Fetch classification IDs
    // -------------------------
    const { data: classifications } = await supabase
      .from("data_classifications")
      .select("id, name")
    if (!classifications) {
      return NextResponse.json({ error: "Failed to fetch classifications" }, { status: 500 })
    }

    const publicClass = classifications.find((c) => c.name === "Public")?.id
    const internalClass = classifications.find((c) => c.name === "Internal")?.id
    const confidentialClass = classifications.find((c) => c.name === "Confidential")?.id

    if (!publicClass || !internalClass || !confidentialClass) {
      return NextResponse.json({ error: "Missing classification IDs" }, { status: 500 })
    }

    // -------------------------
    // Role rules enforcement
    // -------------------------
    let classificationId: string

    if (primaryRole === "Employee") {
      classificationId = publicClass // Employee can only upload Public
    } else if (primaryRole === "Manager") {
      if (body.classification_id !== publicClass && body.classification_id !== internalClass) {
        return NextResponse.json({
          error: "Managers can only upload Public or Internal documents",
        }, { status: 403 })
      }
      classificationId = body.classification_id
    } else if (primaryRole === "System Admin") {
      // Admin can choose any classification
      if (![publicClass, internalClass, confidentialClass].includes(body.classification_id)) {
        return NextResponse.json({ error: "Invalid classification" }, { status: 400 })
      }
      classificationId = body.classification_id
    } else {
      // Default fallback
      classificationId = publicClass
    }

    // -------------------------
    // Insert resource
    // -------------------------
    const { data, error } = await supabase.from("resources").insert([
      {
        name: body.name,
        resource_type: body.resource_type,
        description: body.description || null,
        owner_id: user.id,
        classification_id: classificationId,
        is_encrypted: true,
      },
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, resource: data?.[0] })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to create resource",
    }, { status: 500 })
  }
}
