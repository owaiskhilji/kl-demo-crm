import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLongLivedToken } from "@/lib/meta/tokenRefresh";
import { encrypt } from "@/lib/utils/encryption";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); 
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  // Handle user cancelling the OAuth flow
  if (error || errorReason) {
    console.warn("[Meta OAuth] User cancelled or error:", error, errorReason);
    return NextResponse.redirect(`${baseUrl}/integrations?error=${errorReason || error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/integrations?error=missing_params`);
  }

  // 1. Verify CSRF State Token
  const cookieStore = await cookies();
  const savedCsrfToken = cookieStore.get("oauth_csrf_state")?.value;
  
  if (!savedCsrfToken) {
    return NextResponse.redirect(`${baseUrl}/integrations?error=csrf_missing`);
  }

  const [receivedCsrfToken, channel] = state.split("_");
  
  if (receivedCsrfToken !== savedCsrfToken) {
    return NextResponse.redirect(`${baseUrl}/integrations?error=csrf_mismatch`);
  }

  // Clear the cookie now that it has been used
  cookieStore.delete("oauth_csrf_state");

  try {
    // Standard client for RLS-enforced user and role checks
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    // 2. Defense layer 2: Re-verify caller is owner/manager
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner" && profile?.role !== "manager") {
      return NextResponse.redirect(`${baseUrl}/integrations?error=forbidden`);
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${baseUrl}/api/integrations/meta/callback`;

    if (!appId || !appSecret) throw new Error("Missing Meta App credentials in environment");

    // 1. Exchange OAuth code for a short-lived user access token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    
    console.log("[FB Callback STEP 1] Token Exchange URL:", tokenUrl.replace(appSecret, "HIDDEN_SECRET"));
    console.log("[FB Callback STEP 1] Token Response Status:", tokenRes.status);
    console.log("[FB Callback STEP 1] Token Data:", JSON.stringify(tokenData));

    if (!tokenRes.ok) {
      throw new Error(tokenData.error?.message || "Failed to exchange authorization code");
    }

    const shortLivedUserToken = tokenData.access_token;

    // 2. Fetch the user's Facebook Pages to get a Page Access Token and Page ID
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${shortLivedUserToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();
    
    console.log("[FB Callback STEP 2] Pages Fetch Status:", pagesRes.status);
    console.log("[FB Callback STEP 2] Raw Pages Data:", JSON.stringify(pagesData));
    
    if (!pagesRes.ok) {
      throw new Error(pagesData.error?.message || "Failed to fetch connected Facebook pages");
    }

    console.log("[FB Callback STEP 3] Raw Pages Data:", JSON.stringify(pagesData.data));
    

    const page = pagesData.data?.[0];  
    console.log("[FB Callback STEP 5] Selected Page:", JSON.stringify(page));
    
    if (!page) {
      throw new Error("No Facebook Pages found. You must select at least one page during the connection process.");
    }

    const shortLivedPageToken = page.access_token;
    const pageId = page.id;

    // 3. Exchange the short-lived page token for a long-lived page token (60 days)
    const longLivedData = await getLongLivedToken(shortLivedPageToken);
    
    // 4. Encrypt the token securely before storing
    const encryptedToken = encrypt(longLivedData.access_token);
    
    let expiresAt = null;
    if (longLivedData.expires_in) {
      const d = new Date();
      d.setSeconds(d.getSeconds() + longLivedData.expires_in);
      expiresAt = d.toISOString();
    }

    const channelResolved = channel || "facebook";

    // 5. Upsert the connection record using the admin client (since this table has no client-facing INSERT policy)
    const adminSupabase = createAdminClient();
    const { data: existing } = await adminSupabase
      .from("integration_connections")
      .select("id")
      .eq("channel", channelResolved)
      .eq("page_id", pageId)
      .single();

    if (existing) {
      const { error: updateError } = await adminSupabase
        .from("integration_connections")
        .update({
          access_token: encryptedToken,
          token_expires_at: expiresAt,
          status: "active",
          connected_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
      
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await adminSupabase
        .from("integration_connections")
        .insert({
          channel: channelResolved,
          page_id: pageId,
          access_token: encryptedToken,
          token_expires_at: expiresAt,
          status: "active",
          connected_by: user.id
        });
      
      if (insertError) throw insertError;
    }

    // Success! Redirect back to the integrations UI
    return NextResponse.redirect(`${baseUrl}/integrations?success=true`);
    
  } catch (err: any) {
    console.error("[Meta OAuth] Error during callback processing:", err);
    return NextResponse.redirect(`${baseUrl}/integrations?error=${encodeURIComponent(err.message)}`);
  }
}



// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@/lib/supabase/server";
// import { createAdminClient } from "@/lib/supabase/admin";
// import { getLongLivedToken } from "@/lib/meta/tokenRefresh";
// import { encrypt } from "@/lib/utils/encryption";
// import { cookies } from "next/headers";

// export async function GET(request: NextRequest) {
//   const searchParams = request.nextUrl.searchParams;
//   const code = searchParams.get("code");
//   const state = searchParams.get("state"); 
//   const error = searchParams.get("error");
//   const errorReason = searchParams.get("error_reason");

//   const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

//   // Handle user cancelling the OAuth flow
//   if (error || errorReason) {
//     console.warn("[Meta OAuth] User cancelled or error:", error, errorReason);
//     return NextResponse.redirect(`${baseUrl}/integrations?error=${errorReason || error}`);
//   }

//   if (!code || !state) {
//     return NextResponse.redirect(`${baseUrl}/integrations?error=missing_params`);
//   }

//   // 1. Verify CSRF State Token
//   const cookieStore = await cookies();
//   const savedCsrfToken = cookieStore.get("oauth_csrf_state")?.value;
  
//   if (!savedCsrfToken) {
//     return NextResponse.redirect(`${baseUrl}/integrations?error=csrf_missing`);
//   }

//   const [receivedCsrfToken, channel] = state.split("_");
  
//   if (receivedCsrfToken !== savedCsrfToken) {
//     return NextResponse.redirect(`${baseUrl}/integrations?error=csrf_mismatch`);
//   }

//   // Clear the cookie now that it has been used
//   cookieStore.delete("oauth_csrf_state");

//   try {
//     // Standard client for RLS-enforced user and role checks
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
    
//     if (!user) {
//       return NextResponse.redirect(`${baseUrl}/login`);
//     }

//     // 2. Defense layer 2: Re-verify caller is owner/manager
//     const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
//     if (profile?.role !== "owner" && profile?.role !== "manager") {
//       return NextResponse.redirect(`${baseUrl}/integrations?error=forbidden`);
//     }

//     const appId = process.env.META_APP_ID;
//     const appSecret = process.env.META_APP_SECRET;
//     const redirectUri = `${baseUrl}/api/integrations/meta/callback`;

//     if (!appId || !appSecret) throw new Error("Missing Meta App credentials in environment");

//     // 1. Exchange OAuth code for a short-lived user access token
//     const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
//     const tokenRes = await fetch(tokenUrl);
//     const tokenData = await tokenRes.json();

//     if (process.env.NODE_ENV !== "production") {
//       console.log("[FB Callback STEP 1] Token Exchange URL:", tokenUrl.replace(appSecret, "HIDDEN_SECRET"));
//       console.log("[FB Callback STEP 1] Token Response Status:", tokenRes.status);
//     }

//     if (!tokenRes.ok) {
//       throw new Error(tokenData.error?.message || "Failed to exchange authorization code");
//     }

//     const shortLivedUserToken = tokenData.access_token;

//     // 2. Fetch the user's Facebook Pages to get a Page Access Token and Page ID
//     const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${shortLivedUserToken}`;
//     const pagesRes = await fetch(pagesUrl);
//     const pagesData = await pagesRes.json();

//     if (process.env.NODE_ENV !== "production") {
//       console.log("[FB Callback STEP 2] Pages Fetch Status:", pagesRes.status, "Count:", pagesData.data?.length);
//     }

//     if (!pagesRes.ok) {
//       throw new Error(pagesData.error?.message || "Failed to fetch connected Facebook pages");
//     }

//     let pagesList = pagesData.data || [];

//     // FALLBACK: /me/accounts does not return Pages that are managed through a Business
//     // Manager/Portfolio (documented Meta limitation — see developers.facebook.com/docs/
//     // graph-api/reference/user/accounts/#limitations). If it comes back empty, walk the
//     // user's Business Portfolios and pull owned Pages from there instead.
//     if (pagesList.length === 0) {
//       const businessesUrl = `https://graph.facebook.com/v21.0/me/businesses?access_token=${shortLivedUserToken}`;
//       const businessesRes = await fetch(businessesUrl);
//       const businessesData = await businessesRes.json();

//       if (process.env.NODE_ENV !== "production") {
//         console.log("[FB Callback STEP 2b] Businesses Fetch Status:", businessesRes.status, "Count:", businessesData.data?.length);
//       }

//       if (businessesRes.ok && businessesData.data?.length > 0) {
//         for (const business of businessesData.data) {
//           const ownedPagesUrl = `https://graph.facebook.com/v21.0/${business.id}/owned_pages?fields=id,name,access_token&access_token=${shortLivedUserToken}`;
//           const ownedPagesRes = await fetch(ownedPagesUrl);
//           const ownedPagesData = await ownedPagesRes.json();

//           if (process.env.NODE_ENV !== "production") {
//             console.log(`[FB Callback STEP 2c] Owned Pages for Business ${business.id}:`, ownedPagesRes.status, "Count:", ownedPagesData.data?.length);
//           }

//           if (ownedPagesRes.ok && ownedPagesData.data?.length > 0) {
//             pagesList = pagesList.concat(ownedPagesData.data);
//           }
//         }
//       }
//     }

//     if (pagesList.length === 0) {
//       throw new Error(
//         "No Facebook Pages found via /me/accounts or Business Manager owned_pages. " +
//         "Confirm the Page is shared with this app in Facebook Settings > Business Integrations, " +
//         "and that business_management scope was granted."
//       );
//     }

//     // TODO: if a client manages multiple Pages, blindly taking the first one is wrong —
//     // this needs a page-picker step in the UI before this callback runs (pass the chosen
//     // page_id via `state`). Flagging as-is since scope here was Facebook+Instagram leads only.
//     const page = pagesList[0];

//     if (!page) {
//       throw new Error("No Facebook Pages found. You must select at least one page during the connection process.");
//     }

//     const shortLivedPageToken = page.access_token;
//     const pageId = page.id;

//     // 3. Exchange the short-lived page token for a long-lived page token (60 days)
//     const longLivedData = await getLongLivedToken(shortLivedPageToken);
    
//     // 4. Encrypt the token securely before storing
//     const encryptedToken = encrypt(longLivedData.access_token);
    
//     let expiresAt = null;
//     if (longLivedData.expires_in) {
//       const d = new Date();
//       d.setSeconds(d.getSeconds() + longLivedData.expires_in);
//       expiresAt = d.toISOString();
//     }

//     const channelResolved = channel || "facebook";

//     // 5. Upsert the connection record using the admin client (since this table has no client-facing INSERT policy)
//     const adminSupabase = createAdminClient();
//     const { data: existing } = await adminSupabase
//       .from("integration_connections")
//       .select("id")
//       .eq("channel", channelResolved)
//       .eq("page_id", pageId)
//       .single();

//     if (existing) {
//       const { error: updateError } = await adminSupabase
//         .from("integration_connections")
//         .update({
//           access_token: encryptedToken,
//           token_expires_at: expiresAt,
//           status: "active",
//           connected_by: user.id,
//           updated_at: new Date().toISOString()
//         })
//         .eq("id", existing.id);
      
//       if (updateError) throw updateError;
//     } else {
//       const { error: insertError } = await adminSupabase
//         .from("integration_connections")
//         .insert({
//           channel: channelResolved,
//           page_id: pageId,
//           access_token: encryptedToken,
//           token_expires_at: expiresAt,
//           status: "active",
//           connected_by: user.id
//         });
      
//       if (insertError) throw insertError;
//     }

//     // 6. CRITICAL: Install the app on the Page.
//     // Per Meta docs (developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen):
//     // "Webhook notifications will only be sent if your Page has installed your Webhooks configured-app."
//     // Subscribing at the app level (Webhooks product config) is NOT sufficient — each Page must
//     // individually opt in via this call, or leadgen events will silently never arrive for that Page.
//     const installUrl = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${longLivedData.access_token}`;
//     const installRes = await fetch(installUrl, { method: "POST" });
//     const installData = await installRes.json();

//     if (process.env.NODE_ENV !== "production") {
//       console.log("[FB Callback STEP 6] App Install Status:", installRes.status, JSON.stringify(installData));
//     }

//     if (!installRes.ok || !installData.success) {
//       // Don't let this fail silently — if install fails, leads will NEVER arrive
//       // even though the connection record looks "active". Surface it as a hard error
//       // and mark the connection so the UI reflects the real state.
//       await adminSupabase
//         .from("integration_connections")
//         .update({ status: "install_failed" })
//         .eq("channel", channelResolved)
//         .eq("page_id", pageId);

//       throw new Error(
//         installData.error?.message || "Failed to install app on Page — leadgen webhooks will not fire."
//       );
//     }

//     // Success! Redirect back to the integrations UI
//     return NextResponse.redirect(`${baseUrl}/integrations?success=true`);
    
//   } catch (err: any) {
//     console.error("[Meta OAuth] Error during callback processing:", err);
//     return NextResponse.redirect(`${baseUrl}/integrations?error=${encodeURIComponent(err.message)}`);
//   }
// }