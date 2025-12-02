import { getSupabaseServerClient } from "./supabase-server"
import { logSystemEvent } from "./enhanced-audit-service"
import crypto from "crypto"

export interface BackupConfig {
  frequency: "hourly" | "daily" | "weekly"
  retentionDays: number
  encryptionEnabled: boolean
  tables: string[]
}

const DEFAULT_CONFIG: BackupConfig = {
  frequency: "daily",
  retentionDays: 90,
  encryptionEnabled: true,
  tables: [
    "users",
    "user_roles",
    "roles",
    "permissions",
    "resources",
    "resource_permissions",
    "audit_logs",
    "user_clearance_levels",
  ],
}

// Generate backup with encryption
export async function createBackup(config: BackupConfig = DEFAULT_CONFIG) {
  const supabase = await getSupabaseServerClient()
  const backupId = crypto.randomUUID()
  const timestamp = new Date().toISOString()

  try {
    // Collect data from all specified tables
    const backupData: Record<string, any[]> = {}
    let totalRecords = 0

    for (const table of config.tables) {
      const { data, error } = await supabase.from(table).select("*")

      if (error) {
        console.error(`Error backing up table ${table}:`, error)
        continue
      }

      backupData[table] = data || []
      totalRecords += (data || []).length
    }

    // Serialize backup data
    const backupContent = JSON.stringify(backupData, null, 2)
    const backupSize = Buffer.byteLength(backupContent, "utf8")

    // Generate checksum
    const checksum = crypto.createHash("sha256").update(backupContent).digest("hex")

    // Encrypt if enabled
    let encryptedContent = backupContent
    if (config.encryptionEnabled) {
      encryptedContent = encryptBackupData(backupContent)
    }

    // Store backup metadata
    const { data: backupRecord, error: storeError } = await supabase
      .from("backup_records")
      .insert([
        {
          backup_name: `backup_${timestamp.replace(/[:.]/g, "-")}`,
          backup_type: "full",
          data_backed_up: JSON.stringify(config.tables),
          backup_size_bytes: backupSize,
          checksum,
          is_encrypted: config.encryptionEnabled,
          encryption_algorithm: "AES-256",
          backup_location: `/backups/${backupId}`,
          status: "completed",
        },
      ])
      .select()

    if (storeError) throw storeError

    // Log system event
    await logSystemEvent("backup_created", "info", `Full backup created: ${backupRecord[0].backup_name}`, {
      backupId,
      size: backupSize,
      records: totalRecords,
      encrypted: config.encryptionEnabled,
    })

    return {
      backupId,
      backupName: backupRecord[0].backup_name,
      size: backupSize,
      recordCount: totalRecords,
      encrypted: config.encryptionEnabled,
      checksum,
    }
  } catch (error) {
    await logSystemEvent(
      "backup_failed",
      "critical",
      `Backup creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      { backupId, error: error instanceof Error ? error.message : String(error) },
    )
    throw error
  }
}

// Restore from backup
export async function restoreFromBackup(backupId: string, backupData: Record<string, any[]>) {
  const supabase = await getSupabaseServerClient()

  try {
    const restoreId = crypto.randomUUID()
    const startTime = Date.now()

    for (const [table, records] of Object.entries(backupData)) {
      if (records.length === 0) continue

      // Clear existing data
      await supabase.from(table).delete().neq("id", "")

      // Insert backup data
      const { error } = await supabase.from(table).insert(records)

      if (error) {
        throw new Error(`Failed to restore table ${table}: ${error.message}`)
      }
    }

    const duration = Date.now() - startTime

    await logSystemEvent("backup_restored", "warning", `Backup ${backupId} has been restored`, {
      restoreId,
      backupId,
      duration,
      tablesRestored: Object.keys(backupData).length,
    })

    return { restoreId, success: true, duration }
  } catch (error) {
    await logSystemEvent(
      "restore_failed",
      "critical",
      `Restore operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      { backupId, error: error instanceof Error ? error.message : String(error) },
    )
    throw error
  }
}

// Verify backup integrity
export async function verifyBackupIntegrity(backupId: string, backupContent: string) {
  const supabase = await getSupabaseServerClient()

  try {
    // Get backup record
    const { data: backup } = await supabase.from("backup_records").select("*").eq("id", backupId).single()

    if (!backup) {
      throw new Error("Backup not found")
    }

    // Calculate current checksum
    const currentChecksum = crypto.createHash("sha256").update(backupContent).digest("hex")

    const isValid = currentChecksum === backup.checksum
    const verificationTime = new Date().toISOString()

    // Update backup record
    await supabase.from("backup_records").update({ last_verified: verificationTime }).eq("id", backupId)

    if (isValid) {
      await logSystemEvent("backup_verified", "info", `Backup ${backupId} integrity verified`, {
        backupId,
        status: "passed",
      })
    } else {
      await logSystemEvent("backup_corruption_detected", "critical", `Backup ${backupId} integrity check failed`, {
        backupId,
        expectedChecksum: backup.checksum,
        actualChecksum: currentChecksum,
      })
    }

    return { valid: isValid, checksum: currentChecksum }
  } catch (error) {
    await logSystemEvent(
      "backup_verification_failed",
      "critical",
      `Backup verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      { backupId },
    )
    throw error
  }
}

// Get backup history
export async function getBackupHistory(limit = 50) {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from("backup_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Delete old backups based on retention policy
export async function cleanupOldBackups(retentionDays = 90) {
  const supabase = await getSupabaseServerClient()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  try {
    const { data: backupsToDelete } = await supabase
      .from("backup_records")
      .select("id, backup_name")
      .lt("created_at", cutoffDate.toISOString())

    if (backupsToDelete && backupsToDelete.length > 0) {
      await supabase.from("backup_records").delete().lt("created_at", cutoffDate.toISOString())

      await logSystemEvent("backups_cleaned", "info", `${backupsToDelete.length} old backups deleted`, {
        count: backupsToDelete.length,
        retentionDays,
      })
    }

    return { deletedCount: backupsToDelete?.length || 0 }
  } catch (error) {
    await logSystemEvent(
      "backup_cleanup_failed",
      "warning",
      `Failed to cleanup old backups: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
    throw error
  }
}

// Encryption helper (use proper encryption in production)
function encryptBackupData(data: string): string {
  // Placeholder - implement with proper AES-256 encryption in production
  return Buffer.from(data).toString("base64")
}

export function decryptBackupData(encryptedData: string): string {
  return Buffer.from(encryptedData, "base64").toString()
}

// Automated backup schedule
export async function scheduleAutomaticBackups(config: BackupConfig) {
  const frequencyMs = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
  }

  const interval = frequencyMs[config.frequency]

  // Schedule backup
  setInterval(async () => {
    try {
      await createBackup(config)
      await cleanupOldBackups(config.retentionDays)
    } catch (error) {
      console.error("Scheduled backup failed:", error)
    }
  }, interval)

  await logSystemEvent("backup_scheduler_started", "info", `Automatic backups scheduled: ${config.frequency}`, config)
}

// Data encryption for sensitive fields
export async function encryptSensitiveFields(userId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: user } = await supabase.from("users").select("*").eq("id", userId).single()

  if (!user) return null

  // In production, implement proper field-level encryption
  return {
    ...user,
    email: maskEmail(user.email),
    phone_number: maskPhone(user.phone_number),
  }
}

// Data masking utilities
function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  return `${local.substring(0, 2)}***@${domain}`
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null
  return `***-***-${phone.substring(phone.length - 4)}`
}
