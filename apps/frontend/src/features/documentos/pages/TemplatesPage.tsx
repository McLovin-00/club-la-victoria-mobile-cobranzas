import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { TemplatesList } from '../components/TemplatesList';
import { TemplateFormModal } from '../components/TemplateFormModal';
import {
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  DocumentTemplate,
} from '../api/documentosApiSlice';
import {
  ArrowLeftIcon,
  PlusIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const { show } = useToast();
  const { confirm } = useConfirmDialog();

  // Queries
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useGetTemplatesQuery();

  // Mutations
  const [createTemplate, { isLoading: isCreating }] = useCreateTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateTemplateMutation();
  const [deleteTemplate] = useDeleteTemplateMutation();

  const handleBack = () => {
    navigate('/documentos');
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const handleEdit = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setModalOpen(true);
  };

  const handleSave = async (templateData: {
    nombre: string;
    entityType: string;
    descripcion?: string;
  }) => {
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, ...templateData }).unwrap();
        show('Plantilla actualizada exitosamente', 'success');
      } else {
        await createTemplate(templateData).unwrap();
        show('Plantilla creada exitosamente', 'success');
      }
      setModalOpen(false);
      setEditingTemplate(null);
      refetchTemplates();
    } catch (error: any) {
      const message = error?.data?.message || 'Error al guardar plantilla';
      show(message, 'error');
    }
  };

  const handleDelete = async (templateId: number) => {
    const ok = await confirm({ message: '¿Estás seguro de que deseas eliminar esta plantilla?', confirmText: 'Eliminar' });
    if (!ok) return;
    try {
      await deleteTemplate(templateId).unwrap();
      show('Plantilla eliminada exitosamente', 'success');
      refetchTemplates();
    } catch (error: any) {
      const message = error?.data?.message || 'Error al eliminar plantilla';
      show(message, 'error');
    }
  };

  const handleToggleActive = async (template: DocumentTemplate) => {
    try {
      await updateTemplate({ id: template.id, isActive: !template.isActive }).unwrap();
      show(`Plantilla ${!template.isActive ? 'activada' : 'desactivada'} exitosamente`, 'success');
      refetchTemplates();
    } catch (error: any) {
      const message = error?.data?.message || 'Error al cambiar estado de plantilla';
      show(message, 'error');
    }
  };

  if (templatesError) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-red-600 mb-2'>Error</h2>
          <p className='text-muted-foreground'>
            No se pudieron cargar las plantillas
          </p>
          <Button onClick={handleBack} className='mt-4'>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleBack}
              className='flex items-center'
            >
              <ArrowLeftIcon className='h-4 w-4 mr-2' />
              Volver
            </Button>
            <div>
              <h1 className='text-3xl font-bold text-foreground flex items-center'>
                <DocumentTextIcon className='h-8 w-8 mr-3 text-blue-600' />
                Gestión de Plantillas
              </h1>
              <p className='text-muted-foreground mt-2'>
                Administra las plantillas de documentos del sistema
              </p>
            </div>
          </div>
          <Button
            onClick={handleCreate}
            className='flex items-center bg-blue-600 hover:bg-blue-700'
            disabled={templatesLoading}
          >
            <PlusIcon className='h-5 w-5 mr-2' />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
        <Card className='p-6'>
          <div className='flex items-center'>
            <div className='p-2 bg-blue-100 rounded-lg'>
              <DocumentTextIcon className='h-6 w-6 text-blue-600' />
            </div>
            <div className='ml-4'>
              <p className='text-sm font-medium text-muted-foreground'>Total</p>
              <p className='text-2xl font-bold'>{templates.length}</p>
            </div>
          </div>
        </Card>
        <Card className='p-6'>
          <div className='flex items-center'>
            <div className='p-2 bg-green-100 rounded-lg'>
              <DocumentTextIcon className='h-6 w-6 text-green-600' />
            </div>
            <div className='ml-4'>
              <p className='text-sm font-medium text-muted-foreground'>Activas</p>
              <p className='text-2xl font-bold'>
                {templates.filter(t => t.isActive).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className='p-6'>
          <div className='flex items-center'>
            <div className='p-2 bg-yellow-100 rounded-lg'>
              <DocumentTextIcon className='h-6 w-6 text-yellow-600' />
            </div>
            <div className='ml-4'>
              <p className='text-sm font-medium text-muted-foreground'>Inactivas</p>
              <p className='text-2xl font-bold'>
                {templates.filter(t => !t.isActive).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className='p-6'>
          <div className='flex items-center'>
            <div className='p-2 bg-purple-100 rounded-lg'>
              <DocumentTextIcon className='h-6 w-6 text-purple-600' />
            </div>
            <div className='ml-4'>
              <p className='text-sm font-medium text-muted-foreground'>Tipos</p>
              <p className='text-2xl font-bold'>
                {new Set(templates.map(t => t.entityType)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de Templates */}
      <TemplatesList
        templates={templates}
        isLoading={templatesLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />

      {/* Modal de Formulario */}
      <TemplateFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSave}
        template={editingTemplate}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
};
