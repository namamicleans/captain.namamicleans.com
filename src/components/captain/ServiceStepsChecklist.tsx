"use client";

import { Check } from 'lucide-react';
import { ServiceStep } from '@shared/config/serviceConfig';
import { cn } from '@shared/utils';
import { Progress } from '@/components/ui/progress';

interface ServiceStepsChecklistProps {
  steps: ServiceStep[];
  completedSteps: string[];
  onToggle: (stepId: string) => void;
}

export function ServiceStepsChecklist({ steps, completedSteps, onToggle }: ServiceStepsChecklistProps) {
  const requiredSteps = steps.filter(step => step.required);
  const completedRequired = requiredSteps.filter(step => completedSteps.includes(step.id));
  const progress = (completedSteps.length / steps.length) * 100;
  const allRequiredComplete = completedRequired.length === requiredSteps.length;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">Service Checklist</h4>
          <span className="text-sm text-muted-foreground">
            {completedSteps.length}/{steps.length} completed
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const previousCompleted = index === 0 || completedSteps.includes(steps[index - 1].id);
          
          return (
            <button
              key={step.id}
              onClick={() => onToggle(step.id)}
              disabled={!previousCompleted && !isCompleted}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left",
                isCompleted 
                  ? "bg-primary/5 border-primary/30" 
                  : previousCompleted
                    ? "bg-card border-border hover:border-primary/30 hover:bg-accent/30"
                    : "bg-muted/30 border-border/50 opacity-60 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                isCompleted 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium",
                    isCompleted ? "text-primary" : "text-foreground"
                  )}>
                    {step.title}
                  </span>
                  {step.required && !isCompleted && (
                    <span className="text-xs text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </div>
                {step.instruction && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.instruction}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!allRequiredComplete && (
        <p className="text-sm text-destructive text-center">
          Complete all required steps to proceed
        </p>
      )}
    </div>
  );
}
