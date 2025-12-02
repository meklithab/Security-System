import { loginUser } from "@/lib/auth-service"; 
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Helper to determine dashboard
const getDashboardRoute = (roles: string[] = []) => {
  if (roles.includes("System Admin")) return "/dashboard/admin";
  if (roles.includes("Manager")) return "/dashboard/manager";
  if (roles.includes("Employee")) return "/dashboard/employee";
  return "/login";
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Authenticate user
    const result = await loginUser(email, password, ipAddress);

    // Handle MFA
    if (result.requiresMFA) {
      return NextResponse.json(
        {
          requiresMFA: true,
          userId: result.userId,
          mfaMethod: result.mfaMethod,
        },
        { status: 200 }
      );
    }

    // Ensure roles exist
    const roles = result.user?.roles ?? [];

    // ❗ SET COOKIE HERE
    if (result.sessionToken) {
      (await cookies()).set("session_token", result.sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      redirectTo: getDashboardRoute(roles),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 }
    );
  }
}
