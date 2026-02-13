"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@shared/utils';

interface CustomerRatingProps {
  value: number;
  onChange: (rating: number) => void;
}

export function CustomerRating({ value, onChange }: CustomerRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            className="p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={cn(
                'h-10 w-10 transition-colors',
                (hoverValue || value) >= star
                  ? 'text-primary fill-primary'
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>
      {(hoverValue || value) > 0 && (
        <p className="text-center text-sm font-medium text-foreground">
          {labels[hoverValue || value]}
        </p>
      )}
    </div>
  );
}
