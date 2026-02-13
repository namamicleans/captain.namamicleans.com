"use client";

import { Check, AlertCircle, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@shared/utils";
import type { CaptainMaterial } from "@/types/captain";

interface MaterialCheckState {
  checked: boolean;
  quantity?: number;
  isMissing?: boolean;
}

interface MaterialsChecklistProps {
  readonly items: CaptainMaterial[];
  readonly checkedItems: Record<number, MaterialCheckState>;
  readonly onToggle: (itemId: number) => void;
  readonly onQuantityChange: (itemId: number, quantity: number) => void;
  readonly isLoading?: boolean;
}

export function MaterialsChecklist({
  items,
  checkedItems,
  onToggle,
  onQuantityChange,
  isLoading = false,
}: MaterialsChecklistProps) {
  const requiredItems = items.filter((item) => item.isRequired);
  const allRequiredChecked = requiredItems.every(item => {
    const state = checkedItems[item.id];
    if (!state?.checked) return false;
    if (item.minimumQuantity > 0 && (!state.quantity || state.quantity < item.minimumQuantity)) return false;
    return true;
  });
  const checkedCount = Object.values(checkedItems).filter(s => s.checked).length;
  const totalCount = items.length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="md" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No materials configured. Please contact support.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-foreground">Materials Checklist</h4>
          <p className="text-sm text-muted-foreground">
            {checkedCount}/{totalCount} items checked
          </p>
        </div>
        {allRequiredChecked ? (
          <div className="flex items-center gap-1 text-primary">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Ready</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Required items pending</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const state = checkedItems[item.id] || { checked: false };
          const requiresQuantity = item.minimumQuantity > 0;
          const step = item.unit === "pieces" ? 1 : 0.1;
          
          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col gap-2 p-3 rounded-lg border transition-all",
                state.checked 
                  ? "bg-primary/5 border-primary/30" 
                  : "bg-card border-border hover:border-primary/30"
              )}
            >
              <button
                onClick={() => onToggle(item.id)}
                className="w-full flex items-center gap-3"
              >
                <Checkbox 
                  checked={state.checked}
                  className="pointer-events-none"
                />
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <span className={cn(
                    "font-medium",
                    state.checked ? "text-primary" : "text-foreground"
                  )}>
                    {item.name}
                  </span>
                  {item.isRequired && (
                    <span className="ml-2 text-xs text-destructive">*Required</span>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Report quantity ({item.unit}) {item.minimumQuantity > 0 && `(min ${item.minimumQuantity})`}
                  </p>
                </div>
                {state.checked && !requiresQuantity && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>

              {state.checked && (
                <div className="flex items-center gap-2 ml-14">
                  <Input
                    type="number"
                    placeholder={`Enter ${item.unit}`}
                    value={state.quantity ?? ""}
                    onChange={(e) => onQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                    className="h-9 w-24"
                    min={item.minimumQuantity || 0}
                    step={step}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm text-muted-foreground">{item.unit}</span>
                  {requiresQuantity && state.quantity !== undefined && state.quantity >= item.minimumQuantity && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
