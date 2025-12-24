"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

interface Role {
    id: string
    name: string
    description: string
}

interface UserRole {
    roleName: string
}

interface RoleRequest {
    id: string
    status: string
    reason: string
    created_at: string
    to_role: { name: string } | null
}

export default function UserRoleRequest() {
    const [roles, setRoles] = useState<Role[]>([])
    const [userRoles, setUserRoles] = useState<UserRole[]>([])
    const [requests, setRequests] = useState<RoleRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Request form state
    const [requestRoleId, setRequestRoleId] = useState("")
    const [requestReason, setRequestReason] = useState("")
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Load roles for selection
            const rolesRes = await fetch("/api/roles")
            const rolesData = await rolesRes.json()
            if (rolesRes.ok) {
                setRoles(rolesData.roles || [])
            }

            // Load current user's roles
            const usersRes = await fetch("/api/users/roles")
            const usersData = await usersRes.json()
            if (usersRes.ok) {
                // Find current user's entry (API returns all if current user is admin, but for employee it returns only them)
                const currentUser = usersData.users?.[0]
                if (currentUser) {
                    setUserRoles(currentUser.roles || [])
                }
            }

            // Load role requests for this user
            const requestsRes = await fetch("/api/role-requests")
            const requestsData = await requestsRes.json()
            if (requestsRes.ok) {
                setRequests(requestsData.requests || [])
            }
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleSubmitRequest = async () => {
        if (!requestRoleId || !requestReason.trim()) {
            setError("Please select a role and provide a reason")
            return
        }

        setIsSubmittingRequest(true)
        setError(null)

        try {
            const res = await fetch("/api/role-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    toRoleId: requestRoleId,
                    reason: requestReason.trim()
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to submit request")

            setRequestRoleId("")
            setRequestReason("")
            await loadData()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsSubmittingRequest(false)
        }
    }

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString()

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Current Role</CardTitle>
                    <CardDescription>Your current access level in the system</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : userRoles.length > 0 ? (
                            userRoles.map((role, idx) => (
                                <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                                    {role.roleName}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted-foreground">No roles assigned</span>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Request Role Change</CardTitle>
                    <CardDescription>Submit a request to change your current role</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Requested Role</Label>
                        <Select value={requestRoleId} onValueChange={setRequestRoleId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role..." />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map(role => (
                                    <SelectItem key={role.id} value={role.id}>
                                        {role.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason for Request</Label>
                        <Textarea
                            value={requestReason}
                            onChange={e => setRequestReason(e.target.value)}
                            placeholder="Explain why you need this role change..."
                            rows={4}
                        />
                    </div>

                    <Button
                        onClick={handleSubmitRequest}
                        disabled={isSubmittingRequest || !requestRoleId || !requestReason.trim()}
                        className="w-full"
                    >
                        {isSubmittingRequest && <Spinner className="mr-2 h-4 w-4" />}
                        Submit Request
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Request History</CardTitle>
                    <CardDescription>Status of your previous role change requests</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Requested Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium">{req.to_role?.name || "—"}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                req.status === "approved" ? "default" :
                                                    req.status === "rejected" ? "destructive" :
                                                        "secondary"
                                            }>
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{formatDate(req.created_at)}</TableCell>
                                    </TableRow>
                                ))}
                                {requests.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                            No requests found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
