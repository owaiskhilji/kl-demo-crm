"use client";

import { useState, useTransition } from "react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { FollowUpForm } from "./FollowUpForm";
import {
  markFollowUpDoneAction,
  deleteFollowUpAction,
} from "@/app/(dashboard)/follow-ups/actions";

export interface FollowUp {
  id: string;
  lead_id: string;
  scheduled_at: string;
  notes: string | null;
  is_done: boolean;
  notified: boolean;
  leads: {
    id: string;
    name: string;
  } | null;
}

interface FollowUpListProps {
  followUps: FollowUp[];
  availableLeads: { id: string; name: string }[];
}

// ----------------------------------------------------------------
// Section header with count badge
// ----------------------------------------------------------------
function SectionHeader({
  title,
  icon: Icon,
  count,
  variant,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  variant: "overdue" | "today" | "upcoming";
}) {
  const colors = {
    overdue: "text-red-600 bg-red-50 border-red-100",
    today: "text-amber-600 bg-amber-50 border-amber-100",
    upcoming: "text-primary bg-primary/5 border-primary/10",
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${colors[variant]}`}>
      <Icon className="h-5 w-5" />
      <h2 className="font-semibold text-sm">{title}</h2>
      <Badge variant="outline" className="ml-auto text-xs">
        {count}
      </Badge>
    </div>
  );
}

// ----------------------------------------------------------------
// Individual follow-up row
// ----------------------------------------------------------------
function FollowUpRow({
  followUp,
  availableLeads,
}: {
  followUp: FollowUp;
  availableLeads: { id: string; name: string }[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleMarkDone() {
    startTransition(async () => {
      const result = await markFollowUpDoneAction(followUp.id);
      if (!result.success) {
        toast.error("Failed to mark as done", { description: result.error });
      } else {
        toast.success("Follow-up marked as done");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFollowUpAction(followUp.id);
      if (!result.success) {
        toast.error("Failed to delete", { description: result.error });
      } else {
        toast.success("Follow-up deleted");
      }
    });
  }

  const isOverdue = isPast(new Date(followUp.scheduled_at)) && !isToday(new Date(followUp.scheduled_at));

  return (
    <>
      <div className="flex items-start gap-4 py-3 group">
        {/* Done indicator */}
        <div className="mt-0.5 flex-shrink-0">
          {followUp.is_done ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : isOverdue ? (
            <AlertCircle className="h-5 w-5 text-red-400" />
          ) : (
            <Clock className="h-5 w-5 text-zinc-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
              {followUp.leads?.name || "Unknown Lead"}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {format(new Date(followUp.scheduled_at), "d MMM yyyy")}
            </span>
            {!followUp.is_done && (
              <span className={`text-xs ${isOverdue ? "text-red-500" : "text-zinc-400"}`}>
                ({isOverdue ? "overdue " : ""}
                {formatDistanceToNow(new Date(followUp.scheduled_at), { addSuffix: true })})
              </span>
            )}
          </div>
          {followUp.notes && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
              {followUp.notes}
            </p>
          )}
        </div>

        {/* Actions — only shown for pending follow-ups */}
        {!followUp.is_done && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              title="Mark as done"
              onClick={handleMarkDone}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-700"
              title="Edit"
              onClick={() => setEditOpen(true)}
              disabled={isPending}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete"
                    disabled={isPending}
                    type="button"
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete follow-up?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the follow-up for{" "}
                    <strong>{followUp.leads?.name}</strong>. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <FollowUpForm
        leads={availableLeads}
        editFollowUp={{
          id: followUp.id,
          lead_id: followUp.lead_id,
          scheduled_at: followUp.scheduled_at,
          notes: followUp.notes,
        }}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

// ----------------------------------------------------------------
// Empty state
// ----------------------------------------------------------------
function EmptySection({ message }: { message: string }) {
  return (
    <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4 text-center italic">
      {message}
    </p>
  );
}

// ----------------------------------------------------------------
// Main list — receives pre-grouped data from the server page
// ----------------------------------------------------------------
export function FollowUpList({ followUps, availableLeads }: FollowUpListProps) {
  const now = new Date();

  const overdue = followUps.filter(
    (f) =>
      !f.is_done &&
      isPast(new Date(f.scheduled_at)) &&
      !isToday(new Date(f.scheduled_at))
  );

  const dueToday = followUps.filter(
    (f) => !f.is_done && isToday(new Date(f.scheduled_at))
  );

  const upcoming = followUps.filter(
    (f) =>
      !f.is_done &&
      !isPast(new Date(f.scheduled_at)) &&
      !isToday(new Date(f.scheduled_at))
  );

  const done = followUps.filter((f) => f.is_done);

  function renderRows(items: FollowUp[]) {
    return items.map((f, i) => (
      <div key={f.id}>
        {i > 0 && <div className="border-t border-zinc-100 dark:border-zinc-800" />}
        <FollowUpRow followUp={f} availableLeads={availableLeads} />
      </div>
    ));
  }

  return (
    <div className="space-y-6">
      {/* Overdue */}
      <Card className="shadow-sm border-red-100 dark:border-red-900/30">
        <CardHeader className="pb-2">
          <SectionHeader
            title="Overdue"
            icon={AlertCircle}
            count={overdue.length}
            variant="overdue"
          />
        </CardHeader>
        <CardContent>
          {overdue.length === 0 ? (
            <EmptySection message="No overdue follow-ups. Great work!" />
          ) : (
            renderRows(overdue)
          )}
        </CardContent>
      </Card>

      {/* Due Today */}
      <Card className="shadow-sm border-amber-100 dark:border-amber-900/30">
        <CardHeader className="pb-2">
          <SectionHeader
            title="Due Today"
            icon={CalendarClock}
            count={dueToday.length}
            variant="today"
          />
        </CardHeader>
        <CardContent>
          {dueToday.length === 0 ? (
            <EmptySection message="Nothing scheduled for today." />
          ) : (
            renderRows(dueToday)
          )}
        </CardContent>
      </Card>

      {/* Upcoming (next 7 days) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <SectionHeader
            title="Upcoming (Next 7 Days)"
            icon={Clock}
            count={upcoming.length}
            variant="upcoming"
          />
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptySection message="No upcoming follow-ups in the next 7 days." />
          ) : (
            renderRows(upcoming)
          )}
        </CardContent>
      </Card>

      {/* Completed (collapsible summary) */}
      {done.length > 0 && (
        <Card className="shadow-sm border-zinc-100 dark:border-zinc-800 opacity-70">
          <CardHeader className="pb-2">
            <SectionHeader
              title={`Completed (${done.length})`}
              icon={CheckCircle2}
              count={done.length}
              variant="upcoming"
            />
          </CardHeader>
          <CardContent>{renderRows(done)}</CardContent>
        </Card>
      )}
    </div>
  );
}
