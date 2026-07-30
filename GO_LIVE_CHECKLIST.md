# 🚀 Central Homes CRM — Go-Live Checklist

> **IMPORTANT:** Complete ALL steps below before handing the system over to the actual client.
> Do NOT skip any step, even if the system appears to be working in testing.

---

## 1. Meta App — Facebook Account Setup

- [ ] Add **client's personal Facebook account** to Meta App Dashboard → **App Roles** as `Administrator` or `Developer`
- [ ] Ensure the client's Facebook account manages their **real Business Page** (not any test page)
- [ ] If Meta App is still in **Development Mode**, either:
  - Switch App to **Live Mode** (requires App Review for advanced scopes like `leads_retrieval`), OR
  - Keep in Development Mode and add the client's account as Tester

---

## 2. Facebook Integration — Reconnect with Real Page

- [ ] Log in as **owner/manager** and go to `/integrations`
- [ ] Click **Reconnect** on the Facebook card
- [ ] During Facebook's permission dialog, select the client's **real Business Page** (not the "Central Home CRM" test page)
- [ ] Confirm the new `integration_connections` row shows the correct `page_id`
- [ ] Delete any old test rows in `integration_connections` that have the wrong `page_id`

---

## 3. WhatsApp — Real Business Account Token

> ⚠️ The current WhatsApp token is tied to Meta's **"Test WhatsApp Business Account"** and will NOT work for the client's real number.

- [ ] Go to **Meta Business Manager** → WhatsApp → API Setup for the client's real WABA
- [ ] Create/use a **System User** in that Business Manager with `whatsapp_business_messaging` permission
- [ ] Generate a **new Permanent System User Token** for that System User
- [ ] Encrypt the new token using the encryption script (see `supabase/migrations/006_whatsapp_connection_seed.sql`)
- [ ] Update `integration_connections` row for `channel = 'whatsapp'`:
  - `access_token` → new encrypted token
  - `phone_number_id` → client's real Phone Number ID
- [ ] Update Vercel Environment Variable `WHATSAPP_PHONE_NUMBER_ID` to the client's real number ID
- [ ] Update Vercel Environment Variable `WHATSAPP_ACCESS_TOKEN` (env var fallback) to the new token

---

## 4. Vercel Environment Variables — Final Check

Confirm ALL of these are set to **production** values in Vercel Dashboard → Settings → Environment Variables:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Never expose client-side |
| `NEXT_PUBLIC_APP_URL` | `https://centralhomes.vercel.app` (no trailing slash) |
| `ENCRYPTION_KEY` | 64-char hex string — same key used to encrypt DB tokens |
| `META_APP_ID` | Client's Meta App ID |
| `META_APP_SECRET` | Client's Meta App Secret |
| `WEBHOOK_VERIFY_TOKEN` | Your custom verify token string |
| `WHATSAPP_ACCESS_TOKEN` | Client's real permanent System User token |
| `WHATSAPP_PHONE_NUMBER_ID` | Client's real WhatsApp Phone Number ID |
| `CRON_SECRET` | No trailing `>` character (was found during testing) |

---

## 5. Data Cleanup — Remove All Test Data

Run the following in **Supabase Dashboard → SQL Editor**:

```sql
-- 1. Delete test leads (review before deleting!)
-- DELETE FROM leads WHERE created_at < '2026-07-16' AND source IN ('facebook','whatsapp','instagram');

-- 2. Delete test integration_connections (old page_id / test WABA)
-- DELETE FROM integration_connections WHERE page_id = '<test_page_id>';

-- 3. Verify only 1 active row per channel remains
SELECT channel, page_id, phone_number_id, status, token_expires_at
FROM integration_connections
ORDER BY channel;
```

> **Do NOT run the DELETE statements blindly** — review the rows first and only delete test/placeholder rows.

---

## 6. End-to-End Verification (Client's Real Channels)

- [ ] **Facebook Lead Ads:** Submit a real test lead through the client's actual Facebook Lead Ad form → confirm it appears in `/leads` within ~1 minute
- [ ] **WhatsApp:** Send a WhatsApp message to the client's real business number → confirm a new lead is created in `/leads`
- [ ] **Instagram:** Send a DM to the client's connected Instagram account → confirm a new lead is created in `/leads`
- [ ] **Pipeline:** Move a test lead through all 7 stages via drag-and-drop → confirm each move persists
- [ ] **Notifications:** Schedule a follow-up for today → confirm badge appears in Topbar that evening
- [ ] **Token Refresh Cron:** Check Vercel Cron logs the next morning → confirm Facebook token was processed (or skipped if not near expiry)

---

## 7. Final Handoff

- [ ] Create the client's **owner account** in Supabase Auth (or via `/agents` as owner role)
- [ ] Have client log in, change password, and confirm they can see their dashboard
- [ ] Brief client on: adding agents via `/agents`, reconnecting channels if token expires, and the `/reports` page
- [ ] Archive or delete all developer/test agent accounts

---

*Last updated: 2026-07-16 | Developer: Owais Khilji*
