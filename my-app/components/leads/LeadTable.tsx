"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadStatusBadge } from "./LeadStatusBadge";

const sourceOptions = [
  { value: "", label: "All Sources" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "zameen", label: "Zameen.com" },
  { value: "referral", label: "Referral" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "walk-in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

const stageOptions = [
  { value: "", label: "All Stages" },
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "site_visit", label: "Site Visit" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
];

interface LeadTableProps {
  leads: any[];
  agents?: { id: string; full_name: string }[];
}

export function LeadTable({ leads, agents = [] }: LeadTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");

  const selectClass =
    "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-input/30";

  const filtered = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone && l.phone.includes(search)) ||
      (l.email && l.email.toLowerCase().includes(search.toLowerCase()));
    const matchesSource = !sourceFilter || l.source === sourceFilter;
    const matchesStage = !stageFilter || l.stage === stageFilter;
    const matchesAgent = !agentFilter || l.assigned_to === agentFilter;
    return matchesSearch && matchesSource && matchesStage && matchesAgent;
  });

  return (
    <div className="space-y-4">
      {/* Search + Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder=""
            className="pl-9 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className={selectClass} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          {sourceOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select className={selectClass} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          {stageOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {agents.length > 0 && (
          <select className={selectClass} value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
            <option value="">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table — horizontally scrollable on small screens */}
      <div className="relative border rounded-lg bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 shadow-sm">
        {/* Right fade edge hint for mobile scrolling */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/90 dark:from-zinc-950/90 to-transparent pointer-events-none md:hidden z-10" />
        
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                    No leads found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">{lead.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm text-zinc-500">
                        <span>{lead.phone}</span>
                        {lead.email && <span className="text-xs">{lead.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-zinc-500">{lead.source?.replace("_", " ") || "—"}</TableCell>
                    <TableCell>
                      <LeadStatusBadge stage={lead.stage} />
                    </TableCell>
                    <TableCell className="text-zinc-500">{lead.profiles?.full_name || "Unassigned"}</TableCell>
                    <TableCell className="text-right text-zinc-500 text-sm whitespace-nowrap">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Showing {filtered.length} of {leads.length} leads
      </p>
    </div>
  );
}
