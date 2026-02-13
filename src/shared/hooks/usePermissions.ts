"use client";

import { useState, useEffect, useCallback } from 'react';

export type PermissionType = 'geolocation' | 'camera';
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

interface PermissionsState {
  location: PermissionStatus;
  camera: PermissionStatus;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsState>({
    location: 'prompt',
    camera: 'prompt',
  });
  const [isLoading, setIsLoading] = useState(true);

  const checkPermissions = useCallback(async () => {
    setIsLoading(true);
    const newPermissions: PermissionsState = {
      location: 'prompt',
      camera: 'prompt',
    };

    try {
      // Check geolocation permission
      if ('permissions' in navigator) {
        try {
          const geoResult = await navigator.permissions.query({ name: 'geolocation' });
          newPermissions.location = geoResult.state as PermissionStatus;
        } catch {
          // Fallback - check if geolocation is available
          if ('geolocation' in navigator) {
            newPermissions.location = 'prompt';
          } else {
            newPermissions.location = 'unavailable';
          }
        }

        try {
          const camResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
          newPermissions.camera = camResult.state as PermissionStatus;
        } catch {
          // Camera permission query not supported
          newPermissions.camera = 'prompt';
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }

    setPermissions(newPermissions);
    setIsLoading(false);
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setPermissions(prev => ({ ...prev, location: 'unavailable' }));
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissions(prev => ({ ...prev, location: 'granted' }));
          resolve(true);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setPermissions(prev => ({ ...prev, location: 'denied' }));
          }
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
      return true;
    } catch {
      setPermissions(prev => ({ ...prev, camera: 'denied' }));
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not available'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissions,
    isLoading,
    checkPermissions,
    requestLocationPermission,
    requestCameraPermission,
    getCurrentLocation,
  };
}
