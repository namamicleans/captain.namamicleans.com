"use client";

import { ClipboardList, RotateCcw, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobCard } from '@/components/captain/JobCard';
import { useCaptain } from '@/context/CaptainContext';
import { useRouter } from 'next/navigation';
import { CheckinAnimation } from '@/components/shared/lottieanimations';

export default function JobsPage() {
  const { jobs, isCheckedIn } = useCaptain();
  const router = useRouter();

  console.log('Jobs data:', jobs);

  const scheduledJobs = jobs.filter(job => job.status === 'scheduled');
  const ongoingJobs = jobs.filter(job => job.status === 'ongoing');
  const completedJobs = jobs.filter(job => job.status === 'completed');

  const openNavigation = (job: typeof jobs[0]) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${job.location.lat},${job.location.lng}`,
      '_blank'
    );
  };

  const startJob = (job: typeof jobs[0]) => {
    router.push(`/job/${job.id}/execute`);
  };

  if (!isCheckedIn) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center p-4">
          <CheckinAnimation />
          <h2 className="text-xl font-semibold text-foreground mb-2">Check In Required</h2>
          <p className="text-muted-foreground mb-4">
            You need to check in before viewing jobs
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="p-4 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-foreground">Today&apos;s Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {jobs.length} jobs assigned
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 max-w-lg mx-auto">
        <Tabs defaultValue="scheduled" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="scheduled" className="relative">
              Scheduled
              {scheduledJobs.length > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {scheduledJobs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ongoing" className="relative">
              Ongoing
              {ongoingJobs.length > 0 && (
                <span className="ml-1.5 bg-accent text-accent-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {ongoingJobs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled" className="space-y-3">
            {scheduledJobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No scheduled jobs</p>
              </div>
            ) : (
              scheduledJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onNavigate={() => openNavigation(job)}
                  onStart={() => startJob(job)}
                  onView={() => router.push(`/jobs/${job.id}`)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="ongoing" className="space-y-3">
            {ongoingJobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <RotateCcw className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No ongoing jobs</p>
              </div>
            ) : (
              ongoingJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onNavigate={() => openNavigation(job)}
                  onStart={() => startJob(job)}
                  onView={() => router.push(`/jobs/${job.id}`)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completedJobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No completed jobs yet</p>
              </div>
            ) : (
              completedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onNavigate={() => openNavigation(job)}
                  onStart={() => startJob(job)}
                  onView={() => router.push(`/jobs/${job.id}`)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
