import React from 'react';
import { EstadoGeneral } from './EstadoGeneral';
import { EquiposResumen } from './EquiposResumen';
import { AlertasUrgentes } from './AlertasUrgentes';
import { AccionesRapidas } from './AccionesRapidas';
import { PullToRefresh } from '../mobile/PullToRefresh';
import { useEquipoStats } from '../../hooks/useEquipoStats';
import { cn } from '../../lib/utils';

interface DashboardCumplimientoProps {
  className?: string;
}

/**
 * DashboardCumplimiento - Centro de comando mobile-first
 * Una pantalla que lo dice todo, optimizada para touch
 */
export const DashboardCumplimiento: React.FC<DashboardCumplimientoProps> = ({
  className
}) => {
  const { stats, alertas, isLoading, refetch } = useEquipoStats();

  const handleRefresh = async () => {
    await refetch();
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className={cn('min-h-screen dark:text-slate-100', className)}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-950 dark:to-black">
        {/* Header con spacing para safe area */}
        <div className="pt-safe bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-slate-800">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  Panel de Control
                </h1>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Estado general de tus equipos
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🚛</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Estado General - Protagonista principal */}
          <EstadoGeneral stats={stats} />

          {/* Grid responsivo para stats secundarios */}
          <div className="grid grid-cols-1 gap-6">
            {/* Resumen de Equipos */}
            <EquiposResumen stats={stats} />

            {/* Alertas Urgentes */}
            <AlertasUrgentes alertas={alertas} />
          </div>

          {/* Acciones Rápidas */}
          <AccionesRapidas />
        </div>

        {/* Bottom padding para FAB */}
        <div className="h-20" />
      </div>
    </PullToRefresh>
  );
};

/**
 * Skeleton loading para el dashboard
 */
const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 animate-pulse">
      {/* Header skeleton */}
      <div className="pt-safe bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="px-4 py-6 space-y-6">
        {/* Estado General skeleton */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
            <div className="h-6 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={`skeleton-stat-${i}`} className="bg-white rounded-xl p-4 shadow-md">
              <div className="h-8 bg-gray-200 rounded w-8 mx-auto"></div>
              <div className="mt-2 h-6 bg-gray-200 rounded w-12 mx-auto"></div>
              <div className="mt-1 h-3 bg-gray-200 rounded w-16 mx-auto"></div>
            </div>
          ))}
        </div>

        {/* Alertas skeleton */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={`skeleton-alert-${i}`} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCumplimiento;
