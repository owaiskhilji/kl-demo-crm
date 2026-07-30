"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AgentPerformanceChartProps {
  data: { name: string; assigned: number; closed: number }[];
}

export function AgentPerformanceChart({ data }: AgentPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-sm bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Agent Performance</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-zinc-500">
          No data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Agent Performance</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} width={80} />
            <Tooltip 
              cursor={{ fill: '#f4f4f5' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', backgroundColor: 'rgba(255,255,255,0.9)' }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="assigned" name="Assigned Leads" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={20} />
            <Bar dataKey="closed" name="Closed Deals" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
