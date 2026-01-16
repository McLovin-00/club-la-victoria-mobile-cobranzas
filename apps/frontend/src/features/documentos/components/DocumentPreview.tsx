import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Document } from '../api/documentosApiSlice';
import { useGetDadoresQuery } from '../api/documentosApiSlice';
import { formatFileSize } from '../../../utils/formatters';
import { getRuntimeEnv } from '../../../lib/runtimeEnv';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  DocumentArrowDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface DocumentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const show = (msg: string) => { try { alert(msg); } catch { console.log(msg); } };

  // Detectar si estamos en un dispositivo móvil/Android
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  // Obtener lista de empresas para mostrar el nombre (respuesta puede ser { list: [...] })
  const { data: dadoresResp } = useGetDadoresQuery({});
  const empresas = Array.isArray(dadoresResp) ? dadoresResp : (dadoresResp?.list ?? []);

  // Helper para obtener el nombre de la empresa con guardas
  const getEmpresaName = (empresaId?: number | null): string => {
    if (!empresaId || !Array.isArray(empresas)) return '—';
    const empresa = (empresas as any[]).find((emp: any) => Number(emp?.id) === Number(empresaId));
    return empresa ? String(empresa.razonSocial || `Dador #${empresaId}`) : `Dador #${empresaId}`;
  };

  const loadPreview = useCallback(async () => {
    if (!document) return;

    setIsLoading(true);
    setError(null);

    try {
      const backendBase = getRuntimeEnv('VITE_DOCUMENTOS_API_URL');
      if (!backendBase) throw new Error('VITE_DOCUMENTOS_API_URL no configurada');

      // Llamar al endpoint de preview del backend
      const response = await fetch(
        `${backendBase}/api/docs/documents/${document.id}/preview`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        // Leer cuerpo para mensajes de error más claros
        let message = 'Error al cargar preview del documento';
        try {
          const errBody = await response.json();
          const serverMsg = errBody?.message || errBody?.error;
          const code = errBody?.code;
          // Mensajes específicos para 404 de MinIO
          if (response.status === 404 && (code === 'MINIO_BUCKET_NOT_FOUND' || code === 'MINIO_OBJECT_NOT_FOUND')) {
            message = code === 'MINIO_BUCKET_NOT_FOUND'
              ? 'El repositorio de archivos aún no está inicializado para esta empresa. Subí un documento para crear el bucket automáticamente.'
              : 'El archivo del documento no existe en almacenamiento. Puede haberse eliminado o la referencia es inválida.';
          } else if (serverMsg) {
            message = serverMsg;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      const data = await response.json();
      // Soportar dos formatos de respuesta: directo o anidado en data
      const serverUrl: string | undefined = data.previewUrl || data.data?.previewUrl || data.data?.url;
      // Fallback profesional: si el backend (o una versión intermedia) retorna un enlace directo a MinIO
      // (e.g., http://minio:9000/...), forzamos el uso del endpoint del backend para evitar dependencias de DNS internos.
      const minioRegex = /:\/\/minio(?::|\/)/i;
      const preferBackendDownload = !serverUrl || minioRegex.test(serverUrl);
      const finalUrl = preferBackendDownload
        ? `${backendBase}/api/docs/documents/${document.id}/download?inline=1`
        : serverUrl;
      if (!finalUrl) throw new Error('URL de preview no disponible');

      // Descargar con Authorization y mostrar como blob (evita 401 en iframe)
      // Reintentar hasta 3 veces con backoff exponencial
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout por intento
          
          const fileResp = await fetch(finalUrl, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          if (!fileResp.ok) {
            // Si es 429 (rate limit), esperar más tiempo antes de reintentar
            if (fileResp.status === 429 && attempt < 3) {
              const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            
            let msg = `Error ${fileResp.status}: ${fileResp.statusText}`;
            try { const t = await fileResp.text(); if (t) msg = t; } catch (e) { /* noop */ }
            throw new Error(msg);
          }

          const blob = await fileResp.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          setPreviewUrl(blobUrl);
          return; // Éxito, salir del callback
          
        } catch (e: any) {
          lastError = e;
          
          // Si es abort o timeout, reintentar
          if (e.name === 'AbortError' && attempt < 3) {
            const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          // Para otros errores de red, reintentar con backoff
          if (attempt < 3 && (e.message?.includes('fetch') || e.message?.includes('network'))) {
            const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          // Si es el último intento, lanzar
          if (attempt === 3) {
            throw lastError;
          }
        }
      }
      
      // Si llegamos aquí, falló después de todos los intentos
      if (lastError) {
        throw lastError;
      }
      
    } catch (err) {
      setError((err instanceof Error ? err.message : 'Error desconocido') + ' (después de 3 intentos)');
    } finally {
      setIsLoading(false);
    }
  }, [document]);

  useEffect(() => {
    if (isOpen && document) {
      loadPreview();
    } else {
      // Liberar blob anterior si existe
      if (previewUrl && previewUrl.startsWith('blob:')) {
        try { window.URL.revokeObjectURL(previewUrl); } catch (e) { /* noop */ }
      }
      setPreviewUrl(null);
      setError(null);
      setIsFullscreen(false);
    }
  }, [isOpen, document, loadPreview, previewUrl]);

  const handleDownload = async () => {
    if (!document) return;

    try {
      setIsLoading(true);
      
      // Usar el endpoint específico de descarga del backend
      const backendBase = getRuntimeEnv('VITE_DOCUMENTOS_API_URL');
      if (!backendBase) throw new Error('VITE_DOCUMENTOS_API_URL no configurada');
      const downloadUrl = `${backendBase}/api/docs/documents/${document.id}/download`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Crear URL del blob y descargar
      const blobUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = document.fileName || 'documento';
      
      // Agregar al DOM, hacer clic y limpiar
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      // Limpiar URL del blob
      window.URL.revokeObjectURL(blobUrl);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      show(`Error al descargar: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APROBADO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RECHAZADO':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'VENCIDO':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'VALIDANDO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // formatFileSize ahora viene desde utils/formatters

  if (!isOpen || !document) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white rounded-lg shadow-xl ${isFullscreen ? 'w-full h-full rounded-none' : 'max-w-6xl w-full h-[90vh]'} flex flex-col`}>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b bg-gray-50'>
          <div className='flex items-center space-x-4'>
            <EyeIcon className='h-6 w-6 text-blue-600' />
            <div>
              <h2 className='text-lg font-semibold text-gray-900'>
                {document.fileName}
              </h2>
              <div className='flex items-center space-x-3 mt-1'>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(document.status)}`}
                >
                  {document.status}
                </span>
                <span className='text-sm text-gray-500'>
                  {formatFileSize(document.fileSize || 0)}
                </span>
                <span className='text-sm text-gray-500'>
                  {document.mimeType}
                </span>
              </div>
            </div>
          </div>

          <div className='flex items-center space-x-2'>

            {/* Descargar */}
            <Button
              variant='outline'
              size='sm'
              onClick={handleDownload}
              disabled={!previewUrl || isLoading}
            >
              <DocumentArrowDownIcon className='h-4 w-4 mr-1' />
              Descargar
            </Button>

            {/* Pantalla completa */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className='h-4 w-4' />
              ) : (
                <ArrowsPointingOutIcon className='h-4 w-4' />
              )}
            </Button>

            {/* Cerrar */}
            <Button variant='ghost' size='sm' onClick={onClose}>
              <XMarkIcon className='h-5 w-5' />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-hidden'>
          {isLoading && (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
                <p className='text-gray-600'>Cargando preview...</p>
              </div>
            </div>
          )}

          {error && (
            <div className='flex items-center justify-center h-full'>
              <Card className='p-8 text-center max-w-md'>
                <div className='text-red-500 mb-4'>
                  <XMarkIcon className='h-12 w-12 mx-auto' />
                </div>
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Error al cargar preview
                </h3>
                <p className='text-gray-600 mb-4'>{error}</p>
                <Button onClick={loadPreview} className='mr-2'>
                  Reintentar
                </Button>
                <Button variant='outline' onClick={handleDownload} disabled={!previewUrl || isLoading}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2" />
                  ) : (
                    <DocumentArrowDownIcon className='h-4 w-4 mr-2' />
                  )}
                  {isLoading ? 'Descargando...' : 'Descargar archivo'}
                </Button>
              </Card>
            </div>
          )}

          {previewUrl && !isLoading && !error && (
            <div className='h-full overflow-auto bg-gray-100 p-4'>
              <div className='flex justify-center'>
                {document.mimeType === 'application/pdf' ? (
                  isMobile ? (
                    // Para móviles: mostrar siempre interfaz de descarga
                    <div className='bg-white border border-gray-300 rounded-lg shadow-lg p-6 w-full max-w-2xl text-center'>
                      <div className='mb-6'>
                        <div className='inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4'>
                          <DocumentArrowDownIcon className='h-8 w-8 text-red-600' />
                        </div>
                        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                          {document.fileName}
                        </h3>
                        <div className='flex items-center justify-center space-x-2 text-sm text-gray-500 mb-4'>
                          <span>{formatFileSize(document.fileSize || 0)}</span>
                          <span>•</span>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(document.status)}`}>
                            {document.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6'>
                        <p className='text-sm text-blue-800'>
                          <strong>📱 Dispositivo móvil:</strong> Los PDFs se visualizan mejor con aplicaciones dedicadas. 
                          Descarga el archivo para una experiencia óptima.
                        </p>
                      </div>

                      <div className='space-y-3'>
                        <Button 
                          onClick={handleDownload} 
                          className='w-full bg-blue-600 hover:bg-blue-700 text-white py-3'
                          size='lg'
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <DocumentArrowDownIcon className='h-4 w-4 mr-2' />
                          )}
                          {isLoading ? 'Descargando...' : 'Descargar PDF'}
                        </Button>
                        
                        {/* Botón para abrir en nueva pestaña como fallback */}
                        <Button 
                          variant='outline'
                          onClick={() => window.open(previewUrl, '_blank')}
                          className='w-full'
                          size='sm'
                        >
                          <EyeIcon className='h-4 w-4 mr-2' />
                          Abrir en nueva pestaña
                        </Button>
                        
                        <p className='text-xs text-gray-500'>
                          El archivo se abrirá automáticamente con tu aplicación PDF predeterminada
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Para desktop: iframe con fallback
                    <div className='w-full'>
                      <iframe
                        src={`${previewUrl}#view=FitH&toolbar=1&navpanes=1&scrollbar=1`}
                        className='w-full border border-gray-300 rounded-lg shadow-lg'
                        style={{
                          height: '800px',
                          minHeight: '600px',
                        }}
                        title={`Preview de ${document.fileName}`}
                        allowFullScreen
                        onError={() => {
                          setError('El preview no se pudo cargar. Usa el botón de descarga.');
                        }}
                      />
                      
                      {/* Botón de descarga alternativo para desktop */}
                      <div className='mt-4 text-center'>
                        <Button 
                          variant='outline'
                          onClick={handleDownload}
                          disabled={isLoading}
                          size='sm'
                        >
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2" />
                          ) : (
                            <DocumentArrowDownIcon className='h-4 w-4 mr-2' />
                          )}
                          {isLoading ? 'Descargando...' : 'Descargar como alternativa'}
                        </Button>
                      </div>
                    </div>
                  )
                ) : document.mimeType?.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={document.fileName}
                    className='max-w-full h-auto border border-gray-300 rounded-lg shadow-lg'
                  />
                ) : document.mimeType === 'application/msword' || 
                    document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                  <div className='bg-white border border-gray-300 rounded-lg shadow-lg p-8 w-full' style={{ minHeight: '600px' }}>
                    <div className='text-center mb-6'>
                      <div className='inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mb-4'>
                        <DocumentArrowDownIcon className='h-8 w-8 text-blue-600' />
                      </div>
                      <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                        Documento Microsoft Word
                      </h3>
                      <p className='text-gray-600 mb-4'>
                        {document.fileName}
                      </p>
                      <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6'>
                        <p className='text-sm text-yellow-800'>
                          <strong>📄 Vista previa limitada:</strong> Los documentos de Word no se pueden mostrar completamente en el navegador. 
                          Descarga el archivo para ver el contenido completo.
                        </p>
                      </div>
                    </div>
                    
                    {/* Información del documento */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                      <div className='bg-gray-50 p-4 rounded-lg'>
                        <h4 className='font-medium text-gray-900 mb-2'>Información del Archivo</h4>
                        <div className='space-y-2 text-sm'>
                          <div className='flex justify-between'>
                            <span className='text-gray-600'>Tipo:</span>
                            <span className='font-medium'>{document.mimeType.includes('openxml') ? 'DOCX' : 'DOC'}</span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-gray-600'>Tamaño:</span>
                            <span className='font-medium'>{formatFileSize(document.fileSize || 0)}</span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-gray-600'>Estado:</span>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(document.status)}`}>
                              {document.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className='bg-gray-50 p-4 rounded-lg'>
                        <h4 className='font-medium text-gray-900 mb-2'>Acciones Disponibles</h4>
                        <div className='space-y-2'>
                          <Button 
                            onClick={handleDownload} 
                            className='w-full flex items-center justify-center'
                            size='sm'
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                            ) : (
                              <DocumentArrowDownIcon className='h-4 w-4 mr-2' />
                            )}
                            {isLoading ? 'Descargando...' : 'Descargar Documento'}
                          </Button>
                          <p className='text-xs text-gray-500 text-center'>
                            Abre con Microsoft Word, LibreOffice o Google Docs
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Simulación de documento */}
                    <div className='border-2 border-dashed border-gray-300 rounded-lg p-8 text-center'>
                      <DocumentArrowDownIcon className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                      <h4 className='text-lg font-medium text-gray-700 mb-2'>Contenido del Documento</h4>
                      <p className='text-gray-500 mb-4'>
                        Para ver el contenido completo, descarga el archivo y ábrelo con una aplicación compatible.
                      </p>
                      <div className='bg-gray-100 rounded-lg p-4 text-left'>
                        <div className='space-y-2'>
                          <div className='h-4 bg-gray-300 rounded w-3/4'></div>
                          <div className='h-4 bg-gray-300 rounded w-full'></div>
                          <div className='h-4 bg-gray-300 rounded w-5/6'></div>
                          <div className='h-4 bg-gray-300 rounded w-2/3'></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='text-center py-12'>
                    <DocumentArrowDownIcon className='h-16 w-16 text-gray-400 mx-auto mb-4' />
                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                      Vista previa no disponible
                    </h3>
                    <p className='text-gray-600 mb-4'>
                      Este tipo de archivo ({document.mimeType}) no se puede previsualizar en el navegador.
                    </p>
                    <Button onClick={handleDownload} disabled={isLoading}>
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      ) : (
                        <DocumentArrowDownIcon className='h-4 w-4 mr-2' />
                      )}
                      {isLoading ? 'Descargando...' : 'Descargar archivo'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con información del documento */}
        <div className='border-t bg-gray-50 p-4'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
            <div>
              <span className='font-medium text-gray-900'>Entidad:</span>
              <p className='text-gray-600'>{document.entityType} #{document.entityId}</p>
            </div>
            <div>
              <span className='font-medium text-gray-900'>Empresa:</span>
              <p className='text-gray-600'>{getEmpresaName((document as any).dadorCargaId ?? (document as any).empresaId)}</p>
            </div>
            <div>
              <span className='font-medium text-gray-900'>Subido:</span>
              <p className='text-gray-600'>{new Date(document.uploadedAt).toLocaleDateString('es-AR')}</p>
            </div>
            {document.validatedAt && (
              <div>
                <span className='font-medium text-gray-900'>Validado:</span>
                <p className='text-gray-600'>{new Date(document.validatedAt).toLocaleDateString('es-AR')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
