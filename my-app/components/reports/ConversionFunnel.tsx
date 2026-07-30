"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter } from "lucide-react";

interface ConversionFunnelProps {
  leads: any[];
}

const STAGES = [
  { id: "new_lead", label: "New Lead" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "site_visit", label: "Site Visit" },
  { id: "negotiation", label: "Negotiation" },
  { id: "closed", label: "Closed" },
];

export function ConversionFunnel({ leads = [] }: ConversionFunnelProps) {
  const chartData = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    const counts: Record<string, number> = {};
    STAGES.forEach((s) => (counts[s.id] = 0));

    leads.forEach((lead) => {
      if (counts[lead.stage] !== undefined) {
        counts[lead.stage] += 1;
      }
    });

    return STAGES.map((s) => ({
      name: s.label,
      count: counts[s.id],
    }));
  }, [leads]);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="col-span-1 bg-card border-border shadow-sm h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="h-4 w-4" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>Pipeline stage distribution</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          No pipeline data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 bg-card border-border shadow-sm h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Filter className="h-4 w-4" />
          Conversion Funnel
        </CardTitle>
        <CardDescription>Volume across pipeline stages</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10 dark:opacity-20" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              stroke="currentColor" 
              className="text-[10px] font-medium opacity-70"
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              stroke="currentColor" 
              className="text-xs opacity-50"
            />
            <Tooltip 
              cursor={{ fill: 'var(--muted)' }} 
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
            />
            <Bar dataKey="count" name="Leads" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
