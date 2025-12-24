"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface Permission {
    id: string
    name: string
    description: string
    resource: string
    action: string
}

interface Role {
    id: string
    name: string
    description: string
    isSystemRole: boolean
    permissions: Permission[]
}

interface UserRole {
    assignmentId: string
    roleId: string
    roleName: string
    assignedAt: string
}

interface User {
    id: string
    email: string
    fullName: string
    department: string
    roles: UserRole[]
}

interface RoleRequest {
    id: string
    requested_by: string
    requested_for: string
    status: string
    reason: string
    review_notes: string | null
    created_at: string
    reviewed_at: string | null
    requester: { full_name: string; email: string } | null
    target_user: { full_name: string; email: string } | null
    from_role: { name: string } | null
    to_role: { name: string } | null
    reviewer: { full_name: string } | null
}

export default function RoleManagement() {
    const [roles, setRoles] = useState<Role[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [requests, setRequests] = useState<RoleRequest[]>([])
    const [isAdmin, setIsAdmin] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Request form state
    const [requestRoleId, setRequestRoleId] = useState("")
    const [requestReason, setRequestReason] = useState("")
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

    // Assign role dialog state
    const [assignDialogOpen, setAssignDialogOpen] = useState(false)
    const [assignUserId, setAssignUserId] = useState("")
    const [assignRoleId, setAssignRoleId] = useState("")
    const [isAssigning, setIsAssigning] = useState(false)

    // Review dialog state
    const [reviewRequest, setReviewRequest] = useState<RoleRequest | null>(null)
    const [reviewNotes, setReviewNotes] = useState("")
    const [isReviewing, setIsReviewing] = useState(false)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Load roles
            const rolesRes = await fetch("/api/roles")
            const rolesData = await rolesRes.json()
            if (rolesRes.ok) {
                setRoles(rolesData.roles || [])
            }

            // Load users with roles
            const usersRes = await fetch("/api/users/roles")
            const usersData = await usersRes.json()
            if (usersRes.ok) {
                setUsers(usersData.users || [])
                setIsAdmin(usersData.isAdmin || false)
            }

            // Load role requests
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

    const handleAssignRole = async () => {
        if (!assignUserId || !assignRoleId) return

        setIsAssigning(true)
        setError(null)

        try {
            const res = await fetch("/api/users/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: assignUserId,
                    roleId: assignRoleId
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to assign role")

            setAssignDialogOpen(false)
            setAssignUserId("")
            setAssignRoleId("")
            await loadData()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsAssigning(false)
        }
    }

    const handleRevokeRole = async (userId: string, roleId: string) => {
        try {
            const res = await fetch(`/api/users/roles?userId=${userId}&roleId=${roleId}`, {
                method: "DELETE"
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to revoke role")

            await loadData()
        } catch (err) {
            alert((err as Error).message)
        }
    }

    const handleReviewRequest = async (action: "approve" | "reject") => {
        if (!reviewRequest) return
        if (action === "reject" && !reviewNotes.trim()) {
            setError("Please provide a reason for rejection")
            return
        }

        setIsReviewing(true)
        setError(null)

        try {
            const res = await fetch(`/api/role-requests/${reviewRequest.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    reviewNotes: reviewNotes.trim() || undefined
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to process request")

            setReviewRequest(null)
            setReviewNotes("")
            await loadData()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsReviewing(false)
        }
    }

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString()

    const pendingRequests = requests.filter(r => r.status === "pending")

    return (
        <Card>
            <CardHeader>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>
                    Manage roles, permissions, and role change requests
                    {isAdmin && <Badge className="ml-2" variant="secondary">Admin</Badge>}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <Tabs defaultValue="roles" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                        <TabsTrigger value="users">User Roles</TabsTrigger>
                        <TabsTrigger value="request">Request Change</TabsTrigger>
                        <TabsTrigger value="review">
                            Review Requests
                            {pendingRequests.length > 0 && (
                                <Badge className="ml-2" variant="destructive">{pendingRequests.length}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* Roles Tab */}
                    <TabsContent value="roles">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">System Roles</CardTitle>
                                <CardDescription>Roles defined in the system with their permissions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {roles.map(role => (
                                            <div key={role.id} className="rounded-lg border p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-medium">{role.name}</h4>
                                                        {role.description && (
                                                            <p className="text-sm text-muted-foreground">{role.description}</p>
                                                        )}
                                                    </div>
                                                    {role.isSystemRole && (
                                                        <Badge variant="secondary">System Role</Badge>
                                                    )}
                                                </div>
                                                {role.permissions.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {role.permissions.map(perm => (
                                                            <Badge key={perm.id} variant="outline" className="text-xs">
                                                                {perm.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* User Roles Tab */}
                    <TabsContent value="users">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">User Role Assignments</CardTitle>
                                    <CardDescription>View and manage user roles</CardDescription>
                                </div>
                                {isAdmin && (
                                    <Button onClick={() => setAssignDialogOpen(true)}>
                                        Assign Role
                                    </Button>
                                )}
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
                                                <TableHead>User</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Roles</TableHead>
                                                {isAdmin && <TableHead>Actions</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users.map(user => (
                                                <TableRow key={user.id}>
                                                    <TableCell>
                                                        <div>
                                                            <span className="font-medium">{user.fullName}</span>
                                                            <span className="block text-xs text-muted-foreground">{user.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{user.department || "—"}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.roles.map(role => (
                                                                <Badge key={role.assignmentId} variant="secondary">
                                                                    {role.roleName}
                                                                </Badge>
                                                            ))}
                                                            {user.roles.length === 0 && (
                                                                <span className="text-sm text-muted-foreground">No roles</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    {isAdmin && (
                                                        <TableCell>
                                                            {user.roles.map(role => (
                                                                <AlertDialog key={role.assignmentId}>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="text-destructive">
                                                                            Revoke {role.roleName}
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Revoke Role</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Remove {role.roleName} from {user.fullName}?
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleRevokeRole(user.id, role.roleId)}>
                                                                                Revoke
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            ))}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Request Change Tab */}
                    <TabsContent value="request">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Request Role Change</CardTitle>
                                <CardDescription>Submit a request to change your role</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
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

                                {/* My Requests */}
                                <div className="mt-6">
                                    <h4 className="text-sm font-medium mb-2">My Requests</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Requested Role</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {requests.filter(r => r.requester?.email).slice(0, 10).map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell>{req.to_role?.name || "—"}</TableCell>
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
                                                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                        No requests yet
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Review Requests Tab */}
                    <TabsContent value="review">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Pending Requests</CardTitle>
                                <CardDescription>
                                    {isAdmin ? "Review and approve/reject role change requests" : "View pending requests"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                                    </div>
                                ) : pendingRequests.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No pending requests</p>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingRequests.map(req => (
                                            <div key={req.id} className="rounded-lg border p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">
                                                            {req.target_user?.full_name || "Unknown User"}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {req.target_user?.email}
                                                        </p>
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <Badge variant="outline">{req.from_role?.name || "No role"}</Badge>
                                                            <span>→</span>
                                                            <Badge>{req.to_role?.name}</Badge>
                                                        </div>
                                                        <p className="mt-2 text-sm">
                                                            <strong>Reason:</strong> {req.reason}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Requested: {formatDate(req.created_at)}
                                                        </p>
                                                    </div>
                                                    {isAdmin && (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => setReviewRequest(req)}
                                                            >
                                                                Review
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Past requests */}
                                {requests.filter(r => r.status !== "pending").length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium mb-2">Past Requests</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Role Change</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Reviewed By</TableHead>
                                                    <TableHead>Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {requests.filter(r => r.status !== "pending").slice(0, 10).map(req => (
                                                    <TableRow key={req.id}>
                                                        <TableCell>{req.target_user?.full_name || "—"}</TableCell>
                                                        <TableCell>
                                                            {req.from_role?.name || "None"} → {req.to_role?.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={req.status === "approved" ? "default" : "destructive"}>
                                                                {req.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{req.reviewer?.full_name || "—"}</TableCell>
                                                        <TableCell className="text-sm">
                                                            {req.reviewed_at ? formatDate(req.reviewed_at) : "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Assign Role Dialog */}
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Assign Role</DialogTitle>
                            <DialogDescription>Assign a role to a user</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>User</Label>
                                <Select value={assignUserId} onValueChange={setAssignUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(user => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.fullName} ({user.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role..." />
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
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAssignRole} disabled={isAssigning || !assignUserId || !assignRoleId}>
                                {isAssigning && <Spinner className="mr-2 h-4 w-4" />}
                                Assign
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Review Dialog */}
                <Dialog open={!!reviewRequest} onOpenChange={(open) => !open && setReviewRequest(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Review Role Request</DialogTitle>
                            <DialogDescription>
                                Approve or reject this role change request
                            </DialogDescription>
                        </DialogHeader>
                        {reviewRequest && (
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">User</Label>
                                    <p className="font-medium">{reviewRequest.target_user?.full_name}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Role Change</Label>
                                    <p>
                                        {reviewRequest.from_role?.name || "None"} → {reviewRequest.to_role?.name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Reason</Label>
                                    <p className="text-sm">{reviewRequest.reason}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Review Notes (required for rejection)</Label>
                                    <Textarea
                                        value={reviewNotes}
                                        onChange={e => setReviewNotes(e.target.value)}
                                        placeholder="Add notes..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setReviewRequest(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleReviewRequest("reject")}
                                disabled={isReviewing}
                            >
                                Reject
                            </Button>
                            <Button
                                onClick={() => handleReviewRequest("approve")}
                                disabled={isReviewing}
                            >
                                {isReviewing && <Spinner className="mr-2 h-4 w-4" />}
                                Approve
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}
