"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Activity {
  id: string
  created_at: string
  action_type: string
  resource_type: string | null
  resource_name: string | null
  status: "success" | "failed" | "pending" | null
  ip_address: string | null
  description: string
}

export default function ActivityHistory() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [filterAction, setFilterAction] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  async function fetchActivities() {
    try {
      const res = await fetch("/api/user/activity")
      const data = await res.json()
      console.log("API returned:", data) // <--- check here
      setActivities(Array.isArray(data) ? data : data.activities || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  fetchActivities()
}, [])



  const filteredActivities =
    filterAction !== "all"
      ? activities.filter((a) => a.action_type === filterAction)
      : activities

  if (loading) return <div>Loading activity history...</div>

  // Generate unique action types safely
  const uniqueActions = Array.from(
    new Set(activities.map((a) => a.action_type).filter((a): a is string => !!a))
  )

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
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
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
            {filteredActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm">
                  No activities found.
                </TableCell>
              </TableRow>
            ) : (
              filteredActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="text-sm">
                    {new Date(activity.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{activity.action_type}</TableCell>
                  <TableCell className="text-sm">
                    {activity.resource_name || activity.resource_type || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        activity.status === "success"
                          ? "default"
                          : activity.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {activity.status || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{activity.ip_address || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
