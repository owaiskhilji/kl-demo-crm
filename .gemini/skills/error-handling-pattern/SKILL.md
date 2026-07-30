---
name: error-handling-pattern
description: Guides the agent through consistent error handling across Central Homes CRM — Server Actions, Route Handlers (especially Meta webhooks), Supabase queries, and client-side forms. Use when writing any function that can fail (DB call, external API call, webhook handler, form submission), when errors are surfacing as blank screens or silent failures, or when reviewing code for missing try/catch or swallowed errors.
---

# Error Handling Pattern

## When to use this skill
- Writing any Server Action, Route Handler, or client component that calls Supabase or an external API (Meta Graph API, WhatsApp Cloud API)
- Debugging a feature that fails silently (no visible error, no log, nothing in the UI)
- Reviewing a pull request / diff for missing error handling
- Deciding what an agent-facing error message should say vs. what gets logged internally

## Core rule — every failure must be visible somewhere, to someone
A caught-and-ignored error is worse than an uncaught one, because it hides the problem instead of surfacing it. Every `try/catch` in this project must do at least one of: return a user-facing message, write to a log/table the team can inspect, or re-throw with added context. Never catch an error only to do nothing with it.

## Layer-by-layer pattern

### 1. Supabase queries (Server Components, Server Actions, Route Handlers)
```typescript
const { data, error } = await supabase.from("leads").select("*").eq("id", id);
if (error) {
  console.error("[leads.fetch]", error.message, { id });
  throw new Error("Could not load lead details. Please try again.");
}
```
- Always destructure and check `error` — Supabase client calls do not throw by default, they return `{ data, error }`. Forgetting this check is the single most common source of silent failures in this codebase.
- Log the technical message (`error.message`) server-side; return a plain, non-technical message to the UI. Never surface raw Postgres/Supabase error text to agents or admins — it can leak schema details.

### 2. Server Actions (mutations — createAgent, lead assignment, follow-up scheduling)
```typescript
"use server";
export async function scheduleFollowUp(input: FollowUpInput) {
  try {
    // validation, then the actual mutation
  } catch (error) {
    console.error("[scheduleFollowUp]", error);
    return { success: false, error: "Could not schedule the follow-up. Please try again." };
  }
}
```
- Server Actions should return a `{ success, error? }` shape rather than throwing across the client/server boundary — this lets the calling form show a specific inline message instead of an unhandled promise rejection.
- Validate input (zod) *before* touching the database, so validation failures never reach Supabase as a malformed query.

### 3. Meta webhook Route Handlers (highest-stakes error path in this app)
- **Never let an unhandled exception cause a non-200 response to Meta** for a recoverable error — Meta will retry, and repeated failures can get the webhook subscription disabled. Catch broadly at the top level of the handler, log the failure with the raw payload (for later debugging), and still return 200 once the failure is logged — unless the failure is a signature mismatch, which should be rejected outright (401/403), not swallowed.
- Signature verification failures are the one case that should NOT return 200 — see the `meta-webhook-integration` skill. Every other failure (DB insert failure, malformed payload, assignment logic error) should be logged and acknowledged with 200 so Meta doesn't retry-storm a lead that already failed for a reason retrying won't fix.
- Log failed webhook payloads somewhere inspectable (e.g. a `webhook_errors` table or structured log) — a lead that fails to insert silently is a lost sale, not just a bug.

### 4. Client-side forms (react-hook-form + zod)
- zod handles field-level validation errors — show them inline, next to the field, not as a generic toast.
- Server Action failures (network error, `{ success: false }` response) should show a form-level error banner, distinct from field validation errors, so the agent using the CRM can tell "I typed something wrong" apart from "the system failed."

### 5. Realtime subscriptions (Supabase Realtime for dashboard/notifications)
- Handle the subscription's own error/disconnect events, not just the data callback — a silently dropped realtime connection means KPI cards or the notification bell stop updating with no visible sign anything is wrong. Add a lightweight reconnect-or-banner strategy rather than assuming the subscription stays alive for the life of the session.

## What NOT to do
- Do not use empty `catch {}` blocks anywhere in this codebase.
- Do not show raw error objects, stack traces, or Postgres error codes to end users (agents, managers, owners).
- Do not return 500 to a Meta webhook for a data-layer failure that Meta retrying won't fix — see §3.
- Do not treat a webhook signature failure the same as any other error — it must be rejected, not logged-and-200'd.

## Reference
See CLAUDE.md / GEMINI.md §7 (Meta integrations) and §9 (Security Checkpoints) for the webhook-specific rules this skill builds on.
