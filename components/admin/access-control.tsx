"use client"

import { useState } from "react"
import { Plus, Edit2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface AccessPolicy {
  id: string
  name: string
  type: string
  conditions: string
  priority: number
  status: "active" | "inactive"
}

const mockPolicies: AccessPolicy[] = [
  {
    id: "1",
    name: "Working Hours Only",
    type: "Time-based",
    conditions: "9 AM - 5 PM (Mon-Fri)",
    priority: 100,
    status: "active",
  },
  {
    id: "2",
    name: "Campus Network Only",
    type: "Location-based",
    conditions: "Campus IP ranges only",
    priority: 90,
    status: "active",
  },
  {
    id: "3",
    name: "HR Can View Salary",
    type: "Attribute-based",
    conditions: "Role = HR Manager AND Department = HR",
    priority: 80,
    status: "active",
  },
]

export default function AccessControl() {
  const [policies, setPolicies] = useState<AccessPolicy[]>(mockPolicies)

  return (
    <div className="space-y-4">
      <Tabs defaultValue="policies" className="w-full">
        <TabsList>
          <TabsTrigger value="policies">Access Policies</TabsTrigger>
          <TabsTrigger value="clearance">Clearance Levels</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Access Control Rules</CardTitle>
                <CardDescription>Manage time-based, location-based, and attribute-based rules</CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Rule
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>{policy.type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{policy.conditions}</TableCell>
                      <TableCell>{policy.priority}</TableCell>
                      <TableCell>
                        <Badge variant={policy.status === "active" ? "default" : "secondary"}>{policy.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clearance">
          <Card>
            <CardHeader>
              <CardTitle>Data Classification & Clearance</CardTitle>
              <CardDescription>Manage data classification levels and user clearance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Public", "Internal", "Confidential", "Secret"].map((level, idx) => (
                  <div key={level} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{level}</p>
                      <p className="text-sm text-muted-foreground">
                        Level {idx} -{" "}
                        {idx === 0
                          ? "Public access"
                          : idx === 1
                            ? "Internal use"
                            : idx === 2
                              ? "Restricted"
                              : "Executive only"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage Users
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permission Management</CardTitle>
              <CardDescription>View and manage all system permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { perm: "view_users", resource: "Users", action: "View" },
                    { perm: "edit_users", resource: "Users", action: "Edit" },
                    { perm: "view_salary", resource: "Salary", action: "View" },
                    { perm: "view_reports", resource: "Reports", action: "View" },
                    { perm: "manage_roles", resource: "Roles", action: "Manage" },
                  ].map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{p.perm}</TableCell>
                      <TableCell>{p.resource}</TableCell>
                      <TableCell>{p.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
