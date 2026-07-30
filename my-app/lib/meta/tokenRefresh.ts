import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/utils/encryption";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

/**
 * Exchanges a short-lived user/page token for a long-lived token (usually 60 days).
 * As per Meta's API, the endpoint is:
 * GET https://graph.facebook.com/v21.0/oauth/access_token
 *   ?grant_type=fb_exchange_token
 *   &client_id={app-id}
 *   &client_secret={app-secret}
 *   &fb_exchange_token={short-lived-token}
 */
export class MetaTokenError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MetaTokenError";
    this.status = status;
  }
}

/**
 * Exchanges a short-lived user/page token for a long-lived token (usually 60 days).
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in?: number }> {
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error("META_APP_ID or META_APP_SECRET is missing from environment variables.");
  }

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });

  const url = `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  
  const data = await response.json();

  if (!response.ok) {
    console.error("[Meta Token Refresh] Failed to exchange token:", data);
    throw new MetaTokenError(`Graph API Error: ${data.error?.message || response.statusText}`, response.status);
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

/**
 * Runs periodically (e.g. daily via Vercel Cron) to refresh all active tokens
 * that are close to expiration (e.g., expiring in less than 7 days) or don't have an expiry set.
 */
export async function refreshAllExpiringTokens() {
  const supabase = createAdminClient();
  
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Only fetch connections that have a known expiry date AND are expiring within 7 days.
  // Rows with token_expires_at = NULL are permanent tokens (e.g. WhatsApp System User tokens)
  // and must NEVER be refreshed or expired by this cron job.
  const { data: connections, error } = await supabase
    .from("integration_connections")
    .select("*")
    .eq("status", "active")
    .not("token_expires_at", "is", null)
    .lte("token_expires_at", sevenDaysFromNow.toISOString());

  if (error) {
    console.error("[Meta Token Refresh] Database error fetching connections:", error);
    return { success: false, error };
  }

  if (!connections || connections.length === 0) {
    return { success: true, processed: 0, failed: 0 };
  }

  let processedCount = 0;
  let failedCount = 0;

  for (const connection of connections) {
    try {
      const decryptedToken = decrypt(connection.access_token);
      if (!decryptedToken) {
        throw new MetaTokenError("Could not decrypt existing token.", 401);
      }

      const newTokenData = await getLongLivedToken(decryptedToken);
      const encryptedNewToken = encrypt(newTokenData.access_token);
      
      let expiresAt = null;
      if (newTokenData.expires_in) {
        const d = new Date();
        d.setSeconds(d.getSeconds() + newTokenData.expires_in);
        expiresAt = d.toISOString();
      }

      const { error: updateError } = await supabase
        .from("integration_connections")
        .update({
          access_token: encryptedNewToken,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
          status: "active",
        })
        .eq("id", connection.id);

      if (updateError) throw updateError;
      processedCount++;
      
    } catch (err: any) {
      console.error(`[Meta Token Refresh] Failed to refresh token for connection ${connection.id}:`, err);
      failedCount++;
      
      // ONLY expire the token if Meta explicitly rejected it (400/401) or decryption failed.
      // Do NOT expire on 5xx errors or transient network failures.
      if (err instanceof MetaTokenError && (err.status === 400 || err.status === 401)) {
        await supabase
          .from("integration_connections")
          .update({ 
            status: "expired", 
            updated_at: new Date().toISOString() 
          })
          .eq("id", connection.id);
      }
    }
  }

  return { success: true, processed: processedCount, failed: failedCount };
}
