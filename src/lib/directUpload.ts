/**
 * Client-side direct-to-R2 image upload.
 *
 * The captain app compresses photos in the browser (see ImageUploader's
 * compressImage) and uploads them straight to R2 via a short-lived
 * presigned PUT URL — the bytes never transit this Next.js server or
 * Django. Only the resulting object key (a short string) is sent to the
 * backend afterwards, e.g. as `selfie_key` or `before_image_keys`.
 */

export interface UploadUrlPayload {
  upload_url: string;
  key: string;
}

export interface UploadUrlActionResult {
  success: boolean;
  message?: string | null;
  data: UploadUrlPayload | null;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

interface UploadImageDirectParams {
  dataUrl: string;
  contentType: string;
  getUploadUrl: (contentType: string) => Promise<UploadUrlActionResult>;
}

/**
 * Resolves a presigned upload URL via the given server action, PUTs the
 * image bytes straight to R2, and returns the object key to store
 * server-side. Throws on any failure — callers should track per-image
 * upload status and offer a retry rather than silently swallowing this.
 */
export async function uploadImageDirect({
  dataUrl,
  contentType,
  getUploadUrl,
}: UploadImageDirectParams): Promise<string> {
  const urlResult = await getUploadUrl(contentType);
  if (!urlResult.success || !urlResult.data) {
    throw new Error(urlResult.message || "Unable to prepare photo upload.");
  }

  const { upload_url: uploadUrl, key } = urlResult.data;
  const blob = await dataUrlToBlob(dataUrl);

  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": contentType },
  });

  if (!putResponse.ok) {
    throw new Error(`Photo upload failed (status ${putResponse.status}).`);
  }

  return key;
}
