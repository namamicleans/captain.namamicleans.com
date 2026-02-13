"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CaptainProvider } from "@/context/CaptainContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BottomNav } from "@/components/captain/BottomNav";
import { TokenRefreshMonitor } from "@/components/shared/TokenRefreshMonitor";
import "@/i18n";

import type { ServerActionResponse } from "@/types/generic";
import type { CaptainActions } from "@/context/CaptainContext";
import type { UserResponse } from "@/types/auth";

type ProvidersProps = {
  children: ReactNode;
  refreshSession: () => Promise<ServerActionResponse<{ refreshed: boolean }>>;
  invalidateSession: () => Promise<ServerActionResponse<null>>;
  captainActions: CaptainActions;
  initialUser: UserResponse["user"] | null;
};

const queryClient = new QueryClient();

export function Providers({ children, refreshSession, invalidateSession, captainActions, initialUser }: Readonly<ProvidersProps>) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CaptainProvider actions={captainActions} initialUser={initialUser}>
          <Toaster />
          <Sonner />
          <TokenRefreshMonitor refreshSession={refreshSession} invalidateSession={invalidateSession} />
          {children}
          <BottomNav />
        </CaptainProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
