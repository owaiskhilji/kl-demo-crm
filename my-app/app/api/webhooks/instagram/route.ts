import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/meta/verifyWebhookSignature";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLeastLoadedAgent } from "@/lib/utils/leadAssignment";










// 1. GET: Verify Token Handshake
// Instagram DMs route through the connected Facebook Page's webhook subscription,
// but Meta may still send a verification challenge to this specific callback URL
// if it's registered separately in the App Dashboard. Mirror the standard pattern.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("[Instagram Webhook] Verified handshake successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// 2. POST: Receive Instagram DM Events
export async function POST(request: NextRequest) {
  console.log("\n[Instagram Webhook] === NEW POST REQUEST RECEIVED ===");
  try {
    const rawBody = await request.text();
    console.log("[Instagram Webhook] Raw Body:", rawBody);
    
    const signature = request.headers.get("x-hub-signature-256");
    console.log("[Instagram Webhook] Signature Header:", signature);

    // A. Verify Signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Instagram Webhook] ❌ Invalid or missing X-Hub-Signature-256");
      return new NextResponse("Unauthorized", { status: 401 });
    }
    console.log("[Instagram Webhook] ✅ Signature verified successfully");

    const body = JSON.parse(rawBody);
    console.log("[Instagram Webhook] Parsed JSON Body Object:", body.object);

    // B. Process the Instagram messaging payload
    if (body.object === "instagram") {
      console.log(`[Instagram Webhook] Found ${body.entry?.length || 0} entries`);
      
      for (const entry of body.entry || []) {
        console.log(`[Instagram Webhook] Processing entry ID: ${entry.id}, messaging count: ${entry.messaging?.length || 0}`);
        
        // Instagram DMs use entry[].messaging[]
        for (const event of entry.messaging || []) {
          try {
            console.log("[Instagram Webhook] Event detail:", JSON.stringify(event));
            
            // Skip non-message events
            if (!event.message) {
              console.log("[Instagram Webhook] ⏩ Skipping non-message event");
              continue;
            }

            const senderId = event.sender?.id;
            if (!senderId) {
              console.log("[Instagram Webhook] ❌ No sender ID found, skipping");
              continue;
            }
            
            console.log(`[Instagram Webhook] Valid message from sender: ${senderId}`);

            const messageType = event.message.attachments?.[0]?.type || "text";
            const messageText = event.message.text || `[Received ${messageType} message]`;
            console.log(`[Instagram Webhook] Message type: ${messageType}, text: ${messageText}`);

            const supabase = createAdminClient();

            // C. Lead Ingestion (Idempotent Upsert)
            let leadId = null;

            console.log(`[Instagram Webhook] Checking if lead exists for external_id: ${senderId}`);
            const { data: existingLead } = await supabase
              .from("leads")
              .select("id")
              .eq("external_id", senderId)
              .eq("source", "instagram")
              .single();

            if (existingLead) {
              console.log(`[Instagram Webhook] Lead already exists! ID: ${existingLead.id}`);
              leadId = existingLead.id;
            } else {
              console.log("[Instagram Webhook] New lead detected. Assigning agent...");
              const assignedAgentId = await getLeastLoadedAgent(supabase);
              console.log(`[Instagram Webhook] Assigned agent ID: ${assignedAgentId}`);

              const { data: newLead, error: insertError } = await supabase
                .from("leads")
                .insert({
                  name: `Instagram User ${senderId}`,
                  phone: "No phone provided",
                  source: "instagram",
                  external_id: senderId,
                  assigned_to: assignedAgentId,
                  assignment_type: "auto",
                  stage: "new_lead",
                  raw_payload: body,
                })
                .select("id")
                .single();

              if (insertError) {
                if (insertError.code === "23505") {
                  console.log("[Instagram Webhook] Race condition on insert (23505), retrying fetch...");
                  const { data: retryLead } = await supabase
                    .from("leads")
                    .select("id")
                    .eq("external_id", senderId)
                    .eq("source", "instagram")
                    .single();
                  leadId = retryLead?.id;
                  console.log(`[Instagram Webhook] Recovered lead ID: ${leadId}`);
                } else {
                  console.error("[Instagram Webhook] ❌ Lead creation failed:", insertError);
                }
              } else {
                console.log(`[Instagram Webhook] ✅ New lead created! ID: ${newLead.id}`);
                
                await supabase.from("lead_activities").insert({
                  lead_id: newLead.id,
                  action: "LEAD_CREATED",
                  new_value: "instagram",
                });
                console.log("[Instagram Webhook] Lead activity logged");

                leadId = newLead.id;
              }
            }

            // D. Log message to message_log
            if (leadId) {
              console.log(`[Instagram Webhook] Saving message to log for lead: ${leadId}`);
              const { error: logError } = await supabase
                .from("message_log")
                .insert({
                  lead_id: leadId,
                  channel: "instagram",
                  direction: "inbound",
                  message_type: messageType,
                  content: messageText,
                });

              if (logError) {
                console.error("[Instagram Webhook] ❌ Message logging failed:", logError);
              } else {
                console.log("[Instagram Webhook] ✅ Message logged successfully");
              }
            }
          } catch (innerError) {
            console.error("[Instagram Webhook] ❌ Error processing individual message:", innerError);
          }
        }
      }
    } else {
      console.log(`[Instagram Webhook] ⏩ Ignored payload with object type: ${body.object}`);
    }

    console.log("[Instagram Webhook] === REQUEST PROCESSED SUCCESSFULLY ===");
    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (error) {
    console.error("[Instagram Webhook] ❌ Processing error at top level:", error);
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }
}
