"use server";

import { apiPost } from "@core/http";

type FrontendErrorReport = {
  error_type: string;
  message: string;
  stack?: string;
  url?: string;
  component?: string;
};

/**
 * Reports a client-side error to the backend's error-grouping pipeline.
 * Runs server-to-server (Worker -> Django), so no CORS needed.
 *
 * Returns whether the report actually reached the backend — the caller
 * (see @/lib/errorReporting) uses this to decide whether to queue for
 * retry, so this must never throw itself.
 */
export async function reportFrontendError(report: FrontendErrorReport): Promise<boolean> {
  try {
    await apiPost("/api/monitoring/frontend-error/", {
      source: "frontend-captain",
      ...report,
    });
    return true;
  } catch {
    return false;
  }
}
