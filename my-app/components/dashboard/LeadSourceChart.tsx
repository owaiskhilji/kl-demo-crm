"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

interface LeadSourceChartProps {
  data: { name: string; value: number }[];
}

export function LeadSourceChart({ data }: LeadSourceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-sm bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 col-span-1 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Lead Sources</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-zinc-500">
          No data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 col-span-1 lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Lead Sources</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', backgroundColor: 'rgba(255,255,255,0.9)' }}
              itemStyle={{ color: '#18181b', fontWeight: 500 }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
