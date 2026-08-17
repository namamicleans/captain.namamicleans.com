"use client";

import { useState, useRef } from 'react';
import NextImage from 'next/image';
import { Camera, X, Check } from 'lucide-react';
import { cn } from '@shared/utils';
import { DEFAULT_MAX_IMAGE_SIZE_MB } from '@/shared/utils/images';
import { toast } from 'sonner';

interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  minImages: number;
  maxImages: number;
  cameraOnly?: boolean;
  label?: string;
  compress?: ImageCompressionOptions;
  onImageCaptured?: (payload: { dataUrl: string; capturedAt: string }) => void;
  maxFileSizeMB?: number;
  /**
   * Whether GPS coordinates are actually captured and attached to the
   * photo(s) taken in this uploader instance. Only the check-in selfie
   * captures location today (via getCurrentLocation() in check-in/page.tsx).
   * Odometer photos and job-execution photos never call any geolocation
   * API, so this must stay false/omitted for those callers — otherwise the
   * "GPS ✓" badge misleadingly implies location was recorded for photos
   * that have none.
   */
  hasGps?: boolean;
}

async function readFileAsDataUrl(file: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve((event.target?.result as string) || '');
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File, options?: ImageCompressionOptions): Promise<string> {
  if (!options) {
    return readFileAsDataUrl(file);
  }

  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  const objectUrl = URL.createObjectURL(file);

  try {
    const sourceImage = await new Promise<HTMLImageElement>((resolve, reject) => {
      const browserImage = new window.Image();
      browserImage.onload = () => resolve(browserImage);
      browserImage.onerror = () => reject(new Error('Unable to load image for compression.'));
      browserImage.src = objectUrl;
    });

    const widthRatio = maxWidth / sourceImage.width;
    const heightRatio = maxHeight / sourceImage.height;
    const resizeRatio = Math.min(widthRatio, heightRatio, 1);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceImage.width * resizeRatio));
    canvas.height = Math.max(1, Math.round(sourceImage.height * resizeRatio));

    const context = canvas.getContext('2d');
    if (!context) {
      return readFileAsDataUrl(file);
    }

    context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, quality);
    });

    if (!blob) {
      return readFileAsDataUrl(file);
    }

    return readFileAsDataUrl(blob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ImageUploader({
  images,
  onImagesChange,
  minImages,
  maxImages,
  cameraOnly = true,
  label = "Capture Photos",
  compress,
  onImageCaptured,
  maxFileSizeMB,
  hasGps = false,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = () => {
    if (images.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    fileInputRef.current?.click();
  };

  const maxFileSizeMBProp = maxFileSizeMB ?? DEFAULT_MAX_IMAGE_SIZE_MB;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      e.target.value = '';
      return;
    }

    if (file.size > maxFileSizeMBProp * 1024 * 1024) {
      toast.error(`Image too large. Max ${maxFileSizeMBProp} MB.`);
      e.target.value = '';
      return;
    }

    setIsCapturing(true);

    try {
      const base64 = await compressImage(file, compress);
      onImagesChange([...images, base64]);
      onImageCaptured?.({ dataUrl: base64, capturedAt: new Date().toISOString() });
      toast.success('Photo captured successfully');
    } catch (error) {
      console.error('Failed to process image', error);
      toast.error('Unable to process photo. Please try again.');
    } finally {
      setIsCapturing(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const isComplete = images.length >= minImages;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-foreground">{label}</h4>
          <p className="text-sm text-muted-foreground">
            {images.length}/{minImages} required • Max {maxImages}
          </p>
        </div>
        {isComplete && (
          <div className="flex items-center gap-1 text-primary">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Complete</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {images.map((image, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <NextImage
              src={image}
              alt={`Captured ${index + 1}`}
              fill
              className="object-cover"
              sizes="160px"
              unoptimized
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 h-6 w-6 bg-destructive/90 rounded-full flex items-center justify-center"
            >
              <X className="h-3 w-3 text-destructive-foreground" />
            </button>
            {hasGps && (
              <div className="absolute bottom-1 left-1 bg-background/80 text-xs px-1.5 py-0.5 rounded">
                GPS ✓
              </div>
            )}
          </div>
        ))}
        
        {images.length < maxImages && (
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors",
              isCapturing 
                ? "border-primary/50 bg-primary/5" 
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            {isCapturing ? (
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Capture</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={cameraOnly ? 'environment' : undefined}
        onChange={handleFileChange}
        className="hidden"
      />

      {!isComplete && (
        <p className="text-sm text-destructive">
          Please capture at least {minImages} photos to continue
        </p>
      )}
    </div>
  );
}
