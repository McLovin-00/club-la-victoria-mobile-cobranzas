import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Empresa, EmpresaCreateInput, EmpresaUpdateInput } from '../types';

interface EmpresaFormProps {
  empresa?: Empresa;
  onSubmit: (data: EmpresaCreateInput | EmpresaUpdateInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const EmpresaForm: React.FC<EmpresaFormProps> = ({
  empresa,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<EmpresaCreateInput>({
    nombre: '',
    descripcion: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Cargar datos de la empresa si está editando
  useEffect(() => {
    if (empresa) {
      setFormData({
        nombre: empresa.nombre,
        descripcion: empresa.descripcion || '',
      });
    }
  }, [empresa]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Limpiar error cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (formData.nombre.length > 150) {
      newErrors.nombre = 'El nombre no puede exceder 150 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='space-y-4'>
        <div>
          <Label htmlFor='nombre'>Nombre de la Empresa *</Label>
          <Input
            id='nombre'
            name='nombre'
            type='text'
            value={formData.nombre}
            onChange={handleChange}
            placeholder='Ingresa el nombre de la empresa'
            disabled={isLoading}
            className={errors.nombre ? 'border-red-500' : ''}
          />
          {errors.nombre && <p className='text-sm text-red-500 mt-1'>{errors.nombre}</p>}
        </div>

        <div>
          <Label htmlFor='descripcion'>Descripción</Label>
          <Textarea
            id='descripcion'
            name='descripcion'
            value={formData.descripcion}
            onChange={handleChange}
            placeholder='Descripción opcional de la empresa'
            disabled={isLoading}
            rows={3}
          />
        </div>
      </div>

      <div className='flex justify-end space-x-3'>
        <Button type='button' variant='outline' onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type='submit' disabled={isLoading}>
          {isLoading ? 'Guardando...' : empresa ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
};
