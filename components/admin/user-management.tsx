"use client"

import { useState } from "react"
import { Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  id: string
  email: string
  fullName: string
  role: string
  department: string
  status: "active" | "locked" | "inactive"
  lastLogin: string
}

const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@astu.edu.et",
    fullName: "Admin User",
    role: "System Admin",
    department: "IT",
    status: "active",
    lastLogin: "2 hours ago",
  },
  {
    id: "2",
    email: "security@astu.edu.et",
    fullName: "Security Officer",
    role: "Security Officer",
    department: "Security",
    status: "active",
    lastLogin: "30 minutes ago",
  },
  {
    id: "3",
    email: "hr@astu.edu.et",
    fullName: "HR Manager",
    role: "HR Manager",
    department: "HR",
    status: "active",
    lastLogin: "1 day ago",
  },
]

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAssignRole = () => {
    if (selectedUser && newRole) {
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole } : u)))
      setIsDialogOpen(false)
      setNewRole("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell className="text-sm">{user.email}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                    {user.role}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{user.department}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      user.status === "active"
                        ? "bg-green-100 text-green-800"
                        : user.status === "locked"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                <TableCell className="text-right">
                  <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                        <Shield className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Role</DialogTitle>
                        <DialogDescription>Change role for {selectedUser?.fullName}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Current Role: {selectedUser?.role}</Label>
                        </div>
                        <div>
                          <Label htmlFor="role-select">New Role</Label>
                          <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="System Admin">System Admin</SelectItem>
                              <SelectItem value="Security Officer">Security Officer</SelectItem>
                              <SelectItem value="HR Manager">HR Manager</SelectItem>
                              <SelectItem value="Department Head">Department Head</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Employee">Employee</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleAssignRole} className="w-full">
                          Assign Role
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
