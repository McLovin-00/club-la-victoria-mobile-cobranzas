import { useEffect, useMemo, useState } from 'react';

function getAuthHeaders(): HeadersInit {
  const token = globalThis.localStorage?.getItem('token');
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function fetchProtectedAttachmentBlob(sourceUrl: string): Promise<Blob> {
  const response = await fetch(sourceUrl, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar el adjunto (${response.status})`);
  }

  return response.blob();
}

export async function downloadProtectedFile(sourceUrl: string, fileName: string): Promise<void> {
  const blob = await fetchProtectedAttachmentBlob(sourceUrl);
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function useProtectedObjectUrl(sourceUrl?: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(sourceUrl));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceUrl) {
      setObjectUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    let nextObjectUrl: string | null = null;

    setIsLoading(true);
    setError(null);

    fetchProtectedAttachmentBlob(sourceUrl)
      .then(blob => {
        if (!active) {
          return;
        }

        nextObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(nextObjectUrl);
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : 'No se pudo cargar el adjunto');
        setObjectUrl(null);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [sourceUrl]);

  return { objectUrl, isLoading, error };
}

export function useProtectedObjectUrlMap(items: Array<{ id: string; sourceUrl: string }>) {
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});

  // Create a stable fingerprint to avoid re-renders
  const fingerprint = useMemo(() => {
    return items.map(item => `${item.id}:${item.sourceUrl}`).join('|');
  }, [items]);

  useEffect(() => {
    if (items.length === 0) {
      setUrlMap({});
      return;
    }

    let active = true;
    const createdUrls: string[] = [];

    Promise.all(
      items.map(async item => {
        const blob = await fetchProtectedAttachmentBlob(item.sourceUrl);
        const objectUrl = URL.createObjectURL(blob);
        createdUrls.push(objectUrl);
        return [item.id, objectUrl] as const;
      })
    )
      .then(entries => {
        if (!active) {
          entries.forEach(([, objectUrl]) => URL.revokeObjectURL(objectUrl));
          return;
        }

        setUrlMap(Object.fromEntries(entries));
      })
      .catch(() => {
        if (active) {
          setUrlMap({});
        }
      });

    return () => {
      active = false;
      createdUrls.forEach(objectUrl => URL.revokeObjectURL(objectUrl));
    };
  }, [fingerprint]); // Remove 'items' from dependencies

  return urlMap;
}
