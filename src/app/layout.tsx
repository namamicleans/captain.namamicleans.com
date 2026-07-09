import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shared/providers";
import { ThemeColorSync } from "@/components/shared/ThemeColorSync";
import DevBanner from "@/components/DevBanner";
import {
  getSession,
  invalidateSession,
  refreshSessionIfNeeded,
} from "@core/auth";
import {
  completeCaptainJobExecution,
  createCaptainLeaveDraft,
  getCaptainShiftSummary,
  getCaptainJobs,
  getCaptainJobExecution,
  getCaptainLeaveBalance,
  getCaptainLeaveDetail,
  getCaptainLeaves,
  getCaptainTimesheet,
  saveJobExecutionProgress,
  startCaptainJobExecution,
  submitCaptainCheckIn,
  submitCaptainCheckOut,
  submitCaptainLeave,
  withdrawCaptainLeave,
} from "@core/captain";

export const metadata: Metadata = {
  title: "Namami Captain",
  description: "Captain dashboard for on-demand cleaning services",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // black-translucent → status bar transparent, overlaid on content.
    // The green header bleeds edge-to-edge on iOS instead of hitting an
    // opaque white bar. Requires pt-safe on the header to clear the overlay.
    statusBarStyle: "black-translucent",
    title: "Namami Captain",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Matches the captain primary green so Android status bar / browser chrome
  // blends with the header instead of showing a mismatched sky-blue band.
  themeColor: "#047857",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="Namami Captain" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Namami Captain" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#047857" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=no" />

        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#047857" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body>
        {/*
          Status-bar shelf — sits behind the transparent iOS black-translucent
          status bar. Height = env(safe-area-inset-top) so it fills exactly the
          notch/Dynamic-Island zone. ThemeColorSync changes its backgroundColor
          on every route transition, giving white icons a coloured background to
          sit on regardless of the page's own header colour.
          On devices with no safe-area inset (non-notched / Android) this div
          collapses to 0 height and is invisible.
        */}
        <div
          id="status-bar-shelf"
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "env(safe-area-inset-top, 0px)",
            backgroundColor: "#047857",
            transition: "background-color 300ms ease",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        />
        <ThemeColorSync />
        <DevBanner />
        <Providers
          initialUser={session?.user || null}
          refreshSession={refreshSessionIfNeeded}
          invalidateSession={invalidateSession}
          captainActions={{
            fetchShiftSummary: getCaptainShiftSummary,
            checkIn: submitCaptainCheckIn,
            checkOut: submitCaptainCheckOut,
            fetchJobs: getCaptainJobs,
            startJobExecution: startCaptainJobExecution,
            completeJobExecution: completeCaptainJobExecution,
            getJobExecution: getCaptainJobExecution,
            saveJobExecutionProgress,
            fetchLeaveBalance: getCaptainLeaveBalance,
            fetchLeaves: getCaptainLeaves,
            createLeaveDraft: createCaptainLeaveDraft,
            getLeaveDetail: getCaptainLeaveDetail,
            submitLeave: submitCaptainLeave,
            withdrawLeave: withdrawCaptainLeave,
            fetchTimesheet: getCaptainTimesheet,
          }}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
