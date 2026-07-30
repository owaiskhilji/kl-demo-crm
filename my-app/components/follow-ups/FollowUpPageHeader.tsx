"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FollowUpForm } from "./FollowUpForm";

interface FollowUpPageHeaderProps {
  availableLeads: { id: string; name: string }[];
}

export function FollowUpPageHeader({ availableLeads }: FollowUpPageHeaderProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Follow-Ups
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Track and manage your scheduled follow-ups.
          </p>
        </div>
        <Button className="gap-2 shadow-sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Schedule Follow-Up
        </Button>
      </div>

      <FollowUpForm
        leads={availableLeads}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </>
  );
}
