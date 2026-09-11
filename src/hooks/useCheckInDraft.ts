/**
 * useCheckInDraft
 *
 * Persists in-progress check-in state to localStorage, keyed by shift date, so
 * a captain who kills the app — or fails the final QR submit — doesn't have to
 * retake the odometer photo or re-type the reading. Only the R2 object *key*
 * of the photo is stored, never the image bytes.
 */

import { useEffect, useRef } from "react";

export interface CheckInGps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
}

export interface CheckInDraft {
  currentStep: number;
  odometer: string;
  odometerImageKey: string | null;
  gps: CheckInGps | null;
}

const DRAFT_VERSION = 2;
const STORAGE_PREFIX = "checkin_draft_v2_";

function storageKey(shiftDate: string): string {
  return `${STORAGE_PREFIX}${shiftDate}`;
}

function readDraft(shiftDate: string): CheckInDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(shiftDate));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number } & Partial<CheckInDraft>;
    if (parsed.version !== DRAFT_VERSION) return null;
    return {
      currentStep: typeof parsed.currentStep === "number" ? parsed.currentStep : 0,
      odometer: typeof parsed.odometer === "string" ? parsed.odometer : "",
      odometerImageKey:
        typeof parsed.odometerImageKey === "string" ? parsed.odometerImageKey : null,
      gps: parsed.gps ?? null,
    };
  } catch {
    return null;
  }
}

function writeDraft(shiftDate: string, draft: CheckInDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(shiftDate),
      JSON.stringify({ version: DRAFT_VERSION, ...draft })
    );
  } catch {
    /* quota / unavailable */
  }
}

export function clearCheckInDraft(shiftDate: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(shiftDate));
  } catch {
    /* ignore */
  }
}

export function readCheckInDraft(shiftDate: string): CheckInDraft | null {
  return readDraft(shiftDate);
}

export function useCheckInDraft(shiftDate: string, draft: CheckInDraft): void {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!shiftDate) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => writeDraft(shiftDate, draft), 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftDate, draft.currentStep, draft.odometer, draft.odometerImageKey, draft.gps]);
}
