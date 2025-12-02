import { getCurrentUser } from "@/lib/auth-helpers"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createAuditLog } from "@/lib/audit-service"
import { type NextRequest, NextResponse } from "next/server"

// GET - Fetch current user's profile
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ profile: user }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

// PUT/PATCH - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fullName, phoneNumber, address, dateOfBirth } = body

    // Validate input
    if (!fullName || fullName.trim().length === 0) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Update user profile (only allow updating certain fields)
    const updateData: {
      full_name?: string
      phone_number?: string
      address?: string
      date_of_birth?: string
      updated_at?: string
    } = {
      full_name: fullName.trim(),
      updated_at: new Date().toISOString(),
    }

    if (phoneNumber !== undefined) {
      updateData.phone_number = phoneNumber?.trim() || null
    }

    if (address !== undefined) {
      updateData.address = address?.trim() || null
    }

    if (dateOfBirth) {
      updateData.date_of_birth = dateOfBirth
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id)
      .select("id, email, full_name, phone_number, department, employee_id, profile_picture_url, date_of_birth, address, created_at")
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update profile" },
        { status: 400 }
      )
    }

    // Log the profile update
    await createAuditLog({
      user_id: user.id,
      action_type: "profile_updated",
      description: "User updated their profile information",
      resource_type: "users",
      resource_id: user.id,
      status: "success",
    })

    return NextResponse.json({ profile: updatedUser, message: "Profile updated successfully" }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 }
    )
  }
}


