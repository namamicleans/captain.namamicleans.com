"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Gauge, LogOut, MessageSquare, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ImageUploader } from "@/components/captain/ImageUploader";
import { OdometerInput } from "@/components/captain/OdometerInput";
import { QrScanner } from "@/components/captain/QrScanner";
import { useCaptain } from "@/context/CaptainContext";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { formatDateTimeIST } from "@/shared/utils/datetime";
import { useDirectUploadImage } from "@/hooks/useDirectUploadImage";
import { clearCheckOutDraft, readCheckOutDraft, useCheckOutDraft } from "@/hooks/useCheckOutDraft";

function todayDateKey(): string {
  return new Date().toISOString().split("T")[0] as string;
}

export default function CheckOutPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    checkOut,
    shiftPolicy,
    todayAttendance,
    jobs,
    isCheckOutInFlight,
    isCheckedOut,
    isShiftLoading,
    getCheckOutUploadUrl,
  } = useCaptain();
  const { getCurrentLocation } = usePermissions();

  const dateKey = todayAttendance?.shiftDate || todayDateKey();
  const [initialDraft] = useState(() => readCheckOutDraft(dateKey));

  const qrRequired =
    !!shiftPolicy?.qr_checkin_enabled && shiftPolicy.office_id != null;

  const [phase, setPhase] = useState<"details" | "scan">("details");
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [odometer, setOdometer] = useState(initialDraft?.odometer ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [guardReady, setGuardReady] = useState(false);
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);

  const getOdometerUploadUrl = useCallback(
    (contentType: string) => getCheckOutUploadUrl(contentType),
    [getCheckOutUploadUrl]
  );
  const odometerUpload = useDirectUploadImage({
    getUploadUrl: getOdometerUploadUrl,
    initialKey: initialDraft?.odometerImageKey ?? null,
  });

  useCheckOutDraft(dateKey, { odometer, odometerImageKey: odometerUpload.key, notes });

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

  const completedJobs = jobs.filter((j) => j.status === "completed").length;

  const handleOdometerCaptured = useCallback(
    async (payload: { dataUrl: string; capturedAt: string }) => {
      odometerUpload.onImageCaptured(payload);
      try {
        const pos = await getCurrentLocation();
        setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
      } catch {
        /* optional */
      }
    },
    [getCurrentLocation, odometerUpload]
  );

  const detailsReady =
    odometer.trim() !== "" &&
    Number.parseFloat(odometer) > 0 &&
    Boolean(odometerUpload.key) &&
    odometerUpload.status !== "uploading";

  const submit = useCallback(
    async (qrCodes?: string[]) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const result = await checkOut({
          endOdometer: Number.parseFloat(odometer),
          endOdometerImageKey: odometerUpload.key ?? "",
          notes: notes || undefined,
          qrCodes,
          metadata: gps
            ? { checkout_capture: { captured_at: new Date().toISOString(), location: gps } }
            : undefined,
          shiftDate: todayAttendance?.shiftDate,
        });
        if (!result.success) {
          toast.error(result.message || "Unable to complete check-out");
          if (qrRequired) {
            setPhase("scan");
            setScanKey((k) => k + 1);
          }
          return;
        }
        clearCheckOutDraft(dateKey);
        toast.success(t("checkOut.checkOutSuccess"));
        router.push("/");
      } catch (err) {
        console.error("Check-out failed", err);
        toast.error("Something went wrong. Please try again.");
        if (qrRequired) setScanKey((k) => k + 1);
      } finally {
        setIsSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkOut, odometer, odometerUpload.key, notes, gps, qrRequired, todayAttendance?.shiftDate, dateKey]
  );

  if (!guardReady) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (phase === "scan" ? setPhase("details") : router.push("/"))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Check Out</h1>
            <p className="text-sm text-muted-foreground">End your day</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {phase === "details" && (
          <>
            <Card className="bg-gradient-to-br from-primary to-primary/80 border-0">
              <CardContent className="p-6 text-primary-foreground">
                <h2 className="text-lg font-semibold mb-4">Today&apos;s Summary</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-primary-foreground/70 text-sm">Check-in Time</p>
                    <p className="text-xl font-bold">
                      {formatDateTimeIST(todayAttendance?.checkInTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-primary-foreground/70 text-sm">Jobs Completed</p>
                    <p className="text-xl font-bold">{completedJobs}</p>
                  </div>
                  <div>
                    <p className="text-primary-foreground/70 text-sm">Start Odometer</p>
                    <p className="text-xl font-bold">{todayAttendance?.startOdometer ?? "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gauge className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    {t("checkIn.odometerReading")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("checkIn.odometerDescription")}
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
                    <span>Upload failed.</span>
                    <Button variant="ghost" size="sm" onClick={odometerUpload.retry}>
                      Retry
                    </Button>
                  </div>
                )}
                <hr className="border-border" />
                <OdometerInput value={odometer} onValueChange={setOdometer} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Notes (Optional)</h3>
                    <p className="text-sm text-muted-foreground">Any issues or feedback?</p>
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
          </>
        )}

        {phase === "scan" && qrRequired && (
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

      {phase === "details" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full h-12 text-lg bg-destructive hover:bg-destructive/90"
              disabled={!detailsReady || isSubmitting || isCheckOutInFlight}
              onClick={() => (qrRequired ? setPhase("scan") : submit())}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" /> Processing…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogOut className="h-5 w-5" />
                  {qrRequired ? "Continue to scan" : "Confirm Check-Out"}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
