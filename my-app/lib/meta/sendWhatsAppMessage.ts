"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";
import { z } from "zod";

/**
 * Reads the WhatsApp access token.
 *
 * Strategy (in order):
 *   1. DB (integration_connections) — encrypted at rest, preferred for OAuth-connected setups.
 *   2. Environment variable (WHATSAPP_ACCESS_TOKEN) — valid for WhatsApp Cloud API because
 *      WhatsApp uses long-lived System User Tokens (not short-lived Page Tokens like Facebook).
 *      This is NOT a "dev-only fallback" — it is a legitimate production source for WhatsApp.
 *
 * This is fundamentally different from Facebook/Instagram where tokens come exclusively from
 * OAuth and must live in the DB. WhatsApp Cloud API tokens are generated in Meta Business
 * Manager and are permanent until manually revoked.
 */
async function getWhatsAppToken(): Promise<string | null> {
  // 1. Try DB first (integration_connections)
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("integration_connections")
      .select("access_token")
      .eq("channel", "whatsapp")
      .eq("status", "active")
      .single();

    if (data?.access_token) {
      return decrypt(data.access_token);
    }
  } catch {
    // No active DB row — this is expected when using env-var-based setup
  }

  // 2. Fall back to env var (legitimate for WhatsApp System User Tokens)
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (envToken) {
    console.info("[WhatsApp Outbound] Using WHATSAPP_ACCESS_TOKEN from environment.");
    return envToken;
  }

  console.error("[WhatsApp Outbound] FATAL: No token found in DB or environment variables.");
  return null;
}

/**
 * Reads the WhatsApp phone_number_id.
 * Same strategy as token: DB first, env var fallback.
 */
async function getWhatsAppPhoneNumberId(): Promise<string | null> {
  // 1. Try DB first
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("integration_connections")
      .select("phone_number_id")
      .eq("channel", "whatsapp")
      .eq("status", "active")
      .single();

    if (data?.phone_number_id) {
      return data.phone_number_id;
    }
  } catch {
    // No active DB row
  }

  // 2. Fall back to env var
  const envId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (envId) {
    console.info("[WhatsApp Outbound] Using WHATSAPP_PHONE_NUMBER_ID from environment.");
    return envId;
  }

  console.error("[WhatsApp Outbound] FATAL: No phone_number_id found in DB or environment variables.");
  return null;
}

const sendWhatsAppMessageSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().min(1, "Message content cannot be empty"),
  messageId: z.string().uuid().optional(),
});

export async function sendWhatsAppMessage(input: z.infer<typeof sendWhatsAppMessageSchema>) {
  const result = sendWhatsAppMessageSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: "Invalid input" };
  }
  const { leadId, content, messageId } = result.data;

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getClaims();
    if (!authData?.claims) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Verify lead assignment and access (RLS handles scoping)
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, external_id, source")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return { success: false, error: "Lead not found or access denied" };
    }

    if (lead.source !== "whatsapp" || !lead.external_id) {
      return { success: false, error: "Lead is not a WhatsApp contact" };
    }

    // 2. Check 24-hour window
    const { data: lastInbound, error: inboundError } = await supabase
      .from("message_log")
      .select("created_at")
      .eq("lead_id", leadId)
      .eq("channel", "whatsapp")
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (inboundError || !lastInbound) {
      return { success: false, error: "No inbound messages found. 24-hour window expired." };
    }

    const lastInboundTime = new Date(lastInbound.created_at);
    if (lastInboundTime < twentyFourHoursAgo) {
      return { success: false, error: "24-hour window expired. Use an approved template." };
    }

    // 3. Get token and phone number ID (DB-first, env-var fallback)
    const token = await getWhatsAppToken();
    const phoneNumberId = await getWhatsAppPhoneNumberId();

    if (!phoneNumberId || !token) {
      return { success: false, error: "WhatsApp integration not configured. Contact admin." };
    }

    // 4. Send WhatsApp Message (Cloud API POST — free-form text, only within 24h window)
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: lead.external_id,
        type: "text",
        text: {
          preview_url: false,
          body: content,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("[WhatsApp Outbound] API Error:", errorData);
      return { success: false, error: "Failed to send message via WhatsApp" };
    }

    // 5. Log to message_log (uses caller's session — INSERT RLS policy required on message_log)
    const { error: logError } = await supabase
      .from("message_log")
      .insert({
        ...(messageId ? { id: messageId } : {}),
        lead_id: leadId,
        channel: "whatsapp",
        direction: "outbound",
        message_type: "text",
        content: content,
      });

    if (logError) {
      console.error("[WhatsApp Outbound] Failed to log message:", logError);
      return { success: false, error: "Message sent, but failed to log in CRM" };
    }

    return { success: true };

  } catch (error) {
    console.error("[WhatsApp Outbound] Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
