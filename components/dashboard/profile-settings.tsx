"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface Profile {
  id?: string
  fullName: string
  email: string
  phone: string | null
  department: string | null
  employeeId?: string | null
  address?: string | null
  dateOfBirth?: string | null
  profilePictureUrl?: string | null
}

export default function ProfileSettings() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [profile, setProfile] = useState<Profile>({
    fullName: "",
    email: "",
    phone: null,
    department: null,
  })

  const [editData, setEditData] = useState<Profile>(profile)

  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError("")
      const response = await fetch("/api/profile")

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please log in to view your profile")
          return
        }
        throw new Error("Failed to fetch profile")
      }

      const data = await response.json()
      const userProfile = data.profile

      const formattedProfile: Profile = {
        id: userProfile.id,
        fullName: userProfile.full_name || "",
        email: userProfile.email || "",
        phone: userProfile.phone_number || null,
        department: userProfile.department || null,
        employeeId: userProfile.employee_id || null,
        address: userProfile.address || null,
        dateOfBirth: userProfile.date_of_birth || null,
        profilePictureUrl: userProfile.profile_picture_url || null,
      }

      setProfile(formattedProfile)
      setEditData(formattedProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editData.fullName,
          phoneNumber: editData.phone || null,
          address: editData.address || null,
          dateOfBirth: editData.dateOfBirth || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile")
      }

      setProfile(data.profile)
      setEditData(data.profile)
      setIsEditing(false)
      setSuccess("Profile updated successfully!")

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData(profile)
    setIsEditing(false)
    setError("")
    setSuccess("")
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>View and manage your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.profilePictureUrl || "https://github.com/shadcn.png"} />
              <AvatarFallback>{getInitials(profile.fullName || "U")}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{profile.fullName || "Loading..."}</p>
              <p className="text-sm text-muted-foreground">{profile.email || ""}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : success ? (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullname">Full Name</Label>
                <Input
                  id="fullname"
                  value={editData.fullName}
                  onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editData.phone ?? ""}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={editData.department ?? ""}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  disabled
                />
              </div>
              {editData.address !== undefined && (
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={editData.address ?? ""}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    rows={3}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{profile.fullName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{profile.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="font-medium">{profile.phone}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <p className="font-medium">{profile.department || "N/A"}</p>
                </div>
                {profile.address && (
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <p className="font-medium">{profile.address}</p>
                  </div>
                )}
              </div>
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
