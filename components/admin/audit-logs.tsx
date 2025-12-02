"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  status: "success" | "denied" | "error"
  ipAddress: string
}

const mockLogs: AuditLog[] = [
  {
    id: "1",
    timestamp: "2024-12-01 14:32:15",
    user: "admin@astu.edu.et",
    action: "user_created",
    resource: "john.doe@astu.edu.et",
    status: "success",
    ipAddress: "192.168.1.1",
  },
  {
    id: "2",
    timestamp: "2024-12-01 14:28:43",
    user: "security@astu.edu.et",
    action: "permission_granted",
    resource: "salary_reports",
    status: "success",
    ipAddress: "192.168.1.50",
  },
  {
    id: "3",
    timestamp: "2024-12-01 14:15:22",
    user: "employee@astu.edu.et",
    action: "resource_access",
    resource: "confidential_document",
    status: "denied",
    ipAddress: "192.168.1.100",
  },
]

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>(mockLogs)
  const [actionFilter, setActionFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const filteredLogs = logs.filter(
    (log) => (!actionFilter || log.action === actionFilter) && (!statusFilter || log.status === statusFilter),
  )

  const handleExport = (format: "csv" | "json") => {
    if (format === "csv") {
      const csv = [
        ["Timestamp", "User", "Action", "Resource", "Status", "IP Address"],
        ...filteredLogs.map((log) => [log.timestamp, log.user, log.action, log.resource, log.status, log.ipAddress]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n")

      downloadFile(csv, "audit-logs.csv", "text/csv")
    } else {
      downloadFile(JSON.stringify(filteredLogs, null, 2), "audit-logs.json", "application/json")
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>View and export system activity logs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user_created">User Created</SelectItem>
                <SelectItem value="permission_granted">Permission Granted</SelectItem>
                <SelectItem value="resource_access">Resource Access</SelectItem>
                <SelectItem value="login">Login</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">{log.timestamp}</TableCell>
                <TableCell className="text-sm">{log.user}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{log.action}</code>
                </TableCell>
                <TableCell className="text-sm">{log.resource}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      log.status === "success" ? "default" : log.status === "denied" ? "destructive" : "secondary"
                    }
                  >
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-mono text-xs">{log.ipAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
