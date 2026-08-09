"use client";

import { useEffect, useRef } from "react";

/**
 * next-pwa is configured with skipWaiting: true, so a new service worker
 * takes over network requests the instant it installs — it does NOT wait
 * for every open tab to close first. Without this listener, an
 * already-open tab keeps running its original in-memory JS (React tree,
 * context modules, component chunks) while any *new* chunk it fetches
 * (client-side navigation, a lazy import) comes back from the new SW/
 * build instead. Since every deploy renames chunk files by content hash,
 * mixing an old in-memory module graph with newly-fetched chunks produces
 * duplicate/mismatched module instances — the same React context object
 * created twice, hook order drift, etc. That's the exact signature behind
 * this app's recurring "useCaptain must be used within a CaptainProvider"
 * and minified React errors: not a real provider-nesting bug, but a stale
 * tab left running across a deploy.
 *
 * The fix is the standard companion to skipWaiting: reload once the new
 * service worker actually takes control, so the tab is never left running
 * a stale module graph against fresh assets.
 */
export function ServiceWorkerUpdateReload() {
  const reloading = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleControllerChange = () => {
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
