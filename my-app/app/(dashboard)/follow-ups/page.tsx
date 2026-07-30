import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, startOfDay, endOfDay } from "date-fns";

import { FollowUpList } from "@/components/follow-ups/FollowUpList";
import { FollowUpPageHeader } from "@/components/follow-ups/FollowUpPageHeader";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const supabase = await createClient();

  // Defense Layer 2 — verify session
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) redirect("/login");

  const userId = authData.claims.sub;

  // Defense-in-depth: fetch role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const role = profile?.role || "agent";

  // Fetch follow-ups: overdue + today + next 7 days for active ones,
  // plus recently completed (last 7 days) for the Done section.
  // Agents see their own only; owners/managers see all.
  // RLS enforces this at DB level; we also filter at the query level.
  const sevenDaysAhead = addDays(new Date(), 7).toISOString();
  const sevenDaysBehind = addDays(new Date(), -7).toISOString();

  let query = supabase
    .from("follow_ups")
    .select(`
      id, lead_id, scheduled_at, notes, is_done, notified,
      leads ( id, name )
    `)
    .or(
      // Pending: anything not done within reasonable window (overdue or upcoming 7d)
      `and(is_done.eq.false,scheduled_at.lte.${sevenDaysAhead}),` +
      // Done: completed in last 7 days for the "Completed" section
      `and(is_done.eq.true,scheduled_at.gte.${sevenDaysBehind})`
    )
    .order("scheduled_at", { ascending: true });

  // Application-level filter for agents (defense-in-depth, RLS is primary)
  if (role === "agent") {
    query = query.eq("agent_id", userId);
  }

  const { data: followUps, error } = await query;

  if (error) {
    console.error("[FollowUpsPage] fetch:", error.message);
    // Render page with empty data rather than crashing
  }

  // Fetch leads available for the "Schedule" form lead-selector.
  // Agents only see their own assigned leads; owners/managers see all.
  let leadsQuery = supabase
    .from("leads")
    .select("id, name")
    .not("stage", "in", '("closed","lost")')
    .order("name", { ascending: true });

  if (role === "agent") {
    leadsQuery = leadsQuery.eq("assigned_to", userId);
  }

  const { data: availableLeads } = await leadsQuery;

  return (
    <div className="space-y-6 pb-12">
      <FollowUpPageHeader availableLeads={availableLeads || []} />
      <FollowUpList
        followUps={(followUps as any) || []}
        availableLeads={availableLeads || []}
      />
    </div>
  );
}
