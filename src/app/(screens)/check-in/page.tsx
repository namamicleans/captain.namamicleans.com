"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Gauge, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepProgress } from "@/components/captain/StepProgress";
import { MaterialsChecklist } from "@/components/captain/MaterialsChecklist";
import { ImageUploader } from "@/components/captain/ImageUploader";
import { Spinner } from "@/components/ui/spinner";
import { useCaptain } from "@/context/CaptainContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CaptainCheckInMaterialInput } from "@/types/captain";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { formatDateTimeIST } from "@/shared/utils/datetime";
import { OdometerInput } from "@/components/captain/OdometerInput";
import { useDirectUploadImage } from "@/hooks/useDirectUploadImage";
import {
  clearCheckInDraft,
  readCheckInDraft,
  useCheckInDraft,
  type CheckInSelfieMeta,
} from "@/hooks/useCheckInDraft";

interface MaterialCheckState {
  checked: boolean;
  quantity?: number;
}

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: {
    platform?: string;
  };
}

const steps = ["Selfie", "Materials", "Odometer"];

// Draft is keyed by today's date — check-in always applies to "today", and a
// stale draft from a previous day is not something we want to resume anyway.
function todayDateKey(): string {
  return new Date().toISOString().split("T")[0] as string;
}

function AlreadyCapturedCard({ label, onRetake }: { label: string; onRetake: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-primary">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={onRetake}>
        <RotateCcw className="h-4 w-4 mr-1" />
        Retake
      </Button>
    </div>
  );
}

export default function CheckInPage() {
  const router = useRouter();
  const { checkIn, materials, isShiftLoading, isCurrentlyCheckedIn, todayAttendance, getCheckInUploadUrl } =
    useCaptain();
  const { t } = useTranslation();
  const { permissions, requestLocationPermission, getCurrentLocation } =
    usePermissions();

  const dateKey = useMemo(() => todayDateKey(), []);
  const [initialDraft] = useState(() => readCheckInDraft(dateKey));

  const [currentStep, setCurrentStep] = useState(0);
  const [selfieMeta, setSelfieMeta] = useState<CheckInSelfieMeta | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [checkedMaterials, setCheckedMaterials] = useState<
    Record<number, MaterialCheckState>
  >({});
  const [odometer, setOdometer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guardReady, setGuardReady] = useState(false);

  // Guard against re-checking in while already checked in for an active
  // shift — mirror image of check-out's guard against checking out twice.
  useEffect(() => {
    if (isShiftLoading) return;

    if (isCurrentlyCheckedIn) {
      toast.error("You are already checked in today");
      router.replace("/");
    } else {
      setGuardReady(true);
    }
  }, [isCurrentlyCheckedIn, isShiftLoading, router]);

  const getSelfieUploadUrl = useCallback(
    (contentType: string) => getCheckInUploadUrl("selfie", contentType),
    [getCheckInUploadUrl]
  );
  const getOdometerUploadUrl = useCallback(
    (contentType: string) => getCheckInUploadUrl("start_odometer_image", contentType),
    [getCheckInUploadUrl]
  );

  const selfieUpload = useDirectUploadImage({
    getUploadUrl: getSelfieUploadUrl,
    initialKey: initialDraft?.selfieKey ?? null,
  });
  const odometerUpload = useDirectUploadImage({
    getUploadUrl: getOdometerUploadUrl,
    initialKey: initialDraft?.odometerImageKey ?? null,
  });

  // Restore the rest of the draft once on mount — after the initial render so
  // the resumed step doesn't fight the server-rendered first paint.
  useEffect(() => {
    if (!initialDraft) return;
    setCurrentStep(initialDraft.currentStep);
    setSelfieMeta(initialDraft.selfieMeta);
    setOdometer(initialDraft.odometer);
    setCheckedMaterials(initialDraft.checkedMaterials);
    if (initialDraft.selfieKey || initialDraft.odometerImageKey) {
      toast.success(t("checkIn.draftRestored", "Resumed your in-progress check-in"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useCheckInDraft(dateKey, {
    currentStep,
    selfieKey: selfieUpload.key,
    selfieMeta,
    odometer,
    odometerImageKey: odometerUpload.key,
    checkedMaterials,
  });

  const materialsMap = useMemo(() => {
    return new Map(materials.map((material) => [material.id, material]));
  }, [materials]);

  const requiredMaterials = useMemo(
    () => materials.filter((material) => material.isRequired),
    [materials]
  );

  const allRequiredMaterialsChecked = requiredMaterials.every((item) => {
    const state = checkedMaterials[item.id];
    if (!state?.checked) return false;
    if (
      item.minimumQuantity > 0 &&
      (!state.quantity || state.quantity < item.minimumQuantity)
    )
      return false;
    return true;
  });

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return (
          Boolean(selfieUpload.key) &&
          selfieUpload.status !== "uploading" &&
          !!selfieMeta?.capturedAt &&
          !!selfieMeta?.location &&
          !isFetchingLocation
        );
      case 1:
        return (
          !isShiftLoading && materials.length > 0 && allRequiredMaterialsChecked
        );
      case 2:
        return (
          odometer.length > 0 &&
          Number.parseFloat(odometer) > 0 &&
          Boolean(odometerUpload.key) &&
          odometerUpload.status !== "uploading"
        );
      default:
        return false;
    }
  };

  useEffect(() => {
    if (!todayAttendance?.materials?.length) {
      return;
    }

    const prefilled: Record<number, MaterialCheckState> = {};
    todayAttendance.materials.forEach((snapshot) => {
      prefilled[snapshot.materialId] = {
        checked: !snapshot.isMissing,
        quantity: snapshot.quantityReported,
      };
    });
    setCheckedMaterials(prefilled);
    if (todayAttendance.startOdometer) {
      setOdometer(String(todayAttendance.startOdometer));
    }
  }, [todayAttendance]);

  useEffect(() => {
    if (currentStep === 0 && permissions.location === "prompt") {
      requestLocationPermission();
    }
  }, [currentStep, permissions.location, requestLocationPermission]);

  // Only clears GPS metadata when the captain actively removes the selfie
  // via ImageUploader (not on mount, where a restored-without-preview draft
  // legitimately has no local image but a valid selfieMeta to keep).
  const handleSelfieImagesChange = useCallback(
    (images: string[]) => {
      selfieUpload.onImagesChange(images);
      if (images.length === 0) {
        setSelfieMeta(null);
      }
    },
    [selfieUpload]
  );

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push("/");
    }
  };

  const toggleMaterial = (id: number) => {
    const material = materialsMap.get(id);
    setCheckedMaterials((prev) => {
      const previous = prev[id];
      const nextChecked = !previous?.checked;
      return {
        ...prev,
        [id]: {
          ...previous,
          checked: nextChecked,
          quantity: nextChecked
            ? previous?.quantity ?? material?.minimumQuantity ?? 0
            : previous?.quantity,
        },
      };
    });
  };

  const updateQuantity = (id: number, quantity: number) => {
    setCheckedMaterials((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        checked: prev[id]?.checked || true,
        quantity,
      },
    }));
  };

  const handleSelfieCaptured = useCallback(
    async ({
      dataUrl,
      capturedAt,
    }: {
      dataUrl: string;
      capturedAt: string;
    }) => {
      selfieUpload.onImageCaptured({ dataUrl });
      setIsFetchingLocation(true);
      try {
        const position = await getCurrentLocation();
        setSelfieMeta({
          capturedAt,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
      } catch (error) {
        console.error("GPS capture failed", error);
        toast.error(
          t(
            "checkIn.enableLocation",
            "Enable location services and retake the selfie."
          )
        );
        selfieUpload.reset();
        setSelfieMeta(null);
        await requestLocationPermission();
      } finally {
        setIsFetchingLocation(false);
      }
    },
    [getCurrentLocation, requestLocationPermission, selfieUpload, t]
  );

  const getButtonContent = () => {
    if (isSubmitting) {
      return (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span>{t("common.processing")}</span>
        </div>
      );
    }

    if (
      (currentStep === 0 && selfieUpload.status === "uploading") ||
      (currentStep === 2 && odometerUpload.status === "uploading")
    ) {
      return (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span>{t("checkIn.uploadingPhoto", "Uploading photo...")}</span>
        </div>
      );
    }

    if (currentStep === steps.length - 1) {
      return (
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {t("checkIn.completeCheckIn")}
        </span>
      );
    }

    return t("common.continue");
  };

  if (!guardReady) {
    return null;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (!selfieUpload.key) {
        toast.error(t("checkIn.selfieDescription"));
        setIsSubmitting(false);
        return;
      }

      if (!odometerUpload.key) {
        toast.error(
          t("checkIn.odometerImageRequired", "Odometer photo is required.")
        );
        setIsSubmitting(false);
        return;
      }

      if (!selfieMeta?.location) {
        toast.error(
          t(
            "checkIn.enableLocation",
            "Enable location services and retake the selfie."
          )
        );
        setIsSubmitting(false);
        return;
      }

      // All required materials must be reported — present ones with is_missing: false,
      // absent ones with is_missing: true. The backend rejects if any required ID is omitted.
      const selectedMaterials: CaptainCheckInMaterialInput[] = materials.map((material) => {
        const state = checkedMaterials[material.id];
        const isChecked = Boolean(state?.checked);
        return {
          material_id: material.id,
          quantity_reported: isChecked ? (state.quantity ?? 0) : 0,
          is_missing: !isChecked,
        };
      });

      if (selectedMaterials.every((m) => m.is_missing)) {
        toast.error(t("checkIn.materialsChecklist"));
        setIsSubmitting(false);
        return;
      }

      const deviceMetadata: Record<string, string> = { source: "captain-web" };
      if (typeof navigator !== "undefined") {
        const userNavigator = navigator as NavigatorWithUserAgentData;
        if (navigator.userAgent) {
          deviceMetadata.user_agent = navigator.userAgent;
        }
        if (userNavigator.userAgentData?.platform) {
          deviceMetadata.platform = userNavigator.userAgentData.platform;
        }
      }

      const metadata: Record<string, unknown> = {
        selfie_capture: {
          captured_at: selfieMeta.capturedAt,
          location: selfieMeta.location,
        },
      };

      if (Object.keys(deviceMetadata).length > 0) {
        metadata.device = deviceMetadata;
      }

      const payload = {
        selfieKey: selfieUpload.key,
        start_odometer: odometer ? Number.parseFloat(odometer) : undefined,
        startOdometerImageKey: odometerUpload.key,
        materials: selectedMaterials,
        metadata,
      };

      const result = await checkIn(payload);

      if (!result.success) {
        toast.error(result.message || t("common.error"));
        return;
      }

      clearCheckInDraft(dateKey);
      toast.success(t("checkIn.checkInSuccess"));
      router.push("/");
    } catch (error) {
      console.error("Check-in failed", error);
      toast.error(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">
              {t("checkIn.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="p-4 pl-14 justify-center">
        <StepProgress steps={steps} currentStep={currentStep} />
      </div>

      {/* Content */}
      <main className="p-4 max-w-lg mx-auto pb-24">
        {/* Step 1: Selfie */}
        {currentStep === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  {t("checkIn.takeSelfie")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("checkIn.selfieDescription")}
                </p>
              </div>

              {selfieUpload.isRestoredWithoutPreview ? (
                <AlreadyCapturedCard
                  label={t("checkIn.selfieAlreadyCaptured", "Selfie already captured")}
                  onRetake={() => {
                    selfieUpload.reset();
                    setSelfieMeta(null);
                  }}
                />
              ) : (
                <ImageUploader
                  images={selfieUpload.images}
                  onImagesChange={handleSelfieImagesChange}
                  minImages={1}
                  maxImages={1}
                  cameraOnly={true}
                  compress={{
                    maxWidth: 960,
                    maxHeight: 960,
                    quality: 0.72,
                    mimeType: "image/jpeg",
                  }}
                  label="Capture Selfie"
                  onImageCaptured={handleSelfieCaptured}
                  hasGps={true}
                />
              )}

              {selfieUpload.status === "error" && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <span>{t("checkIn.uploadFailed", "Upload failed.")}</span>
                  <Button variant="ghost" size="sm" onClick={selfieUpload.retry}>
                    {t("common.retry", "Retry")}
                  </Button>
                </div>
              )}

              {isFetchingLocation && (
                <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                  <Spinner size="sm" className="mr-2" />
                  {t("checkIn.capturingLocation", "Capturing GPS location...")}
                </div>
              )}

              {selfieMeta?.location && (
                <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm text-foreground">
                  <p className="font-medium">
                    {t("checkIn.locationCaptured", "Location captured")}
                  </p>
                  <p className="text-muted-foreground">
                    {t("checkIn.locationCoordinates", {
                      defaultValue: "Lat {{lat}}, Lng {{lng}}",
                      lat: selfieMeta.location.latitude.toFixed(5),
                      lng: selfieMeta.location.longitude.toFixed(5),
                    })}
                  </p>
                  {typeof selfieMeta.location.accuracy === "number" && (
                    <p className="text-muted-foreground">
                      {t("checkIn.locationAccuracy", {
                        defaultValue: "Accuracy ±{{accuracy}} m",
                        accuracy: Math.round(selfieMeta.location.accuracy),
                      })}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {t("checkIn.capturedAt", {
                      defaultValue: "Captured at {{time}}",
                      time: formatDateTimeIST(selfieMeta.capturedAt),
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Materials */}
        {currentStep === 1 && (
          <Card>
            <CardContent className="p-6">
              <MaterialsChecklist
                items={materials}
                checkedItems={checkedMaterials}
                onToggle={toggleMaterial}
                onQuantityChange={updateQuantity}
                isLoading={isShiftLoading}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Odometer */}
        {currentStep === 2 && (
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
                    <AlreadyCapturedCard
                      label={t("checkIn.odometerAlreadyCaptured", "Odometer photo already captured")}
                      onRetake={odometerUpload.reset}
                    />
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
                      <span>{t("checkIn.uploadFailed", "Upload failed.")}</span>
                      <Button variant="ghost" size="sm" onClick={odometerUpload.retry}>
                        {t("common.retry", "Retry")}
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
            {getButtonContent()}
          </Button>
        </div>
      </div>
    </div>
  );
}
