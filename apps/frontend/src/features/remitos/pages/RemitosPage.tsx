import { useState } from 'react';
import { 
  DocumentPlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../auth/authSlice';
import { useGetRemitosQuery, useGetStatsQuery } from '../api/remitosApiSlice';
import { RemitoCard } from '../components/RemitoCard';
import { RemitoUploader } from '../components/RemitoUploader';
import { RemitoDetail } from '../components/RemitoDetail';
import type { Remito, RemitoEstado } from '../types';

const TABS = [
  { id: 'todos', label: 'Todos', icon: ChartBarIcon },
  { id: 'PENDIENTE_APROBACION', label: 'Pendientes', icon: ClockIcon },
  { id: 'APROBADO', label: 'Aprobados', icon: CheckCircleIcon },
  { id: 'RECHAZADO', label: 'Rechazados', icon: XCircleIcon },
] as const;

export function RemitosPage() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_INTERNO';
  
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  const [selectedRemito, setSelectedRemito] = useState<Remito | null>(null);
  const [page, setPage] = useState(1);
  
  // Query params
  const queryParams = {
    estado: activeTab !== 'todos' ? activeTab as RemitoEstado : undefined,
    numeroRemito: search || undefined,
    page,
    limit: 20,
  };
  
  const { data: remitosData, isLoading, isFetching, refetch } = useGetRemitosQuery(queryParams);
  const { data: statsData } = useGetStatsQuery();
  
  const remitos = remitosData?.data || [];
  const pagination = remitosData?.pagination;
  const stats = statsData?.data;
  
  const handleUploadSuccess = (remitoId: number) => {
    setShowUploader(false);
    refetch();
    // Podríamos navegar al detalle aquí si queremos
  };
  
  // Si hay un remito seleccionado, mostrar el detalle
  if (selectedRemito) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <RemitoDetail
          remito={selectedRemito}
          onBack={() => setSelectedRemito(null)}
          canApprove={isAdmin}
        />
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            📋 Remitos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestión de remitos de transporte
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <ArrowPathIcon className={`h-5 w-5 text-slate-600 dark:text-slate-300 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DocumentPlusIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Cargar Remito</span>
          </button>
        </div>
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="Pendientes" value={stats.pendientes} color="yellow" />
          <StatCard label="Aprobados" value={stats.aprobados} color="green" />
          <StatCard label="Rechazados" value={stats.rechazados} color="red" />
        </div>
      )}
      
      {/* Uploader */}
      {showUploader && (
        <RemitoUploader
          onSuccess={handleUploadSuccess}
        />
      )}
      
      {/* Tabs y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="relative w-full sm:w-64">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>
      
      {/* Lista de remitos */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : remitos.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <DocumentPlusIcon className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No hay remitos
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Cargá tu primer remito para comenzar
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {remitos.map((remito) => (
              <RemitoCard
                key={remito.id}
                remito={remito}
                onClick={() => setSelectedRemito(remito)}
              />
            ))}
          </div>
          
          {/* Paginación */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Página {page} de {pagination.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Componente de tarjeta de estadísticas
interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'green' | 'red';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  };
  
  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}

export default RemitosPage;

