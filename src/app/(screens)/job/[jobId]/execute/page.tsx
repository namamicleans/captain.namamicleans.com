"use client";

import { useState, useMemo } from 'react';
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
import { serviceConfigs } from '@shared/config/serviceConfig';
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

export default function JobExecutionPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const router = useRouter();
  const { jobs, updateJob, completeJob } = useCaptain();

  const job = jobs.find(j => j.id === jobId);
  const serviceConfig = job ? serviceConfigs[job.serviceType] : null;

  const [currentStep, setCurrentStep] = useState(0);
  const [beforeImages, setBeforeImages] = useState<string[]>(job?.beforeImages || []);
  const [completedSteps, setCompletedSteps] = useState<string[]>(job?.completedSteps || []);
  const [afterImages, setAfterImages] = useState<string[]>(job?.afterImages || []);
  const [notes, setNotes] = useState('');
  const [customerRating, setCustomerRating] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const requiredSteps = useMemo(() => 
    serviceConfig?.steps.filter(s => s.required).map(s => s.id) || [],
    [serviceConfig]
  );

  if (!job || !serviceConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Job not found</p>
      </div>
    );
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Before images
        return beforeImages.length >= serviceConfig.minBeforeImages;
      case 1: // Service steps
        return requiredSteps.every(id => completedSteps.includes(id));
      case 2: // After images
        return afterImages.length >= serviceConfig.minAfterImages;
      case 3: // Complete
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    completeJob(job.id, afterImages, notes);
    setIsSubmitting(false);
    setShowSuccess(true);
  };

  const openNavigation = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${job.location.lat},${job.location.lng}`,
      '_blank'
    );
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
              Great work! ₹{job.paymentAmount} has been added to your earnings.
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
                minImages={serviceConfig.minBeforeImages}
                maxImages={serviceConfig.maxBeforeImages}
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
                steps={serviceConfig.steps}
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
                minImages={serviceConfig.minAfterImages}
                maxImages={serviceConfig.maxAfterImages}
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
                      {completedSteps.length}/{serviceConfig.steps.length}
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
            disabled={!canProceed() || isSubmitting}
            onClick={handleNext}
          >
          {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Completing...</span>
              </div>
            ) : currentStep === executionSteps.length - 1 ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Complete Job
              </span>
            ) : (
              'Continue'
            )}
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
