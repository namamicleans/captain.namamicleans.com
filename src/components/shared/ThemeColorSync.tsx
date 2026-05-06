"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Hex colors that match each section's header background.
// GREEN = captain primary (#047857 ≈ emerald-700 = hsl(161 93% 30%))
// CARD  = card background (#fafafa = hsl(0 0% 98%))
const GREEN = "#047857";
const CARD = "#fafafa";

// Routes whose header is a green gradient — everything else is card/white.
const GREEN_ROUTES = new Set(["/", "/profile", "/login"]);

function resolveColor(pathname: string): string {
  return GREEN_ROUTES.has(pathname) ? GREEN : CARD;
}

/**
 * Keeps the Android `theme-color` meta and the iOS status-bar shelf in sync
 * with the current page's header colour.
 *
 * Android: updates <meta name="theme-color"> → browser chrome changes colour.
 * iOS PWA: updates #status-bar-shelf backgroundColor → the fixed div behind
 *          the transparent black-translucent status bar shows the right colour.
 */
export function ThemeColorSync() {
  const pathname = usePathname();

  useEffect(() => {
    const color = resolveColor(pathname);

    // Android — browser chrome / PWA status bar
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (meta) meta.content = color;

    // iOS — shelf element (transition is set as inline style on the element)
    const shelf = document.getElementById("status-bar-shelf");
    if (shelf) shelf.style.backgroundColor = color;
  }, [pathname]);

  return null;
}
