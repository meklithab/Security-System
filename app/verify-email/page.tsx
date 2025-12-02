"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"

export default function VerifyEmailPage() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle")
    const [message, setMessage] = useState<string>("")

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setMessage("Missing verification token.")
            return
        }

        setStatus("verifying")
        setMessage("")

        fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
            .then(async (res) => {
                const body = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string }
                if (!res.ok || !body.success) {
                    throw new Error(body.error || body.message || "Verification failed")
                }
                setStatus("success")
                setMessage(body.message || "Your email has been verified. You can now log in.")
            })
            .catch((err) => {
                setStatus("error")
                setMessage(err instanceof Error ? err.message : "Verification failed")
            })
    }, [token])

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle>Email Verification</CardTitle>
                    <CardDescription>Confirming your email address for the security system.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === "verifying" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Spinner className="h-4 w-4" />
                            <span>Verifying your email, please wait…</span>
                        </div>
                    )}

                    {status === "success" && (
                        <p className="text-sm text-emerald-600">{message || "Email verified successfully."}</p>
                    )}

                    {status === "error" && (
                        <p className="text-sm text-destructive">
                            {message || "We could not verify your email. The link may be invalid or expired."}
                        </p>
                    )}

                    <Button variant="outline" className="w-full mt-2" onClick={() => (window.location.href = "/login")}>
                        Back to login
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}


