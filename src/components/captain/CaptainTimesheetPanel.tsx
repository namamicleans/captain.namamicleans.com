"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { useCaptain } from "@/context/CaptainContext";
import {
  AttendanceCalendar,
  type AttendanceCalendarStatus,
} from "@/components/captain/AttendanceCalendar";
import type { CaptainTimesheet } from "@/types/captain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type DayStatusType = "leave" | "worked" | "noShow";

type DayStatusItem = {
  kind: DayStatusType;
  badgeLabel: string;
};

type TranslateFn = TFunction;

const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function toDateInputString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateOnly(value: string): string | null {
  if (!value) {
    return null;
  }
  const [datePart] = value.split("T");
  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return null;
  }
  return datePart;
}

function parseDateOnly(value: string): Date | null {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) {
    return null;
  }
  const parsed = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function parseTimeToMinutes(value: string | null): number | null {
  if (!value) {
    return null;
  }

  let timeStr = value.trim();

  // Handle ISO datetime strings: extract time portion after T or space
  const separatorIdx = timeStr.search(/[T ]/);
  if (separatorIdx !== -1) {
    timeStr = timeStr.slice(separatorIdx + 1);
  }

  // Strip timezone suffix: +HH:MM, -HH:MM, Z
  timeStr = timeStr.replace(/[+-]\d{2}:\d{2}$/, "").replace(/Z$/i, "");

  const match = TIME_PATTERN.exec(timeStr);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  return hours * 60 + minutes + seconds / 60;
}

function getHourBandKey(hoursWorked: number):
  | "h0to3"
  | "h3to5"
  | "h5to7"
  | "h7to9"
  | "h9plus" {
  if (hoursWorked < 3) {
    return "h0to3";
  }
  if (hoursWorked < 5) {
    return "h3to5";
  }
  if (hoursWorked < 7) {
    return "h5to7";
  }
  if (hoursWorked < 9) {
    return "h7to9";
  }
  return "h9plus";
}

function getDateRange(startDate: string, endDate: string): {
  start: Date;
  end: Date;
} | null {
  const rangeStart = parseDateOnly(startDate);
  const rangeEnd = parseDateOnly(endDate);

  if (!rangeStart || !rangeEnd || rangeStart.getTime() > rangeEnd.getTime()) {
    return null;
  }

  return { start: rangeStart, end: rangeEnd };
}

function isDateInPast(dateStr: string): boolean {
  const date = parseDateOnly(dateStr);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date.getTime() < today.getTime();
}

function getAllDatesInRange(rangeStart: Date, rangeEnd: Date): string[] {
  const allDates: string[] = [];
  const cursor = new Date(rangeStart);

  while (cursor.getTime() <= rangeEnd.getTime()) {
    allDates.push(toDateInputString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return allDates;
}

function buildShiftByDateMap(shifts: CaptainTimesheet["shifts"]): Map<string, CaptainTimesheet["shifts"][number]> {
  const shiftByDate = new Map<string, CaptainTimesheet["shifts"][number]>();

  for (const shift of shifts) {
    const shiftDate = toDateOnly(shift.shiftDate);
    if (!shiftDate || shiftByDate.has(shiftDate)) {
      continue;
    }
    shiftByDate.set(shiftDate, shift);
  }

  return shiftByDate;
}

function buildLeaveByDateMap(
  leaves: CaptainTimesheet["leave_requests"],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, CaptainTimesheet["leave_requests"][number]> {
  const leaveByDate = new Map<string, CaptainTimesheet["leave_requests"][number]>();

  for (const leave of leaves) {
    // Matches the backend's rule (get_monthly_attendance filters on
    // StatusChoices.APPROVED): a pending/rejected/withdrawn request was
    // never actually leave, so it must not paint the calendar day.
    if (leave.status !== "approved") {
      continue;
    }

    const leaveStart = parseDateOnly(leave.start_date);
    const leaveEnd = parseDateOnly(leave.end_date);
    if (!leaveStart || !leaveEnd || leaveStart.getTime() > leaveEnd.getTime()) {
      continue;
    }

    const overlapStart = leaveStart.getTime() > rangeStart.getTime() ? leaveStart : rangeStart;
    const overlapEnd = leaveEnd.getTime() < rangeEnd.getTime() ? leaveEnd : rangeEnd;
    if (overlapStart.getTime() > overlapEnd.getTime()) {
      continue;
    }

    const leaveCursor = new Date(overlapStart);
    while (leaveCursor.getTime() <= overlapEnd.getTime()) {
      const leaveDate = toDateInputString(leaveCursor);
      if (!leaveByDate.has(leaveDate)) {
        leaveByDate.set(leaveDate, leave);
      }
      leaveCursor.setDate(leaveCursor.getDate() + 1);
    }
  }

  return leaveByDate;
}

function buildLeaveDayItem(
  _date: string,
  _leave: CaptainTimesheet["leave_requests"][number],
  t: TranslateFn
): DayStatusItem {
  return {
    kind: "leave",
    badgeLabel: t("leaves.timesheet.labels.leave"),
  };
}

function buildWorkedOrNoShowDayItem(
  date: string,
  shift: CaptainTimesheet["shifts"][number] | undefined,
  t: TranslateFn
): DayStatusItem | null {
  // Matches the backend's own rule (get_monthly_attendance): a day counts
  // as worked based on the shift's `status`, not on whether checkInTime
  // happens to parse as a time string — the status field is the source
  // of truth and is always set correctly even if a time field is
  // malformed/differently-formatted, so deriving "worked" from parsing
  // could disagree with what admin shows for the same day.
  if (shift && (shift.status === "checked_in" || shift.status === "checked_out")) {
    const checkInMinutes = parseTimeToMinutes(shift.checkInTime ?? null);
    const checkOutMinutes = parseTimeToMinutes(shift.checkOutTime ?? null);

    if (checkInMinutes !== null && checkOutMinutes !== null && checkOutMinutes > checkInMinutes) {
      // Full shift with both check-in and check-out — show hour band
      const workedHours = (checkOutMinutes - checkInMinutes) / 60;
      const hourBandKey = getHourBandKey(workedHours);
      return {
        kind: "worked",
        badgeLabel: t(`leaves.timesheet.hourBands.${hourBandKey}`),
      };
    }

    // Checked in but no valid check-out (or times didn't parse) — still
    // present per status, use the generic label.
    return {
      kind: "worked",
      badgeLabel: t("leaves.timesheet.labels.worked"),
    };
  }

  // No shift, or a shift stuck at "pending" (started but never checked
  // in) — treat as no-show for past dates.
  if (isDateInPast(date)) {
    return {
      kind: "noShow",
      badgeLabel: t("leaves.timesheet.labels.noShow"),
    };
  }

  // Today/future dates with no confirmed shift remain blank.
  return null;
}

function buildTimelineRows(
  timesheet: CaptainTimesheet,
  startDate: string,
  endDate: string,
  t: TranslateFn
): Map<string, DayStatusItem> {
  const rows = new Map<string, DayStatusItem>();
  const dateRange = getDateRange(startDate, endDate);

  if (!dateRange) {
    return rows;
  }

  const allDates = getAllDatesInRange(dateRange.start, dateRange.end);
  const shiftByDate = buildShiftByDateMap(timesheet.shifts ?? []);
  const leaveByDate = buildLeaveByDateMap(
    timesheet.leave_requests ?? [],
    dateRange.start,
    dateRange.end
  );

  for (const date of allDates) {
    // Matches the backend's priority (get_monthly_attendance): actually
    // having worked the day outranks an approved leave record for it —
    // e.g. leave was approved but the captain ended up checking in
    // anyway. Only fall back to leave, then no-show/blank, once "worked"
    // is ruled out.
    const dayItem = buildWorkedOrNoShowDayItem(date, shiftByDate.get(date), t);
    if (dayItem?.kind === "worked") {
      rows.set(date, dayItem);
      continue;
    }

    const leave = leaveByDate.get(date);
    if (leave) {
      rows.set(date, buildLeaveDayItem(date, leave, t));
      continue;
    }

    if (dayItem) {  // Only add if not null
      rows.set(date, dayItem);
    }
  }

  return rows;
}

export function CaptainTimesheetPanel() {
  const { t } = useTranslation();
  const { fetchTimesheet } = useCaptain();

  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const timesheetStartDate = useMemo(
    () => toDateInputString(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)),
    [visibleMonth]
  );
  const timesheetEndDate = useMemo(
    () =>
      toDateInputString(
        new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0)
      ),
    [visibleMonth]
  );

  const timesheetQuery = useQuery({
    queryKey: ["captain-timesheet", timesheetStartDate, timesheetEndDate],
    queryFn: () =>
      fetchTimesheet({
        startDate: timesheetStartDate,
        endDate: timesheetEndDate,
      }),
  });

  const timelineByDate = useMemo(() => {
    const response = timesheetQuery.data;
    const timesheet = response?.data;
    if (!response?.success || !timesheet) {
      return new Map<string, DayStatusItem>();
    }

    return buildTimelineRows(timesheet, timesheetStartDate, timesheetEndDate, t);
  }, [
    timesheetEndDate,
    timesheetQuery.data,
    timesheetStartDate,
    t,
  ]);

  const calendarStatusByDate = useMemo<Record<string, AttendanceCalendarStatus>>(() => {
    const statusByDate: Record<string, AttendanceCalendarStatus> = {};
    timelineByDate.forEach((item, date) => {
      statusByDate[date] = item.kind;
    });
    return statusByDate;
  }, [timelineByDate]);

  const calendarLabelByDate = useMemo<Record<string, string>>(() => {
    const labelByDate: Record<string, string> = {};
    timelineByDate.forEach((item, date) => {
      labelByDate[date] = item.badgeLabel;
    });
    return labelByDate;
  }, [timelineByDate]);

  const handleMonthChange = (nextMonth: Date) => {
    const normalizedMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    setVisibleMonth(normalizedMonth);
  };

  const resolvedBackendErrorMessage = useMemo(() => {
    if (timesheetQuery.isPending || timesheetQuery.isError) {
      return null;
    }

    if (!timesheetQuery.data || timesheetQuery.data.success) {
      return null;
    }

    return timesheetQuery.data.message || t("leaves.timesheet.loadError");
  }, [
    t,
    timesheetQuery.data,
    timesheetQuery.isError,
    timesheetQuery.isPending,
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("leaves.timesheet.calendarTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AttendanceCalendar
            visibleMonth={visibleMonth}
            dayStatusByDate={calendarStatusByDate}
            dayLabelByDate={calendarLabelByDate}
            labels={{
              leave: t("leaves.timesheet.labels.leave"),
              worked: t("leaves.timesheet.labels.worked"),
              noShow: t("leaves.timesheet.labels.noShow"),
            }}
            disableFutureMonth
            onMonthChange={handleMonthChange}
          />

          {timesheetQuery.isPending && (
            <div className="flex items-center gap-2 text-muted-foreground py-2 justify-center">
              <Spinner size="sm" />
              <span>{t("common.loading")}</span>
            </div>
          )}

          {timesheetQuery.isError && (
            <p className="text-sm text-destructive">{t("leaves.timesheet.loadError")}</p>
          )}

          {resolvedBackendErrorMessage && (
            <p className="text-sm text-destructive">{resolvedBackendErrorMessage}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}