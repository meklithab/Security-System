import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUser } from "@/lib/auth-helpers"

type RoleName = "System Admin" | "Manager" | "Employee" | string

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await getSupabaseServerClient()

        // Determine primary role
        const { data: roleRows } = await supabase
            .from("user_roles")
            .select("roles(name)")
            .eq("user_id", user.id)

        const roles: RoleName[] = (roleRows || []).map((r: any) => r.roles?.name).filter(Boolean)
        const primaryRole: RoleName = (roles[0] as RoleName) || "Employee"

        // Load resources with classification + owner metadata
        const { data: resources, error } = await supabase
            .from("resources")
            .select(
                `
        id,
        name,
        resource_type,
        description,
        created_at,
        owner_id,
        data_classifications!inner(name, level),
        users!resources_owner_id_fkey(full_name, email)
      `,
            )
            .order("created_at", { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Role-based visibility by classification name
        const visible = (resources || []).filter((r: any) => {
            const classificationName = r.data_classifications?.name as string | undefined
            const ownerId = r.owner_id as string

            if (!classificationName) return false

            if (primaryRole === "System Admin") {
                return true
            }

            if (primaryRole === "Manager") {
                // Managers: Public + Internal only
                return classificationName === "Public" || classificationName === "Internal"
            }

            // Employees: Public only (their uploads and others') – upload is constrained to Public
            return classificationName === "Public"
        })

        const documents = visible.map((r: any) => {
            const classificationName = r.data_classifications?.name as string
            const ownerId = r.owner_id as string

            const canEditOrDelete = primaryRole === "System Admin" || ownerId === user.id
            const canChangeClassification = primaryRole === "System Admin"

            return {
                id: r.id as string,
                name: r.name as string,
                type: r.resource_type as string,
                description: (r.description as string | null) ?? "",
                classification: classificationName,
                createdAt: r.created_at as string,
                ownerName: (r.users?.full_name as string | null) ?? "",
                ownerEmail: (r.users?.email as string | null) ?? "",
                canEdit: canEditOrDelete,
                canDelete: canEditOrDelete,
                canChangeClassification,
            }
        })

        // Expose classifications for admin (for e.g. classification change UI)
        const { data: classifications } = await supabase
            .from("data_classifications")
            .select("id, name, level")
            .order("level", { ascending: true })

        return NextResponse.json(
            {
                role: primaryRole,
                documents,
                classifications: classifications || [],
            },
            { status: 200 },
        )
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to load documents" },
            { status: 500 },
        )
    }
}


