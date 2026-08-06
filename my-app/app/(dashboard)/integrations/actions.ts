// "use server";

// import { createClient } from "@/lib/supabase/server";
// import { cookies } from "next/headers";
// import crypto from "crypto";

// export async function getMetaOAuthUrl(channel: string) {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error("Unauthorized");
  
//   // Defense layer 2: Verify role is owner/manager
//   const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
//   if (profile?.role !== "owner" && profile?.role !== "manager") {
//     throw new Error("Forbidden");
//   }

//   const appId = process.env.META_APP_ID;
//   if (!appId) throw new Error("META_APP_ID is not configured in .env.local");

//   const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
//   const redirectUri = `${baseUrl}/api/integrations/meta/callback`;
  
//   // Generate CSRF state token and store in HttpOnly cookie
//   const csrfToken = crypto.randomBytes(16).toString("hex");
//   const state = `${csrfToken}_${channel}`;
  
//   const cookieStore = await cookies();
//   cookieStore.set("oauth_csrf_state", csrfToken, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "lax",
//     maxAge: 60 * 15, // 15 mins
//   });

//   // Base scope required for all Facebook-login based flows (to get Page IDs/Tokens)
//   let scope = "pages_show_list";
  
//   if (channel === "facebook") {
//     // All required permissions for Facebook Lead Ads and Page Access
//     scope += ",leads_retrieval,pages_manage_metadata,pages_read_engagement,ads_management";
//   } else if (channel === "instagram") {
//     // Both are required by Meta to read Instagram DMs via the connected Facebook Page
//     scope += ",instagram_basic,instagram_manage_messages";
//   }
  
//   return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&auth_type=rerequest`;
// }


"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function getMetaOAuthUrl(channel: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  // Defense layer 2: Verify role is owner/manager
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner" && profile?.role !== "manager") {
    throw new Error("Forbidden");
  }

  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("META_APP_ID is not configured in .env.local");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const redirectUri = `${baseUrl}/api/integrations/meta/callback`;
  
  // Generate CSRF state token and store in HttpOnly cookie
  const csrfToken = crypto.randomBytes(16).toString("hex");
  const state = `${csrfToken}_${channel}`;
  
  const cookieStore = await cookies();
  cookieStore.set("oauth_csrf_state", csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 15, // 15 mins
  });

  // Base scope required for all Facebook-login based flows (to get Page IDs/Tokens)
  let scope = "pages_show_list";
  
  if (channel === "facebook") {
    scope += ",leads_retrieval,pages_manage_ads,pages_manage_metadata,pages_read_engagement,ads_management,business_management";
  } else if (channel === "instagram") {
    scope += ",instagram_basic,instagram_manage_messages";
  } else if (channel === "whatsapp") {
    scope += ",business_management,whatsapp_business_management,whatsapp_business_messaging";
  }
  
  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&auth_type=rerequest`;
}