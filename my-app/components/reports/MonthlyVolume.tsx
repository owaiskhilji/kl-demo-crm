"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, startOfMonth, formatISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface MonthlyVolumeProps {
  leads: any[];
}

export function MonthlyVolume({ leads = [] }: MonthlyVolumeProps) {
  const chartData = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    const volumeMap: Record<string, number> = {};

    leads.forEach((lead) => {
      if (!lead.created_at) return;
      // Group by month
      const date = parseISO(lead.created_at);
      const monthStart = startOfMonth(date);
      const key = formatISO(monthStart, { representation: 'date' });
      
      volumeMap[key] = (volumeMap[key] || 0) + 1;
    });

    // Sort chronologically
    return Object.entries(volumeMap)
      .map(([dateKey, count]) => ({
        date: dateKey,
        formattedDate: format(parseISO(dateKey), "MMM yy"),
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6); // Show last 6 months max
  }, [leads]);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="col-span-2 bg-card border-border shadow-sm h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-4 w-4" />
            Monthly Lead Volume
          </CardTitle>
          <CardDescription>Velocity over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          No volume data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2 bg-card border-border shadow-sm h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="h-4 w-4" />
          Monthly Lead Volume
        </CardTitle>
        <CardDescription>Velocity over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10 dark:opacity-20" />
            <XAxis 
              dataKey="formattedDate" 
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
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }} 
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              name="Leads"
              stroke="#06b6d4" 
              strokeWidth={3}
              activeDot={{ r: 6, fill: "#06b6d4", stroke: "var(--background)", strokeWidth: 2 }}
              dot={{ r: 4, fill: "var(--background)", stroke: "#06b6d4", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
