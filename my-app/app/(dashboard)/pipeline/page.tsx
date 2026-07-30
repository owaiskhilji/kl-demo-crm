import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = await createClient();

  // Defense Layer 2 — verify session
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) redirect("/login");

  // RLS handles role-based scoping: agents see only their assigned leads,
  // owners/managers see all. We just do a clean fetch.
  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id, name, phone, source, stage, assigned_to, updated_at,
      profiles ( full_name )
    `)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[PipelinePage] Fetch error:", error.message);
    throw new Error("Failed to load pipeline data.");
  }

  return (
    <div className="flex flex-col -m-6 h-[calc(100vh-4rem)]">
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">Pipeline</h1>
        <p className="w-54 md:w-auto text-sm text-slate-500 mt-1">
          Drag and drop leads between stages to update their status.
        </p>
      </div>

      {/* Full-bleed kanban board with its own horizontal scroll */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <KanbanBoard initialLeads={(leads as any) || []} />
      </div>
    </div>
  );
}
