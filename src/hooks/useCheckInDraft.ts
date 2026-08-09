/**
 * useCheckInDraft
 *
 * Persists in-progress check-in state to localStorage, keyed by shift date
 * (CaptainShiftLog is unique per captain+shift_date), so a captain who kills
 * the app mid check-in doesn't have to redo the selfie/odometer photo and
 * re-tick every material on return. Mirrors useExecutionDraft's shape and
 * versioning approach.
 *
 * Photos are safe to persist here because we only ever store the R2 object
 * *key* (a short string) once the direct upload finishes — never the base64
 * image itself.
 */

import { useEffect, useRef } from "react";

export interface CheckInDraftMaterial {
  checked: boolean;
  quantity?: number;
}

export interface CheckInSelfieMeta {
  capturedAt: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

export interface CheckInDraft {
  currentStep: number;
  selfieKey: string | null;
  selfieMeta: CheckInSelfieMeta | null;
  odometer: string;
  odometerImageKey: string | null;
  checkedMaterials: Record<number, CheckInDraftMaterial>;
}

const DRAFT_VERSION = 1;
const STORAGE_PREFIX = "checkin_draft_v1_";

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
      selfieKey: typeof parsed.selfieKey === "string" ? parsed.selfieKey : null,
      selfieMeta: parsed.selfieMeta ?? null,
      odometer: typeof parsed.odometer === "string" ? parsed.odometer : "",
      odometerImageKey: typeof parsed.odometerImageKey === "string" ? parsed.odometerImageKey : null,
      checkedMaterials: parsed.checkedMaterials ?? {},
    };
  } catch {
    return null;
  }
}

function writeDraft(shiftDate: string, draft: CheckInDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(shiftDate), JSON.stringify({ version: DRAFT_VERSION, ...draft }));
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

export function clearCheckInDraft(shiftDate: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(shiftDate));
  } catch {
    // ignore
  }
}

export function readCheckInDraft(shiftDate: string): CheckInDraft | null {
  return readDraft(shiftDate);
}

/**
 * Auto-saves the given draft fields to localStorage (debounced) whenever
 * they change. Callers should read the initial draft once via
 * readCheckInDraft(shiftDate) before this hook starts writing.
 */
export function useCheckInDraft(shiftDate: string, draft: CheckInDraft): void {
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
  }, [
    shiftDate,
    draft.currentStep,
    draft.selfieKey,
    draft.selfieMeta,
    draft.odometer,
    draft.odometerImageKey,
    draft.checkedMaterials,
  ]);
}
