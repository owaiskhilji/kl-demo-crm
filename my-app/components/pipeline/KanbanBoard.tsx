"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { toast } from "sonner";

import { updateLeadStageAction } from "@/app/(dashboard)/leads/actions";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard, type LeadCardData } from "./LeadCard";

const STAGES = [
  "new_lead",
  "contacted",
  "qualified",
  "site_visit",
  "negotiation",
  "closed",
  "lost",
] as const;

interface KanbanBoardProps {
  initialLeads: LeadCardData[];
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<LeadCardData[]>(initialLeads);
  const [activeCard, setActiveCard] = useState<LeadCardData | null>(null);

  // Sensors: pointer for desktop, touch for mobile — with activation distance to prevent accidental drags
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 6 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Group leads into columns by stage
  const columns = STAGES.map((stage) => ({
    stage,
    leads: leads.filter((l) => l.stage === stage),
  }));

  // Find which column a lead or droppable ID belongs to
  function findStageForId(id: string): string | undefined {
    // Check if id is a stage name (column droppable)
    if (STAGES.includes(id as typeof STAGES[number])) return id;
    // Otherwise it's a lead id — find its current stage
    const lead = leads.find((l) => l.id === id);
    return lead?.stage;
  }

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const lead = leads.find((l) => l.id === active.id);
      if (lead) setActiveCard(lead);
    },
    [leads]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeStage = findStageForId(active.id as string);
      const overStage = findStageForId(over.id as string);

      if (!activeStage || !overStage || activeStage === overStage) return;

      // Optimistic: move card to the new column immediately in local state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === active.id ? { ...l, stage: overStage } : l
        )
      );
    },
    [leads]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      if (!over) return;

      const lead = leads.find((l) => l.id === active.id);
      if (!lead) return;

      const targetStage = findStageForId(over.id as string);
      if (!targetStage) return;

      // Find the original stage from initialLeads (before any optimistic changes)
      const originalLead = initialLeads.find((l) => l.id === active.id);
      const originalStage = originalLead?.stage || lead.stage;

      // If dropped back into the same original column, no server call needed
      if (targetStage === originalStage) return;

      // The optimistic move already happened in handleDragOver.
      // Now fire the server action in the background.
      try {
        const result = await updateLeadStageAction(lead.id, targetStage);

        if (!result.success) {
          // ROLLBACK: bounce card back to its original column
          setLeads((prev) =>
            prev.map((l) =>
              l.id === active.id ? { ...l, stage: originalStage } : l
            )
          );
          toast.error("Failed to update stage", {
            description: result.error || "The server rejected this change. The card has been moved back.",
          });
        } else {
          toast.success("Stage updated", {
            description: `${lead.name} moved to ${targetStage.replace(/_/g, " ")}`,
          });
        }
      } catch (err) {
        // ROLLBACK on unexpected network/runtime errors
        setLeads((prev) =>
          prev.map((l) =>
            l.id === active.id ? { ...l, stage: originalStage } : l
          )
        );
        toast.error("Network error", {
          description: "Could not reach the server. The card has been moved back.",
        });
        console.error("[KanbanBoard] DragEnd error:", err);
      }
    },
    [leads, initialLeads]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="relative h-full">
        {/* Right fade edge hint for mobile scrolling */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-950 to-transparent pointer-events-none md:hidden z-10" />
        
        <div className="flex gap-4 overflow-x-auto overflow-y-visible pb-4 h-full snap-x snap-mandatory scroll-smooth">
          {columns.map((col) => (
            <KanbanColumn key={col.stage} stage={col.stage} leads={col.leads} />
          ))}
        </div>
      </div>

      {/* Drag overlay — shows a floating copy of the card being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="w-[264px] rotate-3 opacity-90">
            <LeadCard lead={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
