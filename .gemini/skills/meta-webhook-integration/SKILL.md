---
name: meta-webhook-integration
description: Guides the agent through implementing or modifying the Facebook, WhatsApp, or Instagram webhook integrations in Central Homes CRM — signature verification, lead ingestion, idempotency, and the WhatsApp 24-hour messaging window. Use when building any /api/webhooks/* route, debugging duplicate leads, or working on Meta token lifecycle management.
---

# Meta Webhook Integration (Facebook / WhatsApp / Instagram)

## When to use this skill
- Building or editing `app/api/webhooks/whatsapp`, `app/api/webhooks/facebook`, or `app/api/webhooks/instagram`
- Debugging duplicate leads from webhook retries
- Implementing or fixing the WhatsApp 24-hour session-window logic
- Working on Meta access token storage or refresh

## Core rule — never trust an unverified payload
Every webhook POST from Meta is signed with an `X-Hub-Signature-256` header (HMAC-SHA256 computed with `META_APP_SECRET`). Verify this signature before doing anything with the payload. An unverified webhook body must be treated as hostile input — this is the only thing standing between the system and spoofed lead injection, since these endpoints bypass Supabase Auth entirely (Meta doesn't log in as a user).

## Shared webhook subscription pattern (all 3 channels)
```
GET /api/webhooks/{channel}?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y
  → return hub.challenge as plain text if verify_token matches WEBHOOK_VERIFY_TOKEN

POST /api/webhooks/{channel}
  → verify X-Hub-Signature-256 against META_APP_SECRET before parsing/using the body
```
`WEBHOOK_VERIFY_TOKEN` (GET handshake) and `META_APP_SECRET` (POST signature) are different secrets with different purposes — never conflate them.

## Channel-specific notes

### WhatsApp Cloud API
- Payload shape is the real WhatsApp Cloud API format (nested `entry[].changes[].value.messages[]`), not a custom shape — don't invent a simplified schema.
- Upsert the lead on `(external_id = from, source = 'whatsapp')` using the unique index on `leads (external_id, source)` — this makes retries idempotent instead of creating duplicate leads.
- Log every inbound/outbound message to `message_log`.
- Respond with 200 within 20 seconds; Meta disables webhooks that are consistently slow.
- **24-hour session window:** free-form replies are only allowed within 24h of the customer's last inbound message. Outside that window, only pre-approved template messages can be sent. Any "reply on WhatsApp" UI must check `message_log` for the last inbound timestamp and switch to template-only mode when expired.

### Facebook Lead Ads
- The webhook payload only contains a `leadgen_id` and `page_id` — not the actual form answers. A separate authenticated Graph API call is required: `GET https://graph.facebook.com/v21.0/{leadgen_id}?access_token={page_access_token}`.
- Lead Ad form field mapping must be configurable, not hardcoded — different agencies' forms are not standardized.
- Upsert on `external_id = leadgen_id`.

### Instagram
- Rides on the same Page's webhook subscription (`messaging` field) — Instagram messaging only works through a Page linked to an Instagram Professional/Business account.
- Mirrors the WhatsApp flow: verify signature → upsert by IG sender id → log to `message_log`.

## After ingestion
Every successfully ingested lead (all three channels) should be routed through the auto-assignment logic — see the `lead-auto-assignment` skill — not assigned inline in the webhook handler itself.

## Token lifecycle
- Short-lived user tokens (1–2h) must be exchanged for long-lived Page/WABA tokens (~60 days) at connect time.
- Long-lived tokens do not auto-refresh. A scheduled job must refresh them before expiry and update `integration_connections`.
- On refresh failure, flip `integration_connections.status = 'expired'` and surface this in the `/integrations` UI — never fail silently, since agents will otherwise assume leads are still flowing in when they aren't.

## Common mistakes to avoid
- Parsing and acting on the webhook body before verifying the signature.
- Building a custom/simplified payload schema instead of matching Meta's actual documented shape.
- Missing the unique index on `(external_id, source)`, which allows webhook retries to create duplicate leads.
- Sending a free-form WhatsApp message outside the 24-hour window instead of falling back to a template.
- Storing `access_token` in plaintext — must be encrypted at rest (see the `rls-policy-pattern` and general security checkpoints).

## Reference
See CLAUDE.md / GEMINI.md §7 for the full prerequisites (App Review, Business verification) and code examples.
