"use client";

import { useEffect } from "react";
import { reportError, flushQueuedErrors } from "@/lib/errorReporting";
import { reloadOnceIfStaleModuleGraph } from "@/lib/staleModuleGraph";

/**
 * Catches errors React's error boundaries can't — uncaught exceptions in
 * event handlers, timers, and unhandled promise rejections. Error
 * boundaries (error.tsx, global-error.tsx) only catch render-phase errors.
 */
export function GlobalErrorListener() {
  useEffect(() => {
    flushQueuedErrors();

    const handleError = (event: ErrorEvent) => {
      const message = event.message || String(event.error);
      reportError({
        error_type: event.error?.name || "Error",
        message,
        stack: event.error?.stack,
        url: window.location.href,
        component: "window.onerror",
      });
      reloadOnceIfStaleModuleGraph(message);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || String(reason);
      reportError({
        error_type: reason?.name || "UnhandledRejection",
        message,
        stack: reason?.stack,
        url: window.location.href,
        component: "unhandledrejection",
      });
      reloadOnceIfStaleModuleGraph(message);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
