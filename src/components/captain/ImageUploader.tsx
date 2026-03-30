"use client";

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, X, Check } from 'lucide-react';
import { cn } from '@shared/utils';
import { toast } from 'sonner';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  minImages: number;
  maxImages: number;
  cameraOnly?: boolean;
  label?: string;
  onImageCaptured?: (payload: { dataUrl: string; capturedAt: string }) => void;
}

export function ImageUploader({
  images,
  onImagesChange,
  minImages,
  maxImages,
  cameraOnly = true,
  label = "Capture Photos",
  onImageCaptured,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const estimateDataUrlBytes = (dataUrl: string): number => {
    const base64Payload = dataUrl.split(',')[1] ?? '';
    const paddingMatch = /=+$/.exec(base64Payload);
    const padding = paddingMatch?.[0]?.length ?? 0;
    return Math.floor((base64Payload.length * 3) / 4) - padding;
  };

  const loadImageAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string) ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const loadImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new globalThis.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleCapture = () => {
    if (images.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    fileInputRef.current?.click();
  };

  const compressImage = async (file: File): Promise<string> => {
    const TARGET_MAX_BYTES = 450 * 1024;
    const START_MAX_WIDTH = 1280;
    const MIN_WIDTH = 640;
    const START_QUALITY = 0.8;
    const MIN_QUALITY = 0.45;
    const WIDTH_REDUCTION_FACTOR = 0.85;
    const QUALITY_STEP = 0.08;
    const MAX_ATTEMPTS = 12;

    const src = await loadImageAsDataUrl(file);
    const img = await loadImageElement(src);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas not supported');
    }

    let currentWidth = Math.min(img.width, START_MAX_WIDTH);
    let currentQuality = START_QUALITY;
    let bestEffortDataUrl = '';

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const scale = Math.min(1, currentWidth / img.width);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
      bestEffortDataUrl = dataUrl;

      const estimatedBytes = estimateDataUrlBytes(dataUrl);
      if (estimatedBytes <= TARGET_MAX_BYTES) {
        return dataUrl;
      }

      const canReduceWidth = currentWidth > MIN_WIDTH;
      const canReduceQuality = currentQuality > MIN_QUALITY;

      if (!canReduceWidth && !canReduceQuality) {
        break;
      }

      if (canReduceQuality) {
        currentQuality = Math.max(
          MIN_QUALITY,
          Number((currentQuality - QUALITY_STEP).toFixed(2))
        );
      }

      if (canReduceWidth && (estimatedBytes > TARGET_MAX_BYTES * 1.25 || !canReduceQuality)) {
        currentWidth = Math.max(
          MIN_WIDTH,
          Math.round(currentWidth * WIDTH_REDUCTION_FACTOR)
        );
      }
    }

    return bestEffortDataUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);

    compressImage(file)
      .then((base64) => {
        onImagesChange([...images, base64]);
        onImageCaptured?.({ dataUrl: base64, capturedAt: new Date().toISOString() });
        toast.success('Photo captured successfully');
      })
      .catch(() => {
        toast.error('Failed to process image. Please try again.');
      })
      .finally(() => {
        setIsCapturing(false);
      });

    // Reset input
    e.target.value = '';
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
            <Image
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
            <div className="absolute bottom-1 left-1 bg-background/80 text-xs px-1.5 py-0.5 rounded">
              GPS ✓
            </div>
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
