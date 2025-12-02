
import { getCurrentUser } from "@/lib/auth-helpers";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { type NextRequest, NextResponse } from "next/server";

// GET - Fetch current user's activity logs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Fetch user's audit logs
    const { data: activities, error } = await supabase
      .from("audit_logs")
      .select(
        "id, action_type, description, resource_type, resource_id, status, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch activity logs" },
        { status: 400 }
      );
    }

    return NextResponse.json({ activities }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
