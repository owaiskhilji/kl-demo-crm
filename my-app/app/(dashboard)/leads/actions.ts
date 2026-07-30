"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getLeastLoadedAgent } from "@/lib/utils/leadAssignment";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  budget: z.coerce.number().positive("Budget must be positive").optional().or(z.literal(0)).nullable(),
  area: z.string().optional().nullable(),
  category: z.enum(['residential', 'commercial']).optional().nullable(),
  property_type: z.enum(['home', 'plot', 'apartment']).optional().nullable(),
  source: z.enum(['facebook','instagram','zameen','referral','whatsapp','walk-in','other']).optional().nullable(),
  stage: z.enum(['new_lead','contacted','qualified','site_visit','negotiation','closed','lost']).optional().nullable(),
  notes: z.string().optional().nullable(),
  assigned_to: z.string().uuid("Invalid agent ID").optional().nullable(),
});

export async function createLeadAction(data: any) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };

  const userId = authData.claims.sub;

  const parse = leadSchema.safeParse(data);
  if (!parse.success) {
    return { success: false, error: parse.error.issues[0]?.message ?? "Invalid input" };
  }
  const parsedData = parse.data;

  // Auto-assign if no explicit agent was chosen
  let finalAgentId = parsedData.assigned_to || null;
  let assignmentType = finalAgentId ? 'manual' : 'auto';

  if (!finalAgentId) {
    const adminSupabase = createAdminClient();
    finalAgentId = await getLeastLoadedAgent(adminSupabase);
    // If it's still null, it means no agents exist yet, which is safe to leave null.
  }

  // Use admin client for system-level auto-assignments to bypass RLS, 
  // otherwise use the user's authenticated client for manual assignments.
  const insertClient = assignmentType === 'auto' ? createAdminClient() : supabase;

  const { data: lead, error } = await insertClient
    .from("leads")
    .insert([{
      name: parsedData.name,
      phone: parsedData.phone,
      email: parsedData.email || null,
      budget: parsedData.budget ? Number(parsedData.budget) : null,
      area: parsedData.area || null,
      category: parsedData.category || null,
      property_type: parsedData.property_type || null,
      source: parsedData.source || null,
      stage: parsedData.stage || 'new_lead',
      notes: parsedData.notes || null,
      assigned_to: finalAgentId,
      assignment_type: assignmentType
    }])
    .select()
    .single();

  if (error) {
    console.error("[createLeadAction]", error);
    return { success: false, error: "Failed to create lead." };
  }

  // Automated Activity Logging
  await insertClient.from("lead_activities").insert([{
    lead_id: lead.id,
    agent_id: userId,
    action: 'LEAD_CREATED',
    new_value: lead.stage
  }]);

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, data: lead };
}

export async function updateLeadStageAction(leadId: string, newStage: string) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };
  const userId = authData.claims.sub;

  const { data: oldLead, error: fetchErr } = await supabase.from("leads").select("stage").eq("id", leadId).single();
  if (fetchErr || !oldLead) return { success: false, error: "Lead not found" };

  if (oldLead.stage === newStage) return { success: true };

  const { error: updateErr } = await supabase.from("leads").update({ stage: newStage, updated_at: new Date().toISOString() }).eq("id", leadId);
  if (updateErr) return { success: false, error: "Failed to update stage." };

  // Automated Activity Logging
  await supabase.from("lead_activities").insert([{
    lead_id: leadId,
    agent_id: userId,
    action: 'STAGE_CHANGED',
    old_value: oldLead.stage,
    new_value: newStage
  }]);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reassignLeadAction(leadId: string, newAgentId: string | null) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) return { success: false, error: "Unauthorized" };
  const userId = authData.claims.sub;

  const { data: oldLead, error: fetchErr } = await supabase.from("leads").select("assigned_to").eq("id", leadId).single();
  if (fetchErr) return { success: false, error: "Lead not found" };

  if (oldLead.assigned_to === newAgentId) return { success: true };

  const { error: updateErr } = await supabase.from("leads").update({ 
    assigned_to: newAgentId, 
    assignment_type: 'manual',
    updated_at: new Date().toISOString() 
  }).eq("id", leadId);
  if (updateErr) return { success: false, error: "Failed to reassign lead." };

  // Automated Activity Logging
  await supabase.from("lead_activities").insert([{
    lead_id: leadId,
    agent_id: userId,
    action: 'AGENT_REASSIGNED',
    old_value: oldLead.assigned_to,
    new_value: newAgentId
  }]);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { success: true };
}

export async function deleteLeadAction(id: string) {
  try {
    const supabase = await createClient();
    
    // Auth and strict role check - ONLY owner can delete leads
    const { data: authData } = await supabase.auth.getClaims();
    if (!authData?.claims?.sub) {
      return { success: false, error: "Unauthorized" };
    }
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.claims.sub)
      .single();
      
    if (profile?.role !== "owner") {
      return { success: false, error: "Only owners can delete leads" };
    }

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[deleteLeadAction] DB error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/leads");
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteLeadAction] Unexpected error:", err);
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}
