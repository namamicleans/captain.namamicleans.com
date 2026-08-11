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

/** Reloads once per session on a confirmed stale-graph signature; a no-op every other time. */
export function reloadOnceIfStaleModuleGraph(message: string | undefined | null): void {
  if (typeof window === "undefined") return;
  if (!isStaleModuleGraphError(message)) return;
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;

  sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  window.location.reload();
}
