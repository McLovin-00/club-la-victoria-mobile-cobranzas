import React, { useState } from 'react';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CameraIcon,
  BellIcon 
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface AlertaUrgente {
  id: string;
  equipoId: number;
  documentoTipo: string;
  diasVencimiento: number;
  prioridad: 'alta' | 'media' | 'baja';
  mensaje: string;
}

interface AlertasUrgentesProps {
  alertas: AlertaUrgente[];
}

/**
 * AlertasUrgentes - Lista expandible de alertas
 * Priorizadas por urgencia con acciones rápidas
 */
export const AlertasUrgentes: React.FC<AlertasUrgentesProps> = ({ alertas }) => {
  const [expanded, setExpanded] = useState(false);

  // Ordenar alertas por prioridad y días de vencimiento
  const sortedAlertas = [...(alertas ?? [])].sort((a, b) => {
    const prioridadOrder = { alta: 0, media: 1, baja: 2 };
    if (prioridadOrder[a.prioridad] !== prioridadOrder[b.prioridad]) {
      return prioridadOrder[a.prioridad] - prioridadOrder[b.prioridad];
    }
    return a.diasVencimiento - b.diasVencimiento;
  });

  // Mostrar solo las 3 más urgentes si está collapsed
  const displayAlertas = expanded ? sortedAlertas : sortedAlertas.slice(0, 3);

  const getPrioridadStyle = (prioridad: string) => {
    switch (prioridad) {
      case 'alta':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'text-red-500',
          badge: 'bg-red-500',
        };
      case 'media':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200', 
          text: 'text-orange-700',
          icon: 'text-orange-500',
          badge: 'bg-orange-500',
        };
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: 'text-yellow-500',
          badge: 'bg-yellow-500',
        };
    }
  };

  const handleAlertaAction = (alertaId: string, action: 'upload' | 'remind') => {
    console.log(`Action ${action} for alerta ${alertaId}`);
    // Implementar navegación o acción específica
  };

  if (!alertas || alertas.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-800">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ¡Todo al día!
          </h3>
          <p className="text-gray-600">
            No tienes alertas urgentes por el momento
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <TouchFeedback
        onPress={() => setExpanded(!expanded)}
        hapticFeedback="light"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <BellIcon className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Alertas Urgentes
              </h3>
              <p className="text-sm text-gray-600">
                {alertas.length} documento{alertas.length > 1 ? 's' : ''} requiere{alertas.length === 1 ? '' : 'n'} atención
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Badge de count */}
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              {alertas.length}
            </div>
            
            {/* Expand/Collapse icon */}
            {expanded ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </TouchFeedback>

      {/* Alertas List */}
      <div className="p-6 space-y-4">
        {displayAlertas.map((alerta, _index) => {
          const style = getPrioridadStyle(alerta.prioridad);
          
          return (
            <div
              key={alerta.id}
              className={cn(
                'border-2 rounded-xl p-4 transition-all duration-200',
                style.bg,
                style.border
              )}
            >
              <div className="flex items-start space-x-3">
                {/* Priority Indicator */}
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  style.bg
                )}>
                  {alerta.diasVencimiento <= 0 ? (
                    <ClockIcon className={cn('w-4 h-4', style.icon)} />
                  ) : (
                    <ExclamationTriangleIcon className={cn('w-4 h-4', style.icon)} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className={cn('font-semibold text-sm', style.text)}>
                        {alerta.documentoTipo}
                      </div>
                      <div className="text-xs text-gray-600">
                        Equipo #{alerta.equipoId}
                      </div>
                    </div>
                    
                    {/* Days badge */}
                    <div className={cn(
                      'text-xs px-2 py-1 rounded-full text-white font-semibold',
                      style.badge
                    )}>
                      {alerta.diasVencimiento <= 0 
                        ? 'VENCIDO' 
                        : `${alerta.diasVencimiento}d`
                      }
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">
                    {alerta.mensaje}
                  </p>

                  {/* Quick Actions */}
                  <div className="flex space-x-2">
                    <TouchFeedback
                      onPress={() => handleAlertaAction(alerta.id, 'upload')}
                      hapticFeedback="light"
                    >
                      <div className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1">
                        <CameraIcon className="w-3 h-3" />
                        <span>Subir</span>
                      </div>
                    </TouchFeedback>
                    
                    <TouchFeedback
                      onPress={() => handleAlertaAction(alerta.id, 'remind')}
                      hapticFeedback="light"
                    >
                      <div className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1">
                        <BellIcon className="w-3 h-3" />
                        <span>Recordar</span>
                      </div>
                    </TouchFeedback>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Show More/Less */}
        {alertas.length > 3 && (
          <TouchFeedback
            onPress={() => setExpanded(!expanded)}
            hapticFeedback="light"
          >
            <div className="text-center py-2">
              <div className="text-sm text-blue-600 font-medium">
                {expanded 
                  ? 'Ver menos' 
                  : `Ver ${alertas.length - 3} más`
                }
              </div>
            </div>
          </TouchFeedback>
        )}
      </div>
    </div>
  );
};

export default AlertasUrgentes;
