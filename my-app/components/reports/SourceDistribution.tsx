"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";

interface SourceDistributionProps {
  leads: any[];
}

const COLORS = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#64748b"];

export function SourceDistribution({ leads = [] }: SourceDistributionProps) {
  const chartData = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    const sourceCounts: Record<string, number> = {};

    leads.forEach((lead) => {
      const source = lead.source ? lead.source.replace("_", " ") : "Unknown";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return Object.entries(sourceCounts)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
      .sort((a, b) => b.value - a.value); // Sort largest to smallest
  }, [leads]);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="col-span-1 bg-card border-border shadow-sm h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <PieChartIcon className="h-4 w-4" />
            Leads by Source
          </CardTitle>
          <CardDescription>Distribution of lead origins</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          No source data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 bg-card border-border shadow-sm h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <PieChartIcon className="h-4 w-4" />
          Leads by Source
        </CardTitle>
        <CardDescription>Distribution of lead origins</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
