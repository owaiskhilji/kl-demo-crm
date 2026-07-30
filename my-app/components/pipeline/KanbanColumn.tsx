"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadCard, type LeadCardData } from "./LeadCard";

const stageLabels: Record<string, { label: string; color: string }> = {
  new_lead: { label: "New Lead", color: "bg-blue-500" },
  contacted: { label: "Contacted", color: "bg-yellow-500" },
  qualified: { label: "Qualified", color: "bg-orange-500" },
  site_visit: { label: "Site Visit", color: "bg-purple-500" },
  negotiation: { label: "Negotiation", color: "bg-pink-500" },
  closed: { label: "Closed", color: "bg-green-500" },
  lost: { label: "Lost", color: "bg-zinc-400" },
};

interface KanbanColumnProps {
  stage: string;
  leads: LeadCardData[];
}

export function KanbanColumn({ stage, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { type: "column", stage },
  });

  const config = stageLabels[stage] || { label: stage, color: "bg-zinc-400" };

  return (
    <div
      className={`flex flex-col rounded-lg border bg-zinc-50/80 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 min-w-[280px] w-[280px] shrink-0 snap-center transition-colors ${
        isOver ? "border-primary bg-primary/5 dark:border-primary dark:bg-primary/10" : ""
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {config.label}
        </h3>
        <span className="ml-auto text-xs font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-full px-2 py-0.5">
          {leads.length}
        </span>
      </div>

      {/* Droppable card area */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]"
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-zinc-400 dark:text-zinc-600">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}
