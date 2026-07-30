import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stageConfig: Record<string, { label: string; className: string }> = {
  new_lead: { label: "New Lead", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  contacted: { label: "Contacted", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
  qualified: { label: "Qualified", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
  site_visit: { label: "Site Visit", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
  negotiation: { label: "Negotiation", className: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800" },
  closed: { label: "Closed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
  lost: { label: "Lost", className: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700" },
};

export function LeadStatusBadge({ stage }: { stage: string }) {
  const config = stageConfig[stage] || { label: stage?.replace('_', ' '), className: "bg-zinc-100 text-zinc-800" };
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
