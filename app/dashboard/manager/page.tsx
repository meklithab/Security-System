"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProfileSettings from "@/components/dashboard/profile-settings"
import ActivityHistory from "@/components/dashboard/activity-history"
import SecuritySettings from "@/components/dashboard/security-settings"
import Documents from "@/components/dashboard/documents"

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">MANAGER Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage your profile and security settings</p>
            </div>
            <Button variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>

          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="overview">
            <ProfileSettings />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <ActivityHistory />
          </TabsContent>

             <TabsContent value="documents">
            <Documents />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
