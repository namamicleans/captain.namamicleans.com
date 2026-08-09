/**
 * useCheckOutDraft
 *
 * Persists in-progress check-out state to localStorage, keyed by shift date,
 * mirroring useCheckInDraft. Only the R2 object key is persisted for the
 * odometer photo — never the base64 image.
 */

import { useEffect, useRef } from "react";

export interface CheckOutDraft {
  odometer: string;
  odometerImageKey: string | null;
  notes: string;
}

const DRAFT_VERSION = 1;
const STORAGE_PREFIX = "checkout_draft_v1_";

function storageKey(shiftDate: string): string {
  return `${STORAGE_PREFIX}${shiftDate}`;
}

function readDraft(shiftDate: string): CheckOutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(shiftDate));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number } & Partial<CheckOutDraft>;
    if (parsed.version !== DRAFT_VERSION) return null;
    return {
      odometer: typeof parsed.odometer === "string" ? parsed.odometer : "",
      odometerImageKey: typeof parsed.odometerImageKey === "string" ? parsed.odometerImageKey : null,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return null;
  }
}

function writeDraft(shiftDate: string, draft: CheckOutDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(shiftDate), JSON.stringify({ version: DRAFT_VERSION, ...draft }));
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

export function clearCheckOutDraft(shiftDate: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(shiftDate));
  } catch {
    // ignore
  }
}

export function readCheckOutDraft(shiftDate: string): CheckOutDraft | null {
  return readDraft(shiftDate);
}

export function useCheckOutDraft(shiftDate: string, draft: CheckOutDraft): void {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!shiftDate) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      writeDraft(shiftDate, draft);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftDate, draft.odometer, draft.odometerImageKey, draft.notes]);
}
