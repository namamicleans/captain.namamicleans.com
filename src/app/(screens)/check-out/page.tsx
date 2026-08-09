"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, LogOut, Gauge, MapPin, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCaptain } from "@/context/CaptainContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ImageUploader } from "@/components/captain/ImageUploader";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { formatDateTimeIST } from "@/shared/utils/datetime";
import { OdometerInput } from "@/components/captain/OdometerInput";
import { useDirectUploadImage } from "@/hooks/useDirectUploadImage";
import { clearCheckOutDraft, readCheckOutDraft, useCheckOutDraft } from "@/hooks/useCheckOutDraft";

function todayDateKey(): string {
  return new Date().toISOString().split("T")[0] as string;
}

export default function CheckOutPage() {
  const router = useRouter();
  const {
    checkOut,
    todayAttendance,
    jobs,
    isCheckOutInFlight,
    isCheckedOut,
    isShiftLoading,
    getCheckOutUploadUrl,
  } = useCaptain();
  const { getCurrentLocation, requestLocationPermission } = usePermissions();

  const dateKey = todayAttendance?.shiftDate || todayDateKey();
  const [initialDraft] = useState(() => readCheckOutDraft(dateKey));

  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [odometer, setOdometer] = useState(initialDraft?.odometer ?? "");
  const [guardReady, setGuardReady] = useState(false);

  const getOdometerUploadUrl = useCallback(
    (contentType: string) => getCheckOutUploadUrl(contentType),
    [getCheckOutUploadUrl]
  );
  const odometerUpload = useDirectUploadImage({
    getUploadUrl: getOdometerUploadUrl,
    initialKey: initialDraft?.odometerImageKey ?? null,
  });

  useCheckOutDraft(dateKey, {
    odometer,
    odometerImageKey: odometerUpload.key,
    notes,
  });

  useEffect(() => {
    if (initialDraft?.odometerImageKey) {
      toast.success("Resumed your in-progress check-out");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedJobs = jobs.filter((j) => j.status === "completed").length;

  const { t } = useTranslation();

  useEffect(() => {
    if (todayAttendance?.endOdometer) {
      setOdometer(String(todayAttendance.endOdometer));
    }
  }, [todayAttendance?.endOdometer]);

  // Guard against invalid states (redirect after data has loaded)
  useEffect(() => {
    if (isShiftLoading) return;

    if (isCheckedOut) {
      toast.error("You have already checked out today");
      router.replace("/");
    } else if (!todayAttendance || todayAttendance.status === "pending") {
      toast.error("No active shift to check out from");
      router.replace("/");
    } else {
      setGuardReady(true);
    }
  }, [todayAttendance, isCheckedOut, isShiftLoading, router]);

  // Show nothing while guard hasn't resolved (loading or redirecting)
  if (!guardReady) {
    return null;
  }

  const canSubmit =
    odometer.trim() !== "" &&
    Number.parseFloat(odometer) > 0 &&
    Boolean(odometerUpload.key) &&
    odometerUpload.status !== "uploading" &&
    !isSubmitting &&
    !isCheckOutInFlight;

  const handleSubmit = async () => {
    const odometerValue = parseFloat(odometer);

    if (!Number.isFinite(odometerValue) || odometerValue <= 0) {
      toast.error("Enter a valid odometer reading");
      return;
    }

    if (!odometerUpload.key) {
      toast.error("Odometer photo is required");
      return;
    }

    setIsSubmitting(true);

    let position: GeolocationPosition;

    try {
      position = await getCurrentLocation();
    } catch (error) {
      console.error("Check-out location capture failed", error);
      toast.error(
        t(
          "checkIn.enableLocation",
          "Enable location services and try check-out again."
        )
      );
      await requestLocationPermission();
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await checkOut({
        endOdometer: odometerValue,
        endOdometerImageKey: odometerUpload.key,
        notes: notes || undefined,
        shiftDate: todayAttendance?.shiftDate,
        metadata: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          captured_at: new Date().toISOString(),
          source: "web",
        },
      });

      if (!result.success) {
        toast.error(result.message || "Unable to complete check-out");
        return;
      }

      clearCheckOutDraft(dateKey);
      toast.success(t("checkOut.checkOutSuccess"));
      router.push("/");
    } catch (error) {
      console.error("Check-out failed", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Check Out</h1>
            <p className="text-sm text-muted-foreground">End your day</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Summary */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0">
          <CardContent className="p-6 text-primary-foreground">
            <h2 className="text-lg font-semibold mb-4">Today&apos;s Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-primary-foreground/70 text-sm">
                  Check-in Time
                </p>
                <p className="text-xl font-bold">
                  {formatDateTimeIST(todayAttendance?.checkInTime)}
                </p>
              </div>
              <div>
                <p className="text-primary-foreground/70 text-sm">
                  Jobs Completed
                </p>
                <p className="text-xl font-bold">{completedJobs}</p>
              </div>
              <div>
                <p className="text-primary-foreground/70 text-sm">Shift Status</p>
                <p className="text-xl font-bold">In Progress</p>
              </div>
              <div>
                <p className="text-primary-foreground/70 text-sm">
                  Start Odometer
                </p>
                <p className="text-xl font-bold">
                  {todayAttendance?.startOdometer ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Closing Fuel */}
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
                {t("checkIn.odometerDescription")}
              </p>
            </div>

            <div className="space-y-4">
              {/* Image first, then number input */}
              <div className="space-y-2">
                {odometerUpload.isRestoredWithoutPreview ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Odometer photo already captured</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={odometerUpload.reset}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Retake
                    </Button>
                  </div>
                ) : (
                  <ImageUploader
                    images={odometerUpload.images}
                    onImagesChange={odometerUpload.onImagesChange}
                    minImages={1}
                    maxImages={1}
                    cameraOnly={true}
                    compress={{
                      maxWidth: 960,
                      maxHeight: 960,
                      quality: 0.72,
                      mimeType: "image/jpeg",
                    }}
                    label="Capture Odometer Reading"
                    onImageCaptured={odometerUpload.onImageCaptured}
                  />
                )}
                {odometerUpload.status === "error" && (
                  <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <span>Upload failed.</span>
                    <Button variant="ghost" size="sm" onClick={odometerUpload.retry}>
                      Retry
                    </Button>
                  </div>
                )}
              </div>

              <hr className="border-border" />

              <OdometerInput value={odometer} onValueChange={setOdometer} />
            </div>

            <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {t("checkIn.locationCaptured")}
                </p>
                <p className="text-muted-foreground">
                  {t("checkIn.gpsTagged")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Notes (Optional)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Any issues or feedback?
                </p>
              </div>
            </div>

            <Textarea
              placeholder="Write any notes about your day..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-12 text-lg bg-destructive hover:bg-destructive/90"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isSubmitting || odometerUpload.status === "uploading" ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                <span>{odometerUpload.status === "uploading" ? "Uploading photo..." : "Processing..."}</span>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Confirm Check-Out
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
