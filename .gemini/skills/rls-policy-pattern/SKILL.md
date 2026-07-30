---
name: rls-policy-pattern
description: Guides the agent through writing Row Level Security policies for any new or existing table in Central Homes CRM, following the project's standard role-based access pattern. Use whenever creating a new Supabase table, adding a migration, or reviewing whether a table's access control is correctly enforced.
---

# RLS Policy Pattern

## When to use this skill
- Creating any new table in a migration file
- Reviewing an existing table for missing or incorrect RLS policies
- Adding a new role or permission level to an existing table

## Core rule — RLS is the last line of defense, not the only one
RLS must be enabled on every table, without exception — including tables that seem "internal," like `integration_connections`, `message_log`, and `notifications`. See the `supabase-auth-pattern` skill for how this fits into the broader three-layer defense model (proxy.ts → Server Actions → RLS).

## Standard policy pattern for this project

| Role | Access pattern |
|---|---|
| `agent` | `auth.uid() = assigned_to` (on `leads`) or `auth.uid() = agent_id` (on `follow_ups`, `notifications`) — agents only ever see rows tied to them |
| `manager` / `owner` | `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','manager'))` — broader access per the RBAC table in GEMINI.md §8 |

Example, for a table with an `assigned_to` column:
```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents see own leads" ON leads
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );
```

## Single-tenant confirmation
This project is a custom build for one agency (Central Homes). No `agency_id` column exists, and no tenant-isolation scoping is needed in any policy. All policies scope by `auth.uid()` + role only.

## Service-role bypass — know exactly where this is legitimate
RLS does not apply when using the service-role key. In this project, that bypass is only legitimate in two places:
1. Meta webhook lead-insertion (no `auth.uid()` exists for an unauthenticated webhook call)
2. `createAgent()`'s `auth.admin.createUser()` call (see the `add-agent-flow` skill)

Any other server-side code using the service-role key to bypass RLS should be treated as a design smell worth questioning, not a shortcut to reach for casually.

## Common mistakes to avoid
- Forgetting to run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` after creating a table — a table with no RLS enabled and no explicit policy is either fully open or fully closed depending on Supabase defaults; always confirm which, don't assume.
- Writing a policy that checks `role` directly against a claim in the JWT instead of querying `profiles` — role changes need to take effect immediately, not only after the JWT refreshes.
- Applying the same policy pattern to `integration_connections.access_token` as to ordinary business data — this table holds credentials and should be even more restrictive (server-only reads, never exposed via a SELECT policy to any client role).

## Reference
See CLAUDE.md / GEMINI.md §8 (RBAC table) and §9 (Security Checkpoints) for the full access matrix and non-negotiable rules.
