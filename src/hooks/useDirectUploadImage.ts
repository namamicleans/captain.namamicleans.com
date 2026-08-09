"use client";

/**
 * Manages a single eager-uploaded image slot (selfie, start/end odometer
 * photo). Each capture is compressed client-side by ImageUploader, then
 * uploaded straight to R2 in the background via uploadImageDirect — this
 * hook only tracks the resulting key and upload status, never re-sends
 * bytes anywhere itself.
 */

import { useCallback, useState } from "react";
import { uploadImageDirect, type UploadUrlActionResult } from "@/lib/directUpload";

export type UploadStatus = "idle" | "uploading" | "done" | "error";

interface UseDirectUploadImageOptions {
  getUploadUrl: (contentType: string) => Promise<UploadUrlActionResult>;
  contentType?: string;
  /** A key restored from a saved draft — the photo was already uploaded in a
   * previous session, so show it as captured without a local preview. */
  initialKey?: string | null;
}

export interface DirectUploadImageState {
  /** For ImageUploader's `images` prop — empty unless a fresh capture this session. */
  images: string[];
  onImagesChange: (images: string[]) => void;
  onImageCaptured: (payload: { dataUrl: string }) => void;
  status: UploadStatus;
  key: string | null;
  /** True when a key exists (this session or restored) but there's no local
   * preview to show — render an "already captured" state instead of ImageUploader. */
  isRestoredWithoutPreview: boolean;
  retry: () => void;
  reset: () => void;
}

export function useDirectUploadImage({
  getUploadUrl,
  contentType = "image/jpeg",
  initialKey = null,
}: UseDirectUploadImageOptions): DirectUploadImageState {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(initialKey);
  const [status, setStatus] = useState<UploadStatus>(initialKey ? "done" : "idle");

  const startUpload = useCallback(
    (nextDataUrl: string) => {
      setStatus("uploading");
      uploadImageDirect({ dataUrl: nextDataUrl, contentType, getUploadUrl })
        .then((uploadedKey) => {
          setKey(uploadedKey);
          setStatus("done");
        })
        .catch(() => {
          setStatus("error");
        });
    },
    [contentType, getUploadUrl]
  );

  const onImagesChange = useCallback((images: string[]) => {
    const next = images[images.length - 1] ?? null;
    setDataUrl(next);
    if (!next) {
      setKey(null);
      setStatus("idle");
    }
  }, []);

  const onImageCaptured = useCallback(
    ({ dataUrl: capturedDataUrl }: { dataUrl: string }) => {
      startUpload(capturedDataUrl);
    },
    [startUpload]
  );

  const retry = useCallback(() => {
    if (dataUrl) {
      startUpload(dataUrl);
    }
  }, [dataUrl, startUpload]);

  const reset = useCallback(() => {
    setDataUrl(null);
    setKey(null);
    setStatus("idle");
  }, []);

  return {
    images: dataUrl ? [dataUrl] : [],
    onImagesChange,
    onImageCaptured,
    status,
    key,
    isRestoredWithoutPreview: Boolean(key) && !dataUrl,
    retry,
    reset,
  };
}
