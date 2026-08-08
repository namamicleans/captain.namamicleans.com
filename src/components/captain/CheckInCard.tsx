"use client";

import { LogIn, LogOut, Clock, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCaptain } from '@/context/CaptainContext';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { formatTimeIST } from '@/shared/utils/datetime';

export function CheckInCard() {
  const { isCheckedIn, isCheckedOut, todayAttendance } = useCaptain();
  const router = useRouter();
  const { t } = useTranslation();

  // Already checked out — show day-complete summary, no check-in or check-out CTA
  if (isCheckedOut) {
    const checkOutTime = todayAttendance?.checkOutTime
      ? formatTimeIST(todayAttendance.checkOutTime)
      : '--:--';

    return (
      <Card className="bg-transparent border-none shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-foreground mb-1">
                Day Complete
              </h3>
              <p className="text-sm text-primary-foreground/80">
                Checked out at {checkOutTime}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not checked in (pending / no shift) — show check-in CTA
  if (!isCheckedIn) {
    return (
      <Card className="bg-transparent border-none shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-foreground mb-1">
                {t('checkIn.startYourDay')}
              </h3>
              <p className="text-sm text-primary-foreground/80">
                {t('checkIn.checkInToView')}
              </p>
            </div>
            <Button 
              size="lg"
              className="h-14 px-6 bg-yellow-400 hover:bg-yellow-500 font-semibold"
              onClick={() => router.push('/check-in')}
            >
              <LogIn className="h-5 w-5 mr-2" />
              {t('checkIn.title')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Currently checked in — show active badge + checkout button
  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex bg-white rounded px-2 items-center gap-2">
            <div className="h-3 w-3 bg-primary rounded-full animate-pulse" />
            <span className="font-semibold text-primary">{t('checkIn.youreActive')}</span>
          </div>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => router.push('/check-out')}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('checkOut.title')}
          </Button>
        </div>
        
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2 text-primary-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {todayAttendance?.checkInTime
                ? formatTimeIST(todayAttendance.checkInTime)
                : '--:--'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-primary-foreground">
            <MapPin className="h-4 w-4" />
            <span>{t('checkIn.onDuty')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
