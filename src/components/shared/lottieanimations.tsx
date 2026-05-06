"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

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

export function CheckinAnimation() {
  const mounted = useMounted();
  if (!mounted) {
    return <div className="h-16 w-16 rounded-full bg-primary/10 animate-pulse" aria-hidden="true" />;
  }
  return (
    <div className="h-16 w-16" aria-hidden="true">
      <DotLottieReact src="/checkin.lottie" loop autoplay />
    </div>
  );
}
