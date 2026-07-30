"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { forgotPasswordAction } from "@/app/(auth)/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setMessage(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      // Action always returns success:true with a generic message (security by design —
      // never reveals if the email belongs to an owner or doesn't exist).
      setMessage({ type: 'success', text: result.message || "If that email is registered and eligible for password reset, a reset link has been sent." });
      form.reset();
    });
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Owner Password Reset</CardTitle>
        <CardDescription>Enter your email to receive a password reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {message && (
            <div className={`p-3 text-sm font-medium rounded-md ${
              message.type === 'success' 
                ? 'text-green-800 bg-green-100 dark:bg-green-900/50 dark:text-green-200'
                : 'text-red-800 bg-red-100 dark:bg-red-900/50 dark:text-red-200'
            }`}>
              {message.text}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-[0.8rem] font-medium text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t p-4 mt-2">
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
}
