"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
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
}

interface Role {
    id: string
    name: string
    description: string
    isSystemRole: boolean
    permissions: Permission[]
}

interface User {
    id: string
    email: string
    fullName: string
    department: string
    roles: { assignmentId: string; roleId: string; roleName: string }[]
}

interface RoleRequest {
    id: string
    status: string
    reason: string
    review_notes: string | null
    created_at: string
    reviewed_at: string | null
    target_user: { full_name: string; email: string } | null
    from_role: { name: string } | null
    to_role: { name: string } | null
    reviewer: { full_name: string } | null
}

export default function AdminRoleManagement() {
    const [roles, setRoles] = useState<Role[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [requests, setRequests] = useState<RoleRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
            const rolesRes = await fetch("/api/roles")
            const rolesData = await rolesRes.json()
            if (rolesRes.ok) setRoles(rolesData.roles || [])

            const usersRes = await fetch("/api/users/roles")
            const usersData = await usersRes.json()
            if (usersRes.ok) setUsers(usersData.users || [])

            const requestsRes = await fetch("/api/role-requests")
            const requestsData = await requestsRes.json()
            if (requestsRes.ok) setRequests(requestsData.requests || [])
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleAssignRole = async () => {
        if (!assignUserId || !assignRoleId) return
        setIsAssigning(true)
        try {
            const res = await fetch("/api/users/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: assignUserId, roleId: assignRoleId })
            })
            if (!res.ok) throw new Error("Failed to assign role")
            setAssignDialogOpen(false)
            await loadData()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsAssigning(false)
        }
    }

    const handleRevokeRole = async (userId: string, roleId: string) => {
        try {
            const res = await fetch(`/api/users/roles?userId=${userId}&roleId=${roleId}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to revoke role")
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
        try {
            const res = await fetch(`/api/role-requests/${reviewRequest.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, reviewNotes: reviewNotes.trim() || undefined })
            })
            if (!res.ok) throw new Error("Failed to process request")
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
        <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="requests">
                    Requests
                    {pendingRequests.length > 0 && <Badge className="ml-2" variant="destructive">{pendingRequests.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="users">People</TabsTrigger>
                <TabsTrigger value="roles">Roles</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Role Change Requests</CardTitle>
                        <CardDescription>Review and manage dynamic role change requests</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div> :
                            pendingRequests.length === 0 ? <p className="text-center text-muted-foreground py-8">No pending requests</p> : (
                                <div className="space-y-4">
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="rounded-lg border p-4 flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{req.target_user?.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{req.target_user?.email}</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <Badge variant="outline">{req.from_role?.name || "None"}</Badge>
                                                    <span>→</span>
                                                    <Badge>{req.to_role?.name}</Badge>
                                                </div>
                                                <p className="mt-2 text-sm italic">"{req.reason}"</p>
                                            </div>
                                            <Button size="sm" onClick={() => setReviewRequest(req)}>Review</Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                        {/* Recent History */}
                        <div className="mt-8">
                            <h4 className="text-sm font-semibold mb-4">Recent Actions</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Change</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.filter(r => r.status !== 'pending').slice(0, 5).map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell>{req.target_user?.full_name}</TableCell>
                                            <TableCell>{req.from_role?.name || "—"} → {req.to_role?.name}</TableCell>
                                            <TableCell><Badge variant={req.status === 'approved' ? 'default' : 'destructive'}>{req.status}</Badge></TableCell>
                                            <TableCell className="text-xs">{req.reviewed_at ? formatDate(req.reviewed_at) : '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>User Role Assignments</CardTitle>
                            <CardDescription>Grant or revoke roles from users</CardDescription>
                        </div>
                        <Button onClick={() => setAssignDialogOpen(true)}>Assign Role</Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Roles</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="font-medium">{user.fullName}</div>
                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                        </TableCell>
                                        <TableCell>{user.department || "—"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.map(r => <Badge key={r.assignmentId} variant="secondary">{r.roleName}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.roles.map(role => (
                                                <Button key={role.assignmentId} variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => handleRevokeRole(user.id, role.roleId)}>
                                                    Revoke {role.roleName}
                                                </Button>
                                            ))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="roles" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>System Roles</CardTitle>
                        <CardDescription>Defined roles and their associated permissions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {roles.map(role => (
                                <div key={role.id} className="p-4 border rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold">{role.name}</h4>
                                        {role.isSystemRole && <Badge variant="outline">System</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions.map(p => <Badge key={p.id} variant="secondary" className="text-[10px]">{p.name}</Badge>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Dialogs... (Review and Assign) */}
            <Dialog open={!!reviewRequest} onOpenChange={(open) => !open && setReviewRequest(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Review Role Request</DialogTitle></DialogHeader>
                    {reviewRequest && (
                        <div className="space-y-4 py-4">
                            <div><Label className="text-xs">User</Label><p>{reviewRequest.target_user?.full_name}</p></div>
                            <div><Label className="text-xs">Reason</Label><p className="text-sm italic">"{reviewRequest.reason}"</p></div>
                            <div className="space-y-2">
                                <Label>Notes (Optional)</Label>
                                <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add review notes..." />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewRequest(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleReviewRequest("reject")}>Reject</Button>
                        <Button onClick={() => handleReviewRequest("approve")}>Approve</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Assign Role</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>User</Label>
                            <Select value={assignUserId} onValueChange={setAssignUserId}>
                                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                                <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssignRole} disabled={isAssigning}>Assign</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Tabs>
    )
}
