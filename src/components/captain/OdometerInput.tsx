"use client";

import { Input } from "@/components/ui/input";

interface OdometerInputProps {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
}

export function OdometerInput({ value, onValueChange, id = "odometer-input" }: OdometerInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Current Odometer Reading (km)
      </label>
      <Input
        id={id}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        placeholder="e.g., 45678"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || Number.parseFloat(v) >= 0) {
            onValueChange(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "e" || e.key === "E") {
            e.preventDefault();
          }
        }}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text");
          if (pasted.trim().startsWith("-")) {
            e.preventDefault();
          }
        }}
        className="text-lg h-14 text-center font-semibold"
      />
      <p className="text-xs text-muted-foreground text-center">
        Enter the exact reading shown on your vehicle&apos;s odometer
      </p>
    </div>
  );
}
