"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Gauge, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { StepProgress } from "@/components/captain/StepProgress";
import { ImageUploader } from "@/components/captain/ImageUploader";
import { OdometerInput } from "@/components/captain/OdometerInput";
import { QrScanner } from "@/components/captain/QrScanner";
import { useCaptain } from "@/context/CaptainContext";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useDirectUploadImage } from "@/hooks/useDirectUploadImage";
import {
  clearCheckInDraft,
  readCheckInDraft,
  useCheckInDraft,
  type CheckInGps,
} from "@/hooks/useCheckInDraft";

function todayDateKey(): string {
  return new Date().toISOString().split("T")[0] as string;
}

export default function CheckInPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    checkIn,
    shiftPolicy,
    isShiftLoading,
    isCurrentlyCheckedIn,
    todayAttendance,
    getCheckInUploadUrl,
  } = useCaptain();
  const { getCurrentLocation } = usePermissions();

  const dateKey = useMemo(() => todayDateKey(), []);
  const [initialDraft] = useState(() => readCheckInDraft(dateKey));

  const qrRequired =
    !!shiftPolicy?.qr_checkin_enabled && shiftPolicy.office_id != null;
  const steps = qrRequired ? ["Photo", "Reading", "Scan"] : ["Photo", "Reading"];

  const [currentStep, setCurrentStep] = useState(initialDraft?.currentStep ?? 0);
  const [odometer, setOdometer] = useState(initialDraft?.odometer ?? "");
  const [gps, setGps] = useState<CheckInGps | null>(initialDraft?.gps ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [guardReady, setGuardReady] = useState(false);

  const getOdometerUploadUrl = useCallback(
    (contentType: string) => getCheckInUploadUrl("start_odometer_image", contentType),
    [getCheckInUploadUrl]
  );
  const odometerUpload = useDirectUploadImage({
    getUploadUrl: getOdometerUploadUrl,
    initialKey: initialDraft?.odometerImageKey ?? null,
  });

  useCheckInDraft(dateKey, {
    currentStep,
    odometer,
    odometerImageKey: odometerUpload.key,
    gps,
  });

  useEffect(() => {
    if (isShiftLoading) return;
    if (isCurrentlyCheckedIn) {
      toast.error(t("checkIn.alreadyCheckedIn", "You are already checked in today"));
      router.replace("/");
    } else {
      setGuardReady(true);
    }
  }, [isCurrentlyCheckedIn, isShiftLoading, router, t]);

  // Best-effort GPS grab while they take the photo (audit only, never blocks).
  const handleOdometerCaptured = useCallback(
    async (payload: { dataUrl: string; capturedAt: string }) => {
      odometerUpload.onImageCaptured(payload);
      try {
        const pos = await getCurrentLocation();
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: payload.capturedAt,
        });
      } catch {
        /* location optional */
      }
    },
    [getCurrentLocation, odometerUpload]
  );

  const canProceed = () => {
    if (currentStep === 0) {
      return Boolean(odometerUpload.key) && odometerUpload.status !== "uploading";
    }
    if (currentStep === 1) {
      return odometer.length > 0 && Number.parseFloat(odometer) > 0;
    }
    return false;
  };

  const buildMetadata = () =>
    gps
      ? {
          checkin_capture: {
            captured_at: gps.capturedAt,
            location: {
              latitude: gps.latitude,
              longitude: gps.longitude,
              accuracy: gps.accuracy,
            },
          },
        }
      : undefined;

  const submit = useCallback(
    async (qrCodes?: string[]) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const result = await checkIn({
          start_odometer: Number.parseFloat(odometer),
          startOdometerImageKey: odometerUpload.key ?? "",
          qrCodes,
          metadata: buildMetadata(),
          shiftDate: todayAttendance?.shiftDate,
        });

        if (!result.success) {
          toast.error(result.message || t("common.error"));
          // Bad scan / network — bounce back to the scan step; keep photo+reading.
          if (qrRequired) {
            setCurrentStep(2);
            setScanKey((k) => k + 1);
          }
          return;
        }

        clearCheckInDraft(dateKey);
        toast.success(t("checkIn.checkInSuccess"));
        router.push("/");
      } catch (err) {
        console.error("Check-in failed", err);
        toast.error(t("common.error"));
        if (qrRequired) setScanKey((k) => k + 1);
      } finally {
        setIsSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkIn, odometer, odometerUpload.key, gps, qrRequired, todayAttendance?.shiftDate, dateKey]
  );

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (!qrRequired) {
      submit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else router.push("/");
  };

  if (!guardReady) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">{t("checkIn.title")}</h1>
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 pl-14 justify-center">
        <StepProgress steps={steps} currentStep={currentStep} />
      </div>

      <main className="p-4 max-w-lg mx-auto pb-24">
        {currentStep === 0 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gauge className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  {t("checkIn.odometerReading")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("checkIn.odometerPhotoFirst", "Take a clear photo of your starting odometer.")}
                </p>
              </div>
              <ImageUploader
                images={odometerUpload.images}
                onImagesChange={odometerUpload.onImagesChange}
                minImages={1}
                maxImages={1}
                cameraOnly
                compress={{ maxWidth: 960, maxHeight: 960, quality: 0.72, mimeType: "image/jpeg" }}
                label="Capture Odometer Reading"
                onImageCaptured={handleOdometerCaptured}
              />
              {odometerUpload.status === "error" && (
                <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <span>{t("checkIn.uploadFailed", "Upload failed.")}</span>
                  <Button variant="ghost" size="sm" onClick={odometerUpload.retry}>
                    {t("common.retry", "Retry")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {t("checkIn.enterReading", "Enter the reading")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("checkIn.odometerDescription")}
                </p>
              </div>
              <OdometerInput value={odometer} onValueChange={setOdometer} />
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && qrRequired && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {t("checkIn.qr.title", "Scan the office code")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("checkIn.qr.subtitle", {
                    defaultValue: "Point your camera at the screen at {{office}}.",
                    office: shiftPolicy?.office_name ?? "your office",
                  })}
                </p>
              </div>
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Spinner size="sm" />
                  <span>{t("common.processing")}</span>
                </div>
              ) : (
                <QrScanner
                  key={scanKey}
                  officeId={shiftPolicy?.office_id ?? null}
                  requiredScans={shiftPolicy?.qr_required_scans ?? 2}
                  onCollected={(codes) => submit(codes)}
                />
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {currentStep !== 2 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full h-12 text-lg"
              disabled={!canProceed() || isSubmitting}
              onClick={handleNext}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  {t("common.processing")}
                </span>
              ) : currentStep === steps.length - 1 ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  {t("checkIn.completeCheckIn")}
                </span>
              ) : (
                t("common.continue")
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
