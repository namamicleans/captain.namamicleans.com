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
  compress?: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    mimeType?: string;
  };
}

export function ImageUploader({
  images,
  onImagesChange,
  minImages,
  maxImages,
  cameraOnly = true,
  label = "Capture Photos",
  onImageCaptured,
  compress,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read image."));
      reader.readAsDataURL(file);
    });

  const compressImage = async (file: File, options: NonNullable<ImageUploaderProps["compress"]>) => {
    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Unable to load image for compression."));
        img.src = objectUrl;
      });

      const maxWidth = options.maxWidth;
      const maxHeight = options.maxHeight;
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const targetWidth = Math.round(image.width * ratio);
      const targetHeight = Math.round(image.height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context unavailable for compression.");
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const mimeType = options.mimeType || "image/jpeg";
      return canvas.toDataURL(mimeType, options.quality);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleCapture = () => {
    if (images.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    let base64: string | null = null;

    try {
      if (compress) {
        base64 = await compressImage(file, compress);
      } else {
        base64 = await readFileAsDataUrl(file);
      }
    } catch (error) {
      console.error("Image processing failed", error);
      toast.error("Unable to process image. Please try again.");
    } finally {
      setIsCapturing(false);
      e.target.value = '';
    }

    if (!base64) {
      return;
    }

    onImagesChange([...images, base64]);
    onImageCaptured?.({ dataUrl: base64, capturedAt: new Date().toISOString() });
    toast.success('Photo captured successfully');
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
