"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SecuritySettings() {
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaMethod, setMfaMethod] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isTogglingMFA, setIsTogglingMFA] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  
  // MFA disable form state
  const [mfaDisablePassword, setMfaDisablePassword] = useState("")
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false)

  // Fetch security settings on mount
  useEffect(() => {
    fetchSecuritySettings()
  }, [])

  const fetchSecuritySettings = async () => {
    try {
      setIsLoading(true)
      setError("")
      const response = await fetch("/api/user/settings")
      
      if (!response.ok) {
        if (response.status === 401) {
          setError("Please log in to view security settings")
          return
        }
        throw new Error("Failed to fetch security settings")
      }

      const data = await response.json()
      setMfaEnabled(data.mfaEnabled || false)
      setMfaMethod(data.mfaMethod || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      setIsChangingPassword(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password")
      }

      setSuccess("Password changed successfully!")
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setPasswordDialogOpen(false)
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleEnableMFA = async (method: "email" | "sms") => {
    try {
      setIsTogglingMFA(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enable_mfa",
          mfaMethod: method,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to enable MFA")
      }

      setMfaEnabled(true)
      setMfaMethod(method)
      setSuccess("MFA enabled successfully!")
      setMfaDialogOpen(false)
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable MFA")
    } finally {
      setIsTogglingMFA(false)
    }
  }

  const handleDisableMFA = async () => {
    try {
      setIsTogglingMFA(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disable_mfa",
          currentPassword: mfaDisablePassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to disable MFA")
      }

      setMfaEnabled(false)
      setMfaMethod(null)
      setMfaDisablePassword("")
      setSuccess("MFA disabled successfully!")
      setMfaDialogOpen(false)
      
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable MFA")
    } finally {
      setIsTogglingMFA(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Password Security */}
      <Card>
        <CardHeader>
          <CardTitle>Password Security</CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Password Strength Requirements</Label>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your password must be at least 12 characters with uppercase, lowercase, numbers, and special characters.
              </AlertDescription>
            </Alert>
          </div>

          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Change Password</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>Enter your current password and new password</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-pass">Current Password</Label>
                  <Input
                    id="current-pass"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="new-pass">New Password</Label>
                  <Input
                    id="new-pass"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 12 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirm-pass">Confirm Password</Label>
                  <Input
                    id="confirm-pass"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Multi-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Factor Authentication (MFA)</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaEnabled ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Multi-factor authentication is enabled for your account.
                </AlertDescription>
              </Alert>
              <div>
                <p className="text-sm font-medium mb-2">Enabled Methods:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    {mfaMethod === "email" ? "Email OTP" : mfaMethod === "sms" ? "SMS OTP" : "Unknown"}
                  </li>
                </ul>
              </div>
              <Dialog open={mfaDialogOpen} onOpenChange={setMfaDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isTogglingMFA}>
                    Disable MFA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disable Multi-Factor Authentication</DialogTitle>
                    <DialogDescription>
                      For security, please enter your current password to disable MFA.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mfa-disable-password">Current Password</Label>
                      <Input
                        id="mfa-disable-password"
                        type="password"
                        value={mfaDisablePassword}
                        onChange={(e) => setMfaDisablePassword(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleDisableMFA}
                      disabled={isTogglingMFA || !mfaDisablePassword}
                    >
                      {isTogglingMFA ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Disabling...
                        </>
                      ) : (
                        "Disable MFA"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Enabling MFA will make your account more secure. We recommend enabling it.
                </AlertDescription>
              </Alert>
              <Dialog open={mfaDialogOpen} onOpenChange={setMfaDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Enable MFA</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enable Multi-Factor Authentication</DialogTitle>
                    <DialogDescription>Choose your preferred MFA method</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleEnableMFA("email")}
                      disabled={isTogglingMFA}
                    >
                      {isTogglingMFA ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enabling...
                        </>
                      ) : (
                        "Email OTP"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleEnableMFA("sms")}
                      disabled={isTogglingMFA}
                    >
                      {isTogglingMFA ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enabling...
                        </>
                      ) : (
                        "SMS OTP (Coming Soon)"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
