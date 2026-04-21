"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Navigation, Phone, CheckCircle2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { StepProgress } from '@/components/captain/StepProgress';
import { ImageUploader } from '@/components/captain/ImageUploader';
import { ServiceStepsChecklist } from '@/components/captain/ServiceStepsChecklist';
import { CustomerRating } from '@/components/captain/CustomerRating';
import { Spinner } from '@/components/ui/spinner';
import { useCaptain } from '@/context/CaptainContext';
import { useRouter, useParams } from 'next/navigation';
import type { CaptainExecutionChecklistTemplateItem } from '@/types/captain';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const executionSteps = ['Before', 'Service', 'After', 'Complete'];
const MIN_REQUIRED_BEFORE_IMAGES = 2;
const MIN_REQUIRED_AFTER_IMAGES = 2;
const MAX_ALLOWED_IMAGES = 10;

type ChecklistStep = {
  id: string;
  title: string;
  instruction: string;
  required: boolean;
};

export default function JobExecutionPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const router = useRouter();
  const {
    jobs,
    updateJob,
    startJobExecution,
    completeJobExecution,
    getJobExecution,
  } = useCaptain();

  const job = jobs.find(j => j.id === jobId);

  const [currentStep, setCurrentStep] = useState(0);
  const [beforeImages, setBeforeImages] = useState<string[]>(job?.beforeImages || []);
  const [completedSteps, setCompletedSteps] = useState<string[]>(job?.completedSteps || []);
  const [afterImages, setAfterImages] = useState<string[]>(job?.afterImages || []);
  const [notes, setNotes] = useState('');
  const [customerRating, setCustomerRating] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checklistTemplate, setChecklistTemplate] = useState<CaptainExecutionChecklistTemplateItem[]>([]);
  const [isExecutionLoading, setIsExecutionLoading] = useState(true);
  const [executionLoadError, setExecutionLoadError] = useState<string | null>(null);
  const hasPrefilledExecution = useRef<string | null>(null);

  const checklistSteps = useMemo((): ChecklistStep[] => {
    console.log('Checklist template from backend:', checklistTemplate);
    return checklistTemplate.map((item) => ({
      id: item.id,
      title: item.label,
      instruction: item.description || '',
      required: item.required,
    }));
  }, [checklistTemplate]);

  const requiredSteps = useMemo(() => 
    checklistSteps.filter(s => s.required).map(s => s.id),
    [checklistSteps]
  );

  useEffect(() => {
    let isMounted = true;
    const currentJobId = job?.id;

    if (!currentJobId) {
      setIsExecutionLoading(false);
      return;
    }

    // Prefill only once per job ID to avoid overriding local in-progress checklist state.
    if (hasPrefilledExecution.current === currentJobId) {
      setIsExecutionLoading(false);
      return;
    }
    hasPrefilledExecution.current = currentJobId;

    const prefillExecution = async () => {
      setIsExecutionLoading(true);
      setExecutionLoadError(null);

      const result = await getJobExecution(currentJobId);
      if (!isMounted) {
        return;
      }

      if (!result.success || !result.data) {
        setExecutionLoadError(result.message || 'Execution details are unavailable from backend. You cannot proceed.');
        setIsExecutionLoading(false);
        return;
      }

      const execution = result.data;
      const backendChecklist = execution.checklist_template.length > 0
        ? execution.checklist_template
        : execution.checklist_data;

      if (backendChecklist.length === 0) {
        setExecutionLoadError('Checklist template is missing from backend for this booking. You cannot proceed.');
        setIsExecutionLoading(false);
        return;
      }

      setChecklistTemplate(backendChecklist);

      const beforeFromBackend = execution.before_images
        .map((img) => img.url)
        .filter((url): url is string => Boolean(url));
      const afterFromBackend = execution.after_images
        .map((img) => img.url)
        .filter((url): url is string => Boolean(url));

      if (beforeFromBackend.length > 0 || execution.before_image_urls.length > 0) {
        setBeforeImages(beforeFromBackend.length > 0 ? beforeFromBackend : execution.before_image_urls);
      }

      if (afterFromBackend.length > 0 || execution.after_image_urls.length > 0) {
        setAfterImages(afterFromBackend.length > 0 ? afterFromBackend : execution.after_image_urls);
      }

      if (execution.checklist_data.length > 0) {
        const completed = execution.checklist_data
          .filter((item) => item.completed)
          .map((item) => item.id);
        setCompletedSteps(completed);
      }

      if (execution.captain_notes) {
        setNotes(execution.captain_notes);
      }

      if (execution.captain_rating_for_customer) {
        setCustomerRating(execution.captain_rating_for_customer);
      }

      if (execution.started_at && job?.status === 'scheduled') {
        updateJob(currentJobId, {
          status: 'ongoing',
          startedAt: execution.started_at,
        });
      }

      setIsExecutionLoading(false);
    };

    prefillExecution();

    return () => {
      isMounted = false;
    };
  }, [getJobExecution, job?.id, updateJob]);

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Job not found</p>
      </div>
    );
  }

  if (isExecutionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-2">
        <Spinner size="md" />
        <p className="text-muted-foreground">Loading execution data...</p>
      </div>
    );
  }

  if (executionLoadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4 text-center">
            <h2 className="text-lg font-semibold text-foreground">Execution data unavailable</h2>
            <p className="text-sm text-muted-foreground">{executionLoadError}</p>
            <Button onClick={() => router.push('/jobs')}>Back to Jobs</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Before images
        return beforeImages.length >= MIN_REQUIRED_BEFORE_IMAGES;
      case 1: // Service steps
        return checklistSteps.length > 0 && requiredSteps.every(id => completedSteps.includes(id));
      case 2: // After images
        return afterImages.length >= MIN_REQUIRED_AFTER_IMAGES;
      case 3: // Complete
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!job) {
      return;
    }

    if (currentStep === 0 && job.status === 'scheduled') {
      setIsStarting(true);
      const startResult = await startJobExecution(job.id, { source: 'captain-web' });
      setIsStarting(false);

      if (!startResult.success) {
        toast.error(startResult.message || 'Unable to start job right now');
        return;
      }
    }

    if (currentStep < executionSteps.length - 1) {
      // Save progress
      updateJob(job.id, {
        status: 'ongoing',
        beforeImages,
        completedSteps,
        afterImages,
        startedAt: job.startedAt || new Date().toISOString(),
      });
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setShowExitDialog(true);
    }
  };

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev =>
      prev.includes(stepId) ? prev.filter(id => id !== stepId) : [...prev, stepId]
    );
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    const checklist = checklistSteps.map((step) => ({
      id: step.id,
      label: step.title,
      required: step.required,
      completed: completedSteps.includes(step.id),
    }));

    const completionResult = await completeJobExecution(job.id, {
      beforeImages,
      afterImages,
      checklist,
      captainRatingForCustomer: customerRating,
      captainNotes: notes || undefined,
      summary: {
        service_name: job.serviceName,
        customer_name: job.customerName,
        before_images_count: beforeImages.length,
        after_images_count: afterImages.length,
        checklist_completed_count: checklist.filter((item) => item.completed).length,
        checklist_total_count: checklist.length,
      },
      metadata: {
        source: 'captain-web',
      },
    });

    if (!completionResult.success) {
      toast.error(completionResult.message || 'Unable to complete job right now');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setShowSuccess(true);
  };

  const openNavigation = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${job.location.lat},${job.location.lng}`,
      '_blank'
    );
  };

  const getPrimaryButtonContent = () => {
    if (isSubmitting) {
      return (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span>Completing...</span>
        </div>
      );
    }

    if (isStarting) {
      return (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span>Starting...</span>
        </div>
      );
    }

    if (currentStep === executionSteps.length - 1) {
      return (
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Complete Job
        </span>
      );
    }

    return 'Continue';
  };

  // Success Animation
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <PartyPopper className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Job Completed!</h1>
            <p className="text-muted-foreground">
              Great work! Your job completion has been recorded successfully.
            </p>
          </div>
          <Button size="lg" onClick={() => router.push('/jobs')}>
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h1 className="font-semibold text-foreground text-sm">{job.serviceName}</h1>
            <p className="text-xs text-muted-foreground">{job.customerName}</p>
          </div>
          <div className="flex gap-2">
            <Button size="icon" onClick={openNavigation}>
              <Navigation className="h-5 w-5" />
            </Button>
            <Button 
              
              size="icon"
              onClick={() => window.open(`tel:${job.customerPhone}`)}
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        
      </header>

      {/* Content */}
      <main className="p-4 max-w-lg mx-auto pb-24">
        {/* Progress */}
        <div className="pl-10 pb-4 max-w-lg mx-auto">
          <StepProgress steps={executionSteps} currentStep={currentStep} />
        </div>

        {/* Step 1: Before Images */}
        {currentStep === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Before Service Photos
                </h2>
                <p className="text-sm text-muted-foreground">
                  Capture the condition before starting work
                </p>
              </div>

              <ImageUploader
                images={beforeImages}
                onImagesChange={setBeforeImages}
                minImages={MIN_REQUIRED_BEFORE_IMAGES}
                maxImages={MAX_ALLOWED_IMAGES}
                label="Before Photos"
              />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Service Checklist */}
        {currentStep === 1 && (
          <Card>
            <CardContent className="p-6">
              <ServiceStepsChecklist
                steps={checklistSteps}
                completedSteps={completedSteps}
                onToggle={toggleStep}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: After Images */}
        {currentStep === 2 && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  After Service Photos
                </h2>
                <p className="text-sm text-muted-foreground">
                  Capture the result of your work
                </p>
              </div>

              <ImageUploader
                images={afterImages}
                onImagesChange={setAfterImages}
                minImages={MIN_REQUIRED_AFTER_IMAGES}
                maxImages={MAX_ALLOWED_IMAGES}
                label="After Photos"
              />
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-foreground mb-4">Job Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium text-foreground">{job.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium text-foreground">{job.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Before Photos</span>
                    <span className="font-medium text-foreground">{beforeImages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Steps Completed</span>
                    <span className="font-medium text-foreground">
                      {completedSteps.length}/{checklistSteps.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">After Photos</span>
                    <span className="font-medium text-foreground">{afterImages.length}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="text-muted-foreground">Payment</span>
                    <span className="font-bold text-primary">₹{job.paymentAmount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-foreground mb-2">Rate Customer</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    How was your experience with this customer?
                  </p>
                </div>
                <CustomerRating value={customerRating} onChange={setCustomerRating} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Notes (Optional)</h3>
                <Textarea
                  placeholder="Any notes about the job..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-12 text-lg"
            disabled={!canProceed() || isSubmitting || isStarting}
            onClick={handleNext}
          >
            {getPrimaryButtonContent()}
          </Button>
        </div>
      </div>

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Job?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved. You can continue this job later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              updateJob(job.id, {
                status: 'ongoing',
                beforeImages,
                completedSteps,
                afterImages,
              });
              router.push('/jobs');
            }}>
              Save & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
