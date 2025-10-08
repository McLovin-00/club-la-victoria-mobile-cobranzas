import React, { useState } from 'react';
import { formatDate } from '../../../utils/formatters';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { DocumentTemplate } from '../api/documentosApiSlice';
import { Skeleton, SkeletonTableRows } from '../../../components/ui/Skeleton';
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface TemplatesListProps {
  templates: DocumentTemplate[];
  isLoading: boolean;
  onEdit: (template: DocumentTemplate) => void;
  onDelete: (id: number) => void;
  onToggleActive: (template: DocumentTemplate) => void;
}

export const TemplatesList: React.FC<TemplatesListProps> = ({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case 'EMPRESA_TRANSPORTISTA':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CHOFER':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CAMION':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ACOPLADO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEntityTypeIcon = (entityType: string) => {
    switch (entityType) {
      case 'EMPRESA_TRANSPORTISTA':
        return '🏢';
      case 'CHOFER':
        return '👨‍💼';
      case 'CAMION':
        return '🚛';
      case 'ACOPLADO':
        return '🚚';
      default:
        return '📄';
    }
  };

  // formateo de fechas unificado vía utils/formatters

  // Filtrar templates
  const filteredTemplates = templates.filter((template) => {
    if (filterEntityType !== 'all' && template.entityType !== filterEntityType) {
      return false;
    }
    if (filterActive === 'active' && !template.isActive) {
      return false;
    }
    if (filterActive === 'inactive' && template.isActive) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <Card className='p-6'>
        <div className='mb-4 flex items-center gap-3'>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='h-6 w-24' />
        </div>
        <SkeletonTableRows rows={5} />
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card className='p-8 text-center'>
        <DocumentTextIcon className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
        <h3 className='text-lg font-medium text-foreground mb-2'>
          No hay plantillas
        </h3>
        <p className='text-muted-foreground'>
          Comienza creando la primera plantilla del sistema.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      {/* Filtros */}
      <div className='p-6 border-b border-border'>
        <div className='flex flex-wrap gap-4'>
          <div>
            <label className='block text-sm font-medium text-foreground mb-2'>
              Tipo de Entidad
            </label>
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className='px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            >
              <option value='all'>Todos</option>
              <option value='EMPRESA_TRANSPORTISTA'>Empresa Transportista</option>
              <option value='CHOFER'>Chofer</option>
              <option value='CAMION'>Camión</option>
              <option value='ACOPLADO'>Acoplado</option>
            </select>
          </div>
          <div>
            <label className='block text-sm font-medium text-foreground mb-2'>
              Estado
            </label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className='px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            >
              <option value='all'>Todos</option>
              <option value='active'>Activas</option>
              <option value='inactive'>Inactivas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className='p-6'>
        <h2 className='text-xl font-semibold mb-4'>
          Plantillas ({filteredTemplates.length})
        </h2>
      </div>

      {/* Lista */}
      <div className='divide-y divide-border'>
        {filteredTemplates.map((template) => (
          <div 
            key={template.id} 
            className={`p-6 transition-colors ${
              template.isActive 
                ? 'hover:bg-muted/50' 
                : 'hover:bg-red-50/50 bg-gray-50/30 border-l-4 border-l-red-300'
            }`}
          >
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center space-x-3 mb-3'>
                  <span className='text-2xl'>
                    {getEntityTypeIcon(template.entityType)}
                  </span>
                  <div>
                    <h3 className={`font-medium text-lg ${
                      template.isActive 
                        ? 'text-foreground' 
                        : 'text-gray-600'
                    }`}>
                      {template.nombre}
                    </h3>
                    <div className='flex items-center space-x-2 mt-1'>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getEntityTypeColor(
                          template.entityType
                        )}`}
                      >
                        {template.entityType}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          template.isActive
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {template.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>

                {template.descripcion && (
                  <p className='text-muted-foreground mb-3'>
                    {template.descripcion}
                  </p>
                )}

                <div className='flex items-center space-x-4 text-sm text-muted-foreground'>
                  <span>ID: {template.id}</span>
                  <span>Creada: {formatDate(template.createdAt)}</span>
                  <span>Actualizada: {formatDate(template.updatedAt)}</span>
                </div>
              </div>

              <div className='flex items-center space-x-2 ml-4'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onToggleActive(template)}
                  className={`flex items-center ${
                    template.isActive 
                      ? 'hover:bg-red-50 hover:text-red-700 hover:border-red-300' 
                      : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                  }`}
                >
                  {template.isActive ? (
                    <EyeSlashIcon className='h-4 w-4 mr-1' />
                  ) : (
                    <EyeIcon className='h-4 w-4 mr-1' />
                  )}
                  {template.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onEdit(template)}
                  className='flex items-center'
                >
                  <PencilIcon className='h-4 w-4 mr-1' />
                  Editar
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onDelete(template.id)}
                  className='text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 flex items-center'
                >
                  <TrashIcon className='h-4 w-4 mr-1' />
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className='p-8 text-center'>
          <DocumentTextIcon className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-medium text-foreground mb-2'>
            No hay plantillas que coincidan con los filtros
          </h3>
          <p className='text-muted-foreground'>
            Ajusta los filtros para ver más resultados.
          </p>
        </div>
      )}
    </Card>
  );
};
