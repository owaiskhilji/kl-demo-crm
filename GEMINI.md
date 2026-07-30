## 0. AGENT ROLE & WORKING STYLE

You are acting as a senior software architect with 20+ years of experience building 
production CRM systems — not a tutorial-following code generator. Apply that experience 
to every task in this file:

- Think through edge cases before writing code, not after a bug report. If a task has an 
  obvious failure mode (empty state, race condition, duplicate webhook retry, expired 
  token), handle it in the first version, don't leave a TODO.
- Follow the `error-handling-pattern` skill on every function that can fail — no empty 
  catch blocks, no swallowed errors, no raw error objects shown to end users.
- Write clean, readable code: meaningful names, small functions, no premature abstraction, 
  no clever one-liners that sacrifice clarity.
- When a requirement is ambiguous, make the most reasonable senior-engineer decision and 
  state the assumption in a code comment — don't guess silently, and don't stop to ask 
  unless the ambiguity is genuinely blocking.
- Never skip the security checkpoints in §9 to move faster. Never use `getSession()` for 
  authorization. Never expose the service-role key client-side.
- Before marking any milestone complete, mentally check it against the relevant skill(s) 
  in `.gemini/skills/` — treat them as a senior reviewer would, not as optional reading.
- If something in this spec looks wrong or outdated once you're actually implementing it, 
  say so explicitly rather than silently working around it.


# 🏢 KL Demo CRM — Project Specification (GEMINI.md)

> **Stack:** Next.js 16 (App Router) · Supabase (Auth + DB + Realtime) · Tailwind CSS · shadcn/ui
> **Target:** Pakistani Real Estate Agencies (50–500 employees)
> **Scope:** 7 Core Modules + Meta Lead Webhooks + Admin-Managed Agent Accounts + Auto Lead Distribution + Date-Triggered Follow-Up Notifications

> ✅ **Decision resolved (2026-07-08): Single-tenant.** This CRM is a custom build for one agency (KL Demo CRM). No `agency_id` column, no tenant isolation, no multi-tenant RLS scoping. All tables and policies are scoped by `auth.uid()` + role only.

---

## 1. PROJECT OVERVIEW

| Attribute        | Detail                                      |
|------------------|----------------------------------------------|
| Project Name     | KL Demo CRM                                      |
| Version          | 1.0.0                                       |
| Framework        | Next.js 16 (App Router, TypeScript)         |
| Backend          | Supabase (PostgreSQL + Auth + Realtime)     |
| Styling          | Tailwind CSS + shadcn/ui                    |
| Deployment       | Vercel (Frontend) + Supabase Cloud (Backend)|
| Auth Strategy    | Supabase Auth, admin-provisioned agent accounts, enforced via `getClaims()`/`getUser()` — never `getSession()` for authorization |

---

## 2. FOLDER STRUCTURE

```
central-homes/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Server Layout Guard — verifies session, defense layer 2
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── leads/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── pipeline/
│   │   │   └── page.tsx
│   │   ├── follow-ups/
│   │   │   └── page.tsx
│   │   ├── properties/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── agents/
│   │   │   ├── page.tsx          # Agent list + stats + "Add Agent" button
│   │   │   └── actions.ts        # createAgent() Server Action — admin-only signup
│   │   ├── integrations/
│   │   │   └── page.tsx          # connect/manage FB, WhatsApp, IG — owner/manager only
│   │   └── reports/
│   │       └── page.tsx
│   └── api/
│       ├── leads/
│       │   └── route.ts          # POST /api/leads — generic + Facebook Lead Ads via Zapier
│       ├── notifications/
│       │   └── cron/
│       │       └── route.ts      # daily job: flips due follow-up notifications
│       └── webhooks/
│           ├── whatsapp/
│           │   └── route.ts      # GET (verify) + POST (receive) — WhatsApp Cloud API
│           ├── facebook/
│           │   └── route.ts      # GET (verify) + POST (receive) — Facebook Leadgen webhook
│           └── instagram/
│               └── route.ts      # POST — Instagram DM → lead intake
├── components/
│   ├── ui/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx            # includes NotificationBell (realtime badge)
│   │   └── MobileNav.tsx
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── LeadSourceChart.tsx
│   │   └── RecentLeads.tsx
│   ├── leads/
│   │   ├── LeadTable.tsx
│   │   ├── LeadForm.tsx
│   │   └── LeadStatusBadge.tsx
│   ├── pipeline/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── LeadCard.tsx
│   ├── follow-ups/
│   │   ├── FollowUpList.tsx
│   │   └── FollowUpForm.tsx
│   ├── properties/
│   │   ├── PropertyCard.tsx
│   │   └── PropertySearch.tsx
│   ├── agents/
│   │   ├── AgentTable.tsx
│   │   └── AddAgentDialog.tsx    # NEW: name/email/password form, calls createAgent()
│   ├── integrations/
│   │   ├── MetaConnectCard.tsx
│   │   └── WebhookStatus.tsx
│   └── reports/
│       ├── AgentPerformance.tsx
│       └── ConversionFunnel.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client — ANON KEY ONLY (createBrowserClient)
│   │   ├── server.ts             # Server client — Server Components/Actions/Route Handlers
│   │   ├── admin.ts              # NEW: service-role client, server-only, used ONLY by
│   │   │                          #   createAgent() and webhook lead-insert paths
│   │   └── proxy.ts              # Session refresh logic — imported by root proxy.ts
│   ├── meta/
│   │   ├── verifyWebhookSignature.ts   # X-Hub-Signature-256 (HMAC-SHA256) validation
│   │   ├── whatsappClient.ts           # send template/session messages
│   │   ├── graphApiClient.ts           # FB/IG Graph API wrapper
│   │   └── tokenRefresh.ts             # long-lived token refresh cron
│   ├── hooks/
│   │   ├── useLeads.ts
│   │   ├── usePipeline.ts
│   │   ├── useProperties.ts
│   │   ├── useAgents.ts
│   │   └── useNotifications.ts   # NEW: realtime subscription to `notifications`
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── formatters.ts
│       ├── constants.ts
│       └── leadAssignment.ts     # least-loaded auto-assignment (not naive round-robin)
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_seed_data.sql
│   │   ├── 004_integrations_schema.sql
│   │   └── 005_notifications_schema.sql   # NEW
│   └── functions/
├── proxy.ts                      # Next.js 16 root convention — see §5 for exact contract
├── .env.local
└── CLAUDE.md
```

---

## 3. WHAT CHANGED IN NEXT.JS 16 — VERIFIED, NOT ASSUMED

Source: official Next.js 16 upgrade guide, nextjs.org/docs/app/guides/upgrading/version-16.

| Old (`middleware.ts`) | New (`proxy.ts`) |
|---|---|
| Exported function `middleware()` | Exported function `proxy()` — rename required (default *or* named export both work, name is what matters) |
| Ran on Edge Runtime by default | Runs on **Node.js runtime only — not configurable** |
| Config flag `skipMiddlewareUrlNormalize` | Renamed to `skipProxyUrlNormalize` |
| — | Official codemod: `npx @next/codemod@canary middleware-to-proxy .` — mechanical rename only, doesn't validate logic |

`middleware.ts` still runs in Next.js 16 but is deprecated, Edge-only, and scheduled for removal. Build new code against `proxy.ts` only.

**Why it matters beyond naming:** the old name invited developers to treat this file as general application middleware (Express-style) — auth, DB calls, business logic. It isn't that. It's a network boundary: routing, redirects, header rewriting, and (for this project) session-cookie refresh. Moving to Node.js runtime removes the old Edge-API restrictions that used to force workarounds for `@supabase/ssr` (which needs Node.js APIs) — it does not mean heavier logic now belongs there.

---

## 4. SUPABASE AUTH — VERIFIED PATTERN

Sources: supabase.com/docs/guides/auth/server-side/creating-a-client, supabase.com/docs/reference/javascript/auth-getclaims, supabase.com/docs/guides/auth/server-side/advanced-guide.

| Function | Where to use it | Behavior |
|---|---|---|
| `getClaims()` | Default choice for protecting pages/data in Server Components, Server Actions, Route Handlers | Validates JWT signature locally (WebCrypto + cached JWKS). Fast, no network call. Does **not** confirm server-side logout — a revoked session can still pass until the JWT naturally expires. |
| `getUser()` | When certainty of no server-side revocation is required (e.g. right after a sensitive action) | Live network call to the Supabase Auth server. Slower, authoritative. |
| `getSession()` | Only to forward the raw access/refresh token to another service | **Never use for authorization.** Loaded from storage, not re-validated — spoofable if storage is shared with the client. |

Direct quote from Supabase's docs: *"Always use `supabase.auth.getClaims()` to protect pages and user data. Never trust `supabase.auth.getSession()` inside server code such as Proxy."*

### 4.1 Three-layer defense model (proxy.ts is not the security boundary)
1. **`proxy.ts`** — refreshes the session cookie, redirects unauthenticated users away from protected routes. UX convenience, not the security check.
2. **Server Components / Actions / Route Handlers** — call `getClaims()` (or `getUser()` for sensitive checks) explicitly on every protected page and mutation. Never assume `proxy.ts` already handled it.
3. **Supabase RLS** — default-deny on every table, scoped to `auth.uid()` + role. Last line of defense.

### 4.2 `proxy.ts` — root file
```typescript
// proxy.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 4.3 `lib/supabase/proxy.ts` — session refresh
1. Create a Supabase server client reading/writing cookies against the request/response pair.
2. Call `getClaims()` to refresh the token if needed.
3. Write the refreshed token back via `request.cookies.set(...)` and `response.cookies.set(...)`.
4. Return the response object exactly as constructed — don't build a fresh `NextResponse.next()` and drop the cookies. This is the most common cause of "randomly logged out" bugs per Supabase's own troubleshooting docs.

### 4.4 Caching hazard for this project
Supabase flags a real risk for ISR/CDN-cached apps: a session-refresh response with `Set-Cookie` can get cached and served to a *different* user, silently logging them in as someone else. KL Demo CRM's Dashboard KPI cards are a caching candidate for performance — **do not apply ISR or CDN caching to any authenticated route** without explicitly excluding `Set-Cookie` from the cache key.

---

## 5. DATABASE SCHEMA (Supabase / PostgreSQL)

### 5.1 `profiles`
```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'agent')),
  phone       TEXT,
  avatar_url  TEXT,
  created_by  UUID REFERENCES profiles(id),   -- NEW: which admin/manager created this account
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 `leads`
```sql
CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  budget        BIGINT,
  area          TEXT,
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'plot', 'apartment')),
  source        TEXT CHECK (source IN ('facebook','instagram','zameen','referral','whatsapp','walk-in','other')),
  stage         TEXT NOT NULL DEFAULT 'new_lead'
                CHECK (stage IN ('new_lead','contacted','qualified','site_visit','negotiation','closed','lost')),
  assigned_to   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignment_type TEXT DEFAULT 'auto' CHECK (assignment_type IN ('auto','manual')),  -- NEW: audit trail
  notes         TEXT,
  raw_payload   JSONB,
  external_id   TEXT,               -- FB leadgen_id / WA wa_id / IG sender id — idempotency key
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX leads_external_id_source_idx ON leads (external_id, source)
  WHERE external_id IS NOT NULL;   -- prevents duplicate leads on webhook retries
```

### 5.3 `follow_ups`
```sql
CREATE TABLE follow_ups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes        TEXT,
  is_done      BOOLEAN DEFAULT FALSE,
  notified     BOOLEAN DEFAULT FALSE,   -- NEW: true once the due-notification has fired,
                                         --      prevents re-firing on every cron tick
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 `properties`
```sql
CREATE TABLE properties (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  price        BIGINT NOT NULL,
  location     TEXT NOT NULL,
  area_sqft    NUMERIC,
  type         TEXT CHECK (type IN ('residential', 'commercial', 'plot', 'apartment')),
  status       TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  description  TEXT,
  images       TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.5 `lead_activities`
```sql
CREATE TABLE lead_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.6 `integration_connections`
```sql
-- Per-agency Meta connection state. access_token encrypted at rest, server-read only.
CREATE TABLE integration_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel          TEXT NOT NULL CHECK (channel IN ('facebook','whatsapp','instagram')),
  page_id          TEXT,
  waba_id          TEXT,
  phone_number_id  TEXT,
  access_token     TEXT NOT NULL,      -- encrypted (pgsodium or app-level AES)
  token_expires_at TIMESTAMPTZ,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  connected_by     UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.7 `message_log` (required for WhatsApp 24h session-window compliance)
```sql
CREATE TABLE message_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL CHECK (channel IN ('whatsapp','instagram','facebook')),
  direction    TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_type TEXT,
  content      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.8 `notifications` (NEW — single consolidated table, powers §6.4 and §6.5 alerts)
```sql
-- One row per notification, delivered in-app via Topbar badge + Supabase Realtime.
-- Covers follow-up due dates now; type field leaves room for lead_assigned /
-- integration_expired alerts later without a schema change.
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,   -- recipient
  type         TEXT NOT NULL CHECK (type IN ('follow_up_due','lead_assigned','integration_expired')),
  follow_up_id UUID REFERENCES follow_ups(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  message      TEXT NOT NULL,          -- e.g. "Follow up with Ali Khan today"
  due_at       TIMESTAMPTZ,            -- copied from follow_ups.scheduled_at for follow_up_due type
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','due','seen','dismissed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX notifications_agent_status_idx ON notifications (agent_id, status, due_at);
```

---

## 6. MODULE SPECIFICATIONS

### MODULE 1: DASHBOARD (`/dashboard`)
KPI cards, real-time via Supabase Realtime:
| Metric          | Query                                              |
|-----------------|----------------------------------------------------|
| Total Leads     | `SELECT COUNT(*) FROM leads`                       |
| New Leads       | `WHERE stage = 'new_lead'`                         |
| Follow-ups Due  | `FROM follow_ups WHERE scheduled_at <= NOW() AND is_done = false` |
| Site Visits     | `WHERE stage = 'site_visit'`                       |
| Closed Deals    | `WHERE stage = 'closed'`                           |

Charts (recharts): Lead Source (Pie), Weekly Volume (Bar), Agent Performance (horizontal bar).

### MODULE 2: LEAD MANAGEMENT (`/leads`)
List (searchable/filterable), Detail (`/leads/[id]` — profile, activity timeline, quick actions), Create (`/leads/new` — react-hook-form + zod).

### MODULE 3: PIPELINE (`/pipeline`)
Kanban: New Lead → Contacted → Qualified → Site Visit → Negotiation → Closed/Lost. `@dnd-kit/core` drag-and-drop. Stage move logs to `lead_activities`, optimistic UI with rollback on DB error.

### MODULE 4: FOLLOW-UPS (`/follow-ups`)
Due Today / Upcoming (7d) / Overdue sections. Schedule form with date/time, notes, linked lead, in-app badge counter.

#### 6.4.1 Date-triggered notifications
**Requirement:** agent schedules a follow-up for a specific date (e.g. "call back 9 July") → on that exact date, the agent gets a notification to act. Not on save, not "whenever they next open the app" — on the scheduled date.

Flow:
1. On follow-up creation/edit, no notification row is created yet — only `follow_ups.scheduled_at` is stored.
2. A **daily scheduled job** (Supabase `pg_cron`, or a Vercel Cron hitting `app/api/notifications/cron/route.ts` — pick one, don't build both) runs once a day and:
   - Finds `follow_ups` where `scheduled_at::date = CURRENT_DATE`, `is_done = false`, `notified = false`.
   - Inserts a `notifications` row per match (`type = 'follow_up_due'`, `status = 'due'`, `due_at = scheduled_at`).
   - Flips `follow_ups.notified = true` so the same follow-up doesn't re-fire on tomorrow's cron run.
3. Topbar `NotificationBell` subscribes via Supabase Realtime to `notifications where agent_id = auth.uid() and status = 'due'` — same realtime pattern as §12, different table.
4. Marking a follow-up "done" also flips any linked `notifications` row to `dismissed`.
5. **Edge case to decide explicitly, not as an afterthought:** if an agent reschedules 9 July → 15 July, reset `follow_ups.notified = false` in the same edit action, so the reminder correctly re-fires on the new date instead of silently never firing again.

### MODULE 5: AGENT ASSIGNMENT (`/agents`)
Owner view: stats per agent, bulk assign, reassign. Agent view: own leads only — **RLS-enforced, not application-level**.

#### 6.5.1 "Add Agent" — admin-provisioned signup
**Requirement:** admin creates agent accounts directly (name, email, password) so agents never self-register and never receive more than `agent`-level access.

This cannot be a client-side `supabase.auth.signUp()` call — that would log the *admin's own session* out and sign in as the new agent, and there's no safe way to set `profiles.role = 'agent'` from client code regardless. Correct flow:

```typescript
// app/(dashboard)/agents/actions.ts — Server Action, owner/manager only
"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function createAgent(input: { name: string; email: string; password: string }) {
  // 1. Verify caller via getClaims() and profiles.role IN ('owner','manager') — reject otherwise
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Unauthorized");

  // 2. Service-role client — the ONE legitimate non-webhook use of the service role
  //    key in this app, because admin.createUser() bypasses normal signup and
  //    doesn't touch the caller's own session.
  const admin = createAdminClient();
  const { data: newUser, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (error) throw error;

  // 3. Insert corresponding profiles row
  await admin.from("profiles").insert({
    id: newUser.user.id,
    full_name: input.name,
    role: "agent",
    created_by: /* caller's id from step 1 */ null,
  });

  // 4. Log to lead_activities-style audit trail — who created which agent, when
}
```

`/agents` "Add Agent" button and this Server Action are Owner/Manager only, matching §8.

#### 6.5.2 Auto lead assignment — least-loaded, not naive round-robin
**Requirement:** 5 agents + 20 new leads arriving → each gets ~4 automatically. Admin can still manually override any assignment at any time.

```sql
-- lib/utils/leadAssignment.ts — find the agent with fewest currently-open leads
SELECT p.id
FROM profiles p
LEFT JOIN leads l ON l.assigned_to = p.id AND l.stage NOT IN ('closed', 'lost')
WHERE p.role = 'agent'
GROUP BY p.id
ORDER BY COUNT(l.id) ASC
LIMIT 1;
```

Run this **per incoming lead** (webhook or manual creation) at the moment of assignment — not as a single batch calculation for "20 leads at once" — so it stays correct even if leads arrive one at a time or an agent goes on leave mid-batch. Set `leads.assignment_type = 'auto'` when this path fires.

Manual override: `assigned_to` remains a normal editable field in Lead Detail and the bulk-assign UI for owner/manager. Auto-assignment only fires when a lead has no `assigned_to` at creation time; a manual reassignment sets `assignment_type = 'manual'` so the distinction is auditable later (useful for settling "why did agent X get fewer leads this week" disputes).

### MODULE 6: PROPERTY INVENTORY (`/properties`)
Cards with filters (location, type, price, status). Detail view: images, status toggle, matching-leads link (area + budget).

### MODULE 7: REPORTS (`/reports`)
| Report            | Chart            | Source                        |
|--------------------|------------------|--------------------------------|
| Leads by Source    | Pie/Donut        | `GROUP BY source`             |
| Conversion Rate    | Funnel           | Count per stage               |
| Agent Performance  | Horizontal bar   | Assigned/closed/site visits   |
| Monthly Volume     | Line             | `GROUP BY month`               |

---

## 7. META INTEGRATIONS — FACEBOOK / WHATSAPP / INSTAGRAM

### 7.1 Prerequisites (before writing any webhook code)
1. Meta Business Account, verified (Business Manager verification — legal docs; budget 2–4 weeks including at least one resubmission cycle, especially for Pakistan-based accounts — do not assume first-submission approval).
2. Meta App with products: Webhooks, WhatsApp, Facebook Login for Business.
3. WhatsApp Business Account (WABA) — Meta-hosted test number (demo, max 5 recipients) or a registered production number.
4. Facebook Page connected to the Business Manager.
5. Instagram Professional/Business account linked to that Page (IG messaging only works through the linked Page).
6. **App Review** for production: `leads_retrieval`, `pages_messaging`, `pages_manage_metadata`, `whatsapp_business_messaging`, `whatsapp_business_management`. Requires a screencast + use-case justification. Budget 1–3 weeks — start this in Phase 1, since it's the longest lead-time item in the whole project.

### 7.2 Webhook subscription flow (shared pattern, all 3 channels)
```
Meta → GET /api/webhooks/{channel}?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y
     → return hub.challenge as plain text if verify_token matches WEBHOOK_VERIFY_TOKEN

Meta → POST /api/webhooks/{channel}
     → signed with X-Hub-Signature-256 (HMAC-SHA256 using META_APP_SECRET)
     → verify signature BEFORE trusting payload — treat unverified payloads as hostile input
```

### 7.3 WhatsApp Cloud API — inbound lead flow
```typescript
// POST /api/webhooks/whatsapp
{
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "messages": [{ "from": "923001234567", "type": "text", "text": { "body": "..." } }],
        "contacts": [{ "profile": { "name": "Ali Khan" } }]
      }
    }]
  }]
}

// 1. Verify X-Hub-Signature-256 against META_APP_SECRET
// 2. Upsert lead on (external_id = from, source = 'whatsapp') — idempotent on retries
// 3. Auto-assign via least-loaded logic (§6.5.2)
// 4. Log to message_log (direction: inbound)
// 5. Return 200 within 20s — Meta disables webhooks that are consistently slow
```

**24-hour session window:** free-form replies only within 24h of the customer's last inbound message; otherwise pre-approved template messages only. The "Quick Reply: WhatsApp" button in Lead Detail must check `message_log` for the last inbound timestamp and switch to template-only mode when expired.

### 7.4 Facebook Lead Ads — inbound lead flow
```typescript
// POST /api/webhooks/facebook (leadgen field)
// Payload only contains leadgen_id + page_id — NOT the form answers.
// GET https://graph.facebook.com/v21.0/{leadgen_id}?access_token={page_access_token}

// 1. Verify signature
// 2. Fetch full lead data via Graph API
// 3. Map form answers → leads table (field mapping must be configurable — Lead Ad
//    forms are not standardized across agencies)
// 4. Upsert on external_id = leadgen_id
```

### 7.5 Instagram — inbound DM flow
Rides on the connected Page's webhook subscription (`messaging` field). Mirrors WhatsApp: verify signature → upsert by IG sender id → auto-assign → log to `message_log`.

### 7.6 Token lifecycle
- Short-lived user token (1–2h) → exchange for long-lived Page/WABA token (~60 days) at connect time.
- Long-lived tokens do not auto-refresh — scheduled job (`lib/meta/tokenRefresh.ts`) must refresh before expiry.
- On refresh failure: flip `status = 'expired'`, surface a banner in `/integrations`. Don't fail silently.

### 7.7 Integrations UI (`/integrations`)
One card per channel: connection status, connected page/number, last webhook timestamp, Reconnect button. Owner/Manager only.

---

## 8. ROLE-BASED ACCESS CONTROL (RBAC)

| Feature              | Owner | Manager | Agent       |
|----------------------|-------|---------|-------------|
| View all leads       | ✅    | ✅      | Own only    |
| Assign leads         | ✅    | ✅      | ❌          |
| View all reports     | ✅    | ✅      | Own stats   |
| Add properties       | ✅    | ✅      | ❌          |
| Delete leads         | ✅    | ❌      | ❌          |
| Access /agents       | ✅    | ✅      | ❌          |
| Add Agent (signup)   | ✅    | ✅      | ❌          |
| Access /integrations | ✅    | ✅      | ❌          |

**Enforcement:** Supabase RLS on every table, always — §4.1 explains why this is the last resort, not the only resort.

---

## 9. SECURITY CHECKPOINTS (non-negotiable)

1. `SUPABASE_SERVICE_ROLE_KEY` never touches the browser or client components. Client code uses only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Service role key lives only in server contexts. In this app it has exactly two legitimate uses: (a) inserting a lead from an unauthenticated Meta webhook, where there's no `auth.uid()` to satisfy RLS, and (b) `createAgent()`'s `auth.admin.createUser()` call. Any other server-side use of this key should be treated as a design smell worth questioning.
3. RLS ON for every table, no exceptions — including `integration_connections`, `message_log`, and `notifications`.
4. Policy pattern: `auth.uid() = assigned_to` for agents on `leads`; `auth.uid() = agent_id` for agents on their own `notifications`; `role IN ('owner','manager')` for broader access.
5. Webhook endpoints bypass Supabase Auth entirely — signature verification (`X-Hub-Signature-256`) is the only thing between you and spoofed lead injection. Treat unverified payloads as hostile.
6. `WEBHOOK_VERIFY_TOKEN` (GET handshake) and `META_APP_SECRET` (POST signature) are different secrets with different purposes — don't conflate them.
7. Encrypt `integration_connections.access_token` at rest. A leaked plaintext token is equivalent to a leaked WhatsApp Business account.
8. **Never use `getSession()` for server-side authorization** — see §4. Use `getClaims()` by default, `getUser()` when certainty of no server-side revocation is required.
9. Don't apply ISR/CDN caching to any authenticated route without excluding `Set-Cookie` from the cache key — see §4.4.
10. `createAgent()` must verify the caller's role server-side on every call, even though the UI already hides the "Add Agent" button from agents — a hidden button is not access control.

---

## 10. ENVIRONMENT VARIABLES (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key        # server-side only

NEXT_PUBLIC_APP_URL=http://localhost:3000

META_APP_ID=
META_APP_SECRET=                                       # X-Hub-Signature-256 verification
WEBHOOK_VERIFY_TOKEN=                                  # GET handshake only — different secret than above
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WABA_ID=
WHATSAPP_ACCESS_TOKEN=                                 # long-lived, server-side only
FACEBOOK_PAGE_ACCESS_TOKEN=                            # long-lived, server-side only
INSTAGRAM_BUSINESS_ACCOUNT_ID=

CRON_SECRET=                                           # shared secret so /api/notifications/cron
                                                        # can't be triggered by an outsider hitting the URL
```

---

## 11. KEY DEPENDENCIES

```json
{
  "dependencies": {
    "next": "16.x",
    "react": "18.x",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.x",
    "tailwindcss": "^3.x",
    "shadcn-ui": "latest",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^7.x",
    "recharts": "^2.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@hookform/resolvers": "^3.x",
    "date-fns": "^3.x",
    "lucide-react": "latest"
  }
}
```

> Verify `@supabase/ssr`'s changelog documents `proxy.ts` support (not just the deprecated `middleware.ts` pattern) before pinning a version — some tutorials predate this rename.

---

## 12. DEVELOPMENT PHASES

### Phase 1 — Foundation
- [ ] Next.js 16 project setup + Supabase connection
- [ ] Root `proxy.ts` + `lib/supabase/proxy.ts` (session refresh via `getClaims()`)
- [ ] Server Layout Guard in `app/(dashboard)/layout.tsx` — defense layer 2
- [ ] DB schema + RLS policies (single-tenant — resolved, no `agency_id`)
- [ ] Layout: Sidebar + Topbar (with NotificationBell placeholder)
- [ ] Start Meta Business verification + App Review process — longest lead time in the project

### Phase 2 — Core CRM
- [ ] Dashboard KPI cards (real data, cache-aware per §4.4)
- [ ] Lead list + create + edit
- [ ] Pipeline (Kanban)

### Phase 3 — Operations
- [ ] Follow-up system with reminders
- [ ] `notifications` table + daily cron flipping due follow-ups
- [ ] Realtime NotificationBell subscribed to `notifications`
- [ ] Auto lead assignment (least-loaded) + manual override + RBAC
- [ ] "Add Agent" Server Action using `auth.admin.createUser()` — owner/manager only
- [ ] Property inventory

### Phase 4 — Intelligence & Integrations
- [ ] Reports + charts
- [ ] WhatsApp Cloud API webhook (verify → receive → upsert → auto-assign)
- [ ] Facebook Lead Ads webhook + Graph API field fetch
- [ ] Instagram messaging webhook
- [ ] Meta token refresh cron job
- [ ] Seed data for demo

---

## 13. SUPABASE REALTIME SUBSCRIPTIONS

```typescript
// Dashboard KPI live updates
const leadsChannel = supabase
  .channel('leads-realtime')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'leads' },
    (payload) => { refetchStats(); }
  )
  .subscribe();

// Topbar notification bell
const notificationsChannel = supabase
  .channel('notifications-realtime')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'notifications', filter: `agent_id=eq.${userId}` },
    (payload) => { refetchNotifications(); }
  )
  .subscribe();
```

---

## 14. DEMO SEED DATA CHECKLIST

- 3 users (1 owner, 1 manager, 2 agents) — created via `createAgent()` flow, not raw SQL, to exercise the real path
- 50+ leads across all stages, sources including whatsapp/facebook/instagram, mix of `assignment_type = 'auto'` and `'manual'`
- 10+ properties in DHA, Gulberg, Bahria Town
- 15+ follow-ups (some overdue, some today, at least one dated for tomorrow to test the cron)
- Source mix: Facebook 50%, WhatsApp 25%, Zameen 15%, Instagram 5%, Referral 5%
- 1–2 rows in `integration_connections` (status: active) so `/integrations` isn't empty
- A few `message_log` rows so the 24h WhatsApp session-window UI has data to render against
- A few `notifications` rows in `due` status so the NotificationBell isn't empty on first login

---

*KL Demo CRM — Next.js 16 + Supabase. proxy.ts and Supabase auth sections verified against official docs (§3, §4). Admin-managed agents, auto lead distribution, and date-triggered follow-up notifications specified in §6.4.1, §6.5.1, §6.5.2.*
