import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/meta/verifyWebhookSignature";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLeastLoadedAgent } from "@/lib/utils/leadAssignment";


// 1. GET: Verify Token Handshake (Hub Challenge)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // WEBHOOK_VERIFY_TOKEN is the arbitrary string we configure in the Meta App Dashboard
  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verified handshake successfully");
    // Must return the challenge exactly as plain text
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// 2. POST: Receive Messages and Status Updates
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    console.log("[WhatsApp Webhook] 🚨 RAW PAYLOAD RECEIVED:", rawBody);

    const signature = request.headers.get("x-hub-signature-256");
    console.log("[WhatsApp Webhook] Signature header:", signature);

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[WhatsApp Webhook] ❌ Invalid or missing X-Hub-Signature-256");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("[WhatsApp Webhook] ✅ Signature verified. Object type:", body.object);

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          
          // Iterate over all messages in the batch (usually 1, but can be multiple)
          for (const message of value?.messages || []) {
            try {
              const contact = value.contacts?.find((c: any) => c.wa_id === message.from) || value.contacts?.[0];

              const externalId = message.from; // Phone number without '+'
              const customerName = contact?.profile?.name || "Unknown WhatsApp User";
              const messageType = message.type;
              const messageText = messageType === "text" ? message.text.body : `[Received ${messageType} message]`;
              
              // Webhooks run without a user session, so we MUST use the service-role client
              const supabase = createAdminClient();

              // D. Lead Ingestion (Idempotent Upsert pattern)
              let leadId = null;

              // 1. Check if lead already exists
              const { data: existingLead } = await supabase
                .from("leads")
                .select("id")
                .eq("external_id", externalId)
                .eq("source", "whatsapp")
                .single();

              if (existingLead) {
                leadId = existingLead.id;
              } else {
                // 2. If new lead, auto-assign to the least loaded agent
                const assignedAgentId = await getLeastLoadedAgent(supabase);

                const { data: newLead, error: insertError } = await supabase
                  .from("leads")
                  .insert({
                    name: customerName,
                    phone: externalId, // WhatsApp requires phone number
                    source: "whatsapp",
                    external_id: externalId, // Prevents duplicates via unique index
                    assigned_to: assignedAgentId,
                    assignment_type: "auto",
                    stage: "new_lead",
                    raw_payload: body, // Keep raw payload for debugging
                  })
                  .select("id")
                  .single();

                if (insertError) {
                  // If two webhook retries hit this exactly at the same time, the second one 
                  // fails the unique index constraint (23505). Recover gracefully by fetching again.
                  if (insertError.code === '23505') {
                    const { data: retryLead } = await supabase
                      .from("leads")
                      .select("id")
                      .eq("external_id", externalId)
                      .eq("source", "whatsapp")
                      .single();
                    leadId = retryLead?.id;
                  } else {
                    console.error("[WhatsApp Webhook] Lead creation failed:", insertError);
                  }
                } else {
                  // Log lead activity for the audit trail
                  await supabase.from("lead_activities").insert({
                    lead_id: newLead.id,
                    action: "LEAD_CREATED",
                    new_value: "whatsapp",
                  });

                  leadId = newLead.id;
                }
              }

              // E. Log message to message_log for 24h compliance tracking
              if (leadId) {
                const { error: logError } = await supabase
                  .from("message_log")
                  .insert({
                    lead_id: leadId,
                    channel: "whatsapp",
                    direction: "inbound",
                    message_type: messageType,
                    content: messageText,
                  });
                  
                if (logError) console.error("[WhatsApp Webhook] Message logging failed:", logError);
              }
            } catch (innerError) {
              console.error("[WhatsApp Webhook] Error processing individual message:", innerError);
              // Continue to the next message instead of breaking the entire batch
            }
          }
        }
      }
    }

    // F. Always return 200 OK within 20 seconds to prevent Meta from retrying
    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (error) {
    console.error("[WhatsApp Webhook] Processing error:", error);
    // Return 200 to prevent Meta from retrying indefinitely and disabling the webhook
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }
}
