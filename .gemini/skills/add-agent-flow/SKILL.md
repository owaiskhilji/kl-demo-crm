---
name: add-agent-flow
description: Guides the agent through implementing or modifying admin-provisioned agent account creation in Central Homes CRM. Use when building, editing, or debugging the "Add Agent" feature — creating agent accounts (name, email, password) from the admin/manager side, so agents never self-register and never receive more than agent-level role access.
---

# Add Agent Flow (Admin-Provisioned Signup)

## When to use this skill
- Building or editing the `/agents` "Add Agent" button or dialog
- Writing or modifying the `createAgent()` Server Action
- Debugging why a newly created agent can't log in, or why an admin gets logged out after adding an agent
- Adding new fields to the agent-creation form (e.g. phone number)

## Core rule — never a client-side signup call
Do NOT implement this with `supabase.auth.signUp()` called from the browser. That call authenticates as the *new* user in the current browser session — meaning the admin who just created the account gets signed out and signed in as the agent they just created. This is the single most common mistake when developers unfamiliar with this requirement build "add user" features.

## Correct pattern
1. **Client side (`AddAgentDialog.tsx`):** a form collecting `name`, `email`, `password`, calling the `createAgent()` Server Action on submit. No direct Supabase Auth calls from this component.
2. **Server Action (`app/(dashboard)/agents/actions.ts`):**
   - Verify the caller's session via `getClaims()` (never `getSession()` — see the `supabase-auth-pattern` skill).
   - Verify `profiles.role IN ('owner', 'manager')` for the caller. Reject with an error otherwise — this check must exist even though the UI already hides the button from agents, because a hidden button is not access control.
   - Use a service-role Supabase client (`lib/supabase/admin.ts`) to call `supabase.auth.admin.createUser({ email, password, email_confirm: true })`. This is one of only two legitimate uses of the service role key in this app (the other is Meta webhook lead-insertion) — it bypasses normal signup and does not touch the caller's own session.
   - Insert the corresponding `profiles` row: `{ id: newUser.user.id, full_name, role: 'agent', created_by: <caller's profile id> }`.
   - Write an audit log entry (who created which agent, when) — do not skip this, it matters later for "who added this account" questions.
3. **RBAC:** `/agents` page and the `createAgent()` action are Owner/Manager only, everywhere — UI, Server Action, and (if a table is later touched directly) RLS.

## Common mistakes to avoid
- Forgetting the `email_confirm: true` flag — without it, the new agent may be stuck in an unconfirmed state and unable to log in.
- Putting the role check only in the UI component instead of inside the Server Action itself.
- Reusing the regular (anon-key) Supabase client instead of the service-role admin client for `admin.createUser()` — the anon client does not have permission to call admin APIs and will fail.
- Not logging who created the account — this becomes a real support problem when an agency owner asks "who made this login."

## Reference
See CLAUDE.md / GEMINI.md §6.5.1 for the full code example and rationale.
