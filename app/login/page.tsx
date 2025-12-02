"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, LogIn, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if MFA is required
        if (data.requiresMFA) {
          // Redirect to OTP verification page
          window.location.href = `/verify-otp?userId=${data.userId}&method=${data.mfaMethod || "email"}`;
        } else if (data.redirectTo) {
          // Normal login - redirect to dashboard
          window.location.href = data.redirectTo;
        } else {
          setError("Login successful but no redirect URL provided");
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Login failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Back Button */}
      <Link href="/" className="p-4">
        <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </Link>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Login</h1>
            </div>
            <p className="text-slate-400">Access the Security System</p>
          </div>

          {/* Login Card */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500 rounded text-red-200 text-sm">{error}</div>
                )}

                <div>
                  <Label htmlFor="email" className="text-slate-200">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@astu.edu.et"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-slate-200">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {isLoading ? "Logging in..." : "Login"}
                  <LogIn className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-3">Demo Credentials:</p>
                <div className="space-y-1">
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold">Email:</span> admin@astu.edu.et
                  </p>
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold">Password:</span> AdminSecure123!
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold">Email:</span> manager1@astu.edu.et
                  </p>
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold">Password:</span> ManagerOne123!
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold">Email:</span> manager2@astu.edu.et
                  </p>
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold">Password:</span> ManagerTwo123!
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold">Email:</span> mk543gg@gmail.com
                  </p>
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold">Password:</span> 12345Uu@
                  </p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-slate-400 text-sm">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
                    Register here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
