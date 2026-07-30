# 🏢 KL Demo CRM — Project Milestones

> **Source:** `GEMINI.md` §12 (Development Phases) + §6 (Module Specs)
> **Skills Reference:** `.gemini/skills/` (7 skills total)
> **Last Updated:** 2026-07-08

---

## 📋 Skills Inventory (`.gemini/skills/`)

| # | Skill Path | Purpose |
|---|---|---|
| 1 | `../.gemini/skills/supabase-auth-pattern` | Session verification, `proxy.ts`, `getClaims()`/`getUser()`/`getSession()` rules, three-layer defense |
| 2 | `../.gemini/skills/rls-policy-pattern` | Row Level Security — default-deny, role-based policies, service-role bypass rules |
| 3 | `../.gemini/skills/add-agent-flow` | Admin-provisioned agent signup via `auth.admin.createUser()` — never client-side signUp |
| 4 | `../.gemini/skills/error-handling-pattern` | Consistent error handling across Server Actions, Route Handlers, webhooks, and forms |
| 5 | `../.gemini/skills/followup-notifications` | Date-triggered daily cron → `notifications` table → realtime bell, reschedule edge case |
| 6 | `../.gemini/skills/lead-auto-assignment` | Least-loaded algorithm, per-lead evaluation, manual override, `assignment_type` audit trail |
| 7 | `../.gemini/skills/meta-webhook-integration` | X-Hub-Signature-256 verification, idempotent upserts, WhatsApp 24h window, token lifecycle |

---

## 🔶 Phase 1 — Foundation

> **Goal:** Project scaffolding, auth system, database schema, layout shell
> **Estimated Duration:** 1.5–2 weeks

### Milestone 1.1 — Project Setup & Supabase Connection
| Item | Detail |
|---|---|
| **Tasks** | Next.js 16 project init (App Router, TypeScript) · Tailwind CSS + shadcn/ui setup · Supabase project creation · `.env.local` configuration · Key dependencies install (`@supabase/supabase-js`, `@supabase/ssr`, `recharts`, `@dnd-kit/core`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`) |
| **Deliverables** | Running `npm run dev` with blank app · Supabase client files (`lib/supabase/client.ts`, `server.ts`, `admin.ts`) |
| **Skills Used** | — (no skill needed, pure scaffolding) |

---

### Milestone 1.2 — Auth System (`proxy.ts` + Session Refresh)
| Item | Detail |
|---|---|
| **Tasks** | Create root `proxy.ts` (Next.js 16 convention, NOT `middleware.ts`) · Create `lib/supabase/proxy.ts` (session refresh via `getClaims()`) · Cookie read/write on request+response pair · Redirect unauthenticated users from `/(dashboard)/*` to `/login` |
| **Deliverables** | Working session refresh · Auth redirect loop working · No "randomly logged out" bugs |
| **Skills Used** | ✅ **`supabase-auth-pattern`** — proxy.ts contract, `getClaims()` vs `getSession()` rules, three-layer defense model |

---

### Milestone 1.3 — Login Page
| Item | Detail |
|---|---|
| **Tasks** | Build `app/(auth)/login/page.tsx` · `app/(auth)/layout.tsx` (auth layout) · Email + password form with `react-hook-form` + `zod` validation · Supabase `signInWithPassword()` call · Redirect to `/dashboard` on success |
| **Deliverables** | Functional login page with validation + error messages |
| **Skills Used** | ✅ **`supabase-auth-pattern`** — client vs server client usage |
| | ✅ **`error-handling-pattern`** — form error handling, inline vs form-level errors |

---

### Milestone 1.4 — Database Schema + RLS Policies
| Item | Detail |
|---|---|
| **Tasks** | Write all migration files: `001_initial_schema.sql` (profiles, leads, follow_ups, properties, lead_activities) · `002_rls_policies.sql` (default-deny on every table) · `003_seed_data.sql` · `004_integrations_schema.sql` (integration_connections, message_log) · `005_notifications_schema.sql` (notifications table + index) · ~~**Decision:** single-tenant vs multi-tenant~~ **Resolved: single-tenant, no `agency_id`** |
| **Deliverables** | 8 tables created · RLS ON for all tables · Unique index on `leads(external_id, source)` · Index on `notifications(agent_id, status, due_at)` |
| **Skills Used** | ✅ **`rls-policy-pattern`** — default-deny, role-based SELECT/INSERT/UPDATE policies, service-role bypass rules |

---

### Milestone 1.5 — Dashboard Layout Shell (Sidebar + Topbar)
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/layout.tsx` — Server Layout Guard (defense layer 2, `getClaims()` check) · `components/layout/Sidebar.tsx` — navigation links, role-aware menu items · `components/layout/Topbar.tsx` — user avatar, NotificationBell placeholder · `components/layout/MobileNav.tsx` — responsive hamburger nav |
| **Deliverables** | Protected dashboard shell renders after login · Sidebar navigation to all 7 modules · NotificationBell placeholder (no realtime yet) |
| **Skills Used** | ✅ **`supabase-auth-pattern`** — Server Layout Guard, defense layer 2 |

---

### Milestone 1.6 — Meta Business Verification & Template Approval (Parallel Task)
| Item | Detail |
|---|---|
| **Tasks** | Submit Meta Business verification (legal docs — budget 2–4 weeks, including at least one resubmission cycle, not just "days") · Create Meta App with Webhooks, WhatsApp, Facebook Login products · Start App Review process for `leads_retrieval`, `pages_messaging`, `whatsapp_business_messaging` etc. · Draft and submit 2–3 WhatsApp message templates (e.g. follow-up reminder, property update) to WhatsApp Business Manager for approval — this is separate from App Review and required for any reply sent outside the 24h session window |
| **Deliverables** | App Review submitted (1–3 week approval wait) · At least 1 WhatsApp template approved before Phase 4 webhook work begins |
| **Skills Used** | ✅ **`meta-webhook-integration`** — prerequisites checklist (§7.1) |

> ⚠️ **IMPORTANT:** Meta App Review AND WhatsApp template approval are both separate, external, longest lead-time items in the entire project. Start both in Phase 1 even though webhook code is written in Phase 4. Business Verification for Pakistan-based accounts commonly needs a resubmission cycle — do not assume first-submission approval.

---

## 🔷 Phase 2 — Core CRM

> **Goal:** Dashboard with real data, lead CRUD, pipeline Kanban
> **Estimated Duration:** 2–2.5 weeks

### Milestone 2.1 — Dashboard KPI Cards
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/dashboard/page.tsx` · `components/dashboard/KPICard.tsx` — Total Leads, New Leads, Follow-ups Due, Site Visits, Closed Deals · Server-side data fetching (Supabase queries) · **No ISR/CDN caching** on this authenticated route (§4.4 caching hazard) |
| **Deliverables** | 5 KPI cards rendering real DB counts |
| **Skills Used** | ✅ **`supabase-auth-pattern`** — caching hazard, no ISR on authenticated routes |
| | ✅ **`error-handling-pattern`** — Supabase query error checks |

---

### Milestone 2.2 — Dashboard Charts
| Item | Detail |
|---|---|
| **Tasks** | `components/dashboard/LeadSourceChart.tsx` — Pie/Donut (recharts) · `components/dashboard/RecentLeads.tsx` — latest leads table · Agent Performance horizontal bar · Weekly Volume bar chart |
| **Deliverables** | 3+ charts rendering real data · RecentLeads table with clickable rows |
| **Skills Used** | ✅ **`error-handling-pattern`** — graceful handling of empty data states |

---

### Milestone 2.3 — Dashboard Realtime
| Item | Detail |
|---|---|
| **Tasks** | Supabase Realtime subscription on `leads` table changes · Auto-refetch KPI counts + charts on INSERT/UPDATE/DELETE · Handle subscription disconnect/reconnect |
| **Deliverables** | Dashboard updates live when leads are added/modified from any client |
| **Skills Used** | ✅ **`error-handling-pattern`** — realtime subscription error/disconnect handling |

---

### Milestone 2.4 — Lead Management (List + Create + Edit)
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/leads/page.tsx` — Lead list with search, filter (source, stage, agent) · `components/leads/LeadTable.tsx` · `components/leads/LeadStatusBadge.tsx` · `app/(dashboard)/leads/new/page.tsx` — Create form (`react-hook-form` + `zod`) · `components/leads/LeadForm.tsx` · `app/(dashboard)/leads/[id]/page.tsx` — Detail view with activity timeline + quick actions |
| **Deliverables** | Full CRUD on leads · Activity logging to `lead_activities` on every stage change · Role-aware: agents see own leads only (RLS) |
| **Skills Used** | ✅ **`rls-policy-pattern`** — `assigned_to = auth.uid()` for agent SELECT |
| | ✅ **`error-handling-pattern`** — Server Action `{ success, error }` return shape, form validation |
| | ✅ **`supabase-auth-pattern`** — `getClaims()` on page + Server Actions |

---

### Milestone 2.5 — Pipeline (Kanban Board)
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/pipeline/page.tsx` · `components/pipeline/KanbanBoard.tsx` — 7 columns (new_lead → contacted → qualified → site_visit → negotiation → closed → lost) · `components/pipeline/KanbanColumn.tsx` · `components/pipeline/LeadCard.tsx` · `@dnd-kit/core` drag-and-drop · Optimistic UI with rollback on DB error · Stage move → `lead_activities` log entry |
| **Deliverables** | Drag-and-drop stage changes · Optimistic updates · Activity trail on every move |
| **Skills Used** | ✅ **`error-handling-pattern`** — optimistic UI rollback on Supabase error |
| | ✅ **`rls-policy-pattern`** — UPDATE policies scoped by role |

---

## 🟢 Phase 3 — Operations

> **Goal:** Follow-ups, notifications, agent management, auto-assignment, properties
> **Estimated Duration:** 2.5–3 weeks

### Milestone 3.1 — Follow-Up System
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/follow-ups/page.tsx` — Due Today / Upcoming (7d) / Overdue sections · `components/follow-ups/FollowUpList.tsx` · `components/follow-ups/FollowUpForm.tsx` — date/time picker, notes, linked lead · Mark as done · **Reschedule edge case:** reset `notified = false` when `scheduled_at` changes |
| **Deliverables** | Full follow-up CRUD · Grouped by due status · Reschedule correctly resets notification flag |
| **Skills Used** | ✅ **`followup-notifications`** — data model, reschedule edge case (notified flag reset) |
| | ✅ **`error-handling-pattern`** — Server Action mutation errors |

---

### Milestone 3.2 — Notifications Cron Job
| Item | Detail |
|---|---|
| **Tasks** | `app/api/notifications/cron/route.ts` — daily job (Vercel Cron OR pg_cron — pick ONE) · Query: `follow_ups WHERE scheduled_at::date = CURRENT_DATE AND is_done = false AND notified = false` · Insert `notifications` row per match (`type = 'follow_up_due'`, `status = 'due'`) · Flip `follow_ups.notified = true` · Protect endpoint with `CRON_SECRET` header check |
| **Deliverables** | Daily job creates notifications on the exact scheduled date · No duplicates on re-runs · Endpoint secured |
| **Skills Used** | ✅ **`followup-notifications`** — full cron flow, duplicate prevention via `notified` flag |
| | ✅ **`error-handling-pattern`** — endpoint security, error logging |

---

### Milestone 3.3 — Realtime NotificationBell
| Item | Detail |
|---|---|
| **Tasks** | `lib/hooks/useNotifications.ts` — Supabase Realtime subscription to `notifications WHERE agent_id = auth.uid() AND status = 'due'` · `components/layout/Topbar.tsx` — NotificationBell badge with unread count · Dropdown with notification list · Mark as seen/dismissed · Marking follow-up "done" → also dismiss linked notification |
| **Deliverables** | Live notification badge · Realtime updates without page refresh · Dismiss/seen state synced |
| **Skills Used** | ✅ **`followup-notifications`** — realtime subscription pattern, done→dismissed linkage |
| | ✅ **`error-handling-pattern`** — realtime disconnect handling |

---

### Milestone 3.4 — Auto Lead Assignment (Least-Loaded)
| Item | Detail |
|---|---|
| **Tasks** | `lib/utils/leadAssignment.ts` — least-loaded query (fewest open leads, excluding closed/lost) · Integrate into lead creation flow (manual + future webhooks) · Set `assignment_type = 'auto'` · Handle zero-agents edge case |
| **Deliverables** | New leads auto-assigned to least-loaded agent · `assignment_type` correctly tracks auto vs manual |
| **Skills Used** | ✅ **`lead-auto-assignment`** — query pattern, per-lead evaluation, zero-agents handling |
| | ✅ **`error-handling-pattern`** — null result handling |

---

### Milestone 3.5 — "Add Agent" (Admin-Provisioned Signup)
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/agents/actions.ts` — `createAgent()` Server Action · `components/agents/AddAgentDialog.tsx` — name/email/password form · `lib/supabase/admin.ts` — service-role client · Verify caller role = owner/manager via `getClaims()` · `auth.admin.createUser()` with `email_confirm: true` · Insert `profiles` row with `role: 'agent'`, `created_by` · Audit log entry |
| **Deliverables** | Admin can create agent accounts without losing own session · New agents can log in immediately · Audit trail of who created whom |
| **Skills Used** | ✅ **`add-agent-flow`** — full pattern: dialog → Server Action → admin client → profile insert |
| | ✅ **`supabase-auth-pattern`** — `getClaims()` for caller verification, service-role key rules |
| | ✅ **`rls-policy-pattern`** — service-role bypass legitimacy check |
| | ✅ **`error-handling-pattern`** — Server Action `{ success, error }` pattern |

---

### Milestone 3.6 — Agent Management Page
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/agents/page.tsx` — Agent list + per-agent stats (assigned leads, closed, site visits) · `components/agents/AgentTable.tsx` · Bulk assign/reassign UI · Manual override sets `assignment_type = 'manual'` · RBAC: owner/manager only |
| **Deliverables** | Agent stats dashboard · Bulk operations · Manual assignment overrides auditable |
| **Skills Used** | ✅ **`lead-auto-assignment`** — manual override rules, `assignment_type` tracking |
| | ✅ **`rls-policy-pattern`** — owner/manager-only access |

---

### Milestone 3.7 — Property Inventory
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/properties/page.tsx` — Property cards with filters (location, type, price, status) · `components/properties/PropertyCard.tsx` · `components/properties/PropertySearch.tsx` · `app/(dashboard)/properties/[id]/page.tsx` — Detail view: images, status toggle (available/sold/reserved), matching-leads link |
| **Deliverables** | Property CRUD · Filter/search · Status management · Lead-property matching (budget + area) |
| **Skills Used** | ✅ **`rls-policy-pattern`** — owner/manager can add, agents read-only |
| | ✅ **`error-handling-pattern`** — Supabase query/mutation errors |

---

## 🟣 Phase 4 — Intelligence & Integrations

> **Goal:** Reports, Meta webhook integrations (FB/WA/IG), token lifecycle, seed data
> **Estimated Duration:** 3–4 weeks

### Milestone 4.1 — Reports & Charts
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/reports/page.tsx` · `components/reports/ConversionFunnel.tsx` — funnel chart (count per stage) · `components/reports/AgentPerformance.tsx` — horizontal bar (assigned/closed/site visits per agent) · Leads by Source pie/donut · Monthly Volume line chart · RBAC: owner/manager see all, agent sees own stats only |
| **Deliverables** | 4 report charts with real data · Role-scoped data access |
| **Skills Used** | ✅ **`rls-policy-pattern`** — agent-scoped queries |
| | ✅ **`error-handling-pattern`** — empty data graceful handling |

---

### Milestone 4.2 — Webhook Signature Verification (Shared)
| Item | Detail |
|---|---|
| **Tasks** | `lib/meta/verifyWebhookSignature.ts` — `X-Hub-Signature-256` HMAC-SHA256 validation against `META_APP_SECRET` · Reject unverified payloads with 401/403 (NOT 200) · Used by all 3 webhook routes |
| **Deliverables** | Reusable signature verification utility · Hostile payload rejection |
| **Skills Used** | ✅ **`meta-webhook-integration`** — signature verification rules, never-trust-unverified-payloads |
| | ✅ **`error-handling-pattern`** — signature failure = reject (not log-and-200) |

---

### Milestone 4.3 — WhatsApp Cloud API Webhook
| Item | Detail |
|---|---|
| **Tasks** | `app/api/webhooks/whatsapp/route.ts` — GET (verify token handshake) + POST (receive messages) · Parse nested `entry[].changes[].value.messages[]` (real Meta payload shape) · Upsert lead on `(external_id = from, source = 'whatsapp')` — idempotent via unique index · Auto-assign via `leadAssignment.ts` · Log to `message_log` (direction: inbound) · Return 200 within 20s · `lib/meta/whatsappClient.ts` — send template/session messages · 24h session window check against `message_log` |
| **Deliverables** | WhatsApp messages → leads (deduplicated) · Auto-assigned · Message history logged · 24h window enforced |
| **Skills Used** | ✅ **`meta-webhook-integration`** — WhatsApp payload parsing, idempotent upserts, 24h window |
| | ✅ **`lead-auto-assignment`** — post-upsert auto-assignment |
| | ✅ **`rls-policy-pattern`** — service-role bypass for unauthenticated webhook inserts |
| | ✅ **`error-handling-pattern`** — webhook error handling (log failure + return 200 for non-signature errors) |

---

### Milestone 4.4 — Facebook Lead Ads Webhook
| Item | Detail |
|---|---|
| **Tasks** | `app/api/webhooks/facebook/route.ts` — GET (verify) + POST (receive leadgen event) · Payload only has `leadgen_id` — fetch full data via Graph API: `GET graph.facebook.com/v21.0/{leadgen_id}?access_token={token}` · `lib/meta/graphApiClient.ts` — Graph API wrapper · Configurable field mapping (Lead Ad forms vary per agency) · Upsert on `external_id = leadgen_id` · Auto-assign |
| **Deliverables** | FB Lead Ads → leads (with Graph API field fetch) · Configurable mapping · Deduplicated |
| **Skills Used** | ✅ **`meta-webhook-integration`** — Facebook leadgen flow, Graph API fetch, field mapping |
| | ✅ **`lead-auto-assignment`** — post-upsert auto-assignment |
| | ✅ **`error-handling-pattern`** — Graph API call error handling |

---

### Milestone 4.5 — Instagram DM Webhook
| Item | Detail |
|---|---|
| **Tasks** | `app/api/webhooks/instagram/route.ts` — POST (receive DM via linked Page's `messaging` field subscription) · Verify signature · Upsert by IG sender id · Auto-assign · Log to `message_log` |
| **Deliverables** | Instagram DMs → leads · Linked to same Meta webhook infra |
| **Skills Used** | ✅ **`meta-webhook-integration`** — Instagram flow (mirrors WhatsApp pattern) |
| | ✅ **`lead-auto-assignment`** — post-upsert auto-assignment |
| | ✅ **`error-handling-pattern`** — webhook error handling |

---

### Milestone 4.6 — Meta Token Lifecycle
| Item | Detail |
|---|---|
| **Tasks** | `lib/meta/tokenRefresh.ts` — scheduled job to refresh long-lived Page/WABA tokens before expiry (~60 days) · On failure: flip `integration_connections.status = 'expired'` · Surface expiry banner in `/integrations` UI |
| **Deliverables** | Tokens auto-refreshed · Expired status visible in UI · No silent failures |
| **Skills Used** | ✅ **`meta-webhook-integration`** — token lifecycle rules |
| | ✅ **`error-handling-pattern`** — never fail silently on token refresh failure |

---

### Milestone 4.7 — Integrations Management UI
| Item | Detail |
|---|---|
| **Tasks** | `app/(dashboard)/integrations/page.tsx` — owner/manager only · `components/integrations/MetaConnectCard.tsx` — one card per channel (FB, WA, IG): connection status, connected page/number, last webhook timestamp, Reconnect button · `components/integrations/WebhookStatus.tsx` — health indicators |
| **Deliverables** | Visual integration management · Connection status at a glance · Reconnect flow |
| **Skills Used** | ✅ **`rls-policy-pattern`** — `integration_connections` access (server-only, never exposed to client) |
| | ✅ **`error-handling-pattern`** — connection error display |

---

### Milestone 4.8 — Seed Data for Demo
| Item | Detail |
|---|---|
| **Tasks** | `003_seed_data.sql` update · 3 users (1 owner, 1 manager, 2 agents) — via `createAgent()` flow · 50+ leads across all stages/sources (mix auto/manual assignment) · 10+ properties (DHA, Gulberg, Bahria Town) · 15+ follow-ups (overdue, today, tomorrow) · Source mix: FB 50%, WA 25%, Zameen 15%, IG 5%, Referral 5% · `integration_connections` rows · `message_log` rows · `notifications` rows in `due` status |
| **Deliverables** | Fully populated demo environment · All modules have data to render |
| **Skills Used** | — (data seeding, no skill needed) |

---

### Milestone 4.9 — Security Audit
| Item | Detail |
|---|---|
| **Tasks** | Attempt cross-agent data access: log in as Agent A, try fetching Agent B's leads directly via Supabase REST API/client — confirm RLS blocks it · Inspect browser devtools/network tab to confirm `SUPABASE_SERVICE_ROLE_KEY` never appears in any client-side bundle or request · Hit each webhook endpoint (`/api/webhooks/whatsapp`, `/facebook`, `/instagram`) without a valid `X-Hub-Signature-256` header — confirm rejection (401/403), not silent 200 · Confirm `/agents`, `/integrations`, "Add Agent" are unreachable for an `agent`-role session even via direct URL |
| **Deliverables** | Documented pass/fail for each check above · Any failure fixed before demo/handoff |
| **Skills Used** | ✅ **`rls-policy-pattern`** — verifying default-deny actually holds |
| | ✅ **`supabase-auth-pattern`** — confirming service-role key isolation |
| | ✅ **`meta-webhook-integration`** — signature rejection verification |

> ⚠️ Run this BEFORE seeding demo data (Milestone 4.8) — a security gap found after the client has seen a working demo is a much harder conversation than one caught during internal testing.

---

### Milestone 4.10 — Deployment & Staging
| Item | Detail |
|---|---|
| **Tasks** | Create Vercel project, link repo · Set all production env vars in Vercel dashboard — double-check `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_SECRET`, `CRON_SECRET` etc. do NOT have a `NEXT_PUBLIC_` prefix (that would expose them to the browser bundle) · Set up a staging environment (separate Supabase project or separate env vars) for client review before final production handoff · Configure custom domain + SSL if applicable |
| **Deliverables** | Working production deployment · Working staging environment client can review · No secrets exposed client-side (re-verify against Milestone 4.9's audit) |
| **Skills Used** | — (deployment/infra, no skill needed) |

> ⚠️ Do this with the same care as Milestone 4.9 — a rushed last-minute deployment is exactly where a `NEXT_PUBLIC_` typo on a secret slips through.

---

### Milestone 4.11 — Missing Core Features (Forgot Password, Property/Lead Delete)
| Item | Detail |
|---|---|
| **Tasks** | (1) Forgot Password flow — `/login` page pe "Forgot Password?" link, Supabase `resetPasswordForEmail()` se reset-email bhejna, ek `/reset-password` page jahan naya password set ho · (2) Properties — Edit button already hai to confirm karo working hai, aur Delete button add karo (Owner/Manager only) · (3) Leads — Delete option add karo (Owner-only, jaisa GEMINI.md §8 RBAC table mein already defined hai: "Delete leads: Owner ✅, Manager ❌, Agent ❌") |
| **Critical UX requirement** | Property delete aur Lead delete — dono ek click se turant delete NAHI hone chahiye. Pehle ek confirmation dialog (AlertDialog/popup) aana chahiye — "Are you sure you want to delete this [property/lead]? This cannot be undone." — sirf "Confirm" dabane ke baad hi actual delete ho. |
| **Skills Used** | ✅ `supabase-auth-pattern` — Forgot Password flow ke liye Supabase Auth ka correct client-vs-server usage |
| | ✅ `rls-policy-pattern` — confirm karo `properties` aur `leads` ki DELETE policies already sahi hain (Milestone 1.4/007 fix mein verify ho chuki thi) — sirf UI/action missing hai, RLS nahi |
| | ✅ `error-handling-pattern` — delete actions `{ success, error }` shape return karein, aur confirmation-dialog cancel karne pe koi partial-state na bache |
| **Status** | ⏳ Pending |

> ⚠️ **Reminder for delete actions:** `properties` ki DELETE RLS policy owner+manager allow karti hai (`FOR ALL` policy se), aur `leads` ki DELETE policy sirf owner allow karti hai (007 fix se) — UI mein delete button ka visibility isi RBAC ke sath match honi chahiye, warna ek manager ko delete-button dikhega jo leads ke liye click karte hi RLS-error dega (confusing UX, jaisa humne pehle "hidden button access-control nahi" wale principle mein discuss kiya).

---


## 📊 Skills Usage Summary Per Phase

| Skill | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|:---:|:---:|:---:|:---:|
| `supabase-auth-pattern` | ✅✅✅ | ✅ | ✅ | — |
| `rls-policy-pattern` | ✅ | ✅✅ | ✅✅✅ | ✅✅ |
| `error-handling-pattern` | ✅ | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅✅✅ |
| `add-agent-flow` | — | — | ✅ | — |
| `followup-notifications` | — | — | ✅✅✅ | — |
| `lead-auto-assignment` | — | — | ✅✅ | ✅✅✅ |
| `meta-webhook-integration` | ✅ | — | — | ✅✅✅✅✅ |

> 💡 **TIP:** `error-handling-pattern` is the most frequently used skill — it applies to virtually every milestone. `meta-webhook-integration` concentrates entirely in Phase 4 but is the most complex single skill to execute.

---

## ⏱️ Timeline Overview

| Phase | Duration | Milestones | Key Risk |
|---|---|---|---|
| **Phase 1 — Foundation** | 1.5–2 weeks | 1.1 – 1.6 | — (multi-tenant decision resolved: single-tenant) |
| **Phase 2 — Core CRM** | 2–2.5 weeks | 2.1 – 2.5 | Kanban drag-and-drop edge cases |
| **Phase 3 — Operations** | 2.5–3 weeks | 3.1 – 3.7 | Notification cron timing + reschedule edge case |
| **Phase 4 — Intelligence** | 3–4 weeks | 4.1 – 4.8 | Meta App Review approval (external dependency) |
| **Total** | **~10–12 weeks** | **22 milestones** | |

> ✅ **RESOLVED:** Single-tenant confirmed (2026-07-08). No `agency_id` needed — this is a custom CRM for KL Demo CRM only.
