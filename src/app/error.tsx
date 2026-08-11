"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reportError } from "@/lib/errorReporting";
import { reloadOnceIfStaleModuleGraph } from "@/lib/staleModuleGraph";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error caught by boundary:", error);
    reportError({
      error_type: error?.name || "Error",
      message: error?.message || String(error),
      stack: error?.stack,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      component: "app/error.tsx",
    });

    // `reset()` just re-renders the existing tree and hits the exact same
    // stale module again — only a full reload actually recovers.
    reloadOnceIfStaleModuleGraph(error?.message);
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          <div className="bg-destructive/10 rounded-2xl size-16 flex items-center justify-center">
            <TriangleAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-xs" role="alert">
            {error?.message?.slice(0, 120) || "An unexpected error occurred."}
          </p>
          <Button onClick={handleReset} aria-label="Try again">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
