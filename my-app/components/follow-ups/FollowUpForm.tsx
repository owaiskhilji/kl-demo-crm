"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  createFollowUpAction,
  updateFollowUpAction,
} from "@/app/(dashboard)/follow-ups/actions";

const schema = z.object({
  lead_id: z.string().uuid("Please select a lead"),
  scheduled_at: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Lead {
  id: string;
  name: string;
}

interface FollowUpFormProps {
  leads: Lead[];
  editFollowUp?: {
    id: string;
    lead_id: string;
    scheduled_at: string;
    notes: string | null;
  };
  open: boolean;
  onClose: () => void;
  defaultLeadId?: string;
}

export function FollowUpForm({
  leads,
  editFollowUp,
  open,
  onClose,
  defaultLeadId,
}: FollowUpFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = !!editFollowUp;

  // Format a UTC ISO string into date-only input value (YYYY-MM-DD)
  const toDateInputValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lead_id: editFollowUp?.lead_id ?? defaultLeadId ?? "",
      scheduled_at: editFollowUp?.scheduled_at
        ? toDateInputValue(editFollowUp.scheduled_at)
        : "",
      notes: editFollowUp?.notes ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateFollowUpAction(editFollowUp!.id, values)
        : await createFollowUpAction(values);

      if (!result.success) {
        setServerError(result.error || "An error occurred.");
        return;
      }

      toast.success(isEditing ? "Follow-up updated" : "Follow-up scheduled", {
        description: isEditing
          ? "The follow-up has been rescheduled."
          : "You'll be reminded on the scheduled date.",
      });
      form.reset();
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Follow-Up" : "Schedule Follow-Up"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Lead selector */}
          <div className="space-y-2">
            <Label htmlFor="lead_id">Lead</Label>
            <Select
              value={form.watch("lead_id")}
              onValueChange={(val: string | null) => form.setValue("lead_id", val ?? "")}
              disabled={!!defaultLeadId || isPending}
            >
              <SelectTrigger id="lead_id">
                <SelectValue placeholder="">
                  {form.watch("lead_id") 
                    ? leads.find(l => l.id === form.watch("lead_id"))?.name 
                    : "Select a lead..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.lead_id && (
              <p className="text-[0.8rem] text-red-500">
                {form.formState.errors.lead_id.message}
              </p>
            )}
          </div>

          {/* Date picker (date-only, no time selection) */}
          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Reminder Date</Label>
            <Input
              id="scheduled_at"
              type="date"
              {...form.register("scheduled_at")}
              disabled={isPending}
              min={format(new Date(), "yyyy-MM-dd")}
            />
            {form.formState.errors.scheduled_at && (
              <p className="text-[0.8rem] text-red-500">
                {form.formState.errors.scheduled_at.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder=""
              rows={3}
              {...form.register("notes")}
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Update"
              ) : (
                "Schedule"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
