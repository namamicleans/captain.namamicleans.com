"use client";

import { ChevronLeft, ChevronRight, Check, X, Clock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@shared/utils';

interface AttendanceDay {
  date: number;
  status: 'present' | 'absent' | 'half-day' | 'future' | 'weekend';
  hours?: number;
}

const generateMonthData = (year: number, month: number): AttendanceDay[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const days: AttendanceDay[] = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dayOfWeek = date.getDay();
    const isFuture = date > today;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isFuture) {
      days.push({ date: i, status: 'future' });
    } else if (isWeekend) {
      days.push({ date: i, status: 'weekend' });
    } else {
      // Mock attendance data
      const random = Math.random();
      if (random > 0.9) {
        days.push({ date: i, status: 'absent' });
      } else if (random > 0.8) {
        days.push({ date: i, status: 'half-day', hours: 4 });
      } else {
        days.push({ date: i, status: 'present', hours: 8 + Math.floor(Math.random() * 2) });
      }
    }
  }

  return days;
};

const statusConfig = {
  present: { icon: Check, className: 'bg-primary/20 text-primary' },
  absent: { icon: X, className: 'bg-destructive/20 text-destructive' },
  'half-day': { icon: Clock, className: 'bg-yellow-200 text-yellow-600' },
  future: { icon: null, className: 'bg-muted/30 text-muted-foreground' },
  weekend: { icon: null, className: 'bg-muted/50 text-muted-foreground/50' },
};

export function AttendanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  
  const days = generateMonthData(year, month);
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    if (next <= new Date()) {
      setCurrentDate(next);
    }
  };

  // Stats
  const presentDays = days.filter(d => d.status === 'present').length;
  const absentDays = days.filter(d => d.status === 'absent').length;
  const halfDays = days.filter(d => d.status === 'half-day').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="font-semibold text-foreground">
          {monthName} {year}
        </h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={nextMonth}
          disabled={new Date(year, month + 1, 1) > new Date()}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        
        {/* Empty cells for first week */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {days.map((day) => {
          const config = statusConfig[day.status];
          const Icon = config.icon;
          
          return (
            <div
              key={day.date}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors",
                config.className
              )}
            >
              <span className="font-medium">{day.date}</span>
              {Icon && <Icon className="h-3 w-3 mt-0.5" />}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-primary/20" />
          <span className="text-muted-foreground">Present ({presentDays})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-destructive/20" />
          <span className="text-muted-foreground">Absent ({absentDays})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-yellow-200" />
          <span className="text-muted-foreground">Half ({halfDays})</span>
        </div>
      </div>
    </div>
  );
}
