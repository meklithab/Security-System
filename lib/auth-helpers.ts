// lib/auth-helpers.ts
import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { getSupabaseServerClient } from "./supabase-server"

export function getUserIdFromRequest(req: NextRequest): string | null {
  // DEVELOPMENT: client can pass x-user-id header. In production, read session cookie or JWT here.
  const id = req.headers.get("x-user-id")
  if (id) return id
  // TODO: read from cookie/session: e.g., parse JWT from cookie and return sub
  return null
}

// Get current user from session token cookie
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session_token")?.value

    if (!sessionToken) {
      return null
    }

    const supabase = await getSupabaseServerClient()

    // Get session from database
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return null
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name, phone_number, department, employee_id, profile_picture_url, date_of_birth, address, created_at")
      .eq("id", session.user_id)
      .eq("is_active", true)
      .single()

    if (userError || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}
