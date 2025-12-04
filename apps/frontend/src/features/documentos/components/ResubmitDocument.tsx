import React, { useState, useRef } from 'react';
import { useResubmitDocumentMutation } from '../api/documentosApiSlice';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { 
  ArrowUpTrayIcon, 
  DocumentIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface ResubmitDocumentProps {
  document: {
    id: number;
    templateName: string;
    entityType: string;
    entityName?: string;
    rejectionReason?: string;
    rejectedAt?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Componente simple para resubir documentos rechazados
 */
const ResubmitDocument: React.FC<ResubmitDocumentProps> = ({
  document,
  onSuccess,
  onCancel,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resubmit, { isLoading }] = useResubmitDocumentMutation();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Solo se permiten archivos PDF o imágenes (JPG, PNG)');
        return;
      }
      // Validar tamaño (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no puede superar 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };
  
  const handleSubmit = async () => {
    if (!selectedFile) return;
    
    try {
      await resubmit({ documentId: document.id, file: selectedFile }).unwrap();
      onSuccess?.();
    } catch (err: any) {
      setError(err?.data?.message || 'Error al resubir el documento');
    }
  };
  
  return (
    <Card className='p-4'>
      {/* Info del rechazo */}
      <div className='bg-red-50 border border-red-200 rounded-lg p-3 mb-4'>
        <div className='flex items-start gap-2'>
          <XCircleIcon className='h-5 w-5 text-red-500 mt-0.5' />
          <div>
            <div className='font-medium text-red-800'>Documento Rechazado</div>
            <div className='text-sm text-red-700'>
              {document.templateName} - {document.entityType}
              {document.entityName && ` (${document.entityName})`}
            </div>
            {document.rejectionReason && (
              <div className='mt-2 text-sm'>
                <strong>Motivo:</strong> {document.rejectionReason}
              </div>
            )}
            {document.rejectedAt && (
              <div className='text-xs text-red-600 mt-1'>
                Rechazado el {new Date(document.rejectedAt).toLocaleDateString('es-AR')}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Selector de archivo */}
      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Subir documento corregido
        </label>
        
        <input
          type='file'
          ref={fileInputRef}
          accept='.pdf,.jpg,.jpeg,.png'
          onChange={handleFileSelect}
          className='hidden'
        />
        
        {!selectedFile ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className='w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors'
          >
            <ArrowUpTrayIcon className='h-8 w-8 text-gray-400 mx-auto mb-2' />
            <span className='text-sm text-gray-600'>
              Haz clic para seleccionar archivo (PDF o imagen)
            </span>
          </button>
        ) : (
          <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg border'>
            <div className='flex items-center gap-2'>
              <DocumentIcon className='h-5 w-5 text-blue-500' />
              <div>
                <div className='font-medium text-sm'>{selectedFile.name}</div>
                <div className='text-xs text-gray-500'>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className='text-red-500 hover:text-red-700'
            >
              ✕
            </button>
          </div>
        )}
      </div>
      
      {/* Error */}
      {error && (
        <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2'>
          <ExclamationTriangleIcon className='h-5 w-5 text-red-500' />
          <span className='text-sm text-red-700'>{error}</span>
        </div>
      )}
      
      {/* Botones */}
      <div className='flex justify-end gap-3'>
        {onCancel && (
          <Button variant='outline' onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
        )}
        <Button 
          onClick={handleSubmit}
          disabled={!selectedFile || isLoading}
        >
          {isLoading ? 'Subiendo...' : 'Resubir Documento'}
        </Button>
      </div>
    </Card>
  );
};

export default ResubmitDocument;

