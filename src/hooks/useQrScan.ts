"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type ScanState = "idle" | "starting" | "scanning" | "denied" | "error";

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}

/**
 * Live rear-camera QR scanner. Calls `onDecode` with every decoded string
 * (the caller dedupes / decides when it has enough). Uses the native
 * `BarcodeDetector` when the browser has it (Android Chrome), else jsQR on a
 * canvas frame.
 */
export function useQrScan(onDecode: (value: string) => void, active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  const [state, setState] = useState<ScanState>("idle");

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);

    const emit = (value: string) => {
      if (value) onDecodeRef.current(value);
    };

    if (detectorRef.current) {
      detectorRef.current
        .detect(canvas)
        .then((codes) => codes.forEach((c) => emit(c.rawValue)))
        .catch(() => {});
    } else {
      try {
        const img = ctx.getImageData(0, 0, w, h);
        const result = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
        if (result?.data) emit(result.data);
      } catch {
        /* frame not ready */
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setState("starting");
    try {
      const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
      if (Detector) {
        try {
          detectorRef.current = new Detector({ formats: ["qr_code"] });
        } catch {
          detectorRef.current = null;
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState("scanning");
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
    }
  }, [tick]);

  useEffect(() => {
    if (active) start();
    else stop();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { videoRef, canvasRef, state, restart: start };
}
