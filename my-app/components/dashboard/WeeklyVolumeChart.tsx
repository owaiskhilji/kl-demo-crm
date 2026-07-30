"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeeklyVolumeChartProps {
  data: { date: string; count: number }[];
}

export function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-sm bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Weekly Volume</CardTitle>
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
        <CardTitle className="text-sm font-medium">Weekly Volume</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
            <Tooltip 
              cursor={{ fill: '#f4f4f5' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', backgroundColor: 'rgba(255,255,255,0.9)' }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
