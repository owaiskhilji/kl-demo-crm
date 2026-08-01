"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LeadsRealtime() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("leads_page_realtime")
      // Listen for any new Leads being created or updated
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          console.log("[LeadsRealtime] Lead changed:", payload);
          router.refresh();
        }
      )
      // Listen for any new Messages (so if an existing lead messages, the UI can refresh if needed)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_log" },
        (payload) => {
          console.log("[LeadsRealtime] New message arrived:", payload);
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null; // This is a logic-only component, nothing to render
}
