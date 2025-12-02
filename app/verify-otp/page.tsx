"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Mail, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function VerifyOTPPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const userId = searchParams.get("userId")
  const mfaMethod = searchParams.get("method") || "email"

  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      router.push("/login")
    }
  }, [userId, router])

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP code")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          otp,
          action: "verify",
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess("OTP verified successfully! Redirecting...")
        
        // Use redirectTo from API response, or default to dashboard
        const redirectTo = data.redirectTo || "/dashboard"

        setTimeout(() => {
          window.location.href = redirectTo
        }, 1000)
      } else {
        setError(data.error || "Invalid OTP code. Please try again.")
      }
    } catch (err) {
      setError("Verification failed: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setIsResending(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "send",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("New OTP code sent to your email!")
        setCountdown(60) // 60 second cooldown
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "Failed to resend OTP")
      }
    } catch (err) {
      setError("Failed to resend OTP: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setIsResending(false)
    }
  }

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Back Button */}
      <Link href="/login" className="p-4">
        <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>
      </Link>

      {/* OTP Verification Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Verify OTP</h1>
            </div>
            <p className="text-slate-400">Enter the code sent to your {mfaMethod === "email" ? "email" : "phone"}</p>
          </div>

          {/* OTP Card */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Multi-Factor Authentication</CardTitle>
              <CardDescription className="text-slate-400">
                We've sent a 6-digit code to your {mfaMethod === "email" ? "email address" : "phone number"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success && (
                <Alert className="mb-4 bg-green-500/20 border-green-500">
                  <AlertDescription className="text-green-200">{success}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <Label htmlFor="otp" className="text-slate-200">
                    Enter OTP Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                      setOtp(value)
                    }}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-center text-2xl tracking-widest font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Enter the 6-digit code from your {mfaMethod === "email" ? "email" : "phone"}
                  </p>
                </div>

                <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full bg-blue-600 hover:bg-blue-700">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-400">Didn't receive the code?</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendOTP}
                    disabled={isResending || countdown > 0}
                    className="w-full"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : countdown > 0 ? (
                      `Resend in ${countdown}s`
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend OTP
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">💡 Tips:</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>The code expires in 5 minutes</li>
                  <li>Enter all 6 digits without spaces</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

