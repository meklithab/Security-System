"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, UserPlus, ArrowLeft, CheckCircle } from "lucide-react"


export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "Software Engineering",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validatePassword = (password: string) => {
    const errors: string[] = []
    if (password.length < 8) errors.push("at least 8 characters")
    if (!/[A-Z]/.test(password)) errors.push("an uppercase letter")
    if (!/[a-z]/.test(password)) errors.push("a lowercase letter")
    if (!/[0-9]/.test(password)) errors.push("a number")
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) errors.push("a special character")
    return errors
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const pwdErrors = validatePassword(formData.password)
    if (pwdErrors.length > 0) {
      setError(`Password must contain ${pwdErrors.join(", ")}`)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: `${formData.firstName} ${formData.lastName}`,
          department: formData.department,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          department: "Software Engineering",
        })
        setTimeout(() => window.location.href = "/login", 2000)
      } else {
        setError(data.error || "Registration failed")
      }
    } catch (err) {
      setError("Registration failed: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-slate-400 mb-6">Check your email to verify your account. Redirecting to login...</p>
          <div className="animate-pulse">
            <div className="h-1 bg-blue-600 rounded-full"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <Link href="/" className="p-4">
        <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Button>
      </Link>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Register</h1>
            </div>
            <p className="text-slate-400">Create a new account</p>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Sign Up</CardTitle>
              <CardDescription>Complete the form to create your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                {error && <div className="p-3 bg-red-500/20 border border-red-500 rounded text-red-200 text-sm">{error}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-slate-200">First Name</Label>
                    <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required className="bg-slate-700 border-slate-600 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-slate-200">Last Name</Label>
                    <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required className="bg-slate-700 border-slate-600 text-white" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-slate-200">Email Address</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="bg-slate-700 border-slate-600 text-white" />
                </div>

                <div>
                  <Label htmlFor="department" className="text-slate-200">Department</Label>
                  <select id="department" name="department" value={formData.department} onChange={handleChange} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md">
                    <option>Software Engineering</option>
                    <option>Information Technology</option>
                    <option>Computer Science</option>
                    <option>Human Resources</option>
                    <option>Finance</option>
                    <option>Administration</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="password" className="text-slate-200">Password</Label>
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required className="bg-slate-700 border-slate-600 text-white" placeholder="Min 8 chars, uppercase, number, special" />
                  <p className="text-xs text-slate-500 mt-1">Must contain: uppercase, lowercase, number, and special character</p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-slate-200">Confirm Password</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required className="bg-slate-700 border-slate-600 text-white" />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {isLoading ? "Creating account..." : "Register"}
                  <UserPlus className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-slate-400 text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">Login here</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
