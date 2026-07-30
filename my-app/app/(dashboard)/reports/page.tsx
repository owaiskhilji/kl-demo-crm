import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversionFunnel } from "@/components/reports/ConversionFunnel";
import { AgentPerformance } from "@/components/reports/AgentPerformance";
import { SourceDistribution } from "@/components/reports/SourceDistribution";
import { MonthlyVolume } from "@/components/reports/MonthlyVolume";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();

  // Defense Layer 2: Auth verification
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) redirect("/login");

  const userId = authData.claims.sub;

  // Fetch current user's profile to determine role
  let role = "agent";
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (profile) {
      role = profile.role;
    }
  } catch (err) {
    console.error("[ReportsPage] Error fetching profile role:", err);
  }

  // Data fetching using Promise.all for concurrency
  // RLS (Row Level Security) automatically handles data isolation:
  // - Agents only fetch their assigned leads
  // - Owners/Managers fetch all leads across the agency
  let leadsData: any[] = [];
  let errorMsg = null;

  try {
    const [leadsRes] = await Promise.all([
      supabase
        .from("leads")
        .select(`
          id, 
          stage, 
          source, 
          created_at, 
          assigned_to, 
          profiles(full_name)
        `)
        .order("created_at", { ascending: true })
    ]);

    if (leadsRes.error) {
      console.error("[ReportsPage] Database fetch error:", leadsRes.error.message);
      errorMsg = "Unable to load report data at this time.";
    } else {
      leadsData = leadsRes.data || [];
    }
  } catch (err) {
    console.error("[ReportsPage] Unexpected execution error:", err);
    errorMsg = "An unexpected error occurred while compiling reports.";
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Reports & Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {role === "agent" 
            ? "Your personal performance metrics and pipeline health."
            : "Agency-wide performance metrics and pipeline health."}
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-md bg-destructive/10 p-4 flex gap-3 text-destructive border border-destructive/20">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Row */}
        <div className="lg:col-span-2">
          <AgentPerformance leads={leadsData} role={role} />
        </div>
        <div className="lg:col-span-1">
          <ConversionFunnel leads={leadsData} />
        </div>

        {/* Bottom Row */}
        <div className="lg:col-span-1">
          <SourceDistribution leads={leadsData} />
        </div>
        <div className="lg:col-span-2">
          <MonthlyVolume leads={leadsData} />
        </div>
      </div>
    </div>
  );
}
