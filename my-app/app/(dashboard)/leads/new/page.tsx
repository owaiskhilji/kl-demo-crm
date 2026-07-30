import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeadForm } from "@/components/leads/LeadForm";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const supabase = await createClient();

  // Defense Layer 2 — verify session
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) redirect("/login");

  // Fetch active agents for the "Assign to" dropdown
  const { data: agents, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "agent")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[NewLeadPage] Failed to load agents:", error.message);
    // Non-blocking: allow form to render without agents rather than crash
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Create Lead</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Add a new lead to the CRM pipeline.</p>
      </div>

      <LeadForm agents={agents || []} />
    </div>
  );
}
