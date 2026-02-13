"use client";

import { useMemo } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckInCard } from '@/components/captain/CheckInCard';
import { EarningsCard } from '@/components/captain/EarningsCard';
import { JobCard } from '@/components/captain/JobCard';
import { useCaptain } from '@/context/CaptainContext';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { CheckinAnimation } from '@/components/lottieanimations';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { FlipWords } from '@/components/ui/flip-text';

export default function HomePage() {
  const { captain, isCheckedIn, jobs } = useCaptain();
  const router = useRouter();
  const { t } = useTranslation();
  const welcome = [
    "Welcome",
    "नमस्ते",
    "નમસ્તે",
    "నమస్కారం",
    "नमस्कार",
    "স্বাগতম",
    "ಸ್ವಾಗತ",
    "வணக்கம்",
    "ಹಲೋ",
  ];

  const displayName = useMemo(() => {
    const rawName = captain?.name?.trim();
    if (!rawName) {
      return "Namamian";
    }
    return rawName
      .split(/\s+/)
      .map((part) =>
        part.length > 0
          ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          : part
      )
      .join(" ");
  }, [captain?.name]);

  const todaysJobs = jobs
    .filter((job) => job.status !== "completed")
    .slice(0, 2);
  const completedToday = jobs.filter(
    (job) => job.status === "completed"
  ).length;

  const openNavigation = (job: (typeof jobs)[0]) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${job.location.lat},${job.location.lng}`,
      "_blank"
    );
  };

  const startJob = (job: (typeof jobs)[0]) => {
    router.push(`/job/${job.id}/execute`);
  };

  return (
    
    <div className="min-h-screen bg-background pb-20 ">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary via-primary to-primary/80 pt-safe pb-6">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center">
              <Image src="/logo.png" alt="Logo" width={20} height={20} />
            </div>
            <div>
              <h1 className="font-semibold text-background">Namami Cleans</h1>
              <p className="text-sm text-background">Captain App</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="relative bg-accent/20">
            <Bell className="h-5 w-5 text-background" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
          </Button>
        </div>

        <div className="px-4 pt-4">
          <p className="text-lg  text-background font-bold">
            <FlipWords
              words={welcome}
              className="text-white dark:text-black px-0"
            />{" "}
            👋
          </p>
          <h1 className="font-semibold text-3xl text-background mb-8">
            {displayName}!
          </h1>
          <Separator className="my-2 opacity-30" />
        </div>

        {/* Check-in Card */}
        <CheckInCard />
      </header>

      {/* Content */}
      <main className="flex-1 p-4 max-w-lg mx-auto space-y-4 -mt-6 rounded-t-3xl bg-background z-30">
        {/* Quick Stats */}
        {isCheckedIn && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-2xl font-bold text-foreground">
                {todaysJobs.length}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("jobs.scheduled")}
              </p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-2xl font-bold text-primary">
                {completedToday}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("jobs.completed")}
              </p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-2xl font-bold text-foreground">
                ⭐ {captain.rating}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("profile.title")}
              </p>
            </div>
          </div>
        )}

        {/* Earnings Card */}
        {isCheckedIn && <EarningsCard />}

        {/* Upcoming Jobs */}
        {isCheckedIn && todaysJobs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">
                {t("jobs.title")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => router.push("/jobs")}
              >
                {t("jobs.viewDetails")}
              </Button>
            </div>
            <div className="space-y-3">
              {todaysJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onNavigate={() => openNavigation(job)}
                  onStart={() => startJob(job)}
                  onView={() => router.push(`/jobs/${job.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Not Checked In State */}
        {!isCheckedIn && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              <CheckinAnimation />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("checkIn.startYourDay")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("checkIn.checkInToView")}
            </p>
            {/* <Button size="lg" onClick={() => router.push('/check-in')}>
              {t('checkIn.title')}
            </Button> */}
          </div>
        )}
      </main>
    </div>
  );
}
