"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Role {
  id: string
  name: string
  description: string
  userCount: number
  isSystemRole: boolean
}

const mockRoles: Role[] = [
  {
    id: "1",
    name: "System Admin",
    description: "Full system access and management",
    userCount: 2,
    isSystemRole: true,
  },
  {
    id: "2",
    name: "Security Officer",
    description: "Manage security policies and audit logs",
    userCount: 3,
    isSystemRole: true,
  },
  {
    id: "3",
    name: "HR Manager",
    description: "Manage employees and leave requests",
    userCount: 5,
    isSystemRole: false,
  },
  {
    id: "4",
    name: "Department Head",
    description: "Manage department resources and staff",
    userCount: 8,
    isSystemRole: false,
  },
  {
    id: "5",
    name: "Employee",
    description: "Basic employee access",
    userCount: 104,
    isSystemRole: false,
  },
]

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>(mockRoles)
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ name: "", description: "" })

  const handleAddRole = () => {
    if (formData.name && formData.description) {
      const newRole: Role = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        userCount: 0,
        isSystemRole: false,
      }
      setRoles([...roles, newRole])
      setFormData({ name: "", description: "" })
      setIsOpen(false)
    }
  }

  const handleDeleteRole = (id: string) => {
    setRoles(roles.filter((r) => r.id !== id))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Role Management</CardTitle>
          <CardDescription>Define and manage system roles and their permissions</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Add a new role to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  placeholder="e.g., Manager"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role-desc">Description</Label>
                <Textarea
                  id="role-desc"
                  placeholder="Describe the role's responsibilities"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <Button onClick={handleAddRole} className="w-full">
                Create Role
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{role.description}</TableCell>
                <TableCell>{role.userCount}</TableCell>
                <TableCell>
                  <span className="text-xs">
                    {role.isSystemRole ? (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-blue-800">
                        System
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-gray-800">
                        Custom
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {!role.isSystemRole && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
