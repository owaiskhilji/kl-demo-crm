"use client";

import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RecentLeadsProps {
  leads: any[];
}

export function RecentLeads({ leads }: RecentLeadsProps) {
  const router = useRouter();

  if (!leads || leads.length === 0) {
    return (
      <Card className="shadow-sm bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 col-span-1 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Leads</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8 text-zinc-500">
          No recent leads found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 col-span-1 lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Leads</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">{lead.name}</TableCell>
                <TableCell className="capitalize text-zinc-500">{lead.source?.replace('_', ' ') || 'Unknown'}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {lead.stage?.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-right text-zinc-500 text-sm">
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
