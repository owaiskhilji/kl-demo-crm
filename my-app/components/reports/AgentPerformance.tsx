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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

interface AgentPerformanceProps {
  leads: any[];
  role: string;
}

export function AgentPerformance({ leads = [], role }: AgentPerformanceProps) {
  const chartData = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    const agentStats: Record<string, { assigned: number; siteVisits: number; closed: number }> = {};

    leads.forEach((lead) => {
      const agentName = lead.profiles?.full_name || "Unassigned";
      
      if (!agentStats[agentName]) {
        agentStats[agentName] = { assigned: 0, siteVisits: 0, closed: 0 };
      }

      agentStats[agentName].assigned += 1;
      
      if (lead.stage === "site_visit") {
        agentStats[agentName].siteVisits += 1;
      }
      
      if (lead.stage === "closed") {
        agentStats[agentName].closed += 1;
      }
    });

    return Object.entries(agentStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
      }))
      .sort((a, b) => b.assigned - a.assigned);
  }, [leads]);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="col-span-2 bg-card border-border shadow-sm h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-4 w-4" />
            Agent Performance
          </CardTitle>
          <CardDescription>Performance metrics across agents</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          No agent performance data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2 bg-card border-border shadow-sm h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Users className="h-4 w-4" />
          Agent Performance
        </CardTitle>
        <CardDescription>
          {role === "agent" 
            ? "Your personal performance metrics" 
            : "Contrasting performance across all agents"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="opacity-10 dark:opacity-20" />
            <XAxis type="number" stroke="currentColor" className="text-xs opacity-50" />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              stroke="currentColor" 
              className="text-xs font-medium opacity-70"
              width={100}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }} 
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="assigned" name="Assigned" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={12} />
            <Bar dataKey="siteVisits" name="Site Visits" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
            <Bar dataKey="closed" name="Closed" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
