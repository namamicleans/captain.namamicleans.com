"use client";

import { Home, Briefcase, BarChart3, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@shared/utils';
import { useTranslation } from 'react-i18next';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: t('navigation.home'), path: '/' },
    { icon: Briefcase, label: t('navigation.jobs'), path: '/jobs' },
    { icon: BarChart3, label: t('navigation.analytics'), path: '/analytics' },
    { icon: User, label: t('navigation.profile'), path: '/profile' },
  ];

  // Hide nav during check-in, check-out, and job execution flows
  const hiddenPaths = ['/check-in', '/check-out', '/auth', '/documents'];
  if (
    hiddenPaths.includes(pathname) ||
    (pathname.includes('/job/') && pathname.includes('/execute'))
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-1", isActive && "stroke-[2.5]")} />
              <span className={cn(
                "text-xs font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
