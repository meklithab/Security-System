"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

interface ActivityLog {
  id: string
  created_at: string
  action_type: string
  resource_type?: string | null
  resource_name?: string | null
  status?: string | null
  ip_address?: string | null
  description?: string | null
}

interface ActivityResponse {
  logs: ActivityLog[]
  total: number
  availableActions?: string[]
  availableStatuses?: string[]
  error?: string
}

const SKELETON_ROW_COUNT = 5

interface ActivityHistoryProps {
  /**
   * self  = current user's activity only
   * admin = all system activity (for admins)
   */
  mode?: "self" | "admin"
}

export default function ActivityHistory({ mode = "self" }: ActivityHistoryProps) {
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchActivity = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({ limit: "50" })
      if (actionFilter !== "all") params.set("actionType", actionFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (mode === "admin") params.set("scope", "all")

      const endpoint = "/api/user/activity"

      try {
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          cache: "no-store",
          signal,
        })

        const json = (await response.json().catch(() => null)) as ActivityResponse | { error?: string } | null

        if (!response.ok || !json || "error" in json) {
          throw new Error((json as { error?: string } | null)?.error || "Unable to load activity")
        }

        const payload = json as ActivityResponse

        setActivities(payload.logs || [])
        setAvailableActions(payload.availableActions || [])
        setAvailableStatuses(payload.availableStatuses || [])
        setLastUpdated(new Date())
      } finally {
        setIsLoading(false)
      }
    },
    [actionFilter, statusFilter, mode],
  )

  const handleRefresh = useCallback(() => {
    fetchActivity().catch((err) => {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message)
      }
    })
  }, [fetchActivity])

  useEffect(() => {
    const controller = new AbortController()

    fetchActivity(controller.signal).catch((err) => {
      if ((err as Error).name !== "AbortError") {
        console.error(err)
        setError((err as Error).message)
      }
    })

    return () => controller.abort()
  }, [fetchActivity])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const actionOptions = ["all", ...availableActions]
  const statusOptions = availableStatuses.length > 0 ? ["all", ...availableStatuses] : ["all", "success", "denied", "error"]

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>
            Review every action tied to your account
            {lastUpdated && !isLoading && (
              <span className="ml-1 text-xs text-muted-foreground">
                • Updated {dateFormatter.format(lastUpdated)}
              </span>
            )}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} aria-label="Refresh activity">
          {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action === "all" ? "All actions" : action.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "all" ? "All statuses" : status}
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
            {isLoading &&
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !error && activities.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No activity recorded for the selected filters.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !error &&
              activities.map((activity) => {
                const status = activity.status || "unknown"
                const badgeVariant: "default" | "secondary" | "destructive" =
                  status === "success" ? "default" : status === "denied" || status === "failed" ? "destructive" : "secondary"

                return (
                  <TableRow key={activity.id}>
                    <TableCell className="text-sm">
                      {activity.created_at ? dateFormatter.format(new Date(activity.created_at)) : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {activity.action_type?.replace(/_/g, " ") || "—"}
                      {activity.description && (
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {activity.resource_name || activity.resource_type || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant}>{status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{activity.ip_address || "—"}</TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
