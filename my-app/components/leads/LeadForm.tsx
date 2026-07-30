"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { createLeadAction } from "@/app/(dashboard)/leads/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const leadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().min(5, "Phone number is required."),
  email: z.string().email("Invalid email.").optional().or(z.literal("")),
  budget: z.string().optional(),
  area: z.string().optional(),
  category: z.enum(["residential", "commercial", ""]).optional(),
  property_type: z.enum(["home", "plot", "apartment", ""]).optional(),
  source: z.enum(["facebook", "instagram", "zameen", "referral", "whatsapp", "walk-in", "other", ""]).optional(),
  stage: z.enum(["new_lead", "contacted", "qualified", "site_visit", "negotiation", "closed", "lost"]),
  assigned_to: z.string().optional(),
  notes: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface Agent {
  id: string;
  full_name: string;
}

interface LeadFormProps {
  agents: Agent[];
}

export function LeadForm({ agents }: LeadFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      budget: "",
      area: "",
      category: "",
      property_type: "",
      source: "",
      stage: "new_lead",
      assigned_to: "",
      notes: "",
    },
  });

  async function onSubmit(values: LeadFormValues) {
    setError(null);
    const result = await createLeadAction({
      ...values,
      // Clean empty strings to null for DB
      email: values.email || null,
      category: values.category || null,
      property_type: values.property_type || null,
      source: values.source || null,
      assigned_to: values.assigned_to || null,
    });

    if (!result.success) {
      setError(result.error || "Failed to create lead.");
      return;
    }

    router.push("/leads");
    router.refresh();
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

  return (
    <Card className="max-w-2xl shadow-sm border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-xl">New Lead</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-3 text-sm font-medium text-red-800 bg-red-100 rounded-md dark:bg-red-900/50 dark:text-red-200">
              {error}
            </div>
          )}

          {/* --- Contact Info --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs font-medium text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" placeholder="" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-xs font-medium text-red-500">{form.formState.errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs font-medium text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (PKR)</Label>
              <Input id="budget" type="number" placeholder="" {...form.register("budget")} />
            </div>
          </div>

          {/* --- Property Info --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="area">Area / Location</Label>
              <Input id="area" placeholder="" {...form.register("area")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select id="category" className={selectClass} {...form.register("category")}>
                <option value="">Select category</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="property_type">Property Type</Label>
              <select id="property_type" className={selectClass} {...form.register("property_type")}>
                <option value="">Select type</option>
                <option value="home">Home</option>
                <option value="plot">Plot</option>
                <option value="apartment">Apartment</option>
              </select>
            </div>
          </div>

          {/* --- CRM Info --- */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="source">Lead Source</Label>
              <select id="source" className={selectClass} {...form.register("source")}>
                <option value="">Select source</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="zameen">Zameen.com</option>
                <option value="referral">Referral</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="walk-in">Walk-in</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <select id="stage" className={selectClass} {...form.register("stage")}>
                <option value="new_lead">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="site_visit">Site Visit</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed">Closed</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign to Agent</Label>
              <select id="assigned_to" className={selectClass} {...form.register("assigned_to")}>
                <option value="">Auto-assign</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* --- Notes --- */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder=""
              rows={3}
              {...form.register("notes")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Lead"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
