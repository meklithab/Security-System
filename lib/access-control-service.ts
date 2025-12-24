import { getSupabaseServerClient } from "./supabase-server"
import { createAuditLog } from "./audit-service"

// ============================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================

export async function assignRoleToUser(userId: string, roleId: string, assignedByUserId: string) {
  const supabase = await getSupabaseServerClient()

  // Verify admin has permission
  const hasPermission = await checkPermission(assignedByUserId, "manage_roles")
  if (!hasPermission) {
    throw new Error("You do not have permission to assign roles")
  }

  const { data, error } = await supabase
    .from("user_roles")
    .insert([{ user_id: userId, role_id: roleId, assigned_by: assignedByUserId }])
    .select()

  if (error) throw error

  await createAuditLog({
    user_id: assignedByUserId,
    action_type: "role_assigned",
    description: `Assigned role to user ${userId}`,
    resource_type: "roles",
    resource_id: roleId,
    status: "success",
  })

  return data[0]
}

export async function revokeRoleFromUser(userId: string, roleId: string, revokedByUserId: string) {
  const supabase = await getSupabaseServerClient()

  const hasPermission = await checkPermission(revokedByUserId, "manage_roles")
  if (!hasPermission) {
    throw new Error("You do not have permission to revoke roles")
  }

  const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role_id", roleId)

  if (error) throw error

  await createAuditLog({
    user_id: revokedByUserId,
    action_type: "role_revoked",
    description: `Revoked role from user ${userId}`,
    resource_type: "roles",
    resource_id: roleId,
    status: "success",
  })
}

export async function getUserRoles(userId: string): Promise<any[]> {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase.from("user_roles").select("role_id, roles(*)").eq("user_id", userId)

  if (error) throw error
  return data || []
}

// ============================================================
// PERMISSION CHECKING
// ============================================================

export async function checkPermission(userId: string, permissionName: string): Promise<boolean> {
  const supabase = await getSupabaseServerClient()

  // Get user's roles
  const { data: userRoles } = await supabase.from("user_roles").select("role_id, roles(name)").eq("user_id", userId)

  if (!userRoles || userRoles.length === 0) {
    return false
  }

  // System Admin is always allowed
  const isSystemAdmin = (userRoles as Array<{ roles?: { name?: string }; role_id: string }>).some(
    (ur) => ur.roles?.name === "System Admin",
  )
  if (isSystemAdmin) {
    return true
  }

  const roleIds = (userRoles as Array<{ role_id: string }>).map((ur) => ur.role_id)

  // Check if any role has the permission (Supabase v2 style join using FK)
  const { data: rolePerms, error } = await supabase
    .from("role_permissions")
    .select("role_id, permissions!inner(name)")
    .in("role_id", roleIds)
    .eq("permissions.name", permissionName)

  if (error) throw error
  return rolePerms && rolePerms.length > 0
}

export async function checkResourcePermission(
  userId: string,
  resourceId: string,
  action: "view" | "edit" | "delete" | "share",
): Promise<boolean> {
  const supabase = await getSupabaseServerClient()

  // Check DAC permissions
  const { data: dacPerms } = await supabase
    .from("resource_permissions")
    .select(`can_${action}`)
    .eq("resource_id", resourceId)
    .eq("granted_to_user_id", userId)
    .single()

  if (dacPerms && dacPerms[`can_${action}`]) {
    return true
  }

  // Check role-based DAC permissions
  const userRoles = await getUserRoles(userId)
  if (userRoles.length > 0) {
    const roleIds = userRoles.map((ur) => ur.role_id)

    const { data: roleDacPerms } = await supabase
      .from("resource_permissions")
      .select(`can_${action}`)
      .eq("resource_id", resourceId)
      .in("granted_to_role_id", roleIds)

    if (roleDacPerms && roleDacPerms.some((p: Record<string, boolean>) => p[`can_${action}`])) {
      return true
    }
  }

  return false
}

// ============================================================
// MANDATORY ACCESS CONTROL (MAC)
// ============================================================

export async function getUserClearanceLevel(userId: string): Promise<number | null> {
  const supabase = await getSupabaseServerClient()

  const { data: clearance } = await supabase
    .from("user_clearance_levels")
    .select("data_classifications(level)")
    .eq("user_id", userId)
    .single()

  return clearance?.["data_classifications"]?.level || null
}

export async function checkMACAccess(userId: string, resourceId: string): Promise<boolean> {
  const supabase = await getSupabaseServerClient()

  // Get user's clearance level
  const userClearance = await getUserClearanceLevel(userId)
  if (userClearance === null) {
    return false
  }

  // Get resource's classification level
  const { data: resource } = await supabase
    .from("resources")
    .select("data_classifications(level)")
    .eq("id", resourceId)
    .single()

  if (!resource) return false

  const resourceLevel = resource["data_classifications"]?.level || 0

  // User can access if their clearance level >= resource level
  return userClearance >= resourceLevel
}

export async function assignClearanceLevel(
  userId: string,
  classificationId: string,
  assignedByUserId: string,
  reason: string,
) {
  const supabase = await getSupabaseServerClient()

  // Only admins can assign clearance
  const hasPermission = await checkPermission(assignedByUserId, "manage_access")
  if (!hasPermission) {
    throw new Error("You do not have permission to assign clearance levels")
  }

  const { data, error } = await supabase
    .from("user_clearance_levels")
    .upsert([
      {
        user_id: userId,
        classification_id: classificationId,
        assigned_by: assignedByUserId,
        reason,
      },
    ])
    .select()

  if (error) throw error

  await createAuditLog({
    user_id: assignedByUserId,
    action_type: "clearance_assigned",
    description: `Assigned clearance level to user ${userId}: ${reason}`,
    status: "success",
  })

  return data[0]
}

// ============================================================
// DISCRETIONARY ACCESS CONTROL (DAC)
// ============================================================

export async function grantResourcePermission(
  resourceId: string,
  grantedToUserId: string | null,
  grantedToRoleId: string | null,
  grantedByUserId: string,
  permissions: {
    canView?: boolean
    canEdit?: boolean
    canDelete?: boolean
    canShare?: boolean
  },
  reason?: string,
) {
  const supabase = await getSupabaseServerClient()

  // Verify resource ownership
  const { data: resource } = await supabase.from("resources").select("owner_id").eq("id", resourceId).single()

  if (resource?.owner_id !== grantedByUserId) {
    throw new Error("Only resource owner can grant permissions")
  }

  const { data, error } = await supabase
    .from("resource_permissions")
    .upsert([
      {
        resource_id: resourceId,
        granted_to_user_id: grantedToUserId,
        granted_to_role_id: grantedToRoleId,
        can_view: permissions.canView || false,
        can_edit: permissions.canEdit || false,
        can_delete: permissions.canDelete || false,
        can_share: permissions.canShare || false,
        granted_by: grantedByUserId,
        reason,
      },
    ])
    .select()

  if (error) throw error

  await createAuditLog({
    user_id: grantedByUserId,
    action_type: "permission_granted",
    description: `Granted permission on resource ${resourceId}`,
    resource_type: "resources",
    resource_id: resourceId,
    resource_name: resource?.owner_id,
    status: "success",
  })

  return data[0]
}

export async function revokeResourcePermission(resourceId: string, permissionId: string, revokedByUserId: string) {
  const supabase = await getSupabaseServerClient()

  // Verify resource ownership
  const { data: resource } = await supabase.from("resources").select("owner_id").eq("id", resourceId).single()

  if (resource?.owner_id !== revokedByUserId) {
    throw new Error("Only resource owner can revoke permissions")
  }

  const { error } = await supabase.from("resource_permissions").delete().eq("id", permissionId)

  if (error) throw error

  await createAuditLog({
    user_id: revokedByUserId,
    action_type: "permission_revoked",
    description: `Revoked permission on resource ${resourceId}`,
    resource_type: "resources",
    resource_id: resourceId,
    status: "success",
  })
}

export async function getResourcePermissions(resourceId: string) {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase.from("resource_permissions").select("*").eq("resource_id", resourceId)

  if (error) throw error
  return data
}

// ============================================================
// RULE-BASED ACCESS CONTROL (RuBAC)
// ============================================================

export async function checkTimeBasedAccess(userId: string): Promise<boolean> {
  const supabase = await getSupabaseServerClient()

  const currentTime = new Date()
  const currentHour = currentTime.getHours()

  // Check if outside working hours
  const isWorkingHours = currentHour >= 9 && currentHour < 17 // 9 AM to 5 PM

  // Get user's rules
  const { data: rules } = await supabase
    .from("access_rules")
    .select("*")
    .eq("condition_type", "time")
    .eq("is_active", true)

  if (!rules || rules.length === 0) {
    return isWorkingHours
  }

  // Check if user has preapproval for after-hours
  // This would be stored in a separate table or field
  return isWorkingHours || false // Simplified - implement preapproval logic
}

export async function checkLocationBasedAccess(userId: string, ipAddress: string): Promise<boolean> {
  const supabase = await getSupabaseServerClient()

  // Get location-based rules
  const { data: rules } = await supabase
    .from("access_rules")
    .select("*")
    .eq("condition_type", "location")
    .eq("is_active", true)

  if (!rules || rules.length === 0) {
    return true // Allow if no location rules
  }

  // Simplified location check based on IP ranges
  // In production, use GeoIP database
  return true
}

export async function evaluateRuBAC(userId: string, action: string, ipAddress?: string): Promise<boolean> {
  // Check time-based access
  const timeOk = await checkTimeBasedAccess(userId)
  if (!timeOk) {
    return false
  }

  // Check location-based access
  if (ipAddress) {
    const locationOk = await checkLocationBasedAccess(userId, ipAddress)
    if (!locationOk) {
      return false
    }
  }

  return true
}

// ============================================================
// ATTRIBUTE-BASED ACCESS CONTROL (ABAC)
// ============================================================

export async function getUserAttributes(userId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: user } = await supabase
    .from("users")
    .select("role_id:user_roles(roles(name)), department, created_at")
    .eq("id", userId)
    .single()

  const { data: customAttrs } = await supabase
    .from("abac_attributes")
    .select("attribute_name, attribute_value")
    .eq("user_id", userId)

  return {
    userId,
    role: user?.role_id?.[0]?.roles?.name,
    department: user?.department,
    customAttributes: customAttrs || [],
  }
}

export async function evaluateABACPolicy(
  userId: string,
  policy: {
    requiredRole?: string
    requiredDepartment?: string
    customRules?: Array<{ attribute: string; value: string }>
  },
): Promise<boolean> {
  const attributes = await getUserAttributes(userId)

  // Check role requirement
  if (policy.requiredRole && attributes.role !== policy.requiredRole) {
    return false
  }

  // Check department requirement
  if (policy.requiredDepartment && attributes.department !== policy.requiredDepartment) {
    return false
  }

  // Check custom rules
  if (policy.customRules) {
    for (const rule of policy.customRules) {
      const customAttr = attributes.customAttributes?.find(
        (a: { attribute_name: string; attribute_value: string }) => a.attribute_name === rule.attribute,
      )
      if (!customAttr || customAttr.attribute_value !== rule.value) {
        return false
      }
    }
  }

  return true
}

export async function setUserAttribute(userId: string, attributeName: string, attributeValue: string) {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from("abac_attributes")
    .upsert([{ user_id: userId, attribute_name: attributeName, attribute_value: attributeValue }])
    .select()

  if (error) throw error
  return data[0]
}

// ============================================================
// COMPREHENSIVE ACCESS CHECK
// ============================================================

export async function checkAccess(
  userId: string,
  resourceId: string,
  action: "view" | "edit" | "delete" | "share" = "view",
  ipAddress?: string,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // 1. Check RBAC - does user have any role?
    const userRoles = await getUserRoles(userId)
    if (userRoles.length === 0) {
      return { allowed: false, reason: "User has no roles assigned" }
    }

    const isSystemAdmin = userRoles.some((ur: any) => ur.roles?.name === "System Admin")
    const supabase = await getSupabaseServerClient()
    const { data: resource } = await supabase.from("resources").select("owner_id").eq("id", resourceId).single()

    // 2. System Admin has full access (subject to RuBAC)
    if (isSystemAdmin) {
      const rubacAllowed = await evaluateRuBAC(userId, action, ipAddress)
      if (!rubacAllowed) {
        return { allowed: false, reason: "Access denied by time or location rules" }
      }
      return { allowed: true }
    }

    // 3. Owner has full access to their resources (subject to RuBAC)
    if (resource && resource.owner_id === userId) {
      const rubacAllowed = await evaluateRuBAC(userId, action, ipAddress)
      if (!rubacAllowed) {
        return { allowed: false, reason: "Access denied by time or location rules" }
      }
      return { allowed: true }
    }

    // 4. Check DAC - does user have explicit resource permission?
    // If yes, this bypasses MAC (owner explicitly granted access)
    const dacAllowed = await checkResourcePermission(userId, resourceId, action)
    if (dacAllowed) {
      // DAC permission granted - check RuBAC and allow
      const rubacAllowed = await evaluateRuBAC(userId, action, ipAddress)
      if (!rubacAllowed) {
        return { allowed: false, reason: "Access denied by time or location rules" }
      }
      return { allowed: true }
    }

    // 5. No explicit DAC permission - fall back to MAC-based access
    const macAllowed = await checkMACAccess(userId, resourceId)
    if (!macAllowed) {
      return { allowed: false, reason: "User does not have permission for this resource" }
    }

    // 6. Check RuBAC - do time/location rules allow access?
    const rubacAllowed = await evaluateRuBAC(userId, action, ipAddress)
    if (!rubacAllowed) {
      return { allowed: false, reason: "Access denied by time or location rules" }
    }

    return { allowed: true }
  } catch (error) {
    return { allowed: false, reason: error instanceof Error ? error.message : "Access check failed" }
  }
}
