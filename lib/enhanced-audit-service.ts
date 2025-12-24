import { getSupabaseServerClient } from "./supabase-server"
import crypto from "crypto"

// ============================================================
// CENTRALIZED LOGGING SERVICE
// ============================================================

export interface AuditLogEntry {
  user_id?: string | null
  action_type: string
  resource_type?: string
  resource_id?: string
  resource_name?: string
  description: string
  old_value?: string
  new_value?: string
  ip_address?: string
  user_agent?: string
  status: "success" | "denied" | "error"
}

// Encryption helper (use proper encryption in production)
function encryptSensitiveData(data: string, encryptionKey?: string): string {
  // Placeholder - implement with crypto library in production
  return Buffer.from(data).toString("base64")
}

function decryptSensitiveData(encryptedData: string | null | undefined): string {
  // Handle null/undefined safely
  if (!encryptedData) {
    return ""
  }
  try {
    return Buffer.from(encryptedData, "base64").toString()
  } catch {
    // If decryption fails, return original data (might not be encrypted)
    return encryptedData
  }
}

// Create audit log with encryption
export async function logActivity(entry: AuditLogEntry, encryptSensitive = true) {
  const supabase = await getSupabaseServerClient()

  const encryptedEntry = {
    ...entry,
    description: encryptSensitive ? encryptSensitiveData(entry.description) : entry.description,
    old_value: entry.old_value && encryptSensitive ? encryptSensitiveData(entry.old_value) : entry.old_value,
    new_value: entry.new_value && encryptSensitive ? encryptSensitiveData(entry.new_value) : entry.new_value,
    is_encrypted: encryptSensitive,
  }

  const { data, error } = await supabase.from("audit_logs").insert([encryptedEntry]).select()

  if (error) throw error
  return data[0]
}

// Retrieve and decrypt audit logs
export async function getAuditLogs(filters?: {
  userId?: string
  actionType?: string
  resourceType?: string
  status?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  const supabase = await getSupabaseServerClient()

  let query = supabase.from("audit_logs").select("*", { count: "exact" })

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId)
  }

  if (filters?.actionType) {
    query = query.eq("action_type", filters.actionType)
  }

  if (filters?.resourceType) {
    query = query.eq("resource_type", filters.resourceType)
  }

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate.toISOString())
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate.toISOString())
  }

  query = query.order("created_at", { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error, count } = await query

  if (error) throw error

  // Decrypt sensitive fields - safely handle null values
  const decryptedLogs = data?.map((log) => ({
    ...log,
    description: log.is_encrypted && log.description ? decryptSensitiveData(log.description) : (log.description || ""),
    old_value: log.old_value && log.is_encrypted ? decryptSensitiveData(log.old_value) : log.old_value,
    new_value: log.new_value && log.is_encrypted ? decryptSensitiveData(log.new_value) : log.new_value,
  }))

  return { logs: decryptedLogs || [], total: count || 0 }
}

// Get user activity timeline
export async function getUserActivityTimeline(userId: string, days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return getAuditLogs({
    userId,
    startDate,
    limit: 100,
  })
}

// Export audit logs (for compliance)
export async function exportAuditLogs(format: "csv" | "json" = "csv", filters?: Parameters<typeof getAuditLogs>[0]) {
  const { logs } = await getAuditLogs(filters)

  if (format === "json") {
    return JSON.stringify(logs, null, 2)
  }

  // CSV format
  const headers = ["Timestamp", "User", "Action", "Resource", "Status", "IP Address"]
  const rows = logs.map((log) => [
    log.created_at,
    log.user_id || "System",
    log.action_type,
    log.resource_name || log.resource_type || "-",
    log.status,
    log.ip_address || "-",
  ])

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

  return csv
}

// ============================================================
// SYSTEM EVENTS LOGGING
// ============================================================

export async function logSystemEvent(
  eventType: string,
  severity: "info" | "warning" | "critical",
  description: string,
  eventData?: unknown,
) {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from("system_events")
    .insert([
      {
        event_type: eventType,
        severity,
        description,
        event_data: eventData ? JSON.stringify(eventData) : null,
      },
    ])
    .select()

  if (error) throw error

  // If critical, potentially trigger alert
  if (severity === "critical") {
    await triggerSecurityAlert(eventType, description, eventData)
  }

  return data[0]
}

// Retrieve system events
export async function getSystemEvents(filters?: {
  eventType?: string
  severity?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  const supabase = await getSupabaseServerClient()

  let query = supabase.from("system_events").select("*")

  if (filters?.eventType) {
    query = query.eq("event_type", filters.eventType)
  }

  if (filters?.severity) {
    query = query.eq("severity", filters.severity)
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate.toISOString())
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate.toISOString())
  }

  query = query.order("created_at", { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// ============================================================
// ALERTING MECHANISMS
// ============================================================

interface SecurityAlert {
  id: string
  type: string
  severity: "high" | "critical"
  description: string
  timestamp: string
}

const activeAlerts: SecurityAlert[] = []

export async function triggerSecurityAlert(eventType: string, description: string, eventData?: unknown) {
  const alert: SecurityAlert = {
    id: crypto.randomUUID(),
    type: eventType,
    severity: "critical",
    description,
    timestamp: new Date().toISOString(),
  }

  activeAlerts.push(alert)

  // In production, integrate with alerting service (email, Slack, PagerDuty, etc.)
  console.log("🚨 SECURITY ALERT:", alert)

  // Send alert notification (mock)
  // await sendSecurityAlert(alert)

  // Clean up old alerts
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const index = activeAlerts.findIndex((a) => new Date(a.timestamp) < oneHourAgo)
  if (index > -1) {
    activeAlerts.splice(0, index)
  }
}

export function getActiveAlerts(): SecurityAlert[] {
  return activeAlerts
}

// ============================================================
// ANOMALY DETECTION
// ============================================================

export async function detectAnomalies(userId: string, timeWindowDays = 7) {
  const { logs } = await getAuditLogs({
    userId,
    startDate: new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000),
  })

  const anomalies = []

  // Check for unusual login patterns
  const loginLogs = logs.filter((log) => log.action_type === "login_successful")
  const uniqueIPs = new Set(loginLogs.map((log) => log.ip_address))

  if (uniqueIPs.size > 5) {
    anomalies.push({
      type: "unusual_login_locations",
      severity: "warning",
      description: `User logged in from ${uniqueIPs.size} different IP addresses in ${timeWindowDays} days`,
    })
  }

  // Check for permission changes
  const permissionChanges = logs.filter(
    (log) => log.action_type.includes("permission") || log.action_type.includes("role"),
  )

  if (permissionChanges.length > 10) {
    anomalies.push({
      type: "multiple_permission_changes",
      severity: "warning",
      description: `${permissionChanges.length} permission changes detected in ${timeWindowDays} days`,
    })
  }

  // Check for failed access attempts
  const failedAttempts = logs.filter((log) => log.status === "denied")

  if (failedAttempts.length > 20) {
    anomalies.push({
      type: "excessive_access_denials",
      severity: "critical",
      description: `${failedAttempts.length} access denials detected in ${timeWindowDays} days`,
    })
  }

  return anomalies
}

// ============================================================
// COMPLIANCE REPORTING
// ============================================================

export async function generateComplianceReport(startDate: Date, endDate: Date) {
  const { logs } = await getAuditLogs({ startDate, endDate, limit: 10000 })
  const systemEvents = await getSystemEvents({ startDate, endDate, limit: 1000 })

  const report = {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    summary: {
      totalAuditLogs: logs.length,
      totalSystemEvents: systemEvents.length,
      criticalEvents: systemEvents.filter((e) => e.severity === "critical").length,
      failedAccessAttempts: logs.filter((l) => l.status === "denied").length,
    },
    byActionType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    topUsers: [] as Array<{ userId: string; activities: number }>,
    alerts: getActiveAlerts(),
  }

  // Aggregate by action type
  logs.forEach((log) => {
    report.byActionType[log.action_type] = (report.byActionType[log.action_type] || 0) + 1
    report.byStatus[log.status] = (report.byStatus[log.status] || 0) + 1
  })

  // Find top active users
  const userActivityMap = new Map<string, number>()
  logs.forEach((log) => {
    if (log.user_id) {
      userActivityMap.set(log.user_id, (userActivityMap.get(log.user_id) || 0) + 1)
    }
  })

  report.topUsers = Array.from(userActivityMap.entries())
    .map(([userId, activities]) => ({ userId, activities }))
    .sort((a, b) => b.activities - a.activities)
    .slice(0, 10)

  return report
}
