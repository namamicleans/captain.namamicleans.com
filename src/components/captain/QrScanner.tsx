"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { QrCode, CameraOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useQrScan } from "@/hooks/useQrScan";

type Parsed = { office: number; window: number };

function parse(raw: string): Parsed | null {
  const parts = raw.split(":");
  if (parts.length !== 4 || parts[0] !== "NMC1") return null;
  const office = Number(parts[1]);
  const window = Number(parts[2]);
  if (!Number.isInteger(office) || !Number.isInteger(window)) return null;
  return { office, window };
}

/**
 * Point-and-hold QR scanner. Collects `requiredScans` codes from *consecutive*
 * rotation windows of the captain's own office, then calls `onCollected`.
 * The captain never taps "scan" — they just hold the camera on the screen and
 * the codes come in as the QR rotates.
 */
export function QrScanner({
  officeId,
  requiredScans,
  onCollected,
}: {
  officeId: number | null;
  requiredScans: number;
  onCollected: (codes: string[]) => void;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState(true);
  const [count, setCount] = useState(0);
  const [wrongOffice, setWrongOffice] = useState(false);
  const collectedRef = useRef<Map<number, string>>(new Map());
  const doneRef = useRef(false);

  const handleDecode = useCallback(
    (raw: string) => {
      if (doneRef.current) return;
      const p = parse(raw);
      if (!p) return;
      if (officeId != null && p.office !== officeId) {
        setWrongOffice(true);
        return;
      }
      setWrongOffice(false);

      const map = collectedRef.current;
      if (!map.has(p.window)) map.set(p.window, raw);

      // Keep only the newest `requiredScans + 1` windows.
      const windows = [...map.keys()].sort((a, b) => a - b);
      while (windows.length > requiredScans + 1) {
        map.delete(windows.shift() as number);
      }

      // Find `requiredScans` consecutive windows among what we have.
      const sorted = [...map.keys()].sort((a, b) => a - b);
      setCount(sorted.length);
      for (let i = 0; i + requiredScans <= sorted.length; i += 1) {
        const slice = sorted.slice(i, i + requiredScans);
        const consecutive = slice.every((w, k) => k === 0 || w - slice[k - 1] === 1);
        if (consecutive) {
          doneRef.current = true;
          setActive(false);
          onCollected(slice.map((w) => map.get(w) as string));
          return;
        }
      }
    },
    [officeId, requiredScans, onCollected]
  );

  const { videoRef, canvasRef, state, restart } = useQrScan(handleDecode, active);

  useEffect(() => {
    // Fresh scan whenever this mounts (e.g. after a failed submit sent us back).
    doneRef.current = false;
    collectedRef.current = new Map();
    setCount(0);
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        {/* Reticle */}
        <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/80" />
        {(state === "denied" || state === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center text-white">
            <CameraOff className="h-8 w-8" />
            <p className="text-sm">
              {state === "denied"
                ? t("checkIn.qr.cameraDenied", "Allow camera access to scan the office code.")
                : t("checkIn.qr.cameraError", "Couldn't open the camera.")}
            </p>
            <Button size="sm" variant="secondary" onClick={restart}>
              {t("common.retry", "Retry")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <QrCode className="h-4 w-4" />
        {wrongOffice
          ? t("checkIn.qr.wrongOffice", "That code isn't from your office.")
          : t("checkIn.qr.holding", "Hold steady on the office screen… {{count}}/{{total}}", {
              count: Math.min(count, requiredScans),
              total: requiredScans,
            })}
      </div>
    </div>
  );
}
