import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shared/providers";
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
    statusBarStyle: "default",
    title: "Namami Captain",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c4a6e" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
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
