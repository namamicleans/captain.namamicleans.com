"use client";

import { MapPin, Clock, Navigation, Play, CheckCircle2, Phone, Car, Sofa, Home, Sparkles, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Job } from '@/types/captain';
import { cn } from '@shared/utils';

interface JobCardProps {
  job: Job;
  onNavigate: () => void;
  onStart: () => void;
  onView: () => void;
}

const statusConfig = {
  scheduled: { label: 'Scheduled', className: 'bg-secondary text-secondary-foreground' },
  ongoing: { label: 'Ongoing', className: 'bg-accent text-accent-foreground' },
  completed: { label: 'Completed', className: 'bg-primary/10 text-primary' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive' },
};

const paymentConfig = {
  pending: { label: 'Payment Pending', className: 'bg-destructive/10 text-destructive' },
  paid: { label: 'Prepaid', className: 'bg-primary/10 text-primary' },
  cod: { label: 'COD', className: 'bg-accent text-accent-foreground' },
};

const serviceIcons: Record<string, React.ElementType> = {
  car_wash: Car,
  sofa_cleaning: Sofa,
  home_cleaning: Home,
  default: Sparkles,
};

export function JobCard({ job, onNavigate, onStart }: JobCardProps) {
  const status = statusConfig[job.status];
  const payment = paymentConfig[job.paymentStatus];
  const IconComponent = serviceIcons[job.serviceType] || serviceIcons.default;

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${job.customerPhone}`, '_self');
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        job.status === 'ongoing' && "ring-2 ring-primary/50"
      )}
    >
      <CardContent className="p-0">
        {/* Top Section - Service Info */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <IconComponent className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{job.serviceName}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                  <Badge variant="outline" className={payment.className}>
                    {payment.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">{job.customerName}</p>
              <p className="text-xs text-muted-foreground">{job.customerPhone}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={handleCall}
            >
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>
          </div>

          {/* Time & Duration */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="font-medium text-foreground">{job.scheduledTime}</span>
            </div>
            <span className="text-muted">•</span>
            <span>{job.estimatedDuration} mins</span>
          </div>
          
          {/* Address */}
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground line-clamp-2">{job.address}</span>
          </div>
        </div>

        {/* Bottom Section - Actions */}
        <div className="border-t border-border bg-muted/30 p-3">
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {job.distance && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onNavigate}
            >
              <Navigation className="h-4 w-4 mr-1" />
              Navigate | {job.distance} km
            </Button>
            )}

            {job.status === 'scheduled' && (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={onStart}
              >
                <Play className="h-4 w-4 mr-1" />
                Start Job
              </Button>
            )}
            
            {job.status === 'ongoing' && (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={onStart}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Continue
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
