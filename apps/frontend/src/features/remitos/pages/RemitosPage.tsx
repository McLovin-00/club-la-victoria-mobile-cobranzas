import { useState } from 'react';
import { 
  DocumentPlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectCurrentToken } from '../../auth/authSlice';
import { useGetRemitosQuery } from '../api/remitosApiSlice';
import { RemitoCard } from '../components/RemitoCard';
import { RemitoUploader } from '../components/RemitoUploader';
import { RemitoDetail } from '../components/RemitoDetail';
import { AutocompleteInput } from '../../../components/common/AutocompleteInput';
import type { Remito, RemitoEstado } from '../types';

type FilterType = 'todos' | 'PENDIENTE_APROBACION' | 'APROBADO' | 'RECHAZADO';

export function RemitosPage() {
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const canApprove = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_INTERNO' || user?.role === 'DADOR_CARGA';
  
  // Por defecto mostrar pendientes
  const [activeFilter, setActiveFilter] = useState<FilterType>('PENDIENTE_APROBACION');
  const [search, setSearch] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  const [selectedRemito, setSelectedRemito] = useState<Remito | null>(null);
  const [page, setPage] = useState(1);
  
  // Estados para exportación
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    fechaDesde: '',
    fechaHasta: '',
    estado: '',
    clienteNombre: '',
    transportistaNombre: '',
    patenteChasis: '',
  });
  
  // Query params
  const queryParams = {
    estado: activeFilter !== 'todos' ? activeFilter as RemitoEstado : undefined,
    numeroRemito: search || undefined,
    page,
    limit: 20,
  };
  
  const { data: remitosData, isLoading, isFetching, refetch } = useGetRemitosQuery(queryParams, {
    refetchOnMountOrArgChange: true,
  });
  
  const remitos = remitosData?.data || [];
  const pagination = remitosData?.pagination;
  const stats = remitosData?.stats; // Stats vienen incluidos en la misma respuesta (optimizado)
  
  const handleUploadSuccess = () => {
    setShowUploader(false);
    refetch();
  };

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportFilters.fechaDesde) params.append('fechaDesde', exportFilters.fechaDesde);
      if (exportFilters.fechaHasta) params.append('fechaHasta', exportFilters.fechaHasta);
      if (exportFilters.estado) params.append('estado', exportFilters.estado);
      if (exportFilters.clienteNombre) params.append('clienteNombre', exportFilters.clienteNombre);
      if (exportFilters.transportistaNombre) params.append('transportistaNombre', exportFilters.transportistaNombre);
      if (exportFilters.patenteChasis) params.append('patenteChasis', exportFilters.patenteChasis);

      const baseUrl = import.meta.env.VITE_REMITOS_API_URL || '/api/remitos';
      const response = await fetch(`${baseUrl}/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al exportar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remitos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exportando:', error);
      alert('Error al exportar los remitos');
    } finally {
      setExporting(false);
    }
  };
  
  // Si hay un remito seleccionado, mostrar el detalle
  if (selectedRemito) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <RemitoDetail
          remito={selectedRemito}
          onBack={() => setSelectedRemito(null)}
          canApprove={canApprove}
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
            title="Actualizar"
          >
            <ArrowPathIcon className={`h-5 w-5 text-slate-600 dark:text-slate-300 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            title="Exportar a Excel"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Exportar</span>
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
      
      {/* Stats - Clickeables para filtrar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard 
            label="Total" 
            value={stats.total} 
            color="blue" 
            active={activeFilter === 'todos'}
            onClick={() => handleFilterClick('todos')}
          />
          <StatCard 
            label="Pendientes" 
            value={stats.pendientes} 
            color="yellow" 
            active={activeFilter === 'PENDIENTE_APROBACION'}
            onClick={() => handleFilterClick('PENDIENTE_APROBACION')}
          />
          <StatCard 
            label="Aprobados" 
            value={stats.aprobados} 
            color="green" 
            active={activeFilter === 'APROBADO'}
            onClick={() => handleFilterClick('APROBADO')}
          />
          <StatCard 
            label="Rechazados" 
            value={stats.rechazados} 
            color="red" 
            active={activeFilter === 'RECHAZADO'}
            onClick={() => handleFilterClick('RECHAZADO')}
          />
        </div>
      )}
      
      {/* Uploader */}
      {showUploader && (
        <RemitoUploader
          onSuccess={handleUploadSuccess}
        />
      )}
      
      {/* Búsqueda */}
      <div className="flex justify-end">
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
        <div className="space-y-3">
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
            No hay remitos {activeFilter !== 'todos' && getFilterLabel(activeFilter)}
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            {activeFilter === 'todos' 
              ? 'Cargá tu primer remito para comenzar'
              : 'No se encontraron remitos con este estado'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
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

      {/* Modal de Exportación */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowDownTrayIcon className="h-5 w-5 text-green-600" />
                Exportar Remitos a Excel
              </h3>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Seleccioná los filtros para la exportación. Dejá en blanco para exportar todos.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={exportFilters.fechaDesde}
                    onChange={(e) => setExportFilters(f => ({ ...f, fechaDesde: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={exportFilters.fechaHasta}
                    onChange={(e) => setExportFilters(f => ({ ...f, fechaHasta: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estado
                </label>
                <select
                  value={exportFilters.estado}
                  onChange={(e) => setExportFilters(f => ({ ...f, estado: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE_APROBACION">Pendiente Aprobación</option>
                  <option value="APROBADO">Aprobado</option>
                  <option value="RECHAZADO">Rechazado</option>
                  <option value="PENDIENTE_ANALISIS">Pendiente Análisis</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cliente
                </label>
                <AutocompleteInput
                  value={exportFilters.clienteNombre}
                  onChange={(value) => setExportFilters(f => ({ ...f, clienteNombre: value }))}
                  field="cliente"
                  placeholder="Buscar por nombre de cliente..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Transportista
                </label>
                <AutocompleteInput
                  value={exportFilters.transportistaNombre}
                  onChange={(value) => setExportFilters(f => ({ ...f, transportistaNombre: value }))}
                  field="transportista"
                  placeholder="Buscar por transportista..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Patente Chasis
                </label>
                <AutocompleteInput
                  value={exportFilters.patenteChasis}
                  onChange={(value) => setExportFilters(f => ({ ...f, patenteChasis: value }))}
                  field="patente"
                  placeholder="Buscar por patente..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Exportar Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper para obtener label del filtro
function getFilterLabel(filter: FilterType): string {
  const labels: Record<FilterType, string> = {
    todos: '',
    PENDIENTE_APROBACION: 'pendientes',
    APROBADO: 'aprobados',
    RECHAZADO: 'rechazados',
  };
  return labels[filter];
}

// Componente de tarjeta de estadísticas - ahora clickeable
interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'green' | 'red';
  active?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, color, active, onClick }: StatCardProps) {
  const colors = {
    blue: {
      base: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      active: 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900',
    },
    yellow: {
      base: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      active: 'ring-2 ring-yellow-500 ring-offset-2 dark:ring-offset-slate-900',
    },
    green: {
      base: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
      active: 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-slate-900',
    },
    red: {
      base: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
      active: 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-slate-900',
    },
  };
  
  return (
    <button
      onClick={onClick}
      className={`
        p-4 rounded-xl border text-left transition-all cursor-pointer
        hover:scale-[1.02] hover:shadow-md
        ${colors[color].base}
        ${active ? colors[color].active : ''}
      `}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </button>
  );
}

export default RemitosPage;
