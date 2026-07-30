"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Instantiate client on mount so it processes the URL hash fragment immediately
  const supabase = createClient();

  useEffect(() => {
    const hash = window.location.hash;
    console.log("[ResetPassword] URL hash type:", hash ? "present" : "missing");

    if (!hash) {
      setError("Invalid or expired reset link. Please request a new one.");
      return;
    }

    // @supabase/ssr's browser client does NOT auto-parse URL hash fragments.
    // We must extract the tokens manually and call setSession() ourselves.
    const params = new URLSearchParams(hash.substring(1)); // strip leading '#'
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    console.log("[ResetPassword] Token type:", type, "| access_token present:", !!access_token);

    if (!access_token || !refresh_token || type !== "recovery") {
      setError("Invalid reset link. Please request a new password reset email.");
      return;
    }

    // Explicitly set the session using the tokens from the hash
    supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
      if (error) {
        console.error("[ResetPassword] setSession error:", error.message);
        setError("Your reset link has expired. Please request a new one.");
      } else {
        console.log("[ResetPassword] Session established for:", data.session?.user?.email);
        // Clear the hash from the URL for cleanliness (no functional impact)
        window.history.replaceState(null, "", window.location.pathname);
      }
    });
  }, []);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    setError(null);
    startTransition(async () => {
      try {
        const { error: updateError } = await supabase.auth.updateUser({ 
          password: values.password 
        });

        if (updateError) {
          console.error("[ResetPassword] updateUser error:", updateError.message);
          setError(updateError.message || "Failed to update password. Your reset link may have expired.");
          return;
        }

        // Successfully updated — redirect to dashboard
        router.push("/dashboard");
      } catch (err) {
        console.error("[ResetPassword] Unexpected error:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Set New Password</CardTitle>
        <CardDescription>Please enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 text-sm font-medium text-red-800 bg-red-100 rounded-md dark:bg-red-900/50 dark:text-red-200">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" placeholder="" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-[0.8rem] font-medium text-red-500">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" placeholder="" type="password" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword && (
              <p className="text-[0.8rem] font-medium text-red-500">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
