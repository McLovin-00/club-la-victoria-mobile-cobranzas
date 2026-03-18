import { useCallback, useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

interface UseUpdatesReturn {
  isUpdateAvailable: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  error: Error | null;
  checkForUpdate: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  reloadApp: () => Promise<void>;
}

export function useUpdates(): UseUpdatesReturn {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkForUpdate = useCallback(async () => {
    if (__DEV__) return;
    try {
      setIsChecking(true);
      setError(null);
      const update = await Updates.checkForUpdateAsync();
      setIsUpdateAvailable(update.isAvailable);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsChecking(false);
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (__DEV__) return;
    try {
      setIsDownloading(true);
      setError(null);
      await Updates.fetchUpdateAsync();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const reloadApp = useCallback(async () => {
    if (__DEV__) return;
    try {
      await Updates.reloadAsync();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  return { isUpdateAvailable, isChecking, isDownloading, error, checkForUpdate, downloadUpdate, reloadApp };
}
