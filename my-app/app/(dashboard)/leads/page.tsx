import { createClient } from "@/lib/supabase/server";
import { LeadTable } from "@/components/leads/LeadTable";
import { LeadsRealtime } from "@/components/leads/LeadsRealtime";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();

  // Defense Layer 2 — verify session
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) redirect("/login");

  const userId = authData.claims.sub;

  // Defense-in-depth: fetch role to scope query
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const role = profile?.role || "agent";

  // Build base query
  let leadsQuery = supabase
    .from("leads")
    .select(`
      id, name, phone, email, source, stage, assigned_to, created_at,
      profiles ( full_name )
    `)
    .order("created_at", { ascending: false });

  // Apply application-level filter for agents
  if (role === "agent") {
    leadsQuery = leadsQuery.eq("assigned_to", userId);
  }

  const [
    { data: leads, error: leadsErr },
    { data: agents, error: agentsErr }
  ] = await Promise.all([
    leadsQuery,
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "agent")
      .order("full_name", { ascending: true }),
  ]);

  if (leadsErr) {
    console.error("[LeadsPage] Fetch Error:", leadsErr.message);
    throw new Error("Failed to load leads from the database.");
  }
  if (agentsErr) {
    console.error("[LeadsPage] Agents fetch error:", agentsErr.message);
    // Non-blocking — filters still work without agent names
  }

  return (
    <div className="space-y-6 pb-12">
      <LeadsRealtime />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track your incoming leads.</p>
        </div>
        <Link href="/leads/new">
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        </Link>
      </div>

      <LeadTable leads={leads || []} agents={agents || []} />
    </div>
  );
}
