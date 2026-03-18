import { useCallback, useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

interface UseUpdatesReturn {
  /** Si hay una actualización disponible */
  isUpdateAvailable: boolean;
  /** Si se está verificando si hay actualizaciones */
  isChecking: boolean;
  /** Si se está descargando la actualización */
  isDownloading: boolean;
  /** Si hubo un error */
  error: Error | null;
  /** Verifica manualmente si hay actualizaciones */
  checkForUpdate: () => Promise<void>;
  /** Descarga la actualización disponible */
  downloadUpdate: () => Promise<void>;
  /** Recarga la app para aplicar la actualización */
  reloadApp: () => Promise<void>;
}

/**
 * Hook para manejar actualizaciones OTA con expo-updates.
 *
 * Verifica automáticamente si hay actualizaciones al montar el componente.
 *
 * @example
 * ```tsx
 * const { isUpdateAvailable, isDownloading, downloadUpdate, reloadApp } = useUpdates();
 *
 * if (isUpdateAvailable) {
 *   return (
 *     <Button onPress={downloadUpdate} loading={isDownloading}>
 *       Actualizar
 *     </Button>
 *   );
 * }
 * ```
 */
export function useUpdates(): UseUpdatesReturn {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkForUpdate = useCallback(async () => {
    // En desarrollo, expo-updates no funciona
    if (__DEV__) {
      console.log('[useUpdates] Skip check in development mode');
      return;
    }

    try {
      setIsChecking(true);
      setError(null);

      const update = await Updates.checkForUpdateAsync();
      setIsUpdateAvailable(update.isAvailable);

      if (update.isAvailable) {
        console.log('[useUpdates] Update available');
      } else {
        console.log('[useUpdates] No update available');
      }
    } catch (err) {
      console.error('[useUpdates] Error checking for update:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsChecking(false);
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (__DEV__) {
      console.log('[useUpdates] Skip download in development mode');
      return;
    }

    try {
      setIsDownloading(true);
      setError(null);

      const update = await Updates.fetchUpdateAsync();

      if (update.isNew) {
        console.log('[useUpdates] Update downloaded successfully');
      } else {
        console.log('[useUpdates] No new update to download');
      }
    } catch (err) {
      console.error('[useUpdates] Error downloading update:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const reloadApp = useCallback(async () => {
    if (__DEV__) {
      console.log('[useUpdates] Skip reload in development mode');
      return;
    }

    try {
      await Updates.reloadAsync();
    } catch (err) {
      console.error('[useUpdates] Error reloading app:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  // Verificar actualizaciones al montar
  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  return {
    isUpdateAvailable,
    isChecking,
    isDownloading,
    error,
    checkForUpdate,
    downloadUpdate,
    reloadApp,
  };
}
