"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/shared/utils";

const DotLottieReact = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then((m) => ({
      default: m.DotLottieReact,
    })),
  { ssr: false }
);

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface CheckinAnimationProps {
  className?: string;
}

export function CheckinAnimation({ className }: CheckinAnimationProps) {
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div
        className={cn(
          "mx-auto h-48 w-48 rounded-full bg-primary/10 animate-pulse sm:h-56 sm:w-56",
          className,
        )}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cn(
        "mx-auto flex h-48 w-48 items-center justify-center overflow-hidden sm:h-56 sm:w-56",
        className,
      )}
      aria-hidden="true"
    >
      <DotLottieReact
        src="/checkin.lottie"
        loop
        autoplay
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
