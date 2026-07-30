import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/meta/verifyWebhookSignature";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLeastLoadedAgent } from "@/lib/utils/leadAssignment";
import { fetchFacebookLead, mapFacebookLeadFields } from "@/lib/meta/graphApiClient";
import { decrypt } from "@/lib/utils/encryption";

// 1. GET: Verify Token Handshake (Hub Challenge)
export async function GET(request: NextRequest) {
  try {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("[Facebook Webhook] GET Request received. Mode:", mode, "Token:", token, "Challenge:", challenge);
  console.log("[Facebook Webhook] ENV WEBHOOK_VERIFY_TOKEN:", process.env.WEBHOOK_VERIFY_TOKEN);
  console.log("[Facebook Webhook] ENV META_APP_SECRET:", process.env.META_APP_SECRET);

  // Re-using the same WEBHOOK_VERIFY_TOKEN for all Meta Webhooks
  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("[Facebook Webhook] Verified handshake successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });  
  } catch (error) {
    console.error("[Facebook Webhook] Error verifying token:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
  
}

// 2. POST: Receive Leadgen Event
// export async function POST(request: NextRequest) {
//   try {
//     const rawBody = await request.text();
//      const signature = request.headers.get("x-hub-signature-256");

//     // A. Verify Signature using the shared utility
//     if (!verifyWebhookSignature(rawBody, signature)) {
//       console.warn("[Facebook Webhook] Invalid or missing X-Hub-Signature-256");
//       return new NextResponse("Unauthorized", { status: 401 });
//     }

//     const body = JSON.parse(rawBody);

//     // B. Process the Facebook Page event payload
//     if (body.object === "page") {
//       for (const entry of body.entry || []) {
//         for (const change of entry.changes || []) {
          
//           // Verify this is specifically a leadgen event, not a page comment or like
//           if (change.field === "leadgen") {
//             const value = change.value;
//             const leadgenId = value.leadgen_id;
//             const pageId = value.page_id;

//             if (!leadgenId || !pageId) continue;

//             const supabase = createAdminClient();

//             try {
//               // C. Token Retrieval (from DB or Env fallback)
//               let accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
              
//               const { data: connection } = await supabase
//                 .from("integration_connections")
//                 .select("access_token")
//                 .eq("channel", "facebook")
//                 .eq("page_id", pageId)
//                 .eq("status", "active")
//                 .single();
                
//               if (connection?.access_token) {
//                 const decrypted = decrypt(connection.access_token);
//                 if (decrypted) accessToken = decrypted;
//               }

//               if (!accessToken) {
//                 console.error(`[Facebook Webhook] No access token available for page ${pageId}`);
//                 // Continue to next change, don't break the whole batch
//                 continue; 
//               }

//               // D. Fetch full lead data from Graph API (since webhook only gives IDs)
//               const fbLead = await fetchFacebookLead(leadgenId, accessToken);
              
//               // E. Dynamic Field Mapping
//               const mappedData = mapFacebookLeadFields(fbLead.field_data);

//               // F. Idempotent Upsert (using external_id + source)
//               let leadId = null;
//               const { data: existingLead } = await supabase
//                 .from("leads")
//                 .select("id")
//                 .eq("external_id", leadgenId)
//                 .eq("source", "facebook")
//                 .single();

//               if (existingLead) {
//                 leadId = existingLead.id;
//               } else {
//                 // G. Auto-Assign Lead
//                 const assignedAgentId = await getLeastLoadedAgent(supabase);

//                 const { data: newLead, error: insertError } = await supabase
//                   .from("leads")
//                   .insert({
//                     name: mappedData.name,
//                     phone: mappedData.phone,
//                     email: mappedData.email,
//                     area: mappedData.area,
//                     budget: mappedData.budget,
//                     source: "facebook",
//                     external_id: leadgenId, // Key for idempotency
//                     assigned_to: assignedAgentId,
//                     assignment_type: "auto",
//                     stage: "new_lead",
//                     raw_payload: fbLead, // Store Graph API response, not just the webhook payload
//                   })
//                   .select("id")
//                   .single();

//                 if (insertError) {
//                   if (insertError.code === '23505') {
//                     // Retry on unique constraint violation race-condition
//                     const { data: retryLead } = await supabase
//                       .from("leads")
//                       .select("id")
//                       .eq("external_id", leadgenId)
//                       .eq("source", "facebook")
//                       .single();
//                     leadId = retryLead?.id;
//                   } else {
//                     console.error("[Facebook Webhook] Lead creation failed:", insertError);
//                   }
//                 } else {
//                   // Log lead activity for the audit trail
//                   await supabase.from("lead_activities").insert({
//                     lead_id: newLead.id,
//                     action: "LEAD_CREATED",
//                     new_value: "facebook",
//                   });

//                   leadId = newLead.id;
//                 }
//               }

//             } catch (innerError) {
//               console.error("[Facebook Webhook] Error processing individual leadgen event:", innerError);

//              const failed_webhook_events=   await supabase.from("failed_webhook_events").insert({
//                 source: "facebook",
//                 leadgen_id: leadgenId,
//                 page_id: pageId,
//                 error_message: String(innerError),
//                 raw_payload: change,
//                 created_at: new Date().toISOString(),
//             });

//              if (failed_webhook_events.error) {
//                   console.log("[Facebook Webhook] ...................................", failed_webhook_events.error);
//                   console.error("[Facebook Webhook] Failed to insert failed webhook event:", failed_webhook_events.error);
//                 }


//             }
//           }
//         }
//       }
//     }

//     // Always return 200 OK within 20 seconds
//     return new NextResponse("EVENT_RECEIVED", { status: 200 });

//   } catch (error) {
//     console.error("[Facebook Webhook] Processing error:", error);
//     // Return 200 to prevent Meta from retrying indefinitely on bad payload
//     return new NextResponse("EVENT_RECEIVED", { status: 200 });
//   }
// }



// 2. POST: Receive Leadgen Event
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    // A. Verify Signature using the shared utility
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Facebook Webhook] Invalid or missing X-Hub-Signature-256");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // ⚡ CRITICAL FIX: Meta ko response block kiye bina background me process karein
    if (body.object === "page") {
      // Hum function ko await NAHI karenge, taaki yeh background me chalta rahe
      processPayloadInBackground(body).catch((err) => {
        console.error("[Facebook Webhook] Background processing unhandled error:", err);
      });
    }

    // 🚀 META KO FAURAN 200 OK BHEJEIN (Under 1 Second)
    // Is se Testing Tool me status fauran "Success" ho jayega
    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (error) {
    console.error("[Facebook Webhook] Processing error:", error);
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }
}

// 📦 Saara heavy loading aur database ka kaam is alag function me shift kar diya
async function processPayloadInBackground(body: any) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      
      if (change.field === "leadgen") {
        const value = change.value;
        const leadgenId = value.leadgen_id;
        const pageId = value.page_id;

        if (!leadgenId || !pageId) continue;

        const supabase = createAdminClient();

        try {
          let accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
          
          const { data: connection } = await supabase
            .from("integration_connections")
            .select("access_token")
            .eq("channel", "facebook")
            .eq("page_id", pageId)
            .eq("status", "active")
            .single();
            
          if (connection?.access_token) {
            const decrypted = decrypt(connection.access_token);
            if (decrypted) accessToken = decrypted;
          }

          if (!accessToken) {
            console.error(`[Facebook Webhook] No access token available for page ${pageId}`);
            continue; 
          }

          // Fetch full lead data from Graph API
          const fbLead = await fetchFacebookLead(leadgenId, accessToken);
          const mappedData = mapFacebookLeadFields(fbLead.field_data);

          let leadId = null;
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("external_id", leadgenId)
            .eq("source", "facebook")
            .single();

          if (existingLead) {
            leadId = existingLead.id;
          } else {
            const assignedAgentId = await getLeastLoadedAgent(supabase);

            const { data: newLead, error: insertError } = await supabase
              .from("leads")
              .insert({
                name: mappedData.name,
                phone: mappedData.phone,
                email: mappedData.email,
                area: mappedData.area,
                budget: mappedData.budget,
                source: "facebook",
                external_id: leadgenId,
                assigned_to: assignedAgentId,
                assignment_type: "auto",
                stage: "new_lead",
                raw_payload: fbLead,
              })
              .select("id")
              .single();

            if (insertError) {
              if (insertError.code === '23505') {
                const { data: retryLead } = await supabase
                  .from("leads")
                  .select("id")
                  .eq("external_id", leadgenId)
                  .eq("source", "facebook")
                  .single();
                leadId = retryLead?.id;
              } else {
                console.error("[Facebook Webhook] Lead creation failed:", insertError);
              }
            } else {
              await supabase.from("lead_activities").insert({
                lead_id: newLead.id,
                action: "LEAD_CREATED",
                new_value: "facebook",
              });
              leadId = newLead.id;
            }
          }

        } catch (innerError) {
          console.error("[Facebook Webhook] Error processing individual leadgen event:", innerError);
          await supabase.from("failed_webhook_events").insert({
            source: "facebook",
            leadgen_id: leadgenId,
            page_id: pageId,
            error_message: String(innerError),
            raw_payload: change,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }
}
