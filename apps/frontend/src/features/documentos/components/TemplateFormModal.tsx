import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { DocumentTemplate } from '../api/documentosApiSlice';
import {
  XMarkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    nombre: string;
    entityType: string;
  }) => void;
  template?: DocumentTemplate | null;
  isLoading: boolean;
}

export const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  template,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    entityType: 'CHOFER',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template) {
      setFormData({
        nombre: template.nombre,
        entityType: template.entityType,
      });
    } else {
      setFormData({
        nombre: '',
        entityType: 'CHOFER',
      });
    }
    setErrors({});
  }, [template, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    const newErrors: Record<string, string> = {};
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    
    if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }
    
    if (!formData.entityType) {
      newErrors.entityType = 'El tipo de entidad es requerido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSave({
        nombre: formData.nombre.trim(),
        entityType: formData.entityType,
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-xl font-semibold flex items-center'>
            <DocumentTextIcon className='h-6 w-6 mr-2 text-blue-600' />
            {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h2>
          <Button variant='ghost' size='sm' onClick={onClose}>
            <XMarkIcon className='h-5 w-5' />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-6'>
          {/* Nombre */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Nombre de la Plantilla *
            </label>
            <input
              type='text'
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder='Ej: Licencia de Conducir, CUIT, etc.'
              className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.nombre ? 'border-red-300' : 'border-gray-300'
              }`}
              maxLength={100}
            />
            {errors.nombre && (
              <p className='text-red-600 text-sm mt-1'>{errors.nombre}</p>
            )}
          </div>

          {/* Tipo de Entidad */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Tipo de Entidad *
            </label>
            <select
              value={formData.entityType}
              onChange={(e) => handleChange('entityType', e.target.value)}
              className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.entityType ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value='EMPRESA_TRANSPORTISTA'>🏢 Empresa Transportista</option>
              <option value='CHOFER'>👨‍💼 Chofer</option>
              <option value='CAMION'>🚛 Camión</option>
              <option value='ACOPLADO'>🚚 Acoplado</option>
            </select>
            {errors.entityType && (
              <p className='text-red-600 text-sm mt-1'>{errors.entityType}</p>
            )}
          </div>



          {/* Información adicional */}
          <div className='bg-blue-50 p-4 rounded-md'>
            <h4 className='font-medium text-blue-900 mb-2'>Información</h4>
            <ul className='text-sm text-blue-700 space-y-1'>
              <li>• Las plantillas activas aparecerán en el formulario de subida</li>
              <li>• Cada dador puede configurar qué plantillas usar</li>
              <li>• Solo los superadmins pueden gestionar plantillas</li>
            </ul>
          </div>

          {/* Botones */}
          <div className='flex justify-end space-x-3 pt-4 border-t'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type='submit'
              disabled={isLoading}
              className='bg-blue-600 hover:bg-blue-700'
            >
              {isLoading ? (
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
              ) : null}
              {template ? 'Actualizar' : 'Crear'} Plantilla
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
