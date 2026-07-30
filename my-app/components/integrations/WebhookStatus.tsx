"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

export function WebhookStatus() {
  const [lastWebhook, setLastWebhook] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLastWebhook = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("leads")
          .select("created_at")
          .in("source", ["facebook", "whatsapp", "instagram"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (data?.created_at) {
          setLastWebhook(new Date(data.created_at));
        }
      } catch (err) {
        console.error("Failed to fetch webhook status", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLastWebhook();
  }, []);

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />;
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-zinc-50 dark:bg-zinc-900/50">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Webhook Health</h3>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">Webhooks are listening</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Your server is ready to receive incoming leads and messages.
            </p>
          </div>
        </div>
        
        <div className="sm:text-right flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 pl-14 sm:pl-0 border-t sm:border-t-0 pt-4 sm:pt-0 border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Last event received
          </p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {lastWebhook ? (
              formatDistanceToNow(lastWebhook, { addSuffix: true })
            ) : (
              <span className="text-zinc-500 font-normal">No events yet</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
