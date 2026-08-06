"use client";

import { reportFrontendError } from "@core/monitoring/actions";

const QUEUE_KEY = "namami_error_report_queue";
const MAX_QUEUE_SIZE = 20;

type QueuedError = {
  error_type: string;
  message: string;
  stack?: string;
  url?: string;
  component?: string;
};

function readQueue(): QueuedError[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedError[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
  } catch {
    // Storage full or unavailable — dropping the report is preferable to throwing.
  }
}

function enqueue(report: QueuedError) {
  writeQueue([...readQueue(), report]);
}

/**
 * Reports a client-side error. If the API is unreachable (the exact moment
 * this matters most), the report is queued in localStorage and retried on
 * the next successful flush instead of being silently dropped.
 */
export async function reportError(report: QueuedError): Promise<void> {
  let delivered = false;
  try {
    delivered = await reportFrontendError(report);
  } catch {
    delivered = false;
  }
  if (!delivered) enqueue(report);
}

/** Retries any errors queued from a previous failed report. Call on app mount. */
export async function flushQueuedErrors(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  writeQueue([]);
  for (const report of queue) {
    let delivered = false;
    try {
      delivered = await reportFrontendError(report);
    } catch {
      delivered = false;
    }
    if (!delivered) enqueue(report);
  }
}
