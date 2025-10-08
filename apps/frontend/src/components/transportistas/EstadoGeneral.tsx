import React, { useState } from 'react';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface EstadoGeneralProps {
  stats: {
    cumplimiento: number;
    vigentes: number;
    vencidos: number;
    proximos: number;
    total: number;
  };
}

/**
 * EstadoGeneral - Semáforo visual del cumplimiento
 * El centro de gravedad del dashboard
 */
export const EstadoGeneral: React.FC<EstadoGeneralProps> = ({ stats }) => {
  const [expanded, setExpanded] = useState(false);

  const { 
    cumplimiento = 0, 
    vigentes = 0, 
    vencidos = 0, 
    proximos = 0, 
    total = 0 
  } = stats || {};

  // Determinar color según porcentaje de cumplimiento
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  const statusColor = getStatusColor(cumplimiento);
  
  const colorClasses = {
    success: {
      bg: 'from-green-400 to-emerald-500',
      text: 'text-green-700',
      border: 'border-green-200',
      ring: 'ring-green-500/20',
    },
    warning: {
      bg: 'from-yellow-400 to-orange-500',
      text: 'text-orange-700',
      border: 'border-orange-200',
      ring: 'ring-orange-500/20',
    },
    error: {
      bg: 'from-red-400 to-red-500',
      text: 'text-red-700',
      border: 'border-red-200',
      ring: 'ring-red-500/20',
    },
  };

  const colors = colorClasses[statusColor];

  const circumference = 2 * Math.PI * 45; // radio = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (cumplimiento / 100) * circumference;

  return (
    <TouchFeedback
      onPress={() => setExpanded(!expanded)}
      scaleOnPress
      hapticFeedback="light"
    >
      <div className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-2 border-gray-100 dark:border-slate-800 transition-all duration-300',
        'hover:shadow-2xl',
        colors.border,
        expanded ? 'ring-4' : '',
        colors.ring
      )}>
        {/* Main Circle */}
        <div className="p-8">
          <div className="flex flex-col items-center">
            {/* Progress Circle */}
            <div className="relative w-36 h-36 mb-6">
              {/* Background Circle */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                {/* Progress Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" className={cn('stop-color-current', statusColor === 'success' ? 'text-green-400' : statusColor === 'warning' ? 'text-yellow-400' : 'text-red-400')} />
                    <stop offset="100%" className={cn('stop-color-current', statusColor === 'success' ? 'text-emerald-500' : statusColor === 'warning' ? 'text-orange-500' : 'text-red-500')} />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn('text-4xl font-bold', colors.text)}>
                  {cumplimiento}%
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Cumplimiento
                </div>
              </div>
            </div>

            {/* Status Message */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {statusColor === 'success' && '✅ Excelente cumplimiento'}
                {statusColor === 'warning' && '⚠️ Requiere atención'}
                {statusColor === 'error' && '❌ Acción inmediata'}
              </h3>
              <p className="text-sm text-gray-600">
                {vigentes} de {total} documentos vigentes
              </p>
            </div>

            {/* Expand/Collapse Indicator */}
            <div className="flex items-center space-x-2 text-gray-500">
              <span className="text-xs">
                {expanded ? 'Ver menos' : 'Ver detalles'}
              </span>
              {expanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="border-t border-gray-100 p-6 bg-gray-50/50 rounded-b-2xl">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{vigentes}</div>
                <div className="text-xs text-gray-600">Vigentes</div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{proximos}</div>
                <div className="text-xs text-gray-600">Próximos</div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">❌</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{vencidos}</div>
                <div className="text-xs text-gray-600">Vencidos</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 flex space-x-3">
              <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-colors">
                📄 Subir Documento
              </button>
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors">
                📊 Ver Reporte
              </button>
            </div>
          </div>
        )}
      </div>
    </TouchFeedback>
  );
};

export default EstadoGeneral;
