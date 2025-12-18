import { Remito, ESTADO_LABELS, ESTADO_COLORS } from '../types';
import { 
  DocumentTextIcon, 
  TruckIcon, 
  UserIcon,
  CalendarIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';

interface RemitoCardProps {
  remito: Remito;
  onClick?: () => void;
}

export function RemitoCard({ remito, onClick }: RemitoCardProps) {
  const estadoLabel = ESTADO_LABELS[remito.estado];
  const estadoColor = ESTADO_COLORS[remito.estado];
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  const formatWeight = (weight: number | null) => {
    if (weight === null) return '-';
    return `${weight.toLocaleString('es-AR')} kg`;
  };
  
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700
        p-4 hover:shadow-md transition-shadow cursor-pointer
      `}
    >
      {/* Header con número y estado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-slate-500" />
          <span className="font-semibold text-slate-900 dark:text-white">
            {remito.numeroRemito || `#${remito.id}`}
          </span>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${estadoColor}`}>
          {estadoLabel}
        </span>
      </div>
      
      {/* Info principal */}
      <div className="space-y-2 text-sm">
        {/* Fecha */}
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <CalendarIcon className="h-4 w-4" />
          <span>{formatDate(remito.fechaOperacion)}</span>
        </div>
        
        {/* Transportista */}
        {remito.transportistaNombre && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <TruckIcon className="h-4 w-4" />
            <span className="truncate">{remito.transportistaNombre}</span>
          </div>
        )}
        
        {/* Chofer */}
        {remito.choferNombre && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <UserIcon className="h-4 w-4" />
            <span className="truncate">{remito.choferNombre}</span>
          </div>
        )}
        
        {/* Peso neto */}
        {remito.pesoOrigenNeto && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <ScaleIcon className="h-4 w-4" />
            <span>{formatWeight(remito.pesoOrigenNeto)}</span>
          </div>
        )}
      </div>
      
      {/* Patentes */}
      {(remito.patenteChasis || remito.patenteAcoplado) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex flex-wrap gap-2">
            {remito.patenteChasis && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300">
                🚛 {remito.patenteChasis}
              </span>
            )}
            {remito.patenteAcoplado && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300">
                🚚 {remito.patenteAcoplado}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Confianza IA */}
      {remito.confianzaIA !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                remito.confianzaIA >= 80 ? 'bg-green-500' :
                remito.confianzaIA >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${remito.confianzaIA}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{remito.confianzaIA}%</span>
        </div>
      )}
    </div>
  );
}

