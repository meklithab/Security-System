"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

interface Document {
  id: string
  name: string
  type: string
  accessLevel: "Confidential" | "Internal" | "Public"
  lastModified: string
}

const mockDocuments: Document[] = [
  { id: "1", name: "Performance_Report_2024.pdf", type: "PDF", accessLevel: "Confidential", lastModified: "2024-12-01" },
  { id: "2", name: "Holiday_Schedule.xlsx", type: "Excel", accessLevel: "Internal", lastModified: "2024-11-28" },
  { id: "3", name: "Employee_Handbook.pdf", type: "PDF", accessLevel: "Public", lastModified: "2024-11-15" },
  { id: "4", name: "Salary_Data_2024.xlsx", type: "Excel", accessLevel: "Confidential", lastModified: "2024-12-01" },
]

export default function Documents() {
  const [filterLevel, setFilterLevel] = useState("all")

  const filteredDocs =
    filterLevel === "all" ? mockDocuments : mockDocuments.filter((doc) => doc.accessLevel === filterLevel)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>Access your department and role-based resources</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter */}
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by access level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Confidential">Confidential</SelectItem>
            <SelectItem value="Internal">Internal</SelectItem>
            <SelectItem value="Public">Public</SelectItem>
          </SelectContent>
        </Select>

        {/* Document Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Access Level</TableHead>
              <TableHead>Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.name}</TableCell>
                <TableCell>{doc.type}</TableCell>
                <TableCell>
                  <Badge variant={doc.accessLevel === "Confidential" ? "destructive" : doc.accessLevel === "Internal" ? "secondary" : "default"}>
                    {doc.accessLevel}
                  </Badge>
                </TableCell>
                <TableCell>{doc.lastModified}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
