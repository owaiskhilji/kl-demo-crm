import { NextResponse } from "next/server";
import { refreshAllExpiringTokens } from "@/lib/meta/tokenRefresh";

// GET /api/integrations/cron
// Intended to be called daily by Vercel Cron
export async function GET(request: Request) {
  // Standard Vercel Cron security check
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshAllExpiringTokens();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[Meta Token Refresh Cron] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
