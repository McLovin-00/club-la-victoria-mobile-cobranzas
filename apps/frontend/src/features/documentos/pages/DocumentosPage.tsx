import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { DocumentsSemaforo } from '../components/DocumentsSemaforo';
import { Pagination } from '../../../components/ui/Pagination';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { DocumentsList } from '../components/DocumentsList';
import {
  useGetDocumentsByEmpresaQuery,
  useGetTemplatesQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
} from '../api/documentosApiSlice';
import {
  ArrowLeftIcon,
  PlusIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

export const DocumentosPage: React.FC = () => {
  const { empresaId } = useParams<{ empresaId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { show } = useToast();
  const { confirm } = useConfirmDialog();

  // Queries
  // Filtros vía querystring
  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const statusFilter = (qs.get('status') || '').toUpperCase() || undefined;
  const dueSoon = qs.get('due') === 'soon';

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);

  const {
    data: docsResp,
    isLoading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useGetDocumentsByEmpresaQuery({ dadorId: Number(empresaId), status: statusFilter, page, limit }, {
    skip: !empresaId,
    pollingInterval: 60000,
  });
  const docsRaw = (docsResp as any)?.data ?? [];
  const total = (docsResp as any)?.pagination?.total ?? (Array.isArray(docsRaw) ? docsRaw.length : 0);

  // Filtro adicional por "Por vencer" (client-side: próximos 30 días)
  const documents = useMemo(() => {
    if (!dueSoon) return docsRaw;
    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    return (docsRaw as any[]).filter((d) => {
      const ex = d?.expiresAt ? new Date(d.expiresAt) : null;
      return ex && ex >= now && ex <= in30 && String(d?.status).toUpperCase() === 'APROBADO';
    }) as any[];
  }, [docsRaw, dueSoon]);

  const {
    data: templates = [],
    isLoading: templatesLoading,
  } = useGetTemplatesQuery();

  // Mutations
  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();

  const handleBack = () => { navigate('/documentos'); };

  const handleUpload = async (uploadData: {
    templateId: number;
    entityType: string;
    entityId: string;
    files: File[];
    expiresAt?: string;
  }) => {
    if (!empresaId) return;

    try {
      await uploadDocument({
        ...uploadData,
        empresaId: Number(empresaId),
      }).unwrap();
      show('Documento subido exitosamente', 'success');
      setUploadModalOpen(false);
      refetchDocuments();
    } catch (error: any) {
      const message = error?.data?.message || 'Error al subir documento';
      show(message, 'error');
    }
  };

  const handleDelete = async (documentId: number) => {
    const ok = await confirm({ message: '¿Estás seguro de que deseas eliminar este documento?', confirmText: 'Eliminar' });
    if (!ok) return;
    try {
      await deleteDocument(documentId).unwrap();
      show('Documento eliminado exitosamente', 'success');
      refetchDocuments();
    } catch (error: any) {
      const message = error?.data?.message || 'Error al eliminar documento';
      show(message, 'error');
    }
  };

  if (documentsError) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-red-600 mb-2'>Error</h2>
          <p className='text-muted-foreground'>
            No se pudieron cargar los documentos
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
                Gestión de Documentos
              </h1>
             <p className='text-muted-foreground mt-2'>
               Documentación del dador de carga y su flota
               {statusFilter && (
                 <span className='ml-2 inline-flex items-center text-xs px-2 py-1 rounded-full border bg-blue-50 text-blue-700'>
                   Filtro: {statusFilter}{dueSoon ? ' (por vencer ≤30d)' : ''}
                 </span>
               )}
             </p>
            </div>
          </div>
          <Button
            onClick={() => setUploadModalOpen(true)}
            className='flex items-center bg-blue-600 hover:bg-blue-700'
            disabled={templatesLoading}
          >
            <PlusIcon className='h-5 w-5 mr-2' />
            Subir Documento
          </Button>
        </div>
      </div>

      {/* Dashboard Semáforos */}
      <div className='mb-8'>
        <Card className='p-6'>
          <h2 className='text-xl font-semibold mb-4 flex items-center'>🚦 Estado de Documentación</h2>
          <DocumentsSemaforo empresaId={Number(empresaId)} />
        </Card>
      </div>

      {/* Lista de Documentos */}
      <DocumentsList
        documents={documents}
        isLoading={documentsLoading}
        onDelete={handleDelete}
      />

      {/* Paginación */}
      <div className='mt-4 flex items-center justify-end gap-2'>
        <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />
      </div>

      {/* Modal de Subida */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        templates={templates}
        isLoading={isUploading || templatesLoading}
      />
    </div>
  );
};