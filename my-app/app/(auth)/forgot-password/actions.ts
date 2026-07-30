"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function forgotPasswordAction(input: { email: string }) {
  const genericMessage = "If that email is registered and eligible for password reset, a reset link has been sent.";
  
  try {
    const admin = createAdminClient();
    
    // 1. Look up the user by email using the admin client.
    // Since this CRM is for 50-500 employees, a single page of 1000 users is sufficient.
    const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    
    if (usersErr || !usersData.users) {
      console.error("[forgotPasswordAction] Failed to list users", usersErr);
      return { success: true, message: genericMessage };
    }
    
    const user = usersData.users.find((u: any) => u.email?.toLowerCase() === input.email.toLowerCase());
    
    if (user) {
      // 2. Check if the user is an owner
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
      if (profile?.role === "owner") {
        // 3. Only send email if role === 'owner'
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const redirectTo = `${baseUrl}/reset-password`;

        const { error } = await admin.auth.resetPasswordForEmail(input.email, {
          redirectTo,
        });

        if (error) {
          console.error("[forgotPasswordAction] resetPasswordForEmail error:", error.message);
        }
      } else {
        console.warn(`[forgotPasswordAction] Password reset attempted for non-owner email: ${input.email}`);
      }
    } else {
      console.warn(`[forgotPasswordAction] Password reset attempted for non-existent email: ${input.email}`);
    }

    // Always return the same generic message
    return { success: true, message: genericMessage };
  } catch (err) {
    console.error("[forgotPasswordAction] Unexpected error:", err);
    // Still return the generic message to avoid leaking errors to the client
    return { success: true, message: genericMessage };
  }
}
