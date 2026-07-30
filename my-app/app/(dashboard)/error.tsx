"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client-side error to an error tracking service in a real app
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center space-y-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold tracking-tight">Something went wrong!</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <Button onClick={() => reset()} variant="outline" className="mt-4">
          Try again
        </Button>
      </div>
    </div>
  );
}
