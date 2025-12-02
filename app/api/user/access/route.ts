import { getSupabaseServerClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Load basic user info + role + MAC label + ABAC attributes
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name, email, department")
      .eq("id", userId)
      .single()

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role:roles(name)")
      .eq("user_id", userId)

    const { data: clearance } = await supabase
      .from("user_clearance_levels")
      .select("classification:data_classifications(name, level)")
      .eq("user_id", userId)
      .single()

    const { data: abac } = await supabase
      .from("abac_attributes")
      .select("attribute_name, attribute_value")
      .eq("user_id", userId)

    const { data: resourcePerms } = await supabase
      .from("resource_permissions")
      .select(
        `
        id,
        resource:resources(name, resource_type, classification:data_classifications(name, level)),
        granted_to_user_id,
        granted_to_role_id,
        can_view,
        can_edit,
        can_delete,
        can_share
      `,
      )
      .or(`granted_to_user_id.eq.${userId},granted_to_role_id.in.(select role_id from user_roles where user_id = '${userId}')`)

    return NextResponse.json({
      user,
      roles: roles?.map((r: any) => r.role?.name).filter(Boolean) || [],
      macLabel: clearance?.classification?.name || null,
      macLevel: clearance?.classification?.level || null,
      abacAttributes: abac || [],
      permissions: resourcePerms || [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load access information" },
      { status: 500 },
    )
  }
}




