"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const mockResources = [
  {
    name: "Employee Profile",
    classification: "Internal",
    macLevel: "Level 1 – Internal",
    dacOwner: "You (resource owner)",
    rbacRole: "Employee",
    abac: "Department = Software Engineering",
    rubac: "Allowed during working hours",
  },
  {
    name: "Performance Report 2024",
    classification: "Confidential",
    macLevel: "Level 2 – Confidential",
    dacOwner: "Department Manager",
    rbacRole: "Manager",
    abac: "Role = Manager AND Department = Software Engineering",
    rubac: "Approval required after 5:00 PM",
  },
  {
    name: "Salary Data",
    classification: "Highly Confidential",
    macLevel: "Level 3 – Executive Only",
    dacOwner: "Payroll / HR",
    rbacRole: "HR Manager",
    abac: "Department = Payroll, Role = HR Manager",
    rubac: "Access denied for you",
  },
]

export default function AccessControl() {
  return (
    <div className="space-y-6">
      {/* Intro */}
      <Card>
        <CardHeader>
          <CardTitle>Access Control Overview</CardTitle>
          <CardDescription>
            This section shows how different access control models (MAC, DAC, RBAC, RuBAC, ABAC) are applied to
            your account and the resources you can (or cannot) access.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold mb-1">Mandatory Access Control (MAC)</p>
            <p className="text-xs text-muted-foreground">
              Data is classified as Public, Internal, Confidential, and Highly Confidential. System-defined
              clearance levels decide if you can see a resource; only administrators can change these labels.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1">Discretionary Access Control (DAC)</p>
            <p className="text-xs text-muted-foreground">
              Resource owners (such as your department head) decide who can view, edit, delete, or share specific
              files. Every permission change is logged in the audit trail.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1">Role-Based Access Control (RBAC)</p>
            <p className="text-xs text-muted-foreground">
              Roles like Employee, Manager, and HR Manager have predefined permissions. Changing roles requires
              approval and is fully audited.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1">Rule-Based Access Control (RuBAC)</p>
            <p className="text-xs text-muted-foreground">
              Time and location rules (for example, working hours only or campus network only) can additionally
              allow or deny access, even if you have other permissions.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1">Attribute-Based Access Control (ABAC)</p>
            <p className="text-xs text-muted-foreground">
              Fine-grained policies also look at attributes like your department, role, and employment status –
              e.g. “Manager in Finance Department can approve reports only during working hours.”
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1">Audit & Logs</p>
            <p className="text-xs text-muted-foreground">
              Every successful or denied access attempt is logged with username, timestamp, IP address, and
              action, and stored securely with encryption.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Example resources showing MAC/DAC/RBAC/RuBAC/ABAC decisions for this employee */}
      <Card>
        <CardHeader>
          <CardTitle>Your Resource Access Matrix</CardTitle>
          <CardDescription>
            Example view of how your current role and attributes affect access to common resources in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Classification (MAC)</TableHead>
                <TableHead>Owner / DAC</TableHead>
                <TableHead>Role (RBAC)</TableHead>
                <TableHead>Attributes (ABAC)</TableHead>
                <TableHead>Rules (RuBAC)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockResources.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <p className="text-xs font-semibold">{r.classification}</p>
                    <p className="text-[10px] text-muted-foreground">{r.macLevel}</p>
                  </TableCell>
                  <TableCell className="text-xs">{r.dacOwner}</TableCell>
                  <TableCell className="text-xs">{r.rbacRole}</TableCell>
                  <TableCell className="text-xs">{r.abac}</TableCell>
                  <TableCell className="text-xs">{r.rubac}</TableCell>
                  <TableCell>
                    {r.name === "Salary Data" ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Access Denied
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px]">
                        Access Allowed
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
