"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(input: { email: string; password: string }) {
  let success = false;
  
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      console.error("[loginAction]", error.message);
      return { success: false, error: "Invalid email or password. Please try again." };
    }

    success = true;
  } catch (err) {
    console.error("[loginAction] Unexpected error:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }

  
  // Redirect MUST be outside the try/catch block
  if (success) {
    redirect("/dashboard");
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
