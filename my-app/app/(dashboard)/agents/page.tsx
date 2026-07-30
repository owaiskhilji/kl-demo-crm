import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AddAgentDialog } from "@/components/agents/AddAgentDialog";
import { AgentTable } from "@/components/agents/AgentTable";
import { Users } from "lucide-react";

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();

  if (!authData?.claims) {
    redirect("/login");
  }

  const userId = authData.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const isManagerOrOwner = profile?.role === "owner" || profile?.role === "manager";

  if (!isManagerOrOwner) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-zinc-500">
        You do not have permission to view the Agents directory.
      </div>
    );
  }

  // Fetch list of agents
  const { data: agents } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "agent")
    .order("created_at", { ascending: false });

  // Fetch leads to calculate stats and list for reassign
  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, assigned_to, stage")
    .order("created_at", { ascending: false });

  const agentStats = agents?.map(agent => {
    const agentLeads = leads?.filter(l => l.assigned_to === agent.id) || [];
    const openLeads = agentLeads.filter(l => !['closed', 'lost'].includes(l.stage));
    return {
      id: agent.id,
      full_name: agent.full_name,
      avatar_url: agent.avatar_url,
      totalLeads: openLeads.length,
      openLeads: openLeads.map(l => ({ id: l.id, name: l.name })),
      closedDeals: agentLeads.filter(l => l.stage === 'closed').length,
      siteVisits: agentLeads.filter(l => l.stage === 'site_visit').length,
    };
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            Agents
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your team members.
          </p>
        </div>
        
        {/* Only render Add Agent button for authorized roles */}
        {isManagerOrOwner && <AddAgentDialog />}
      </div>

      <AgentTable agents={agentStats} />
    </div>
  );
}
