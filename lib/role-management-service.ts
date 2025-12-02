import { getSupabaseServerClient } from "./supabase-server"
import { createAuditLog } from "./audit-service"
import { checkPermission } from "./access-control-service"

export async function createRoleChangeRequest(
  requestedByUserId: string,
  requestedForUserId: string,
  toRoleId: string,
  reason: string,
) {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from("role_change_requests")
    .insert([
      {
        requested_by: requestedByUserId,
        requested_for: requestedForUserId,
        to_role_id: toRoleId,
        reason,
        status: "pending",
      },
    ])
    .select()

  if (error) throw error

  await createAuditLog({
    user_id: requestedByUserId,
    action_type: "role_change_requested",
    description: `Requested role change for user ${requestedForUserId}`,
    status: "success",
  })

  return data[0]
}

export async function approveRoleChangeRequest(requestId: string, reviewedByUserId: string, reviewNotes?: string) {
  const supabase = await getSupabaseServerClient()

  // Check permission
  const hasPermission = await checkPermission(reviewedByUserId, "manage_roles")
  if (!hasPermission) {
    throw new Error("You do not have permission to approve role changes")
  }

  // Get request
  const { data: request } = await supabase.from("role_change_requests").select("*").eq("id", requestId).single()

  if (!request) throw new Error("Request not found")

  // Update request
  await supabase
    .from("role_change_requests")
    .update({
      status: "approved",
      reviewed_by: reviewedByUserId,
      review_notes: reviewNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  // Assign new role
  if (request.from_role_id) {
    await supabase.from("user_roles").delete().eq("user_id", request.requested_for).eq("role_id", request.from_role_id)
  }

  await supabase.from("user_roles").insert([
    {
      user_id: request.requested_for,
      role_id: request.to_role_id,
      assigned_by: reviewedByUserId,
    },
  ])

  await createAuditLog({
    user_id: reviewedByUserId,
    action_type: "role_change_approved",
    description: `Approved role change for user ${request.requested_for}`,
    status: "success",
  })
}

export async function rejectRoleChangeRequest(requestId: string, reviewedByUserId: string, reason: string) {
  const supabase = await getSupabaseServerClient()

  const hasPermission = await checkPermission(reviewedByUserId, "manage_roles")
  if (!hasPermission) {
    throw new Error("You do not have permission to reject role changes")
  }

  await supabase
    .from("role_change_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewedByUserId,
      review_notes: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  await createAuditLog({
    user_id: reviewedByUserId,
    action_type: "role_change_rejected",
    description: `Rejected role change for user requested in request ${requestId}`,
    status: "success",
  })
}

export async function getRoleChangeRequests(filters?: { status?: string; limit?: number }) {
  const supabase = await getSupabaseServerClient()

  let query = supabase.from("role_change_requests").select("*, users!requested_for(full_name, email), roles(name)")

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  query = query.order("created_at", { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}
