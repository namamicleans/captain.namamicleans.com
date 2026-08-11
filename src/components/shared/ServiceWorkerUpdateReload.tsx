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
 *
 * `controllerchange` alone only fires for a tab that's actively around
 * (foregrounded, network-connected) when the browser gets around to
 * checking for an update — which it does on its own schedule, not
 * instantly. A captain's installed PWA left backgrounded/dormant across a
 * deploy won't have run that check by the time they reopen it hours
 * later, so it can resume with the same stale-module-graph problem before
 * `controllerchange` ever fires. Closing that gap: proactively ask the
 * registration to check for an update whenever the app becomes visible or
 * focused again (and once on mount) — if a new worker is actually out
 * there, `skipWaiting` takes it live and `controllerchange` below fires
 * and reloads, same as the already-open-tab case.
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

    const checkForUpdate = () => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        registration?.update().catch(() => {
          // Offline or a transient network hiccup — the next visibility/focus
          // trigger will simply retry, nothing to surface here.
        });
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };

    // iOS standalone PWAs are the gap `visibilitychange`/`focus` don't
    // reliably cover: the OS can suspend and later resume the webview
    // without firing either. `pageshow` does fire on that resume — with
    // `event.persisted` true when it's a bfcache restore of the exact
    // stale module graph this listener exists to catch.
    const handlePageShow = () => checkForUpdate();

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("pageshow", handlePageShow);
    checkForUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
