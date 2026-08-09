"use client";

/**
 * Manages a multi-image gallery slot (job execution before/after photos)
 * where some entries are already-uploaded S3 URLs fetched from the backend
 * and others are freshly captured this session. New captures are uploaded
 * straight to R2 in the background as soon as they're taken; this hook
 * tracks per-image upload status and exposes only the newly-uploaded keys
 * (existing rows are kept via their row IDs, tracked separately by the page
 * exactly as before this change).
 */

import { useCallback, useState } from "react";
import { uploadImageDirect, type UploadUrlActionResult } from "@/lib/directUpload";
import type { UploadStatus } from "@/hooks/useDirectUploadImage";

interface GalleryItem {
  dataUrl: string;
  key: string | null;
  status: UploadStatus;
}

function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

interface UseDirectUploadGalleryOptions {
  getUploadUrl: (contentType: string) => Promise<UploadUrlActionResult>;
  contentType?: string;
}

export function useDirectUploadGallery({
  getUploadUrl,
  contentType = "image/jpeg",
}: UseDirectUploadGalleryOptions) {
  const [items, setItems] = useState<GalleryItem[]>([]);

  const startUpload = useCallback(
    (dataUrl: string) => {
      uploadImageDirect({ dataUrl, contentType, getUploadUrl })
        .then((key) => {
          setItems((prev) =>
            prev.map((item) => (item.dataUrl === dataUrl ? { ...item, key, status: "done" } : item))
          );
        })
        .catch(() => {
          setItems((prev) =>
            prev.map((item) => (item.dataUrl === dataUrl ? { ...item, status: "error" } : item))
          );
        });
    },
    [contentType, getUploadUrl]
  );

  const setExistingImages = useCallback((urls: string[]) => {
    setItems(urls.map((dataUrl) => ({ dataUrl, key: null, status: "done" as const })));
  }, []);

  const onImagesChange = useCallback((nextImages: string[]) => {
    setItems((prev) =>
      nextImages.map((dataUrl) => {
        const existing = prev.find((item) => item.dataUrl === dataUrl);
        if (existing) return existing;
        if (!isDataUrl(dataUrl)) {
          // Already-uploaded row fetched from the backend — no key needed here.
          return { dataUrl, key: null, status: "done" as const };
        }
        return { dataUrl, key: null, status: "uploading" as const };
      })
    );
  }, []);

  const onImageCaptured = useCallback(
    ({ dataUrl }: { dataUrl: string }) => {
      startUpload(dataUrl);
    },
    [startUpload]
  );

  const retryFailed = useCallback(() => {
    items
      .filter((item) => item.status === "error")
      .forEach((item) => {
        setItems((prev) =>
          prev.map((entry) => (entry.dataUrl === item.dataUrl ? { ...entry, status: "uploading" } : entry))
        );
        startUpload(item.dataUrl);
      });
  }, [items, startUpload]);

  const images = items.map((item) => item.dataUrl);
  const isUploading = items.some((item) => isDataUrl(item.dataUrl) && item.status === "uploading");
  const hasError = items.some((item) => isDataUrl(item.dataUrl) && item.status === "error");
  const newKeys = items
    .filter((item): item is GalleryItem & { key: string } => isDataUrl(item.dataUrl) && item.status === "done" && Boolean(item.key));

  return {
    images,
    onImagesChange,
    onImageCaptured,
    setExistingImages,
    isUploading,
    hasError,
    retryFailed,
    newKeys: newKeys.map((item) => item.key),
  };
}
