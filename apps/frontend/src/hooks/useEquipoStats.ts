import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface DashboardStats {
  totalEquipos: number;
  equiposVigentes: number;
  equiposProximos: number;
  equiposVencidos: number;
  equiposFaltantes: number;
  compliancePercentage: number;
}

interface UrgentAlert {
  id: string;
  type: 'VENCIMIENTO' | 'FALTANTE' | 'OTRO';
  message: string;
  equipoId?: number;
  documentId?: number;
  dueDate?: string;
}

export const useEquipoStats = () => {
  const authToken = useSelector((s: RootState) => (s as any)?.auth?.token);
  const empresaId = useSelector((s: RootState) => (s as any)?.auth?.user?.empresaId);
  const baseUrl = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs`;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<UrgentAlert[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [errorAlerts, setErrorAlerts] = useState<string | null>(null);

  const authHeaders: HeadersInit = useMemo(() => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
    'Content-Type': 'application/json',
  }), [authToken, empresaId]);

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    setErrorStats(null);
    try {
      const res = await fetch(`${baseUrl}/transportistas/dashboard-stats`, {
        credentials: 'include',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setStats(data.data);
    } catch (e: any) {
      console.error('Error fetching dashboard stats:', e);
      setErrorStats(e.message || 'Failed to fetch stats');
      setStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [baseUrl, authHeaders]);

  const fetchAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);
    setErrorAlerts(null);
    try {
      const res = await fetch(`${baseUrl}/transportistas/alertas-urgentes`, {
        credentials: 'include',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setAlerts(data.data);
    } catch (e: any) {
      console.error('Error fetching urgent alerts:', e);
      setErrorAlerts(e.message || 'Failed to fetch alerts');
      setAlerts([]);
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [baseUrl, authHeaders]);

  useEffect(() => {
    fetchStats();
    fetchAlerts();

    // Optional: polling for real-time updates
    const statsInterval = setInterval(fetchStats, 5 * 60 * 1000); // Every 5 minutes
    const alertsInterval = setInterval(fetchAlerts, 2 * 60 * 1000); // Every 2 minutes

    return () => {
      clearInterval(statsInterval);
      clearInterval(alertsInterval);
    };
  }, [fetchStats, fetchAlerts]);

  return {
    stats,
    alerts,
    isLoadingStats,
    isLoadingAlerts,
    errorStats,
    errorAlerts,
    refetchStats: fetchStats,
    refetchAlerts: fetchAlerts,
  };
};