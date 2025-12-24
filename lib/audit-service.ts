import { getSupabaseServerClient } from "./supabase-server"

export interface AuditLogData {
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
  status?: string
}

// Create audit log entry with encryption
export async function createAuditLog(data: AuditLogData) {
  const supabase = await getSupabaseServerClient()

  await supabase.from("audit_logs").insert([
    {
      user_id: data.user_id || null,
      action_type: data.action_type,
      resource_type: data.resource_type,
      resource_id: data.resource_id,
      resource_name: data.resource_name,
      description: encryptData(data.description),
      old_value: data.old_value ? encryptData(data.old_value) : null,
      new_value: data.new_value ? encryptData(data.new_value) : null,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      status: data.status || "success",
      is_encrypted: true,
    },
  ])
}

// Simple encryption helper (in production, use proper encryption)
function encryptData(data: string): string {
  // This is a placeholder - use proper encryption in production
  return Buffer.from(data).toString("base64")
}

// Decrypt audit log data
export function decryptData(encryptedData: string | null | undefined): string {
  // Handle null/undefined safely
  if (!encryptedData) {
    return ""
  }
  // This is a placeholder - use proper decryption in production
  try {
    return Buffer.from(encryptedData, "base64").toString()
  } catch {
    // If decryption fails, return the original data (might not be encrypted)
    return encryptedData
  }
}

// Get audit logs with optional filtering
export async function getAuditLogs(filters?: {
  userId?: string
  actionType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  const supabase = await getSupabaseServerClient()

  let query = supabase.from("audit_logs").select("*")

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId)
  }

  if (filters?.actionType) {
    query = query.eq("action_type", filters.actionType)
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

  // Decrypt data - safely handle null values
  return data?.map((log: { description: string | null; old_value: string | null; new_value: string | null; is_encrypted?: boolean }) => ({
    ...log,
    description: log.is_encrypted ? decryptData(log.description) : (log.description || ""),
    old_value: log.old_value && log.is_encrypted ? decryptData(log.old_value) : log.old_value,
    new_value: log.new_value && log.is_encrypted ? decryptData(log.new_value) : log.new_value,
  }))
}

// Log system events
export async function logSystemEvent(
  eventType: string,
  severity: "info" | "warning" | "critical",
  description: string,
  eventData?: unknown,
) {
  const supabase = await getSupabaseServerClient()

  await supabase.from("system_events").insert([
    {
      event_type: eventType,
      severity,
      description,
      event_data: eventData ? JSON.stringify(eventData) : null,
    },
  ])
}
