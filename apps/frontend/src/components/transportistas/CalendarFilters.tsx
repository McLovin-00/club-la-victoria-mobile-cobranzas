import React, { useState } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  CalendarDaysIcon,
  TruckIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ToggleSwitch } from '../ui/toggle-switch';
import { CalendarFilters as FiltersType, FilterOption, useEventFilters } from '../../hooks/useEventFilters';

interface CalendarFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FiltersType;
  onFiltersChange: ReturnType<typeof useEventFilters>;
  equipoOptions: FilterOption[];
  tipoDocumentoOptions: FilterOption[];
}

/**
 * CalendarFilters - Panel de filtros avanzados del calendario
 * Diseño mobile-first con controles touch-friendly
 */
export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  equipoOptions,
  tipoDocumentoOptions,
}) => {
  const [searchQuery, setSearchQuery] = useState(filters.search);

  if (!isOpen) return null;

  const {
    updateFilter,
    toggleArrayFilter,
    clearFilters,
    clearFilter,
    applyUrgentPreset,
    applyThisMonthPreset,
    applyNext30DaysPreset,
    activeFiltersCount,
  } = onFiltersChange;

  // Manejar búsqueda con debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Debounce de 300ms
    setTimeout(() => {
      updateFilter('search', value);
    }, 300);
  };

  // Presets rápidos
  const presets = [
    {
      id: 'urgent',
      label: 'Urgentes (7 días)',
      icon: FireIcon,
      color: 'bg-red-100 text-red-700 border-red-200',
      action: applyUrgentPreset,
    },
    {
      id: 'month',
      label: 'Este mes',
      icon: CalendarDaysIcon,
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      action: applyThisMonthPreset,
    },
    {
      id: 'next30',
      label: 'Próximos 30 días',
      icon: ClockIcon,
      color: 'bg-green-100 text-green-700 border-green-200',
      action: applyNext30DaysPreset,
    },
  ];

  const prioridadOptions: FilterOption[] = [
    { id: 'alta', label: 'Alta', count: 0, color: 'text-red-600' },
    { id: 'media', label: 'Media', count: 0, color: 'text-yellow-600' },
    { id: 'baja', label: 'Baja', count: 0, color: 'text-green-600' },
  ];

  const estadoOptions: FilterOption[] = [
    { id: 'vencido', label: 'Vencido', count: 0, color: 'text-red-600' },
    { id: 'proximo', label: 'Próximo a vencer', count: 0, color: 'text-yellow-600' },
    { id: 'vigente', label: 'Vigente', count: 0, color: 'text-green-600' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <FunnelIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Filtros</h3>
              {activeFiltersCount > 0 && (
                <p className="text-sm text-blue-600">
                  {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <TouchFeedback>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-blue-600 hover:bg-blue-100"
                >
                  Limpiar
                </Button>
              </TouchFeedback>
            )}
            <TouchFeedback>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </TouchFeedback>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)] pb-20">
          <div className="p-4 space-y-6">
            
            {/* Búsqueda */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                <h4 className="font-semibold text-gray-900">Buscar</h4>
              </div>
              <Input
                type="text"
                placeholder="Buscar por equipo o documento..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />
            </Card>

            {/* Presets rápidos */}
            <Card className="p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Filtros rápidos</h4>
              <div className="grid grid-cols-1 gap-2">
                {presets.map(preset => (
                  <TouchFeedback key={preset.id}>
                    <button
                      onClick={preset.action}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${preset.color}`}
                    >
                      <preset.icon className="h-5 w-5" />
                      <span className="font-medium">{preset.label}</span>
                    </button>
                  </TouchFeedback>
                ))}
              </div>
            </Card>

            {/* Toggles principales */}
            <Card className="p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Opciones</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-gray-900">Solo urgentes</span>
                    <Badge variant="destructive" className="text-xs">Crítico</Badge>
                  </div>
                  <ToggleSwitch
                    checked={filters.soloUrgentes}
                    onChange={(checked) => updateFilter('soloUrgentes', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TruckIcon className="h-5 w-5 text-blue-500" />
                    <span className="font-medium text-gray-900">Solo mis equipos</span>
                  </div>
                  <ToggleSwitch
                    checked={filters.soloMisEquipos}
                    onChange={(checked) => updateFilter('soloMisEquipos', checked)}
                  />
                </div>
              </div>
            </Card>

            {/* Estados */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-gray-500" />
                  <h4 className="font-semibold text-gray-900">Estados</h4>
                </div>
                {filters.estados.length > 0 && (
                  <TouchFeedback>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearFilter('estados')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Limpiar
                    </Button>
                  </TouchFeedback>
                )}
              </div>
              <div className="space-y-2">
                {estadoOptions.map(option => (
                  <TouchFeedback key={option.id}>
                    <div
                      onClick={() => toggleArrayFilter('estados', option.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                        filters.estados.includes(option.id as any)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`font-medium ${option.color}`}>
                        {option.label}
                      </span>
                      {filters.estados.includes(option.id as any) && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </TouchFeedback>
                ))}
              </div>
            </Card>

            {/* Prioridades */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />
                  <h4 className="font-semibold text-gray-900">Prioridades</h4>
                </div>
                {filters.prioridades.length > 0 && (
                  <TouchFeedback>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearFilter('prioridades')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Limpiar
                    </Button>
                  </TouchFeedback>
                )}
              </div>
              <div className="space-y-2">
                {prioridadOptions.map(option => (
                  <TouchFeedback key={option.id}>
                    <div
                      onClick={() => toggleArrayFilter('prioridades', option.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                        filters.prioridades.includes(option.id as any)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`font-medium ${option.color}`}>
                        {option.label}
                      </span>
                      {filters.prioridades.includes(option.id as any) && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </TouchFeedback>
                ))}
              </div>
            </Card>

            {/* Equipos */}
            {equipoOptions.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TruckIcon className="h-5 w-5 text-gray-500" />
                    <h4 className="font-semibold text-gray-900">Equipos</h4>
                  </div>
                  {filters.equipos.length > 0 && (
                    <TouchFeedback>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearFilter('equipos')}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Limpiar
                      </Button>
                    </TouchFeedback>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {equipoOptions.map(option => (
                    <TouchFeedback key={option.id}>
                      <div
                        onClick={() => toggleArrayFilter('equipos', option.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                          filters.equipos.includes(option.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 block truncate">
                            {option.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {option.count} evento{option.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {filters.equipos.includes(option.id) && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 ml-2">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </TouchFeedback>
                  ))}
                </div>
              </Card>
            )}

            {/* Tipos de documento */}
            {tipoDocumentoOptions.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DocumentIcon className="h-5 w-5 text-gray-500" />
                    <h4 className="font-semibold text-gray-900">Tipos de documento</h4>
                  </div>
                  {filters.tiposDocumento.length > 0 && (
                    <TouchFeedback>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearFilter('tiposDocumento')}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Limpiar
                      </Button>
                    </TouchFeedback>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tipoDocumentoOptions.map(option => (
                    <TouchFeedback key={option.id}>
                      <div
                        onClick={() => toggleArrayFilter('tiposDocumento', option.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                          filters.tiposDocumento.includes(option.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 block truncate">
                            {option.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {option.count} evento{option.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {filters.tiposDocumento.includes(option.id) && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 ml-2">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </TouchFeedback>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Footer fijo */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <div className="flex gap-3">
            <TouchFeedback className="flex-1">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex-1 h-12 text-base font-medium"
                disabled={activeFiltersCount === 0}
              >
                Limpiar todo
              </Button>
            </TouchFeedback>
            <TouchFeedback className="flex-1">
              <Button
                onClick={onClose}
                className="flex-1 h-12 text-base font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                Aplicar filtros
              </Button>
            </TouchFeedback>
          </div>
        </div>
      </div>
    </div>
  );
};
