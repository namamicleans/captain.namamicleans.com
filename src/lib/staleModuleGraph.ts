/**
 * Signatures of a stale in-memory module graph left running across a
 * deploy (see ServiceWorkerUpdateReload.tsx for the root cause): an
 * already-open tab keeps its original React/context module instances
 * while fetching newly-hashed chunks or talking to a redeployed server,
 * producing errors that look unrelated but share one cause. Kept as an
 * explicit whitelist, not a broad heuristic, so a genuinely new error
 * is never silently swallowed by an auto-reload.
 */
const STALE_MODULE_GRAPH_PATTERNS = [
  /must be used within a .*Provider/, // duplicate context module instance
  /Minified React error #310/, // hook order drift across duplicate React instances
  /insertBefore.*not a child of this node/, // DOM built by one React instance, patched by another
  /Server Action "[a-f0-9]+" was not found on the server/, // client holds an action id from an old build
];

export function isStaleModuleGraphError(message: string | undefined | null): boolean {
  if (!message) return false;
  return STALE_MODULE_GRAPH_PATTERNS.some((pattern) => pattern.test(message));
}

const RELOAD_GUARD_KEY = "namami-captain-stale-graph-reload";

/**
 * A plain `location.reload()` is not enough here: this app is a PWA with
 * skipWaiting, and a reload just re-fetches through the *same* stale
 * service worker cache that produced the error in the first place —
 * confirmed live, where a stale-graph crash on a fresh PWA launch
 * (before any visibilitychange/focus/pageshow update-check had a chance
 * to run) auto-reloaded straight into the identical error a second
 * time. Force an update check and, if a new worker is actually waiting,
 * wait for it to activate before reloading — that's what makes the
 * reload actually fetch fresh code instead of the same stale bundle.
 */
async function forceFreshReload(): Promise<void> {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        const newWorker = registration.waiting || registration.installing;
        if (newWorker && newWorker.state !== "activated") {
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, 3000);
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                clearTimeout(timeout);
                resolve();
              }
            });
          });
        }
      }
    } catch {
      // Best-effort — a failed update check shouldn't block the reload.
    }
  }

  window.location.reload();
}

/** Reloads once per session on a confirmed stale-graph signature; a no-op every other time. */
export function reloadOnceIfStaleModuleGraph(message: string | undefined | null): void {
  if (typeof window === "undefined") return;
  if (!isStaleModuleGraphError(message)) return;
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;

  sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  void forceFreshReload();
}
