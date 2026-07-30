"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const addAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function createAgentAction(data: any) {
  // 1. Verify caller session and role
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };

  const callerId = authData.claims.sub;

  const { data: callerProfile, error: callerErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();

  if (callerErr || !callerProfile || !['owner', 'manager'].includes(callerProfile.role)) {
    return { success: false, error: "Forbidden: Only Owners or Managers can add agents." };
  }

  // 2. Validate input
  const parse = addAgentSchema.safeParse(data);
  if (!parse.success) {
    return { success: false, error: parse.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password } = parse.data;

  // 3. Service-role client for Auth API bypass
  const admin = createAdminClient();
  const { data: newUser, error: signUpErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Crucial step from the pattern
  });

  if (signUpErr) {
    console.error("[createAgentAction] Auth Error:", signUpErr);
    return { success: false, error: signUpErr.message };
  }

  const newUserId = newUser.user.id;

  // 4. Insert corresponding profiles row
  const { error: profileErr } = await admin.from("profiles").insert({
    id: newUserId,
    full_name: name,
    role: "agent",
    created_by: callerId,
  });

  if (profileErr) {
    console.error("[createAgentAction] Profile Error:", profileErr);
    // Rollback: Delete the orphaned auth user to prevent ghost accounts
    await admin.auth.admin.deleteUser(newUserId);
    return { success: false, error: "Agent login created, but failed to create profile. Cleaned up." };
  }

  // 5. Audit log entry (lead_activities-style)
  const { error: auditErr } = await admin.from("audit_logs").insert({
    actor_id: callerId,
    action: "AGENT_CREATED",
    target_id: newUserId,
    details: { name, email }
  });

  if (auditErr) {
    // We don't fail the action if audit logging fails, but we must log it
    console.warn("[createAgentAction] Audit Log Warning:", auditErr);
  }

  revalidatePath("/agents");
  return { success: true };
}

const bulkReassignSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "No leads selected for reassignment"),
  targetAgentId: z.string().uuid("Invalid target agent ID"),
});

export async function bulkReassignAction(data: any) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };

  const callerId = authData.claims.sub;

  const { data: callerProfile, error: callerErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();

  if (callerErr || !callerProfile || !['owner', 'manager'].includes(callerProfile.role)) {
    return { success: false, error: "Forbidden: Only Owners or Managers can reassign leads." };
  }

  const parse = bulkReassignSchema.safeParse(data);
  if (!parse.success) {
    return { success: false, error: parse.error.issues[0]?.message ?? "Invalid input" };
  }
  const { leadIds, targetAgentId } = parse.data;

  // Validate targetAgentId is actually an agent
  const { data: targetProfile, error: targetErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetAgentId)
    .single();

  if (targetErr || !targetProfile || targetProfile.role !== 'agent') {
    return { success: false, error: "Target must be a valid agent profile." };
  }

  // Update open leads using the REGULAR authenticated client (RLS handles permissions)
  const { error: updateErr } = await supabase
    .from("leads")
    .update({ 
      assigned_to: targetAgentId, 
      assignment_type: 'manual',
      updated_at: new Date().toISOString()
    })
    .in("id", leadIds); // Using .in() with validated leadIds array

  if (updateErr) {
    console.error("[bulkReassignAction] Update Error:", updateErr);
    return { success: false, error: "Failed to reassign leads." };
  }

  // 4. Bulk log into lead_activities (per-lead timeline visible to agents)
  const activities = leadIds.map((leadId: string) => ({
    lead_id: leadId,
    agent_id: callerId, // The admin who performed the reassignment
    action: "AGENT_REASSIGNED",
    new_value: targetAgentId,
  }));

  const { error: activityErr } = await supabase.from("lead_activities").insert(activities);
  if (activityErr) {
    console.warn("[bulkReassignAction] Lead Activity Log Warning:", activityErr);
  }

  // 5. Log it via admin client to bypass RLS for audit_logs (system-level)
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_id: callerId,
    action: "BULK_REASSIGN",
    target_id: targetAgentId,
    details: { lead_count: leadIds.length }
  });

  revalidatePath("/agents");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return { success: true };
}

const resetPasswordSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function resetAgentPasswordAction(data: any) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };

  const callerId = authData.claims.sub;

  const { data: callerProfile, error: callerErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();

  if (callerErr || !callerProfile || !['owner', 'manager'].includes(callerProfile.role)) {
    return { success: false, error: "Forbidden: Only Owners or Managers can reset agent passwords." };
  }

  const parse = resetPasswordSchema.safeParse(data);
  if (!parse.success) {
    return { success: false, error: parse.error.issues[0]?.message ?? "Invalid input" };
  }
  const { agentId, newPassword } = parse.data;

  // Check if the target is actually an agent
  const { data: targetProfile, error: targetErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", agentId)
    .single();
    
  if (targetErr || !targetProfile || targetProfile.role !== 'agent') {
    return { success: false, error: "Target must be a valid agent profile." };
  }

  const admin = createAdminClient();
  const { error: updateErr } = await admin.auth.admin.updateUserById(agentId, {
    password: newPassword,
  });

  if (updateErr) {
    console.error("[resetAgentPasswordAction] Auth Error:", updateErr);
    return { success: false, error: updateErr.message };
  }

  // Audit log entry
  const { error: auditErr } = await admin.from("audit_logs").insert({
    actor_id: callerId,
    action: "PASSWORD_RESET",
    target_id: agentId,
  });

  if (auditErr) {
    console.warn("[resetAgentPasswordAction] Audit Log Warning:", auditErr);
  }

  return { success: true };
}
