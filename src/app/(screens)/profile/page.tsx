"use client";

import { 
  User, Phone, Star, HelpCircle, 
  FileText, Shield, LogOut, ChevronRight, Moon, Sun,
  Languages, MapPin, Camera, Check
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useCaptain } from '@/context/CaptainContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { logout } from '@core/auth/session';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
];

const DEFAULT_LANGUAGE = 'en';

const normalizeLanguageCode = (lang: string | undefined | null) => {
  const baseCode = (lang || '').toLowerCase().split('-')[0];
  return languages.some((language) => language.code === baseCode)
    ? baseCode
    : DEFAULT_LANGUAGE;
};

export default function ProfilePage() {
  const { captain } = useCaptain();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Check initial permission states
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
        result.onchange = () => setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
      });
      
      navigator.permissions.query({ name: 'camera' as PermissionName }).then((result) => {
        setCameraPermission(result.state as 'granted' | 'denied' | 'prompt');
        result.onchange = () => setCameraPermission(result.state as 'granted' | 'denied' | 'prompt');
      }).catch(() => {
        // Camera permission query not supported
      });
    }

    // Check dark mode
    if (typeof document !== 'undefined') {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    toast.success(`Language changed to ${languages.find(l => l.code === langCode)?.name}`);
  };

  const selectedLanguage = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language);

  const requestLocationPermission = async () => {
    try {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPermission('granted');
          toast.success('Location permission granted');
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermission('denied');
            toast.error('Location permission denied. Please enable in browser settings.');
          }
        }
      );
    } catch {
      toast.error('Failed to request location permission');
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      toast.success('Camera permission granted');
    } catch {
      setCameraPermission('denied');
      toast.error('Camera permission denied. Please enable in browser settings.');
    }
  };

  const menuItems = [
    { icon: FileText, label: t('profile.documents'), description: t('profile.documentsDesc'), onClick: () => router.push('/documents') },
    { icon: Shield, label: t('profile.privacy'), description: t('profile.privacyDesc'), onClick: () => window.open('https://namamicleans.com/privacy-policy', '_blank') },
    { icon: HelpCircle, label: t('profile.help'), description: t('profile.helpDesc'), onClick: () => window.open('https://wa.me/+918770490169', '_blank') },
  ];

  const getPermissionBadge = (status: 'granted' | 'denied' | 'prompt') => {
    if (status === 'granted') return { text: 'Allowed', className: 'text-primary' };
    if (status === 'denied') return { text: 'Denied', className: 'text-destructive' };
    return { text: 'Not Set', className: 'text-muted-foreground' };
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
      router.replace('/auth');
    } catch (error) {
      console.error('Logout error', error);
      toast.error('Failed to logout. Please try again');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary to-primary/80 pt-8 pb-16 px-4">
        <div className="max-w-lg mx-auto">
          {/* <h1 className="text-xl font-bold text-primary-foreground mb-6">{t('profile.title')}</h1> */}
          
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-background/20 flex items-center justify-center">
              <User className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-primary-foreground">{captain.name}</h2>
              <p className="text-primary-foreground/80 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {captain.phone}
              </p>
              <p className="text-primary-foreground/70 text-sm">ID: {captain.id}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Card */}
      <div className="px-4 -mt-8 max-w-lg mx-auto">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="text-center px-2">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground">
                  <Star className="h-5 w-5 text-primary fill-primary" />
                  {captain.rating}
                </div>
                <p className="text-xs text-muted-foreground">{t('profile.title')}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-2xl font-bold text-foreground">{captain.totalJobs}</p>
                <p className="text-xs text-muted-foreground">{t('jobs.completed')}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-2xl font-bold text-foreground">18</p>
                <p className="text-xs text-muted-foreground">Months</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Language Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Languages className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('profile.language')}</p>
                  <p className="text-sm text-muted-foreground">{t('profile.settingsDesc')}</p>
                </div>
              </div>
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Dark Mode Toggle */}
        <Card>
          <CardContent className="p-4">
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {isDarkMode ? (
                    <Moon className="h-5 w-5 text-primary" />
                  ) : (
                    <Sun className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{t('profile.darkMode')}</p>
                  <p className="text-sm text-muted-foreground">
                    {isDarkMode ? 'Currently on' : 'Currently off'}
                  </p>
                </div>
              </div>
              <Switch checked={isDarkMode} />
            </button>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {/* Location Permission */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('profile.locationPermission')}</p>
                  <p className={`text-sm ${getPermissionBadge(locationPermission).className}`}>
                    {getPermissionBadge(locationPermission).text}
                  </p>
                </div>
              </div>
              {locationPermission !== 'granted' && (
                <Button size="sm" variant="outline" onClick={requestLocationPermission}>
                  {locationPermission === 'denied' ? 'Retry' : 'Allow'}
                </Button>
              )}
              {locationPermission === 'granted' && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>

            {/* Camera Permission */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('profile.cameraPermission')}</p>
                  <p className={`text-sm ${getPermissionBadge(cameraPermission).className}`}>
                    {getPermissionBadge(cameraPermission).text}
                  </p>
                </div>
              </div>
              {cameraPermission !== 'granted' && (
                <Button size="sm" variant="outline" onClick={requestCameraPermission}>
                  {cameraPermission === 'denied' ? 'Retry' : 'Allow'}
                </Button>
              )}
              {cameraPermission === 'granted' && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="h-5 w-5 mr-2" />
          {isLoggingOut ? 'Logging out...' : t('auth.logout')}
        </Button>

        {/* App Version */}
        <p className="text-center text-sm text-muted-foreground">
          Captain App v1.0.0
        </p>
      </main>
    </div>
  );
}
