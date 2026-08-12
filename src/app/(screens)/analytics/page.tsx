"use client";

import { useTranslation } from "react-i18next";

import { CaptainTimesheetPanel } from "@/components/captain/CaptainTimesheetPanel";
import { LeaveManagementPanel } from "@/components/captain/LeaveManagementPanel";
import { PayslipsPanel } from "@/components/captain/PayslipsPanel";
import { TravelStatsPanel } from "@/components/captain/TravelStatsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AnalyticsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="p-4 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-foreground">{t("analytics.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="insights">{t("analytics.sections.insights")}</TabsTrigger>
            <TabsTrigger value="leave">{t("analytics.sections.leave")}</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4 mt-4">
            <Tabs defaultValue="earnings" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="earnings">{t("analytics.earnings")}</TabsTrigger>
                <TabsTrigger value="attendance">{t("analytics.attendance")}</TabsTrigger>
                <TabsTrigger value="travel">{t("analytics.travel")}</TabsTrigger>
              </TabsList>

              <TabsContent value="earnings" className="space-y-4 mt-4">
                <PayslipsPanel />
              </TabsContent>

              <TabsContent value="attendance" className="space-y-4 mt-4">
                <CaptainTimesheetPanel />
              </TabsContent>

              <TabsContent value="travel" className="space-y-4 mt-4">
                <TravelStatsPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="leave" className="space-y-4 mt-4">
            <LeaveManagementPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
