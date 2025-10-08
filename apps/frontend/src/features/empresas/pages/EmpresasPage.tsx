import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { showToast } from '../../../components/ui/Toast.utils';
import { EmpresaTable } from '../components/EmpresaTable';
import { EmpresaModal } from '../components/EmpresaModal';
import {
  useGetEmpresasQuery,
  useCreateEmpresaMutation,
  useUpdateEmpresaMutation,
  useDeleteEmpresaMutation,
} from '../api/empresasApiSlice';
import { Empresa, EmpresaCreateInput, EmpresaUpdateInput } from '../types';
import { PlusIcon } from '@heroicons/react/24/outline';

export const EmpresasPage: React.FC = () => {
  const _navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | undefined>(undefined);

  // Queries y mutations
  const { data: empresas = [], isLoading, error, refetch } = useGetEmpresasQuery();
  const [createEmpresa, { isLoading: isCreating }] = useCreateEmpresaMutation();
  const [updateEmpresa, { isLoading: isUpdating }] = useUpdateEmpresaMutation();
  const [deleteEmpresa] = useDeleteEmpresaMutation();

  const handleCreate = () => {
    setSelectedEmpresa(undefined);
    setModalOpen(true);
  };

  const handleEdit = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEmpresa(id).unwrap();
      showToast('Empresa eliminada exitosamente', 'success');
      // Refetch manual para asegurar que la tabla se actualice
      refetch();
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message
          : 'Error al eliminar la empresa';
      showToast(errorMessage || 'Error al eliminar la empresa', 'error');
    }
  };

  const handleSubmit = async (data: EmpresaCreateInput | EmpresaUpdateInput) => {
    try {
      if (selectedEmpresa) {
        // Actualizar empresa existente
        await updateEmpresa({
          id: selectedEmpresa.id,
          empresa: data,
        }).unwrap();
        showToast('Empresa actualizada exitosamente', 'success');
      } else {
        // Crear nueva empresa
        await createEmpresa(data).unwrap();
        showToast('Empresa creada exitosamente', 'success');
      }
      setModalOpen(false);
      setSelectedEmpresa(undefined);
      // Refetch manual para asegurar que la tabla se actualice inmediatamente
      refetch();
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message
          : 'Error al guardar la empresa';
      showToast(errorMessage || 'Error al guardar la empresa', 'error');
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEmpresa(undefined);
  };

  // Documentos navigation removed

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-red-600 mb-2'>Error</h2>
          <p className='text-muted-foreground'>No se pudieron cargar las empresas</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <div className='flex justify-between items-center'>
          <div>
            <h1 className='text-3xl font-bold text-foreground'>Gestión de Empresas</h1>
            <p className='text-muted-foreground mt-2'>
              Administra las empresas del sistema. Las empresas son utilizadas para organizar
              usuarios y controlar el acceso a diferentes secciones.
            </p>
          </div>
          <Button onClick={handleCreate} className='flex items-center'>
            <PlusIcon className='h-5 w-5 mr-2' />
            Nueva Empresa
          </Button>
        </div>
      </div>

      <EmpresaTable
        empresas={empresas}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <EmpresaModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        empresa={selectedEmpresa}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
};
