"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Activity {
  id: string
  timestamp: string
  action: string
  resource: string
  status: "success" | "denied"
  ipAddress: string
}

const mockActivities: Activity[] = [
  {
    id: "1",
    timestamp: "2024-12-01 14:32:15",
    action: "login",
    resource: "Dashboard",
    status: "success",
    ipAddress: "192.168.1.100",
  },
  {
    id: "2",
    timestamp: "2024-12-01 13:45:22",
    action: "view_document",
    resource: "Performance_Report_2024.pdf",
    status: "success",
    ipAddress: "192.168.1.100",
  },
  {
    id: "3",
    timestamp: "2024-12-01 12:15:10",
    action: "update_profile",
    resource: "Profile",
    status: "success",
    ipAddress: "192.168.1.100",
  },
  {
    id: "4",
    timestamp: "2024-11-30 18:30:45",
    action: "access_denied",
    resource: "Salary_Data",
    status: "denied",
    ipAddress: "192.168.2.50",
  },
]

export default function ActivityHistory() {
  const [filterAction, setFilterAction] = useState("all")

  const filteredActivities =
    filterAction !== "all" ? mockActivities.filter((a) => a.action === filterAction) : mockActivities

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
        <CardDescription>View your recent account activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="view_document">View Document</SelectItem>
              <SelectItem value="update_profile">Update Profile</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredActivities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell className="text-sm">{activity.timestamp}</TableCell>
                <TableCell className="font-medium text-sm">{activity.action}</TableCell>
                <TableCell className="text-sm">{activity.resource}</TableCell>
                <TableCell>
                  <Badge variant={activity.status === "success" ? "default" : "destructive"}>{activity.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{activity.ipAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
