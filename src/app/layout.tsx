import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shared/providers";
import {
  getSession,
  invalidateSession,
  refreshSessionIfNeeded,
} from "@core/auth";
import {
  getCaptainShiftSummary,
  getCaptainJobs,
  submitCaptainCheckIn,
  submitCaptainCheckOut,
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
          }}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
