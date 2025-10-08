import { useCallback, useMemo, useState } from 'react';

export function useLoadingState() {
  const [map, setMap] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, state: boolean) => {
    setMap((prev) => ({ ...prev, [key]: state }));
  }, []);

  const isLoading = useCallback((key: string) => Boolean(map[key]), [map]);

  const isAnyLoading = useMemo(() => Object.values(map).some(Boolean), [map]);

  return { setLoading, isLoading, isAnyLoading } as const;
}


