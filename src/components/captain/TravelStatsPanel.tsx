"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Car, Route } from "lucide-react";

import { useCaptain } from "@/context/CaptainContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

function toDateInputString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Real total distance for the current month, from the same odometer
 * readings the attendance calendar's shift data already carries —
 * mirrors the backend's own distance calc (get_monthly_attendance):
 * only counts a shift when both readings are present and the diff isn't
 * negative (a negative diff is a data-entry error, not travel). */
function sumMonthlyDistance(
  shifts: { startOdometer: number | null; endOdometer: number | null }[]
): number {
  let total = 0;
  for (const shift of shifts) {
    if (shift.startOdometer != null && shift.endOdometer != null) {
      const distance = shift.endOdometer - shift.startOdometer;
      if (distance >= 0) {
        total += distance;
      }
    }
  }
  return Math.round(total * 100) / 100;
}

export function TravelStatsPanel() {
  const { t } = useTranslation();
  const { fetchTimesheet, fetchJobs } = useCaptain();

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(
    () => toDateInputString(new Date(now.getFullYear(), now.getMonth(), 1)),
    [now]
  );
  const monthEnd = useMemo(
    () => toDateInputString(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    [now]
  );

  // Same queryKey shape as CaptainTimesheetPanel would use for this exact
  // range — when both tabs are viewing the current month, react-query
  // serves this from cache instead of firing a second request.
  const timesheetQuery = useQuery({
    queryKey: ["captain-timesheet", monthStart, monthEnd],
    queryFn: () => fetchTimesheet({ startDate: monthStart, endDate: monthEnd }),
  });

  const jobsQuery = useQuery({
    queryKey: ["captain-jobs", "completed", monthStart, monthEnd],
    queryFn: () =>
      fetchJobs({
        startDate: monthStart,
        endDate: monthEnd,
        status: "completed",
        pageSize: 200,
      }),
  });

  const isLoading = timesheetQuery.isPending || jobsQuery.isPending;

  const totalKm = useMemo(() => {
    const shifts = timesheetQuery.data?.success
      ? timesheetQuery.data.data?.shifts ?? []
      : [];
    return sumMonthlyDistance(shifts);
  }, [timesheetQuery.data]);

  const jobsCompleted = jobsQuery.data?.success
    ? jobsQuery.data.data?.length ?? 0
    : 0;

  const avgDistancePerJob = jobsCompleted > 0 ? totalKm / jobsCompleted : null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Spinner size="sm" />
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex flex-col items-center">
            <Car className="h-8 w-8 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{totalKm.toLocaleString("en-IN")} km</p>
            <p className="text-xs text-muted-foreground">{t("analytics.totalDistance")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center">
            <Route className="h-8 w-8 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{jobsCompleted}</p>
            <p className="text-xs text-muted-foreground">{t("analytics.jobsCompleted")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t("analytics.monthStats")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">{t("analytics.avgDistancePerJob")}</span>
            <span className="font-medium text-foreground">
              {avgDistancePerJob != null ? `${avgDistancePerJob.toFixed(1)} km` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
