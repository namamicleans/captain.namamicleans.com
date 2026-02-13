"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <div className="text-6xl font-bold text-primary">404</div>
        <h1 className="text-2xl font-semibold text-foreground">Page Not Found</h1>
        <p className="text-muted-foreground max-w-md">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button onClick={() => router.push('/')} size="lg">
          Back to Home
        </Button>
      </div>
    </div>
  );
}
