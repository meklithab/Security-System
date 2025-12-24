"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface User {
    id: string
    email: string
    full_name: string
}

interface PermissionLog {
    id: string
    user_id: string
    action_type: string
    resource_type: string
    resource_id: string
    resource_name: string
    description: string
    status: string
    ip_address: string
    created_at: string
    actor: User | null
}

interface OwnedResource {
    id: string
    name: string
    resource_type: string
}

export default function PermissionLogs() {
    const [logs, setLogs] = useState<PermissionLog[]>([])
    const [ownedResources, setOwnedResources] = useState<OwnedResource[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [selectedResourceId, setSelectedResourceId] = useState<string>("all")
    const [startDate, setStartDate] = useState<string>("")
    const [endDate, setEndDate] = useState<string>("")

    const loadOwnedResources = useCallback(async () => {
        try {
            const res = await fetch("/api/resources/permissions")
            const data = await res.json()
            if (res.ok) {
                setOwnedResources(data.ownedResources || [])
            }
        } catch {
            // Ignore - not critical
        }
    }, [])

    const loadLogs = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams()
            if (selectedResourceId && selectedResourceId !== "all") {
                params.set("resourceId", selectedResourceId)
            }
            if (startDate) params.set("startDate", startDate)
            if (endDate) params.set("endDate", endDate)
            params.set("limit", "50")

            const res = await fetch(`/api/audit/permissions?${params.toString()}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to load logs")
            }

            setLogs(data.logs || [])
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsLoading(false)
        }
    }, [selectedResourceId, startDate, endDate])

    useEffect(() => {
        loadOwnedResources()
    }, [loadOwnedResources])

    useEffect(() => {
        loadLogs()
    }, [loadLogs])

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString()
    }

    const getActionBadgeVariant = (action: string) => {
        if (action.includes("revoke") || action.includes("DELETE")) return "destructive"
        if (action.includes("grant") || action.includes("INSERT")) return "default"
        return "secondary"
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Permission Logs</CardTitle>
                <CardDescription>
                    Audit trail showing who granted, modified, or revoked access to shared resources
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs">Resource</Label>
                        <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All resources" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All my resources</SelectItem>
                                {ownedResources.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                        {r.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">From Date</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-[150px]"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">To Date</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-[150px]"
                        />
                    </div>

                    <Button variant="outline" size="sm" onClick={() => {
                        setSelectedResourceId("all")
                        setStartDate("")
                        setEndDate("")
                    }}>
                        Clear Filters
                    </Button>
                </div>

                {/* Logs Table */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skel-${i}`}>
                                    <TableCell colSpan={6}>
                                        <Skeleton className="h-6 w-full" />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}

                        {!isLoading && logs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                                    No permission logs found. Permission changes will appear here when you grant or revoke access to your resources.
                                </TableCell>
                            </TableRow>
                        )}

                        {!isLoading && logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="text-sm whitespace-nowrap">
                                    {formatDate(log.created_at)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getActionBadgeVariant(log.action_type)}>
                                        {log.action_type.replace(/_/g, " ").toLowerCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                    {log.resource_name || "—"}
                                </TableCell>
                                <TableCell className="text-sm max-w-[200px] truncate" title={log.description}>
                                    {log.description}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {log.actor?.full_name || "System"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={log.status === "success" ? "outline" : "destructive"}>
                                        {log.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
