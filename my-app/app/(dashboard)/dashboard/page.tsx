import { createClient } from "@/lib/supabase/server";
import { KPICard } from "@/components/dashboard/KPICard";
import { LeadSourceChart } from "@/components/dashboard/LeadSourceChart";
import { WeeklyVolumeChart } from "@/components/dashboard/WeeklyVolumeChart";
import { AgentPerformanceChart } from "@/components/dashboard/AgentPerformanceChart";
import { RecentLeads } from "@/components/dashboard/RecentLeads";
import { DashboardRealtime } from "@/components/dashboard/DashboardRealtime";

import { 
  Users, 
  UserPlus, 
  CalendarClock, 
  MapPin, 
  CheckCircle2 
} from "lucide-react";
import { format, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Execute all queries concurrently, leveraging our RLS-aware Views for heavy lifting
  const [
    { count: totalLeads, error: err1 },
    { count: newLeads, error: err2 },
    { count: followUpsDue, error: err3 },
    { count: siteVisits, error: err4 },
    { count: closedDeals, error: err5 },
    { data: sourceData, error: err6 },
    { data: volumeData, error: err7 },
    { data: agentData, error: err8 },
    { data: recentLeads, error: err9 }
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("stage", "new_lead"),
    supabase.from("follow_ups").select("*", { count: "exact", head: true }).lte("scheduled_at", nowIso).eq("is_done", false),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("stage", "site_visit"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("stage", "closed"),
    supabase.from("view_dashboard_lead_sources").select("*"),
    supabase.from("view_dashboard_weekly_volume").select("*"),
    supabase.from("view_dashboard_agent_performance").select("*").order("assigned_leads", { ascending: false }).limit(5),
    supabase.from("leads").select("id, name, email, stage, source, created_at").order("created_at", { ascending: false }).limit(5)
  ]);

  // Handle and log errors gracefully without crashing the UI
  const errors = [err1, err2, err3, err4, err5, err6, err7, err8, err9];
  errors.forEach((err, idx) => {
    if (err) console.error(`[fetchDashboard] query ${idx + 1}:`, err.message || err);
  });

  // --- Process Lead Sources (Lightweight mapping) ---
  const formattedSourceData = (sourceData || []).map((row) => ({
    name: (row.source || 'other').charAt(0).toUpperCase() + (row.source || 'other').slice(1).replace('_', ' '),
    value: Number(row.count || 0)
  }));

  // --- Process Weekly Volume (Lightweight mapping) ---
  const now = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, i) => format(subDays(now, 6 - i), 'MMM dd'));
  
  const volumeMap = (volumeData || []).reduce((acc: any, row) => {
    if (!row.date) return acc;
    const dateStr = format(new Date(row.date), 'MMM dd');
    acc[dateStr] = Number(row.count || 0);
    return acc;
  }, {});

  const formattedVolumeData = last7Days.map(date => ({
    date,
    count: volumeMap[date] || 0
  }));

  // --- Process Agent Performance (Lightweight mapping) ---
  const formattedAgentData = (agentData || []).map((row) => ({
    name: row.agent_name || 'Unassigned',
    assigned: Number(row.assigned_leads || 0),
    closed: Number(row.closed_deals || 0)
  }));

  return (
    <div className="space-y-6 pb-12">
      <DashboardRealtime />
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Overview of your CRM pipeline and current activities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard title="Total Leads" value={totalLeads || 0} icon={Users} />
        <KPICard title="New Leads" value={newLeads || 0} icon={UserPlus} description="Awaiting first contact" />
        <KPICard title="Follow-ups Due" value={followUpsDue || 0} icon={CalendarClock} description="Pending actions" />
        <KPICard title="Site Visits" value={siteVisits || 0} icon={MapPin} />
        <KPICard title="Closed Deals" value={closedDeals || 0} icon={CheckCircle2} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <LeadSourceChart data={formattedSourceData} />
        <WeeklyVolumeChart data={formattedVolumeData} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <AgentPerformanceChart data={formattedAgentData} />
        <RecentLeads leads={recentLeads || []} />
      </div>

      
    </div>
  );
}
