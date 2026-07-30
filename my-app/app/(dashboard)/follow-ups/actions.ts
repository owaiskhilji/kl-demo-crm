"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const followUpSchema = z.object({
  lead_id: z.string().uuid("Invalid lead selected"),
  scheduled_at: z.string().min(1, "Date and time is required"),
  notes: z.string().optional(),
});

// ----------------------------------------------------------------
// CREATE a new follow-up
// ----------------------------------------------------------------
export async function createFollowUpAction(input: unknown) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };

  const parse = followUpSchema.safeParse(input);
  if (!parse.success) {
    return { success: false, error: parse.error.issues[0]?.message ?? "Invalid input." };
  }

  const { lead_id, scheduled_at, notes } = parse.data;

  // Skill rule: do NOT create a notifications row here.
  // The cron job (Milestone 3.2) is the only place that creates notifications.
  const { error } = await supabase.from("follow_ups").insert({
    lead_id,
    agent_id: authData.claims.sub,
    scheduled_at: new Date(scheduled_at).toISOString(),
    notes: notes || null,
    is_done: false,
    notified: false,
  });

  if (error) {
    console.error("[createFollowUpAction]", error.message);
    return { success: false, error: "Could not schedule the follow-up. Please try again." };
  }

  revalidatePath("/follow-ups");
  return { success: true };
}

// ----------------------------------------------------------------
// UPDATE a follow-up (reschedule or edit notes)
// CRITICAL edge case from skill: reset notified = false whenever
// scheduled_at changes, so the cron re-fires on the new date.
// ----------------------------------------------------------------
export async function updateFollowUpAction(
  followUpId: string,
  input: unknown
) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };

  const parse = followUpSchema.safeParse(input);
  if (!parse.success) {
    return { success: false, error: parse.error.issues[0]?.message ?? "Invalid input." };
  }

  const { lead_id, scheduled_at, notes } = parse.data;

  // Fetch the existing row to check if scheduled_at actually changed
  const { data: existing, error: fetchErr } = await supabase
    .from("follow_ups")
    .select("scheduled_at, agent_id")
    .eq("id", followUpId)
    .single();

  if (fetchErr || !existing) {
    console.error("[updateFollowUpAction] fetch:", fetchErr?.message);
    return { success: false, error: "Follow-up not found." };
  }

  // Agents can only edit their own follow-ups
  const userId = authData.claims.sub;
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const isAdmin = callerProfile?.role === "owner" || callerProfile?.role === "manager";
  if (!isAdmin && existing.agent_id !== userId) {
    return { success: false, error: "You can only edit your own follow-ups." };
  }

  const newIso = new Date(scheduled_at).toISOString();
  const dateChanged =
    new Date(existing.scheduled_at).toISOString() !== newIso;

  const { error: updateErr } = await supabase
    .from("follow_ups")
    .update({
      lead_id,
      scheduled_at: newIso,
      notes: notes || null,
      // Reschedule edge case: reset notified so cron fires on the new date.
      // If the date didn't change, leave notified as-is.
      ...(dateChanged ? { notified: false } : {}),
    })
    .eq("id", followUpId);

  if (updateErr) {
    console.error("[updateFollowUpAction]", updateErr.message);
    return { success: false, error: "Could not update follow-up. Please try again." };
  }

  revalidatePath("/follow-ups");
  return { success: true };
}

// ----------------------------------------------------------------
// MARK AS DONE
// Also dismisses any linked notification row (future-proofing for
// when Milestone 3.2 cron is active — safe no-op if no row exists).
// ----------------------------------------------------------------
export async function markFollowUpDoneAction(followUpId: string) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };

  const { error: doneErr } = await supabase
    .from("follow_ups")
    .update({ is_done: true })
    .eq("id", followUpId);

  if (doneErr) {
    console.error("[markFollowUpDoneAction]", doneErr.message);
    return { success: false, error: "Could not mark follow-up as done." };
  }

  // Dismiss any linked notification (Milestone 3.3 will show these in the bell).
  // Using upsert=false here — just a best-effort update, not blocking.
  const { error: notifErr } = await supabase
    .from("notifications")
    .update({ status: "dismissed" })
    .eq("follow_up_id", followUpId)
    .neq("status", "dismissed");

  if (notifErr) {
    // Non-blocking: notification dismissal failure should not fail the action
    console.warn("[markFollowUpDoneAction] notification dismiss:", notifErr.message);
  }

  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return { success: true };
}

// ----------------------------------------------------------------
// DELETE a follow-up
// ----------------------------------------------------------------
export async function deleteFollowUpAction(followUpId: string) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", followUpId);

  if (error) {
    console.error("[deleteFollowUpAction]", error.message);
    return { success: false, error: "Could not delete follow-up. Please try again." };
  }

  revalidatePath("/follow-ups");
  return { success: true };
}

// ----------------------------------------------------------------
// JIT TRIGGER (CLIENT-INVOKED FOR SAME-DAY FOLLOW-UPS)
// ----------------------------------------------------------------
export async function triggerJITFollowUpNotificationAction(followUpId: string) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false };

  // Need service role to insert into notifications table safely
  const admin = createAdminClient();

  // 1. Verify ownership and state
  const { data: followUp } = await supabase
    .from("follow_ups")
    .select("*, leads(name)")
    .eq("id", followUpId)
    .single();

  if (!followUp || followUp.is_done || followUp.notified) return { success: false };
  if (new Date(followUp.scheduled_at) > new Date()) return { success: false };

  // 2. Insert notification
  const { error: notifErr } = await admin.from("notifications").insert({
    agent_id: followUp.agent_id,
    type: "follow_up_due",
    follow_up_id: followUp.id,
    lead_id: followUp.lead_id,
    message: `Follow up with ${followUp.leads?.name || "lead"} is due now`,
    due_at: followUp.scheduled_at,
    status: "due",
  });

  if (notifErr) {
    console.error("[triggerJIT] notif error:", notifErr);
    return { success: false };
  }

  // 3. Mark as notified so it doesn't trigger again
  await admin.from("follow_ups").update({ notified: true }).eq("id", followUpId);

  revalidatePath("/dashboard");
  return { success: true };
}
