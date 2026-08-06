"use client";

import { useEffect } from "react";
import { reportError, flushQueuedErrors } from "@/lib/errorReporting";

/**
 * Catches errors React's error boundaries can't — uncaught exceptions in
 * event handlers, timers, and unhandled promise rejections. Error
 * boundaries (error.tsx, global-error.tsx) only catch render-phase errors.
 */
export function GlobalErrorListener() {
  useEffect(() => {
    flushQueuedErrors();

    const handleError = (event: ErrorEvent) => {
      reportError({
        error_type: event.error?.name || "Error",
        message: event.message || String(event.error),
        stack: event.error?.stack,
        url: window.location.href,
        component: "window.onerror",
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportError({
        error_type: reason?.name || "UnhandledRejection",
        message: reason?.message || String(reason),
        stack: reason?.stack,
        url: window.location.href,
        component: "unhandledrejection",
      });
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
