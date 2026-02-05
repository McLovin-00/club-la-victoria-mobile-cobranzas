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
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      role="button"
      tabIndex={0}
      className="rounded-lg border bg-white dark:bg-slate-900 p-3 grid gap-3 md:grid-cols-[1fr,auto,auto] items-center hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Info principal */}
      <div className="space-y-1">
        {/* Número y estado (mobile) */}
        <div className="font-medium flex items-center gap-2 flex-wrap">
          <DocumentTextIcon className="h-5 w-5 text-slate-500" />
          <span className="text-slate-900 dark:text-white">
            {remito.numeroRemito || `#${remito.id}`}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${estadoColor} md:hidden`}>
            {estadoLabel}
          </span>
        </div>
        
        {/* Detalles en línea */}
        <div className="text-sm text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {formatDate(remito.fechaOperacion)}
          </span>
          {remito.transportistaNombre && (
            <span className="flex items-center gap-1">
              <TruckIcon className="h-4 w-4" />
              {remito.transportistaNombre}
            </span>
          )}
          {remito.choferNombre && (
            <span className="flex items-center gap-1">
              <UserIcon className="h-4 w-4" />
              {remito.choferNombre}
            </span>
          )}
          {remito.pesoOrigenNeto && (
            <span className="flex items-center gap-1">
              <ScaleIcon className="h-4 w-4" />
              {formatWeight(remito.pesoOrigenNeto)}
            </span>
          )}
        </div>
        
        {/* Patentes */}
        {(remito.patenteChasis || remito.patenteAcoplado) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {remito.patenteChasis && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                🚛 {remito.patenteChasis}
              </span>
            )}
            {remito.patenteAcoplado && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                🚚 {remito.patenteAcoplado}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Confianza IA */}
      <div className="justify-self-start md:justify-self-center min-w-[100px]">
        {remito.confianzaIA !== null && (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
      
      {/* Estado (desktop) */}
      <div className="hidden md:flex justify-self-end">
        <span className={`text-xs px-2.5 py-1 font-medium rounded-full ${estadoColor}`}>
          {estadoLabel}
        </span>
      </div>
    </div>
  );
}
