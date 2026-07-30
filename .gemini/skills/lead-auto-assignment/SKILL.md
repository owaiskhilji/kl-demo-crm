---
name: lead-auto-assignment
description: Guides the agent through implementing or modifying automatic lead distribution across agents in Central Homes CRM, including the least-loaded assignment algorithm and manual override behavior. Use when building the lead-assignment logic, changing how incoming leads are routed to agents, or debugging uneven/incorrect lead distribution.
---

# Lead Auto-Assignment (Least-Loaded, Not Round-Robin)

## When to use this skill
- Implementing the logic that assigns a newly created or webhook-received lead to an agent
- Changing the assignment algorithm (e.g. adding weighting by experience, area specialization, or working hours)
- Debugging complaints like "why did agent X get fewer leads this week"
- Adding the manual-override / bulk-reassign UI in `/agents` or Lead Detail

## Core rule — least-loaded, evaluated per lead, not batch-averaged
Naive round-robin (agent 1, 2, 3, 4, 5, 1, 2, ...) is wrong for this use case: it doesn't account for an agent being on leave, already overloaded from manual assignments, or leads arriving at uneven rates. Instead, assign each incoming lead to whichever agent currently has the fewest open leads, evaluated at the moment that specific lead arrives — not as a single calculation across a batch of "20 leads for 5 agents."

## Query pattern
```sql
SELECT p.id
FROM profiles p
LEFT JOIN leads l ON l.assigned_to = p.id AND l.stage NOT IN ('closed', 'lost')
WHERE p.role = 'agent'
GROUP BY p.id
ORDER BY COUNT(l.id) ASC
LIMIT 1;
```
"Open" leads are anything not in `closed` or `lost` — closed/lost leads should not count against an agent's current load.

## Where this runs
- `lib/utils/leadAssignment.ts` — a function wrapping the above query, callable from:
  - Meta webhook handlers (WhatsApp, Facebook, Instagram) after a lead is upserted
  - The manual "Create Lead" flow, when no agent is explicitly chosen
- Set `leads.assignment_type = 'auto'` whenever this path fires.

## Manual override
- `assigned_to` stays a normal, always-editable field for owner/manager in Lead Detail and the bulk-assign UI.
- Auto-assignment only fires when a lead has no `assigned_to` set at creation time — never overwrite an existing manual assignment.
- A manual reassignment sets `assignment_type = 'manual'`. This distinction is what makes later disputes ("why did I get fewer leads") auditable — you can show whether a lead's routing was algorithmic or a deliberate admin decision.

## Common mistakes to avoid
- Calculating assignment for a whole batch of leads at once instead of per-lead — this produces stale load counts as soon as the first lead in the batch is assigned.
- Counting `closed`/`lost` leads toward an agent's load, which makes long-tenured agents look artificially "busy" forever.
- Overwriting a manual `assigned_to` value when a lead is edited for unrelated reasons (e.g. updating notes) — only the assignment action itself should change `assigned_to`/`assignment_type`.
- Forgetting to handle the zero-agents edge case (no `profiles` with `role = 'agent'` yet) — the query will return no rows; the calling code must handle a null result instead of crashing the webhook handler.

## Reference
See CLAUDE.md / GEMINI.md §6.5.2 for full context and rationale.
