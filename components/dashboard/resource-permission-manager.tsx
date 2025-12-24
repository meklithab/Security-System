"use client"

import { useEffect, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface User {
    id: string
    email: string
    full_name: string
}

interface Role {
    id: string
    name: string
}

interface Permission {
    id: string
    granted_to_user_id: string | null
    granted_to_role_id: string | null
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
    can_share: boolean
    granted_at: string
    granted_by: string
    reason: string | null
    granted_to_user: User | null
    granted_to_role: Role | null
    granted_by_user: User | null
}

interface PermissionLog {
    id: string
    action_type: string
    description: string
    created_at: string
    actor: User | null
}

interface ResourcePermissionManagerProps {
    resourceId: string
    resourceName: string
    isOpen: boolean
    onClose: () => void
}

export default function ResourcePermissionManager({
    resourceId,
    resourceName,
    isOpen,
    onClose
}: ResourcePermissionManagerProps) {
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [logs, setLogs] = useState<PermissionLog[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state for granting permissions
    const [grantType, setGrantType] = useState<"user" | "role">("user")
    const [selectedUserId, setSelectedUserId] = useState<string>("")
    const [selectedRoleId, setSelectedRoleId] = useState<string>("")
    const [canView, setCanView] = useState(true)
    const [canEdit, setCanEdit] = useState(false)
    const [canDelete, setCanDelete] = useState(false)
    const [canShare, setCanShare] = useState(false)
    const [reason, setReason] = useState("")

    const loadData = useCallback(async () => {
        if (!resourceId || !isOpen) return

        setIsLoading(true)
        setError(null)

        try {
            // Load permissions for this resource
            const permRes = await fetch(`/api/resources/${resourceId}/permissions`)
            const permData = await permRes.json()
            if (!permRes.ok) throw new Error(permData.error || "Failed to load permissions")
            setPermissions(permData.permissions || [])

            // Load users and roles for granting
            const optionsRes = await fetch("/api/resources/permissions")
            const optionsData = await optionsRes.json()
            if (!optionsRes.ok) throw new Error(optionsData.error || "Failed to load options")
            setUsers(optionsData.users || [])
            setRoles(optionsData.roles || [])

            // Load permission logs
            const logsRes = await fetch(`/api/audit/permissions?resourceId=${resourceId}&limit=20`)
            const logsData = await logsRes.json()
            if (logsRes.ok) {
                setLogs(logsData.logs || [])
            }
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsLoading(false)
        }
    }, [resourceId, isOpen])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleGrantPermission = async () => {
        if (grantType === "user" && !selectedUserId) {
            setError("Please select a user")
            return
        }
        if (grantType === "role" && !selectedRoleId) {
            setError("Please select a role")
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const res = await fetch("/api/resources/permissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resourceId,
                    grantedToUserId: grantType === "user" ? selectedUserId : null,
                    grantedToRoleId: grantType === "role" ? selectedRoleId : null,
                    canView,
                    canEdit,
                    canDelete,
                    canShare,
                    reason: reason.trim() || null
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to grant permission")

            // Reset form
            setSelectedUserId("")
            setSelectedRoleId("")
            setCanView(true)
            setCanEdit(false)
            setCanDelete(false)
            setCanShare(false)
            setReason("")

            // Reload data
            await loadData()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRevokePermission = async (permissionId: string) => {
        setIsSubmitting(true)
        setError(null)

        try {
            const res = await fetch(
                `/api/resources/permissions?resourceId=${resourceId}&permissionId=${permissionId}`,
                { method: "DELETE" }
            )

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to revoke permission")
            }

            await loadData()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Permissions</DialogTitle>
                    <DialogDescription>
                        Control who can access "{resourceName}"
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <Tabs defaultValue="permissions" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="permissions">Current Permissions</TabsTrigger>
                        <TabsTrigger value="grant">Grant Access</TabsTrigger>
                        <TabsTrigger value="logs">Permission Logs</TabsTrigger>
                    </TabsList>

                    {/* Current Permissions Tab */}
                    <TabsContent value="permissions">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Active Permissions</CardTitle>
                                <CardDescription>Users and roles with access to this resource</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-12 w-full" />
                                        ))}
                                    </div>
                                ) : permissions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No permissions granted yet. Use the "Grant Access" tab to share this resource.
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Granted To</TableHead>
                                                <TableHead>Permissions</TableHead>
                                                <TableHead>Granted By</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {permissions.map((perm) => (
                                                <TableRow key={perm.id}>
                                                    <TableCell>
                                                        {perm.granted_to_user ? (
                                                            <div>
                                                                <span className="font-medium">{perm.granted_to_user.full_name}</span>
                                                                <span className="block text-xs text-muted-foreground">{perm.granted_to_user.email}</span>
                                                            </div>
                                                        ) : perm.granted_to_role ? (
                                                            <Badge variant="secondary">{perm.granted_to_role.name}</Badge>
                                                        ) : (
                                                            "Unknown"
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {perm.can_view && <Badge variant="outline" className="text-xs">View</Badge>}
                                                            {perm.can_edit && <Badge variant="outline" className="text-xs">Edit</Badge>}
                                                            {perm.can_delete && <Badge variant="outline" className="text-xs">Delete</Badge>}
                                                            {perm.can_share && <Badge variant="outline" className="text-xs">Share</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">
                                                            {perm.granted_by_user?.full_name || "Unknown"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {formatDate(perm.granted_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="destructive" size="sm" disabled={isSubmitting}>
                                                                    Revoke
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Revoke Permission</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to revoke access for {perm.granted_to_user?.full_name || perm.granted_to_role?.name}?
                                                                        This action will be logged.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleRevokePermission(perm.id)}>
                                                                        Revoke Access
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Grant Access Tab */}
                    <TabsContent value="grant">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Grant New Permission</CardTitle>
                                <CardDescription>Share this resource with a user or role</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Grant Type Selection */}
                                <div className="space-y-2">
                                    <Label>Grant access to</Label>
                                    <Select value={grantType} onValueChange={(v) => setGrantType(v as "user" | "role")}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">Specific User</SelectItem>
                                            <SelectItem value="role">Role (all users with this role)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* User/Role Selection */}
                                {grantType === "user" ? (
                                    <div className="space-y-2">
                                        <Label>Select User</Label>
                                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose a user..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.full_name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Select Role</Label>
                                        <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose a role..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roles.map((role) => (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Permission Checkboxes */}
                                <div className="space-y-2">
                                    <Label>Permissions</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="canView"
                                                checked={canView}
                                                onCheckedChange={(c) => setCanView(c === true)}
                                            />
                                            <label htmlFor="canView" className="text-sm">Can View</label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="canEdit"
                                                checked={canEdit}
                                                onCheckedChange={(c) => setCanEdit(c === true)}
                                            />
                                            <label htmlFor="canEdit" className="text-sm">Can Edit</label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="canDelete"
                                                checked={canDelete}
                                                onCheckedChange={(c) => setCanDelete(c === true)}
                                            />
                                            <label htmlFor="canDelete" className="text-sm">Can Delete</label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="canShare"
                                                checked={canShare}
                                                onCheckedChange={(c) => setCanShare(c === true)}
                                            />
                                            <label htmlFor="canShare" className="text-sm">Can Share</label>
                                        </div>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="space-y-2">
                                    <Label htmlFor="reason">Reason (optional)</Label>
                                    <Input
                                        id="reason"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Why are you granting this access?"
                                    />
                                </div>

                                <Button
                                    onClick={handleGrantPermission}
                                    disabled={isSubmitting}
                                    className="w-full"
                                >
                                    {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                                    Grant Permission
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Permission Logs Tab */}
                    <TabsContent value="logs">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Permission History</CardTitle>
                                <CardDescription>Audit trail of permission changes for this resource</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-10 w-full" />
                                        ))}
                                    </div>
                                ) : logs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No permission changes recorded yet.
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Timestamp</TableHead>
                                                <TableHead>Action</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Actor</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-sm">
                                                        {formatDate(log.created_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            log.action_type.includes("revoke") || log.action_type.includes("DELETE")
                                                                ? "destructive"
                                                                : "default"
                                                        }>
                                                            {log.action_type.replace(/_/g, " ")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm max-w-xs truncate">
                                                        {log.description}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {log.actor?.full_name || "System"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
