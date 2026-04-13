"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@shared/utils";

import { Button } from "@/components/ui/button";

export type AttendanceCalendarStatus = "leave" | "worked" | "noShow";

type AttendanceCalendarProps = {
  visibleMonth: Date;
  dayStatusByDate: Record<string, AttendanceCalendarStatus>;
  dayLabelByDate: Record<string, string>;
  labels: {
    leave: string;
    worked: string;
    noShow: string;
  };
  disableFutureMonth?: boolean;
  onMonthChange: (nextMonth: Date) => void;
};

function toDateInputString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const statusClasses: Record<AttendanceCalendarStatus, string> = {
  leave: "bg-primary/15 text-primary border-primary/30",
  worked: "bg-emerald-100 text-emerald-700 border-emerald-200",
  noShow: "bg-destructive/10 text-destructive border-destructive/20",
};

export function AttendanceCalendar({
  visibleMonth,
  dayStatusByDate,
  dayLabelByDate,
  labels,
  disableFutureMonth = false,
  onMonthChange,
}: Readonly<AttendanceCalendarProps>) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthName = visibleMonth.toLocaleString("default", { month: "long" });

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [month, year]);
  const firstDayOfMonth = useMemo(() => new Date(year, month, 1).getDay(), [month, year]);

  const canGoNext = useMemo(() => {
    if (!disableFutureMonth) {
      return true;
    }
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonthStart = new Date(year, month + 1, 1);
    return nextMonthStart.getTime() <= currentMonthStart.getTime();
  }, [disableFutureMonth, month, year]);

  const counts = useMemo(() => {
    let leave = 0;
    let worked = 0;
    let noShow = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toDateInputString(new Date(year, month, day));
      const status = dayStatusByDate[key];

      if (status === "leave") {
        leave += 1;
      } else if (status === "worked") {
        worked += 1;
      } else if (status === "noShow") {
        noShow += 1;
      }
    }

    return { leave, worked, noShow };
  }, [dayStatusByDate, daysInMonth, month, year]);

  const leadingEmptyCellKeys = useMemo(
    () =>
      Array.from(
        { length: firstDayOfMonth },
        (_, dayOffset) => `${year}-${month + 1}-empty-${dayOffset + 1}`
      ),
    [firstDayOfMonth, month, year]
  );

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    if (!canGoNext) {
      return;
    }
    onMonthChange(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="font-semibold text-foreground">
          {monthName} {year}
        </h3>
        <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={!canGoNext}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((weekday, index) => (
          <div key={`${weekday}-${index}`} className="text-xs font-medium text-muted-foreground py-2">
            {weekday}
          </div>
        ))}

        {leadingEmptyCellKeys.map((emptyKey) => (
          <div key={emptyKey} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = new Date(year, month, day);
          const dateKey = toDateInputString(date);
          const status = dayStatusByDate[dateKey];
          const compactLabel = dayLabelByDate[dateKey] ?? "";

          return (
            <div
              key={dateKey}
              className={cn(
                "h-14 rounded-lg border px-1 py-1.5 transition-colors",
                "flex flex-col items-center",
                compactLabel ? "justify-between" : "justify-center",
                status ? statusClasses[status] : "bg-background text-foreground border-border/70"
              )}
            >
              <span className="text-xs font-semibold leading-none">{day}</span>
              {compactLabel ? (
                <span className="max-w-full truncate text-[10px] font-medium leading-tight">
                  {compactLabel}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-primary/15" />
          <span className="text-muted-foreground">
            {labels.leave} ({counts.leave})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-emerald-100" />
          <span className="text-muted-foreground">
            {labels.worked} ({counts.worked})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-destructive/10" />
          <span className="text-muted-foreground">
            {labels.noShow} ({counts.noShow})
          </span>
        </div>
      </div>
    </div>
  );
}
