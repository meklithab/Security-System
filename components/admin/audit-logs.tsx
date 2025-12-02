"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, RefreshCw } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

interface AuditLog {
  id: string
  created_at: string
  user_id?: string | null
  action_type: string
  resource_type?: string | null
  resource_name?: string | null
  status?: string | null
  ip_address?: string | null
  description?: string | null
}

interface AuditLogResponse {
  logs: AuditLog[]
  total: number
  availableActions?: string[]
  availableStatuses?: string[]
  error?: string
}

const ROW_SKELETON_COUNT = 6

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ limit: "100" })
    if (actionFilter !== "all") params.set("actionType", actionFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)
    return params
  }, [actionFilter, statusFilter])

  const fetchLogs = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)

      const params = buildParams()

      try {
        const response = await fetch(`/api/audit/logs?${params.toString()}`, {
          cache: "no-store",
          signal,
        })

        const payload = (await response.json().catch(() => null)) as AuditLogResponse | { error?: string } | null

        if (!response.ok || !payload || "error" in payload) {
          throw new Error((payload as { error?: string } | null)?.error || "Unable to load audit logs")
        }

        setLogs(payload.logs || [])
        setAvailableActions(payload.availableActions || [])
        setAvailableStatuses(payload.availableStatuses || [])
        setTotal(payload.total || 0)
        setLastUpdated(new Date())
      } finally {
        setIsLoading(false)
      }
    },
    [buildParams],
  )

  const handleRefresh = useCallback(() => {
    fetchLogs().catch((err) => {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message)
      }
    })
  }, [fetchLogs])

  useEffect(() => {
    const controller = new AbortController()
    fetchLogs(controller.signal).catch((err) => {
      if ((err as Error).name !== "AbortError") {
        console.error(err)
        setError((err as Error).message)
      }
    })

    return () => controller.abort()
  }, [fetchLogs])

  const handleExport = useCallback(
    async (format: "csv" | "json") => {
      try {
        const params = buildParams()
        params.set("format", format)

        const response = await fetch(`/api/audit/logs?${params.toString()}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error || `Unable to export logs as ${format.toUpperCase()}`)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `audit-logs.${format === "csv" ? "csv" : "json"}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to export logs")
      }
    },
    [buildParams],
  )

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
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            System-wide activity ({total} events)
            {lastUpdated && !isLoading && (
              <span className="ml-1 text-xs text-muted-foreground">
                • Updated {dateFormatter.format(lastUpdated)}
              </span>
            )}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
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
          </div>

          <div className="flex-1 min-w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
            {isLoading &&
              Array.from({ length: ROW_SKELETON_COUNT }).map((_, index) => (
                <TableRow key={`audit-skeleton-${index}`}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !error && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No audit events match the selected filters.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !error &&
              logs.map((log) => {
                const status = log.status || "unknown"
                const badgeVariant: "default" | "secondary" | "destructive" =
                  status === "success" ? "default" : status === "denied" || status === "failed" ? "destructive" : "secondary"

                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {log.created_at ? dateFormatter.format(new Date(log.created_at)) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {log.user_id || "system"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{log.action_type}</code>
                      {log.description && <p className="text-xs text-muted-foreground">{log.description}</p>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.resource_name || log.resource_type || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant}>{status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-xs">{log.ip_address || "—"}</TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
