"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateLeadStageAction, reassignLeadAction } from "@/app/(dashboard)/leads/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stages = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "site_visit", label: "Site Visit" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
];

interface Agent {
  id: string;
  full_name: string;
}

interface LeadQuickActionsProps {
  leadId: string;
  currentStage: string;
  currentAgentId: string | null;
  agents: Agent[];
}

export function LeadQuickActions({ leadId, currentStage, currentAgentId, agents }: LeadQuickActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState(currentStage);
  const [selectedAgent, setSelectedAgent] = useState(currentAgentId || "");

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

  function handleStageChange(newStage: string) {
    setSelectedStage(newStage);
    setError(null);
    startTransition(async () => {
      const result = await updateLeadStageAction(leadId, newStage);
      if (!result.success) {
        setError(result.error || "Failed to update stage.");
        setSelectedStage(currentStage); // rollback
      } else {
        router.refresh();
      }
    });
  }

  function handleAgentChange(newAgentId: string) {
    setSelectedAgent(newAgentId);
    setError(null);
    startTransition(async () => {
      const result = await reassignLeadAction(leadId, newAgentId || null);
      if (!result.success) {
        setError(result.error || "Failed to reassign.");
        setSelectedAgent(currentAgentId || ""); // rollback
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-2 text-xs font-medium text-red-800 bg-red-100 rounded-md dark:bg-red-900/50 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="stage-select">Update Stage</Label>
          <select
            id="stage-select"
            className={selectClass}
            value={selectedStage}
            onChange={(e) => handleStageChange(e.target.value)}
            disabled={isPending}
          >
            {stages.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-select">Reassign Agent</Label>
          <select
            id="agent-select"
            className={selectClass}
            value={selectedAgent}
            onChange={(e) => handleAgentChange(e.target.value)}
            disabled={isPending}
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
