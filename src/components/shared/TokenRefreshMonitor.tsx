"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ServerActionResponse } from "@/types/generic";

type RefreshPayload = { refreshed: boolean };

type TokenRefreshMonitorProps = {
  refreshSession: () => Promise<ServerActionResponse<RefreshPayload>>;
  invalidateSession: () => Promise<ServerActionResponse<null>>;
};

const INITIAL_CHECK_DELAY_MS = 5_000;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function TokenRefreshMonitor({
  refreshSession,
  invalidateSession,
}: TokenRefreshMonitorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isCheckingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleSessionExpiry = useCallback(async () => {
    clearTimers();
    try {
      await invalidateSession();
    } catch (error) {
      console.error("Failed to invalidate session", error);
    }

    if (pathname !== "/login") {
      const searchParams = new URLSearchParams();
      if (pathname) {
        searchParams.set("next", pathname);
      }
      const target = searchParams.size > 0 ? `/login?${searchParams.toString()}` : "/login";
      router.replace(target);
    }
  }, [clearTimers, invalidateSession, pathname, router]);

  const runRefreshCheck = useCallback(async () => {
    if (isCheckingRef.current) {
      return;
    }
    isCheckingRef.current = true;

    try {
      const result = await refreshSession();

      if (!result.success) {
        // Treat missing or expired sessions as sign-out conditions
        if (
          result.code === "NO_SESSION" ||
          result.code === "SESSION_EXPIRED" ||
          result.code === "SESSION_REFRESH_FAILED" ||
          result.code === "NO_REFRESH_TOKEN"
        ) {
          await handleSessionExpiry();
        }
      }
    } catch (error) {
      console.error("Token refresh check failed", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [handleSessionExpiry, refreshSession]);

  useEffect(() => {
    timeoutRef.current = setTimeout(runRefreshCheck, INITIAL_CHECK_DELAY_MS);
    intervalRef.current = setInterval(runRefreshCheck, REFRESH_INTERVAL_MS);

    return () => {
      clearTimers();
    };
  }, [clearTimers, runRefreshCheck]);

  return null;
}
