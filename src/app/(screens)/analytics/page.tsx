"use client";

import { TrendingUp, IndianRupee, Car, Fuel, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttendanceCalendar } from '@/components/captain/AttendanceCalendar';
import { useCaptain } from '@/context/CaptainContext';

export default function AnalyticsPage() {
  const { earnings } = useCaptain();
  const showAnalyticsComingSoon = process.env.NEXT_PUBLIC_ANALYTICS_READY !== 'true';

  if (showAnalyticsComingSoon) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="p-4 max-w-lg mx-auto">
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">Your performance dashboard</p>
          </div>
        </header>

        <main className="p-4 max-w-lg mx-auto">
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <BarChart3 className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Analytics Coming Soon</h2>
              <p className="text-sm text-muted-foreground">
                We are working on your detailed performance insights.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const thisMonthJobs = 28; // Mock
  const totalKm = 245; // Mock
  const fuelUsed = 32; // Mock liters

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="p-4 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Your performance dashboard</p>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Earnings Summary */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-primary-foreground/80 mb-2">
              <IndianRupee className="h-5 w-5" />
              <span className="font-medium">This Month&apos;s Earnings</span>
            </div>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-bold text-primary-foreground">
                ₹{earnings.thisMonth.toLocaleString()}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background/10 rounded-lg p-3">
                <p className="text-primary-foreground/70 text-xs mb-1">Today</p>
                <p className="font-bold text-primary-foreground">
                  ₹{earnings.today.toLocaleString()}
                </p>
              </div>
              <div className="bg-background/10 rounded-lg p-3">
                <p className="text-primary-foreground/70 text-xs mb-1">This Week</p>
                <p className="font-bold text-primary-foreground">
                  ₹{earnings.thisWeek.toLocaleString()}
                </p>
              </div>
              <div className="bg-background/10 rounded-lg p-3">
                <p className="text-primary-foreground/70 text-xs mb-1">Jobs</p>
                <p className="font-bold text-primary-foreground">
                  {thisMonthJobs}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="earnings" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="travel">Travel</TabsTrigger>
          </TabsList>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Salary Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Base Earnings (Jobs)</span>
                  <span className="font-medium text-foreground">
                    ₹{(earnings.thisMonth - earnings.incentives + earnings.deductions).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Incentives & Bonuses</span>
                  <span className="font-medium text-primary">
                    +₹{earnings.incentives.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Deductions</span>
                  <span className="font-medium text-destructive">
                    -₹{earnings.deductions.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-foreground">Net Earnings</span>
                  <span className="font-bold text-lg text-foreground">
                    ₹{earnings.thisMonth.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Stats
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <Award className="h-8 w-8 text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">{captain.rating}</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <Calendar className="h-8 w-8 text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">{captain.totalJobs}</p>
                  <p className="text-xs text-muted-foreground">Total Jobs</p>
                </CardContent>
              </Card>
            </div> */}
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                {/* <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Attendance Calendar
                </CardTitle> */}
              </CardHeader>
              <CardContent>
                <AttendanceCalendar />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Travel Tab */}
          <TabsContent value="travel" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <Car className="h-8 w-8 text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">{totalKm} km</p>
                  <p className="text-xs text-muted-foreground">Total Distance</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <Fuel className="h-8 w-8 text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">{fuelUsed} L</p>
                  <p className="text-xs text-muted-foreground">Fuel Used</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">This Month Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Avg. Distance/Job</span>
                  <span className="font-medium text-foreground">
                    {(totalKm / thisMonthJobs).toFixed(1)} km
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Fuel Efficiency</span>
                  <span className="font-medium text-foreground">
                    {(totalKm / fuelUsed).toFixed(1)} km/L
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Jobs Completed</span>
                  <span className="font-medium text-foreground">{thisMonthJobs}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
