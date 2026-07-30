"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DashboardRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("dashboard_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          // Log explicitly for debugging without cluttering UI
          console.log("[DashboardRealtime] Received leads update:", payload);
          // Refetch the server component gracefully to get updated data
          router.refresh();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("[DashboardRealtime] Subscription error:", err);
        }
        if (status === "SUBSCRIBED") {
          console.log("[DashboardRealtime] Connected to realtime leads stream");
        } else if (status === "CLOSED") {
          console.warn("[DashboardRealtime] Connection closed");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[DashboardRealtime] Channel error - attempting to reconnect...");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
