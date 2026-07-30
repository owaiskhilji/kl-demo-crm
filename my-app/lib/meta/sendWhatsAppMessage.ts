"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";
import { z } from "zod";

/**
 * Reads the WhatsApp access token from integration_connections (preferred, encrypted at rest)
 * with a fallback to the WHATSAPP_ACCESS_TOKEN env var for local dev / bootstrap.
 *
 * This is the SAME pattern used by the inbound webhook (app/api/webhooks/whatsapp/route.ts).
 * Both inbound and outbound paths must read from the same source so that when
 * tokenRefresh.ts updates the DB token, outbound messages immediately pick it up.
 */
async function getWhatsAppToken(): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("integration_connections")
      .select("access_token")
      .eq("channel", "whatsapp")
      .eq("status", "active")
      .single();

    if (error) {
      console.error("[WhatsApp Outbound] Error fetching token from DB:", error);
    } else if (data?.access_token) {
      return decrypt(data.access_token);
    }
  } catch (err) {
    console.error("[WhatsApp Outbound] Unexpected error fetching token from DB:", err);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("[WhatsApp Outbound] FATAL: No active DB token found for WhatsApp in production. Refusing to fall back to env var.");
    return null;
  }

  console.warn("[WhatsApp Outbound] WARNING: No DB token found, falling back to WHATSAPP_ACCESS_TOKEN env var — this should not happen in production.");
  return process.env.WHATSAPP_ACCESS_TOKEN || null;
}

/**
 * Reads the WhatsApp phone_number_id from integration_connections,
 * falling back to WHATSAPP_PHONE_NUMBER_ID env var.
 */
async function getWhatsAppPhoneNumberId(): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("integration_connections")
      .select("phone_number_id")
      .eq("channel", "whatsapp")
      .eq("status", "active")
      .single();

    if (error) {
      console.error("[WhatsApp Outbound] Error fetching phone_number_id from DB:", error);
    } else if (data?.phone_number_id) {
      return data.phone_number_id;
    }
  } catch (err) {
    console.error("[WhatsApp Outbound] Unexpected error fetching phone_number_id from DB:", err);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("[WhatsApp Outbound] FATAL: No active DB phone_number_id found in production. Refusing to fall back to env var.");
    return null;
  }

  console.warn("[WhatsApp Outbound] WARNING: No DB phone_number_id found, falling back to env var — this should not happen in production.");
  return process.env.WHATSAPP_PHONE_NUMBER_ID || null;
}

const sendWhatsAppMessageSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().min(1, "Message content cannot be empty"),
});

export async function sendWhatsAppMessage(input: z.infer<typeof sendWhatsAppMessageSchema>) {
  const result = sendWhatsAppMessageSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: "Invalid input" };
  }
  const { leadId, content } = result.data;

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

    // 3. Get token from integration_connections (same source as inbound webhook)
    const token = await getWhatsAppToken();
    const phoneNumberId = await getWhatsAppPhoneNumberId();

    if (!phoneNumberId || !token) {
      return { success: false, error: "WhatsApp integration not configured" };
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
      console.error("WhatsApp API Error:", errorData);
      return { success: false, error: "Failed to send message via WhatsApp" };
    }

    // 5. Log to message_log (uses caller's session — INSERT RLS policy required on message_log)
    const { error: logError } = await supabase
      .from("message_log")
      .insert({
        lead_id: leadId,
        channel: "whatsapp",
        direction: "outbound",
        message_type: "text",
        content: content,
      });

    if (logError) {
      console.error("Failed to log message:", logError);
      return { success: false, error: "Message sent, but failed to log in CRM" };
    }

    return { success: true };

  } catch (error) {
    console.error("Unexpected error in sendWhatsAppMessage:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
