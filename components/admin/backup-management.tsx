"use client"

import { useState } from "react"
import { Database, Download, RotateCcw, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Backup {
  id: string
  name: string
  date: string
  size: string
  status: "completed" | "in_progress" | "failed"
  encrypted: boolean
  verified: boolean
}

const mockBackups: Backup[] = [
  {
    id: "1",
    name: "backup_2024-12-01T14-30-00",
    date: "2024-12-01 14:30",
    size: "256 MB",
    status: "completed",
    encrypted: true,
    verified: true,
  },
  {
    id: "2",
    name: "backup_2024-12-01T00-00-00",
    date: "2024-12-01 00:00",
    size: "248 MB",
    status: "completed",
    encrypted: true,
    verified: true,
  },
  {
    id: "3",
    name: "backup_2024-11-30T00-00-00",
    date: "2024-11-30 00:00",
    size: "242 MB",
    status: "completed",
    encrypted: true,
    verified: true,
  },
]

export default function BackupManagement() {
  const [backups, setBackups] = useState<Backup[]>(mockBackups)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateBackup = async () => {
    setIsCreating(true)
    try {
      // Call API to create backup
      setTimeout(() => {
        const newBackup: Backup = {
          id: Date.now().toString(),
          name: `backup_${new Date().toISOString().replace(/[:.]/g, "-")}`,
          date: new Date().toLocaleString(),
          size: "250 MB",
          status: "completed",
          encrypted: true,
          verified: true,
        }
        setBackups([newBackup, ...backups])
        setIsCreating(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to create backup:", error)
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Backup & Recovery</CardTitle>
          <CardDescription>Manage system backups and data protection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Daily automated backups are enabled. Last backup completed successfully on 2024-12-01 14:30.
            </AlertDescription>
          </Alert>

          <Button onClick={handleCreateBackup} disabled={isCreating}>
            {isCreating ? "Creating Backup..." : "Create Backup Now"}
          </Button>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Backup Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Encrypted</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell className="font-mono text-sm">{backup.name}</TableCell>
                  <TableCell className="text-sm">{backup.date}</TableCell>
                  <TableCell className="text-sm">{backup.size}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        backup.status === "completed"
                          ? "default"
                          : backup.status === "in_progress"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {backup.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {backup.encrypted ? (
                      <Badge variant="outline">AES-256</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {backup.verified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <span className="text-yellow-500">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Retention Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Policy</CardTitle>
          <CardDescription>Configure backup retention settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Frequency</p>
              <p className="text-lg font-bold mt-2">Daily</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Retention</p>
              <p className="text-lg font-bold mt-2">90 Days</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Encryption</p>
              <p className="text-lg font-bold mt-2">AES-256</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
