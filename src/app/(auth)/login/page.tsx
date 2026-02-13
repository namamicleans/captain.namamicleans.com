"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { getOTP, verifyOTP, logout } from "@core/auth";

type Step = "phone" | "otp";

const RESEND_COOLDOWN = 30;

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatPhone = useCallback((value: string) => {
    const digits = value.replaceAll(/\D/g, "");
    return digits.slice(0, 10);
  }, []);

  const buildPhonePayload = useCallback((value: string) => {
    if (value.startsWith("+")) {
      return value;
    }
    return `+91${value}`;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startResendTimer = useCallback(() => {
    clearTimer();
    setResendTimer(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(event.target.value));
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSending(true);
    try {
      const response = await getOTP(buildPhonePayload(phone));
      if (!response.success) {
        toast.error(response.message || "Failed to send OTP");
        return;
      }

      toast.success("OTP sent successfully");
      setStep("otp");
      startResendTimer();
    } catch (error) {
      console.error("OTP send error", error);
      toast.error("Something went wrong while sending OTP");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await verifyOTP(buildPhonePayload(phone), otp);
      if (!response.success || !response.data) {
        toast.error(response.message || "Failed to verify OTP");
        return;
      }

      if ((response.data.user.role || "").toLowerCase() !== "captain") {
        await logout();
        toast.error("Please login using your captain account");
        setStep("phone");
        setOtp("");
        clearTimer();
        setResendTimer(0);
        return;
      }

      toast.success("Login successful");
      clearTimer();
      const next = searchParams.get("next");
      router.replace(next || "/");
    } catch (error) {
      console.error("OTP verification error", error);
      toast.error("Something went wrong while verifying OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || phone.length !== 10) {
      return;
    }

    setIsResending(true);
    try {
      const response = await getOTP(buildPhonePayload(phone));
      if (!response.success) {
        toast.error(response.message || "Failed to resend OTP");
        return;
      }

      toast.success("OTP resent successfully");
      startResendTimer();
    } catch (error) {
      console.error("OTP resend error", error);
      toast.error("Something went wrong while resending OTP");
    } finally {
      setIsResending(false);
    }
  };

  const renderResendLabel = () => {
    if (isResending) {
      return (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span>Resending...</span>
        </div>
      );
    }

    if (resendTimer > 0) {
      return `Resend in ${resendTimer}s`;
    }

    return "Resend OTP";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 pt-safe">
        <div className="p-6 pb-12">
          {step === "otp" && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 -ml-2 mb-4"
              onClick={() => {
                setStep("phone");
                setOtp("");
                clearTimer();
                setResendTimer(0);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center">
              <Image src="/logo.png" alt="Logo" width={30} height={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">
                Namami Cleans
              </h1>
              <p className="text-primary-foreground/80">App for Namamians</p>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-primary-foreground">
              {step === "phone" ? "Welcome back!" : "Verify OTP"}
            </h2>
            <p className="text-primary-foreground/80">
              {step === "phone"
                ? "Enter your mobile number to continue"
                : `Enter the 6-digit code sent to +91 ${phone}`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 -mt-6 rounded-t-3xl bg-background relative">
        <div className="p-6 max-w-lg mx-auto">
          {step === "phone" ? (
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="phone-input" className="text-sm font-medium text-foreground">
                  Mobile Number
                </label>
                <div className="flex">
                  <div className="flex items-center px-4 bg-muted border border-r-0 border-input rounded-l-lg">
                    <span className="text-muted-foreground font-medium">
                      +91
                    </span>
                  </div>
                  <Input
                    id="phone-input"
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="rounded-l-none text-lg h-12"
                    maxLength={10}
                  />
                </div>
              </div>

              <Button
                className="w-full h-12 text-lg"
                onClick={handleSendOtp}
                disabled={phone.length !== 10 || isSending}
              >
                {isSending ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span>Sending OTP...</span>
                  </div>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>By continuing, you agree to our</p>
                <p>
                  <button className="text-primary font-medium">
                    Terms of Service
                  </button>
                  {" & "}
                  <button className="text-primary font-medium">
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  className="gap-2"
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-14 w-12 text-xl font-semibold rounded-lg border-2"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full h-12 text-lg"
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || isVerifying}
              >
                {isVerifying ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Didn&apos;t receive the code?
                </p>
                <Button
                  variant="ghost"
                  className="text-primary font-medium"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isResending}
                >
                  {renderResendLabel()}
                </Button>
              </div>
            </div>
          )}

          {/* Features */}
          {/* <div className="mt-8 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Secure Login</p>
                <p className="text-sm text-muted-foreground">Your data is protected</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Quick Access</p>
                <p className="text-sm text-muted-foreground">Login in seconds with OTP</p>
              </div>
            </div>
          </div> */}

          {/* Trust badge */}
          <div className="sticky bottom-10 text-center">
            <p className="text-sm text-muted-foreground">
              Trusted by{" "}
              <span className="font-semibold text-foreground">100+</span>{" "}
              captains
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
