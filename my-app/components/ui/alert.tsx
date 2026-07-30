"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" }
>(({ className, variant = "default", ...props }, ref) => {
  const base = "relative w-full rounded-md border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11";
  const variants: Record<string, string> = {
    default:
      "bg-zinc-50 text-zinc-800 border-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-200 dark:border-zinc-700",
    destructive:
      "border-red-500/30 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200 [&>svg]:text-red-600",
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
