"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Gauge, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

interface MaterialCheckState {
  checked: boolean;
  quantity?: number;
}

interface SelfieCaptureMeta {
  capturedAt: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

const steps = ["Selfie", "Materials", "Odometer"];

export default function CheckInPage() {
  const router = useRouter();
  const { checkIn, materials, isShiftLoading, todayAttendance } = useCaptain();
  const { t } = useTranslation();
  const { permissions, requestLocationPermission, getCurrentLocation } =
    usePermissions();

  const [currentStep, setCurrentStep] = useState(0);
  const [selfie, setSelfie] = useState<string[]>([]);
  const [selfieMeta, setSelfieMeta] = useState<SelfieCaptureMeta | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [checkedMaterials, setCheckedMaterials] = useState<
    Record<number, MaterialCheckState>
  >({});
  const [odometer, setOdometer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          selfie.length >= 1 &&
          !!selfieMeta?.capturedAt &&
          !!selfieMeta?.location &&
          !isFetchingLocation
        );
      case 1:
        return (
          !isShiftLoading && materials.length > 0 && allRequiredMaterialsChecked
        );
      case 2:
        return odometer.length > 0 && Number.parseFloat(odometer) > 0;
      default:
        return false;
    }
  };

  useEffect(() => {
    if (!todayAttendance || !todayAttendance.materials?.length) {
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

  useEffect(() => {
    if (selfie.length === 0) {
      setSelfieMeta(null);
    }
  }, [selfie]);

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
        setSelfie((prev) => prev.filter((img) => img !== dataUrl));
        setSelfieMeta(null);
        await requestLocationPermission();
      } finally {
        setIsFetchingLocation(false);
      }
    },
    [getCurrentLocation, requestLocationPermission, t]
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

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (!selfie[0]) {
        toast.error(t("checkIn.selfieDescription"));
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

      const selectedMaterials: CaptainCheckInMaterialInput[] = Object.entries(
        checkedMaterials
      )
        .filter(([, state]) => state.checked)
        .map(([id, state]) => {
          const materialId = Number(id);
          const material = materialsMap.get(materialId);
          const fallbackQuantity = material?.minimumQuantity ?? 0;
          const quantity = state.quantity ?? fallbackQuantity;

          return {
            material_id: materialId,
            quantity_reported: quantity,
            is_missing: false,
          };
        })
        .filter(
          (material) =>
            material.quantity_reported !== undefined &&
            material.quantity_reported > 0
        );

      if (selectedMaterials.length === 0) {
        toast.error(t("checkIn.materialsChecklist"));
        setIsSubmitting(false);
        return;
      }

      const deviceMetadata: Record<string, string> = { source: "captain-web" };
      if (typeof navigator !== "undefined") {
        if (navigator.userAgent) {
          deviceMetadata.user_agent = navigator.userAgent;
        }
        if (navigator.platform) {
          deviceMetadata.platform = navigator.platform;
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
        selfie: selfie[0],
        start_odometer: odometer ? Number.parseFloat(odometer) : undefined,
        materials: selectedMaterials,
        metadata,
      };

      const result = await checkIn(payload);

      if (!result.success) {
        toast.error(result.message || t("common.error"));
        return;
      }

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
              {t("common.loading").replace("...", "")} {currentStep + 1} /{" "}
              {steps.length}
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

              <ImageUploader
                images={selfie}
                onImagesChange={setSelfie}
                minImages={1}
                maxImages={1}
                cameraOnly={true}
                label="Capture Selfie"
                onImageCaptured={handleSelfieCaptured}
              />

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
                      time: new Date(selfieMeta.capturedAt).toLocaleString(),
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
                <div className="space-y-2">
                  <label
                    htmlFor="odometer-input"
                    className="text-sm font-medium text-foreground"
                  >
                    Current Odometer Reading (km)
                  </label>
                  <Input
                    id="odometer-input"
                    type="number"
                    placeholder="e.g., 45678"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="text-lg h-14 text-center font-semibold"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the exact reading shown on your vehicle&apos;s
                    odometer
                  </p>
                </div>
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
