"use client"

import { AlertCircle, Info, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Alert {
  id: string
  severity: "info" | "warning" | "critical"
  message: string
  timestamp: string
}

const mockAlerts: Alert[] = [
  {
    id: "1",
    severity: "warning",
    message: "Multiple failed login attempts detected from IP 203.45.67.89",
    timestamp: "30 minutes ago",
  },
  {
    id: "2",
    severity: "info",
    message: "System backup completed successfully",
    timestamp: "2 hours ago",
  },
]

export default function SystemAlerts() {
  const getIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Alerts</CardTitle>
        <CardDescription>System events and security alerts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockAlerts.map((alert) => (
          <div key={alert.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
            {getIcon(alert.severity)}
            <div className="flex-1">
              <p className="text-sm font-medium">{alert.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
            </div>
            <Badge
              variant={
                alert.severity === "critical" ? "destructive" : alert.severity === "warning" ? "secondary" : "default"
              }
            >
              {alert.severity}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
