import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadQuickActions } from "@/components/leads/LeadQuickActions";
import { LeadActivityTimeline } from "@/components/leads/LeadActivityTimeline";
import { LeadDeleteButton } from "@/components/leads/LeadDeleteButton";
import { Phone, Mail, MapPin, Building2, Banknote, Calendar, User, MessageSquare } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const supabase = await createClient();

  // Defense Layer 2 — verify session
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.claims.sub)
    .single();

  const isOwner = profile?.role === "owner";

  // Fetch lead with assigned agent profile
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select(`
      *,
      profiles ( id, full_name )
    `)
    .eq("id", id)
    .single();

  if (leadErr || !lead) {
    console.error("[LeadDetailPage] Not found:", leadErr?.message);
    notFound();
  }

  // Fetch activity timeline (most recent first)
  const { data: activities, error: actErr } = await supabase
    .from("lead_activities")
    .select(`
      id, action, old_value, new_value, created_at, agent_id,
      profiles ( full_name )
    `)
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  if (actErr) {
    console.error("[LeadDetailPage] Activities fetch error:", actErr.message);
    // Non-blocking — render page without timeline rather than crash
  }

  // Fetch all agents for the quick-actions reassignment dropdown
  const { data: agents } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "agent")
    .order("full_name", { ascending: true });

  const infoItems = [
    { icon: Phone, label: "Phone", value: lead.phone && lead.phone !== "No phone provided" ? lead.phone : null },
    { icon: Mail, label: "Email", value: lead.email },
    { icon: MapPin, label: "Area", value: lead.area },
    { icon: Building2, label: "Category", value: lead.category },
    { icon: Building2, label: "Property Type", value: lead.property_type?.replace("_", " ") },
    { icon: Banknote, label: "Budget", value: lead.budget ? `PKR ${Number(lead.budget).toLocaleString()}` : null },
    { icon: User, label: "Source", value: lead.source?.replace("_", " ") },
    { icon: Calendar, label: "Created", value: format(new Date(lead.created_at), "dd MMM yyyy, h:mm a") },
  ].filter((item) => item.value);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{lead.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <LeadStatusBadge stage={lead.stage} />
            {lead.profiles?.full_name && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Assigned to <span className="font-medium text-zinc-700 dark:text-zinc-300">{lead.profiles.full_name}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["whatsapp", "facebook", "instagram"].includes(lead.source || "") && (
            <Link 
              href={`/leads/${lead.id}/chat`}
              className={cn(buttonVariants({ variant: "default" }), "gap-2")}
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Link>
          )}
          {isOwner && <LeadDeleteButton leadId={lead.id} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — Lead Info + Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Details Card */}
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Lead Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                {infoItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3">
                      <Icon className="h-4 w-4 mt-0.5 text-zinc-400" />
                      <div>
                        <dt className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</dt>
                        <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">{item.value}</dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
              {lead.notes && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Notes</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{lead.notes}</p>
                </div>

              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadActivityTimeline activities={(activities as any) || []} />
            </CardContent>
          </Card>
        </div>

        {/* Right column — Quick Actions */}
        <div className="space-y-6">
          <LeadQuickActions
            leadId={lead.id}
            currentStage={lead.stage}
            currentAgentId={lead.assigned_to}
            agents={agents || []}
          />
        </div>
      </div>
    </div>
  );
}
