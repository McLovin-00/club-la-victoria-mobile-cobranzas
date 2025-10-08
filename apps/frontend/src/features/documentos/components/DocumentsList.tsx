import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Document } from '../api/documentosApiSlice';
import { DocumentPreview } from './DocumentPreview';
import {
  DocumentTextIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { formatDateTime } from '../../../utils/formatters';

interface DocumentsListProps {
  documents: Document[];
  isLoading: boolean;
  onDelete: (id: number) => void;
}

export const DocumentsList: React.FC<DocumentsListProps> = ({
  documents,
  isLoading,
  onDelete,
}) => {
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'APROBADO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RECHAZADO':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'VENCIDO':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: Document['status']) => {
    switch (status) {
      case 'APROBADO':
        return 'Aprobado';
      case 'PENDIENTE':
        return 'Pendiente';
      case 'RECHAZADO':
        return 'Rechazado';
      case 'VENCIDO':
        return 'Vencido';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => formatDateTime(dateString);

  const handlePreview = (document: Document) => {
    setPreviewDocument(document);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewDocument(null);
  };

  if (isLoading) {
    return (
      <Card className='p-8'>
        <div className='flex justify-center items-center h-32'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        </div>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className='p-8 text-center'>
        <DocumentTextIcon className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
        <h3 className='text-lg font-medium text-foreground mb-2'>
          No hay documentos
        </h3>
        <p className='text-muted-foreground'>
          Comienza subiendo el primer documento para este dador de carga.
        </p>
      </Card>
    );
  }

  // Ordenar por fecha de subida descendente en la UI como seguridad adicional
  const ordered = [...documents].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  return (
    <Card>
      <div className='p-6'>
        <h2 className='text-xl font-semibold mb-4'>
          Documentos ({documents.length})
        </h2>
      </div>
      <div className='divide-y divide-border'>
        {ordered.map((document) => (
          <div key={document.id} className='p-6 hover:bg-muted/50 transition-colors'>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center space-x-3 mb-2'>
                  <DocumentTextIcon className='h-5 w-5 text-blue-600' />
                  <div>
                    <h3 className='font-medium text-foreground'>
                      {document.entityType} - {document.entityId}
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                      Plantilla: {(document as any)?.template?.name || `ID ${document.templateId}`}
                    </p>
                  </div>
                </div>

                <div className='flex items-center space-x-4 text-sm text-muted-foreground mb-3'>
                  <div className='flex items-center space-x-1'>
                    <CalendarIcon className='h-4 w-4' />
                    <span>Subido: {formatDate(document.uploadedAt)}</span>
                  </div>
                  {document.expiresAt && (
                    <div className='flex items-center space-x-1'>
                      <CalendarIcon className='h-4 w-4' />
                      <span>Vence: {formatDate(document.expiresAt)}</span>
                    </div>
                  )}
                </div>

                <div className='flex items-center space-x-3'>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      document.status
                    )}`}
                  >
                    {getStatusText(document.status)}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {document.fileName}
                  </span>
                </div>

                {document.validationNotes && (
                  <div className='mt-3 p-3 bg-muted rounded-md'>
                    <p className='text-sm text-foreground'>
                      <strong>Notas:</strong> {document.validationNotes}
                    </p>
                  </div>
                )}
              </div>

              <div className='flex items-center space-x-2 ml-4'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handlePreview(document)}
                  className='flex items-center'
                >
                  <EyeIcon className='h-4 w-4 mr-1' />
                  Ver
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onDelete(document.id)}
                  className='text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20'
                >
                  <TrashIcon className='h-4 w-4 mr-1' />
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      <DocumentPreview
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        document={previewDocument}
      />
    </Card>
  );
};