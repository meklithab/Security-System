"use client"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Lock, LogIn, UserPlus, ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Navigation Bar */}
      <nav className="bg-slate-900/50 border-b border-slate-700 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold text-white">Security System</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="mr-2 h-4 w-4" />
                Register
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-white mb-6">Comprehensive Security System</h1>
          <p className="text-xl text-slate-400 mb-4">Addis Ababa Science and Technology University</p>
          <p className="text-lg text-slate-500">Department of Software Engineering - Computer System Security</p>
        </div>

        {/* CTA Buttons */}
        <div className="flex justify-center gap-4 mb-20">
          <Link href="/register">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-200 hover:bg-slate-700 text-lg px-8 bg-transparent"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <Shield className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">Multi-Layer Access Control</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm">
                RBAC, MAC, DAC, RuBAC, and ABAC for fine-grained security policies
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <Lock className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">Advanced Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm">
                Secure password policies, OTP-based MFA, and account lockout protection
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <Shield className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">Audit & Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm">
                Comprehensive logging, anomaly detection, and compliance reporting
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <Lock className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">Data Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm">Encrypted backups, data encryption, and secure data handling</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <Shield className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">Role Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm">Dynamic role assignment, permission management, and audit trails</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition">
            <CardHeader>
              <Lock className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">System Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm">
                Real-time alerts, system events logging, and centralized monitoring
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500">
          <p>Computer System Security Project - v1.0</p>
          <p className="text-sm">© 2025 Addis Ababa Science and Technology University</p>
        </div>
      </footer>
    </div>
  )
}
