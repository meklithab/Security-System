"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

type AccessLevel = "Confidential" | "Internal" | "Public"

interface DashboardDocument {
  id: string
  name: string
  type: string
  classification: AccessLevel
  createdAt: string
  ownerName: string
  ownerEmail: string
  canEdit: boolean
  canDelete: boolean
  canChangeClassification: boolean
}

interface Classification {
  id: string
  name: AccessLevel
  level: number
}

interface DashboardResponse {
  role: string
  documents: DashboardDocument[]
  classifications: Classification[]
}

export default function Documents() {
  const [filterLevel, setFilterLevel] = useState<"all" | AccessLevel>("all")
  const [documents, setDocuments] = useState<DashboardDocument[]>([])
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [role, setRole] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newDocName, setNewDocName] = useState("")
  const [newDocType, setNewDocType] = useState("PDF")
  const [newDocDescription, setNewDocDescription] = useState("")
  const [newDocClassificationId, setNewDocClassificationId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const isAdmin = role === "System Admin"

  // Load documents & classifications
  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch("/api/resources/dashboard", { cache: "no-store", signal: controller.signal })
        const json = (await res.json().catch(() => null)) as DashboardResponse | { error?: string } | null

        if (!res.ok || !json || "error" in json) {
          throw new Error((json as { error?: string } | null)?.error || "Failed to load documents")
        }

        const payload = json as DashboardResponse
        setRole(payload.role)
        setDocuments(payload.documents || [])
        setClassifications(payload.classifications || [])

      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message)
        }
      } finally {
        setIsLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [])

  // Set default classification based on role
  useEffect(() => {
    if (classifications.length === 0) return

    if (role === "Employee") {
      const publicClass = classifications.find((c) => c.name === "Public")?.id
      setNewDocClassificationId(publicClass || null)
    } else if (role === "Manager") {
      const defaultClass = classifications.find((c) => c.name === "Public")?.id
      setNewDocClassificationId(defaultClass || null)
    } else if (isAdmin) {
      setNewDocClassificationId(classifications[0]?.id || null)
    }
  }, [role, classifications, isAdmin])

  const filteredDocs = useMemo(
    () =>
      filterLevel === "all"
        ? documents
        : documents.filter((doc) => doc.classification === filterLevel),
    [documents, filterLevel],
  )

  const handleUpload = async () => {
    if (!newDocName.trim()) return

    try {
      setIsUploading(true)
      setError(null)

      const body: any = {
        name: newDocName.trim(),
        resource_type: newDocType,
        description: newDocDescription.trim() || null,
      }

      // Enforce role rules for classification
      if (role === "Employee") {
        const publicClass = classifications.find((c) => c.name === "Public")?.id
        body.classification_id = publicClass
      } else if (role === "Manager") {
        body.classification_id = newDocClassificationId
      } else if (isAdmin) {
        body.classification_id = newDocClassificationId
      }

      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || "Failed to upload document")
      }

      // Refresh list
      setNewDocName("")
      setNewDocType("PDF")
      setNewDocDescription("")

      const reload = await fetch("/api/resources/dashboard", { cache: "no-store" })
      const reloadJson = (await reload.json().catch(() => null)) as DashboardResponse | { error?: string } | null
      if (!reload.ok || !reloadJson || "error" in reloadJson) {
        throw new Error((reloadJson as { error?: string } | null)?.error || "Failed to refresh documents")
      }
      const payload = reloadJson as DashboardResponse
      setRole(payload.role)
      setDocuments(payload.documents || [])
      setClassifications(payload.classifications || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  const classificationOptions: Array<"all" | AccessLevel> = ["all", "Public", "Internal", "Confidential"]

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return
    try {
      // Unwrap promise if needed (for Next.js [id] route)
      const id = await docId
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete document")
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          Access resources based on your role and data classification
          {role && <span className="ml-1 font-medium">({role})</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Upload section */}
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Upload document</p>
          <p className="text-xs text-muted-foreground">
            Employees: public only. Managers: internal or below. System Admin: can choose classification.
          </p>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              placeholder="Document name"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              className="md:w-1/3"
            />
            <Select value={newDocType} onValueChange={setNewDocType}>
              <SelectTrigger className="md:w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="Word">Word</SelectItem>
                <SelectItem value="Excel">Excel</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Classification dropdown */}
            {role !== "Employee" && (
              <Select
                value={newDocClassificationId || undefined}
                onValueChange={(v) => setNewDocClassificationId(v)}
              >
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent>
                  {classifications
                    .filter((c) => {
                      if (role === "Manager") return c.name === "Public" || c.name === "Internal"
                      if (isAdmin) return true
                      return false
                    })
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            <Button onClick={handleUpload} disabled={isUploading || !newDocName.trim()}>
              {isUploading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Upload
            </Button>
          </div>
        </div>

        {/* Filter */}
        <Select value={filterLevel} onValueChange={(v: "all" | AccessLevel) => setFilterLevel(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by classification" />
          </SelectTrigger>
          <SelectContent>
            {classificationOptions.map((lvl) => (
              <SelectItem key={lvl} value={lvl}>
                {lvl === "all" ? "All" : lvl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Document Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Created</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`doc-skel-${i}`}>
                  <TableCell colSpan={isAdmin ? 6 : 5}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && filteredDocs.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-sm text-muted-foreground">
                  No documents available for your role and filters.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              filteredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.name}</TableCell>
                  <TableCell>{doc.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        doc.classification === "Confidential"
                          ? "destructive"
                          : doc.classification === "Internal"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {doc.classification}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{doc.ownerName || "—"}</span>
                    {doc.ownerEmail && (
                      <span className="block text-xs text-muted-foreground">{doc.ownerEmail}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
