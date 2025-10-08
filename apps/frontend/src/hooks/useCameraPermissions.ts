import { useState, useEffect, useCallback } from 'react';

export type CameraPermissionStatus = 'prompt' | 'granted' | 'denied' | 'not-supported';

interface CameraPermissionsHook {
  permissionStatus: CameraPermissionStatus;
  isLoading: boolean;
  requestPermission: () => Promise<CameraPermissionStatus>;
  checkPermission: () => Promise<CameraPermissionStatus>;
  openCameraSettings: () => void;
}

export const useCameraPermissions = (): CameraPermissionsHook => {
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>('prompt');
  const [isLoading, setIsLoading] = useState(true);

  const checkPermission = useCallback(async (): Promise<CameraPermissionStatus> => {
    // Check if camera API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('not-supported');
      return 'not-supported';
    }

    try {
      // Check if permissions API is available
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const status = result.state as CameraPermissionStatus;
        setPermissionStatus(status);
        return status;
      }

      // Fallback: try to access camera to check permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } 
        });
        // If successful, permission is granted
        stream.getTracks().forEach(track => track.stop());
        setPermissionStatus('granted');
        return 'granted';
      } catch (error: any) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionStatus('denied');
          return 'denied';
        }
        // Other errors might indicate that permission is still prompt
        setPermissionStatus('prompt');
        return 'prompt';
      }
    } catch (error) {
      console.warn('Error checking camera permission:', error);
      setPermissionStatus('prompt');
      return 'prompt';
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<CameraPermissionStatus> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('not-supported');
      return 'not-supported';
    }

    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      // Permission granted, cleanup the stream
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      return 'granted';
    } catch (error: any) {
      console.warn('Camera permission request failed:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        return 'denied';
      }
      
      // Other errors (e.g., NotFoundError for no camera)
      setPermissionStatus('not-supported');
      return 'not-supported';
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openCameraSettings = useCallback(() => {
    // On mobile, this will typically open the browser's site settings
    // This is a best-effort implementation as there's no standard API
    if ('permissions' in navigator) {
      // Some browsers may support this
      const settingsUrl = `chrome://settings/content/camera`;
      window.open(settingsUrl, '_blank');
    } else {
      // Fallback: show instructions to user
      // eslint-disable-next-line no-alert
      window.alert('Para cambiar los permisos de cámara, ve a la configuración de tu navegador > Sitios web > Permisos > Cámara');
    }
  }, []);

  useEffect(() => {
    checkPermission().finally(() => setIsLoading(false));
  }, [checkPermission]);

  return {
    permissionStatus,
    isLoading,
    requestPermission,
    checkPermission,
    openCameraSettings,
  };
};
