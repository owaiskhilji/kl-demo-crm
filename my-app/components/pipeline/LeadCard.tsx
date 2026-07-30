"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { GripVertical } from "lucide-react";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";

export interface LeadCardData {
  id: string;
  name: string;
  phone: string;
  source: string | null;
  stage: string;
  assigned_to: string | null;
  updated_at: string;
  profiles?: { full_name: string } | null;
}

interface LeadCardProps {
  lead: LeadCardData;
}

export function LeadCard({ lead }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary/30 z-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          className="mt-0.5 cursor-grab touch-none text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {lead.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {lead.phone}
          </p>
          <div className="flex items-center justify-between gap-2">
            {lead.source && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {lead.source.replace("_", " ")}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
              {lead.profiles?.full_name || "Unassigned"}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
              {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
