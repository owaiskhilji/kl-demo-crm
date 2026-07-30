import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";


export async function GET(request: Request) {
  // 1. Verify CRON_SECRET to protect the endpoint
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[Cron] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Service-role client for background task (no user session)
    const admin = createAdminClient();

    // 3. Call the atomic RPC to insert notifications AND flip follow_ups.notified safely
    const { data: processedCount, error: rpcError } = await admin.rpc(
      "process_due_follow_ups"
    );

    if (rpcError) {
      console.error("[Cron] RPC failed:", rpcError.message);
      throw rpcError;
    }

    return NextResponse.json({
      success: true,
      processed: processedCount || 0
    });
    
  } catch (error: any) {
    console.error("[Cron] Failed to process follow-ups:", error.message || error);
    // Returning 500 allows Vercel Cron to potentially alert us of failures
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
