import { formatDistanceToNow } from "date-fns";
import {
  ArrowRightLeft,
  UserCheck,
  PlusCircle,
  RefreshCw,
} from "lucide-react";

interface Activity {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  agent_id: string | null;
  profiles?: { full_name: string } | null;
}

const actionConfig: Record<string, { icon: typeof ArrowRightLeft; label: string; color: string }> = {
  LEAD_CREATED: { icon: PlusCircle, label: "Lead Created", color: "text-green-600 dark:text-green-400" },
  STAGE_CHANGED: { icon: RefreshCw, label: "Stage Changed", color: "text-blue-600 dark:text-blue-400" },
  AGENT_REASSIGNED: { icon: UserCheck, label: "Agent Reassigned", color: "text-purple-600 dark:text-purple-400" },
};

function formatStage(s: string | null): string {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LeadActivityTimeline({ activities }: { activities: Activity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4">
        No activity recorded for this lead yet.
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />

      {activities.map((activity) => {
        const config = actionConfig[activity.action] || {
          icon: ArrowRightLeft,
          label: activity.action,
          color: "text-zinc-600",
        };
        const Icon = config.icon;

        return (
          <div key={activity.id} className="relative flex items-start gap-4 py-3 pl-2">
            {/* Icon dot */}
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 ${config.color}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {config.label}
              </p>
              {activity.action === "STAGE_CHANGED" && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {formatStage(activity.old_value)} → {formatStage(activity.new_value)}
                </p>
              )}
              {activity.action === "AGENT_REASSIGNED" && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Reassigned to a new agent
                </p>
              )}
              {activity.action === "LEAD_CREATED" && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Initial stage: {formatStage(activity.new_value)}
                </p>
              )}
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                {activity.profiles?.full_name && ` • by ${activity.profiles.full_name}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
