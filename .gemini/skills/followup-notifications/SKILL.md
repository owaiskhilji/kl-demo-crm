---
name: followup-notifications
description: Guides the agent through implementing or modifying date-triggered follow-up notifications in Central Homes CRM — the system that alerts an agent exactly on the date they scheduled a follow-up (e.g. "call back 9 July"). Use when building the notifications table, the daily cron job, the realtime notification bell, or debugging notifications that fire early, late, or not at all.
---

# Follow-Up Date-Triggered Notifications

## When to use this skill
- Building or editing the `notifications` table or its RLS policies
- Writing or modifying the daily cron job that creates due notifications
- Building the Topbar `NotificationBell` realtime subscription
- Debugging: a notification didn't fire on the scheduled date, fired on the wrong date after a reschedule, or kept re-firing after being dismissed

## Core requirement
An agent schedules a follow-up for a specific date (e.g. "9 July"). The agent must be notified exactly on that date — not immediately on save, and not only "whenever they next happen to open the app."

## Data model
- `follow_ups.scheduled_at` — the date/time the agent committed to.
- `follow_ups.notified` (boolean) — flips to `true` once the due-notification has been created, so the same follow-up doesn't generate a duplicate notification on the next day's cron run.
- `notifications` table — one row per alert actually delivered, with `agent_id`, `type = 'follow_up_due'`, `follow_up_id`, `lead_id`, `message`, `due_at`, `status` (`pending` / `due` / `seen` / `dismissed`).

## Flow
1. Creating or editing a follow-up only writes `scheduled_at` — it does NOT create a notification row at save time.
2. A **daily scheduled job** (Supabase `pg_cron`, or a Vercel Cron hitting `app/api/notifications/cron/route.ts` — implement exactly one of these, not both) runs once a day and:
   - Selects `follow_ups` where `scheduled_at::date = CURRENT_DATE`, `is_done = false`, `notified = false`.
   - Inserts one `notifications` row per match (`type = 'follow_up_due'`, `status = 'due'`, `due_at = scheduled_at`).
   - Flips `follow_ups.notified = true` for each matched row.
3. The Topbar `NotificationBell` subscribes via Supabase Realtime to `notifications where agent_id = auth.uid() and status = 'due'`.
4. Marking a follow-up "done" must also flip any linked `notifications` row to `dismissed`.
5. **Reschedule edge case — must be handled explicitly:** if an agent moves a follow-up from 9 July to 15 July, reset `follow_ups.notified = false` in that same edit action. If this reset is skipped, the reminder silently never fires again, because the cron job will see `notified = true` and skip it forever.

## Security
Protect the cron endpoint with a shared secret (`CRON_SECRET` env var, checked against a header) so it can't be triggered by anyone who guesses the URL. `notifications` must have RLS enabled — an agent should only ever see rows where `agent_id = auth.uid()`.

## Common mistakes to avoid
- Creating the notification at follow-up creation time instead of waiting for the scheduled date.
- Forgetting to reset `notified = false` on reschedule.
- Running the cron job more than once a day without a way to detect "already notified today" — the `notified` flag exists specifically to prevent this.
- Building both a `pg_cron` job and a Vercel Cron route for the same check — pick one, running both risks duplicate notifications.

## Reference
See CLAUDE.md / GEMINI.md §6.4.1 and §5.8 for schema and rationale.
