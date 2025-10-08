import React from 'react';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { 
  TruckIcon, 
  DocumentCheckIcon, 
  ExclamationTriangleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface EquiposResumenProps {
  stats: {
    vigentes: number;
    vencidos: number;
    proximos: number;
    total: number;
  };
}

interface StatCard {
  id: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
}

/**
 * EquiposResumen - Cards con estadísticas clave
 * Touch-friendly y visualmente claras
 */
export const EquiposResumen: React.FC<EquiposResumenProps> = ({ stats }) => {
  const { 
    vigentes = 0, 
    vencidos = 0, 
    proximos = 0, 
    total = 0 
  } = stats || {};

  const statCards: StatCard[] = [
    {
      id: 'vigentes',
      label: 'Vigentes',
      value: vigentes,
      icon: DocumentCheckIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      description: 'Documentos al día',
    },
    {
      id: 'proximos',
      label: 'Próximos',
      value: proximos,
      icon: ExclamationTriangleIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      description: 'Vencen pronto',
    },
    {
      id: 'vencidos',
      label: 'Vencidos',
      value: vencidos,
      icon: ClockIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      description: 'Requieren acción',
    },
  ];

  const handleCardPress = (cardId: string) => {
    // Navegar a vista filtrada según el tipo
    console.log(`Navigating to filtered view: ${cardId}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Estado de Documentos
        </h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <TruckIcon className="w-4 h-4" />
          <span>{total} total</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <TouchFeedback
            key={card.id}
            onPress={() => handleCardPress(card.id)}
            hapticFeedback="light"
            scaleOnPress
          >
            <div className={cn(
              'bg-white dark:bg-slate-900 rounded-xl border-2 border-gray-100 dark:border-slate-800 p-4 shadow-md transition-all duration-200',
              'hover:shadow-lg hover:-translate-y-0.5',
              card.bgColor
            )}>
              {/* Icon y Value */}
              <div className="flex items-center justify-between mb-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  card.color.replace('text-', 'bg-').replace('-600', '-100')
                )}>
                  <card.icon className={cn('w-5 h-5', card.color)} />
                </div>
                <div className={cn('text-2xl font-bold', card.color)}>
                  {card.value}
                </div>
              </div>

              {/* Label y Description */}
              <div>
                <div className="font-semibold text-gray-900 mb-1">
                  {card.label}
                </div>
                <div className="text-xs text-gray-600">
                  {card.description}
                </div>
              </div>

              {/* Progress Bar (solo si hay datos) */}
              {total > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-500',
                        card.color.replace('text-', 'bg-')
                      )}
                      style={{ 
                        width: `${(card.value / total) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {total > 0 ? Math.round((card.value / total) * 100) : 0}% del total
                  </div>
                </div>
              )}
            </div>
          </TouchFeedback>
        ))}
      </div>

      {/* Quick Action */}
      {vencidos > 0 && (
        <TouchFeedback
          onPress={() => handleCardPress('action-urgente')}
          hapticFeedback="medium"
        >
          <div className="bg-red-500 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Acción Requerida</div>
                <div className="text-sm opacity-90">
                  {vencidos} documento{vencidos > 1 ? 's' : ''} vencido{vencidos > 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-xs bg-white/20 px-2 py-1 rounded-full">
                ¡Urgente!
              </div>
            </div>
          </div>
        </TouchFeedback>
      )}
    </div>
  );
};

export default EquiposResumen;
