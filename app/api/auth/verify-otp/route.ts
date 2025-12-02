import { verifyOTPAndLogin, sendOTP } from "@/lib/auth-service"
import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// Helper to determine dashboard
const getDashboardRoute = (roles: string[] = []) => {
  if (roles.includes("System Admin")) return "/dashboard/admin"
  if (roles.includes("Manager")) return "/dashboard/manager"
  return "/dashboard/employee"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, otp, action } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Send OTP
    if (action === "send") {
      await sendOTP(userId, "email")
      return NextResponse.json({ success: true, message: "OTP sent to your email" }, { status: 200 })
    }

    // Verify OTP
    if (action === "verify") {
      if (!otp) {
        return NextResponse.json({ error: "OTP is required" }, { status: 400 })
      }

      const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

      const result = await verifyOTPAndLogin(userId, otp, ipAddress)

      // Set session cookie
      if (result.sessionToken) {
        ;(await cookies()).set("session_token", result.sessionToken, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      }

      return NextResponse.json({
        success: true,
        user: result.user,
        sessionToken: result.sessionToken,
        redirectTo: getDashboardRoute(result.user?.roles || []),
      }, { status: 200 })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 400 })
  }
}
