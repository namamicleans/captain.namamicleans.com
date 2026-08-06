"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errorReporting";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError({
      error_type: error?.name || "Error",
      message: error?.message || String(error),
      stack: error?.stack,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      component: "app/global-error.tsx",
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md w-full mx-auto p-8 text-center space-y-4">
            <div className="bg-red-100 rounded-2xl size-16 mx-auto flex items-center justify-center">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.8-2.96L13.8 4.96a2 2 0 00-3.6 0L3.2 16.04A2 2 0 005.07 19z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-gray-500" role="alert">
              {error?.message?.slice(0, 120) || "The application encountered an unexpected error."}
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
              aria-label="Try again"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
