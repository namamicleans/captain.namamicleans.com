/**
 * useExecutionDraft
 *
 * Persists in-progress job execution state to localStorage so captains can
 * exit mid-flow and resume from the same step without losing work.
 *
 * What is saved:
 *   - currentStep  — which step the captain was on (0-3)
 *   - completedSteps — checklist item IDs already ticked
 *   - notes        — captain notes typed so far
 *   - customerRating — star rating selected so far
 *
 * What is NOT saved here:
 *   - Images (before/after) — these are either fresh base64 strings in React
 *     state (new captures) or S3-backed URLs fetched from the backend on load.
 *     We don't persist base64 blobs to localStorage (too large; quota errors).
 *     On resume, the page re-fetches execution data from the backend which
 *     returns already-uploaded images, and the captain re-captures any new
 *     ones they want to add.
 */

import { useCallback, useEffect, useRef } from 'react';

export interface ExecutionDraft {
  currentStep: number;
  completedSteps: string[];
  notes: string;
  customerRating: number;
}

const DRAFT_VERSION = 1;
const STORAGE_PREFIX = 'exec_draft_v1_';

function storageKey(bookingId: string): string {
  return `${STORAGE_PREFIX}${bookingId}`;
}

function readDraft(bookingId: string): ExecutionDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bookingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number } & ExecutionDraft;
    if (parsed.version !== DRAFT_VERSION) return null;
    return {
      currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : 0,
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      customerRating: typeof parsed.customerRating === 'number' ? parsed.customerRating : 0,
    };
  } catch {
    return null;
  }
}

function writeDraft(bookingId: string, draft: ExecutionDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey(bookingId),
      JSON.stringify({ version: DRAFT_VERSION, ...draft }),
    );
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

export function clearExecutionDraft(bookingId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(bookingId));
  } catch {
    // ignore
  }
}

interface UseExecutionDraftOptions {
  bookingId: string;
  currentStep: number;
  completedSteps: string[];
  notes: string;
  customerRating: number;
}

/**
 * Returns the saved draft (or null if none exists) and auto-saves whenever
 * any of the tracked values change.
 */
export function useExecutionDraft({
  bookingId,
  currentStep,
  completedSteps,
  notes,
  customerRating,
}: UseExecutionDraftOptions): ExecutionDraft | null {
  // Read once on mount — stable ref so it doesn't cause re-renders
  const initialDraft = useRef<ExecutionDraft | null>(
    bookingId ? readDraft(bookingId) : null,
  );

  // Auto-save on every change, debounced via a ref to avoid stale closures
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      writeDraft(bookingId, { currentStep, completedSteps, notes, customerRating });
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [bookingId, currentStep, completedSteps, notes, customerRating]);

  return initialDraft.current;
}
