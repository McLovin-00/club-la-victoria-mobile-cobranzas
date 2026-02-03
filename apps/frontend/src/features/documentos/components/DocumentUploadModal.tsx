import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { DocumentTemplate } from '../api/documentosApiSlice';
import {
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useUploadBatchDocsTransportistasMutation, useLazyGetJobStatusQuery } from '../api/documentosApiSlice';
import { CameraCapture } from './CameraCapture';
import { useToast } from '../../../hooks/useToast';
import { getApiErrorMessage } from '../../../utils/apiErrors';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: {
    templateId: number;
    entityType: string;
    entityId: string;
    files: File[];
    expiresAt?: string;
  }) => void;
  templates: DocumentTemplate[];
  isLoading: boolean;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  templates,
  isLoading,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [entityType, setEntityType] = useState<string>('CHOFER');
  const [entityId, setEntityId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadBatch, { isLoading: bulkUploading }] = useUploadBatchDocsTransportistasMutation();
  const [skipDedupe, setSkipDedupe] = useState(false);
  const [triggerJobStatus] = useLazyGetJobStatusQuery();
  const { show } = useToast();

  const getEntityIdLabel = (): string => {
    switch (entityType) {
      case 'DADOR':
        return 'CUIT del dador de carga';
      case 'EMPRESA_TRANSPORTISTA':
        return 'CUIT de la empresa transportista';
      case 'CHOFER':
        return 'DNI de chofer';
      case 'CAMION':
        return 'Patente de camión/tractor';
      case 'ACOPLADO':
        return 'Patente de acoplado/semirremolque';
      default:
        return 'Identificador';
    }
  };

  const getEntityIdPlaceholder = (): string => {
    switch (entityType) {
      case 'DADOR':
        return 'Ingresa el CUIT del dador (11 dígitos)';
      case 'EMPRESA_TRANSPORTISTA':
        return 'Ingresa el CUIT de la empresa transportista (11 dígitos)';
      case 'CHOFER':
        return 'Ingresa el DNI';
      case 'CAMION':
        return 'Ingresa la patente del camión/tractor';
      case 'ACOPLADO':
        return 'Ingresa la patente del acoplado/semirremolque';
      default:
        return 'Ingresa el identificador';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !entityId || files.length === 0) return;

    onUpload({
      templateId: selectedTemplate,
      entityType,
      entityId,
      files,
      expiresAt: expiresAt ?? undefined,
    });

    // Reset form
    setSelectedTemplate(null);
    setEntityType('CHOFER');
    setEntityId('');
    setFiles([]);
    setExpiresAt('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const availableTemplates = templates.filter(
    (template) => template.isActive && template.entityType === entityType
  );

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-xl font-semibold flex items-center'>
            <CloudArrowUpIcon className='h-6 w-6 mr-2 text-blue-600' />
            Subir Documento
          </h2>
          <Button variant='ghost' size='sm' onClick={onClose}>
            <XMarkIcon className='h-5 w-5' />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-6'>
          {/* Tipo de Entidad */}
          <div>
            <label className='block text-sm font-medium text-foreground mb-2'>
              Tipo de Entidad
            </label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setSelectedTemplate(null);
              }}
              className='w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              required
            >
              <option value='DADOR'>Dador de Carga</option>
              <option value='EMPRESA_TRANSPORTISTA'>Empresa Transportista</option>
              <option value='CHOFER'>Chofer</option>
              <option value='CAMION'>Camión</option>
              <option value='ACOPLADO'>Acoplado</option>
            </select>
          </div>

          {/* Identificador según entidad */}
          <div>
            <label className='block text-sm font-medium text-foreground mb-2'>
              {getEntityIdLabel()}
            </label>
            <input
              type='text'
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder={getEntityIdPlaceholder()}
              className='w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              required
            />
          </div>

          {/* Template */}
          <div>
            <label className='block text-sm font-medium text-foreground mb-2'>
              Plantilla de Documento
            </label>
            {availableTemplates.length === 0 ? (
              <p className='text-sm text-muted-foreground p-3 bg-gray-50 dark:bg-slate-800/60 rounded-md'>
                No hay plantillas disponibles para {entityType.toLowerCase()}
              </p>
            ) : (
              <div className='grid grid-cols-1 gap-2'>
                {availableTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className='flex items-center space-x-3'>
                      <DocumentTextIcon className='h-5 w-5 text-blue-600' />
                      <div>
                        <h4 className='font-medium text-gray-900'>
                          {template.nombre}
                        </h4>
                        {template.descripcion && (
                          <p className='text-sm text-muted-foreground'>
                            {template.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fecha de Vencimiento */}
          <div>
            <label className='block text-sm font-medium text-foreground mb-2'>
              Fecha de Vencimiento (Opcional)
            </label>
            <input
              type='datetime-local'
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className='w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
          </div>

          {/* Área de Subida de Archivos */}
          <div>
            <label className='block text-sm font-medium text-foreground mb-2'>
              Archivos
            </label>
            <div
              className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <CloudArrowUpIcon className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <p className='text-muted-foreground mb-2'>
                Arrastra archivos aquí o{' '}
                <label className='text-blue-600 hover:text-blue-700 cursor-pointer'>
                  selecciona archivos
                  <input
                    type='file'
                    multiple
                    accept='.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx'
                    onChange={handleFileChange}
                    className='hidden'
                  />
                </label>
              </p>
              <p className='text-xs text-muted-foreground'>
                PDF, JPG, PNG, WEBP, DOC, DOCX hasta 10MB
              </p>
              <div className='mt-3'>
                <Button type='button' variant='outline' onClick={() => setCameraOpen(true)}>
                  Usar cámara
                </Button>
              </div>
            </div>

            {/* Lista de Archivos */}
            {files.length > 0 && (
              <div className='mt-4 space-y-2'>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/60 rounded-md'
                  >
                    <div className='flex items-center space-x-3'>
                      <DocumentTextIcon className='h-5 w-5 text-gray-500 dark:text-slate-400' />
                      <div>
                        <p className='text-sm font-medium text-gray-900'>
                          {file.name}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => removeFile(index)}
                    >
                      <XMarkIcon className='h-4 w-4' />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subida Masiva con IA */}
          <div className='rounded-xl border p-4 bg-gradient-to-r from-purple-50 to-indigo-50'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-semibold text-indigo-700'>Subida masiva con IA</div>
                <div className='text-xs text-indigo-900/70'>Detecta entidad, ID, tipo y vencimiento; envía a Aprobación</div>
              </div>
              <Button type='button' variant='outline' className='border-indigo-300 text-indigo-700 hover:bg-indigo-100' disabled={bulkUploading}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
                  input.onchange = async () => {
                    const selected = Array.from(input.files ?? []);
                    if (selected.length === 0) return;
                    try {
                      const resp = await uploadBatch({ files: selected, skipDedupe }).unwrap();
                      show('Archivos enviados a clasificación. Si había repetidos, se omitieron automáticamente.', 'success');

                      // Polling del estado del job para mostrar resumen al usuario
                      const jobId = (resp as any)?.jobId as string | undefined;
                      if (jobId) {
                        const startedAt = Date.now();
                        const timeoutMs = 120000; // 2 minutos
                        const intervalMs = 1500;
                        let done = false;
                        while (!done && Date.now() - startedAt < timeoutMs) {
                          try {
                            const st = await triggerJobStatus({ jobId }).unwrap();
                            const job = (st as any)?.job;
                            if (job?.status === 'completed' || job?.status === 'failed') {
                              const stats = (job as any)?.stats || {};
                              const processed = typeof stats.processed === 'number' ? stats.processed : (Array.isArray(job?.items) ? job.items.length : 0);
                              const duplicates = typeof stats.skippedDuplicates === 'number' ? stats.skippedDuplicates : Math.max(0, selected.length - processed);
                              const errors = typeof stats.failed === 'number' ? stats.failed : (Array.isArray(job?.results) ? job.results.filter((r: any) => String(r.status).toUpperCase() === 'RECHAZADO').length : 0);
                              const msg = `Batch ${job.status}. Procesados: ${processed}. Duplicados: ${duplicates}. Fallidos: ${errors}.`;
                              show(msg, job.status === 'completed' ? 'success' : 'error');
                              done = true;
                              break;
                            }
                          } catch { /* noop, retry */ }
                          await new Promise((r) => setTimeout(r, intervalMs));
                        }
                        if (!done) {
                          show('El batch sigue en progreso. Podés continuar trabajando; te notificaremos en Aprobación.', 'info');
                        }
                      }
                    } catch (e) {
                      const msg = getApiErrorMessage(e as any) || 'Error en subida masiva';
                      show(msg, 'error');
                    }
                  };
                  input.click();
                }}
              >
                Seleccionar archivos
              </Button>
            </div>
            <div className='mt-3 flex items-center justify-end'>
              <label className='flex items-center gap-2 text-xs text-indigo-900/80'>
                <input type='checkbox' checked={skipDedupe} onChange={(e)=> setSkipDedupe(e.target.checked)} />
                Evitar deduplicación en este lote
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className='flex justify-end space-x-3 pt-4 border-t'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type='submit'
              disabled={
                isLoading ||
                !selectedTemplate ||
                !entityId ||
                files.length === 0
              }
              className='bg-blue-600 hover:bg-blue-700'
            >
              {isLoading ? (
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
              ) : null}
              Subir Documento
            </Button>
          </div>
        </form>
      </div>
      <CameraCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)} title='Capturar fotos del documento' onCapture={(pics) => setFiles((arr) => [...arr, ...pics])} />
    </div>
  );
};