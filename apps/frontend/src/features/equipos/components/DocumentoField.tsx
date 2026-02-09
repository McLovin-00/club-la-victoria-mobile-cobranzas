import React, { useState, useRef } from 'react';
import { CheckCircleIcon, ArrowUpTrayIcon, ExclamationCircleIcon, DocumentCheckIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/solid';
import type { DocumentoExistente, DocumentoEstado } from '../hooks/useEntityVerification';

export interface DocumentoFieldProps {
  templateId: number;
  templateName: string;
  entityType: 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';
  entityId: string;
  dadorCargaId: number;
  requiresExpiry?: boolean;
  onUploadSuccess: (templateId: number, expiryDate?: string) => void;
  uploadMutation: any; // useUploadDocumentMutation hook
  disabled?: boolean;
  onFileSelect?: (templateId: number, file: File | null, expiryDate?: string) => void; // Callback para modo selección
  selectOnlyMode?: boolean; // Si es true, solo permite seleccionar archivos, no subirlos
  /** Documento existente para este template (del pre-check) */
  documentoExistente?: DocumentoExistente;
}

/** Configuración visual por estado de documento */
const estadoConfig: Record<DocumentoEstado, { label: string; bgClass: string; textClass: string; icon: React.ElementType }> = {
  VIGENTE: { label: 'Vigente', bgClass: 'bg-green-50 border-green-300', textClass: 'text-green-700', icon: DocumentCheckIcon },
  POR_VENCER: { label: 'Por vencer', bgClass: 'bg-yellow-50 border-yellow-300', textClass: 'text-yellow-700', icon: ClockIcon },
  VENCIDO: { label: 'Vencido', bgClass: 'bg-red-50 border-red-300', textClass: 'text-red-700', icon: XCircleIcon },
  PENDIENTE: { label: 'Pendiente', bgClass: 'bg-gray-50 border-gray-300', textClass: 'text-gray-600', icon: ClockIcon },
  RECHAZADO: { label: 'Rechazado', bgClass: 'bg-red-50 border-red-300', textClass: 'text-red-700', icon: XCircleIcon },
  FALTANTE: { label: 'Faltante', bgClass: 'bg-gray-50 border-gray-300', textClass: 'text-gray-500', icon: ExclamationCircleIcon },
};

/**
 * Componente para subir un documento individual
 * Reutiliza el sistema de upload existente (useUploadDocumentMutation)
 */
export const DocumentoField: React.FC<DocumentoFieldProps> = ({
  templateId,
  templateName,
  entityType,
  entityId,
  dadorCargaId,
  requiresExpiry = false,
  onUploadSuccess,
  uploadMutation,
  disabled = false,
  onFileSelect,
  selectOnlyMode = false,
  documentoExistente,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');
  const [wantsReplace, setWantsReplace] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Determinar si el documento existente es reutilizable (no requiere nueva carga)
  const esReutilizable = documentoExistente?.reutilizable && 
    (documentoExistente.estado === 'VIGENTE' || documentoExistente.estado === 'POR_VENCER');
  
  // Si es reutilizable y el usuario no quiere reemplazarlo, mostrar estado existente
  const mostrarExistente = esReutilizable && !wantsReplace && !uploaded;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tipo de archivo
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Solo se permiten archivos PDF o imágenes (JPG, PNG, WEBP)');
        return;
      }

      // Validar tamaño (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setError('El archivo no debe superar 10MB');
        return;
      }

      setFile(selectedFile);
      setError('');
      setUploaded(false);

      // En modo selectOnlyMode, notificar al padre
      if (selectOnlyMode && onFileSelect) {
        onFileSelect(templateId, selectedFile, expiryDate);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Seleccioná un archivo');
      return;
    }

    if (requiresExpiry && !expiryDate) {
      setError('La fecha de vencimiento es obligatoria');
      return;
    }

    if (!entityId || entityId === '0') {
      setError('Completá primero los datos básicos (DNI, patentes)');
      return;
    }

    try {
      setUploading(true);
      setError('');

      // Crear FormData según lo que espera el backend existente
      const formData = new FormData();
      formData.append('document', file);
      formData.append('templateId', String(templateId));
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('dadorCargaId', String(dadorCargaId));

      // Modo initial para que cree las entidades si no existen
      formData.append('mode', 'renewal');

      // Si hay vencimiento, agregarlo al objeto vencimientos
      if (requiresExpiry && expiryDate) {
        const vencimientos = JSON.stringify({ [templateId]: expiryDate });
        formData.append('planilla', JSON.stringify({ vencimientos: JSON.parse(vencimientos) }));
      }

      // Usar el mutation existente
      await uploadMutation(formData).unwrap();

      setUploaded(true);
      onUploadSuccess(templateId, expiryDate ?? undefined);

      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      const errorMsg = err?.data?.message || err?.message || 'Error al subir documento';
      setError(errorMsg);
      setUploaded(false);
    } finally {
      setUploading(false);
    }
  };

  // Renderizar estado de documento existente reutilizable
  if (mostrarExistente && documentoExistente) {
    const config = estadoConfig[documentoExistente.estado];
    const IconComponent = config.icon;
    
    return (
      <div className={`border rounded-lg p-4 mb-3 ${config.bgClass}`}>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <IconComponent className={`h-5 w-5 ${config.textClass}`} />
            <label className='text-sm font-medium text-gray-900'>{templateName}</label>
          </div>
          <span className={`text-xs font-semibold ${config.textClass}`}>
            ✓ {config.label}
          </span>
        </div>
        
        <div className='flex items-center justify-between'>
          <div className='text-xs text-gray-600'>
            {documentoExistente.expiresAt && (
              <span>
                Vence: {new Date(documentoExistente.expiresAt).toLocaleDateString('es-AR')}
                {documentoExistente.diasParaVencer !== null && documentoExistente.diasParaVencer <= 30 && (
                  <span className='ml-1 text-yellow-600'>({documentoExistente.diasParaVencer} días)</span>
                )}
              </span>
            )}
          </div>
          <button
            type='button'
            onClick={() => setWantsReplace(true)}
            className='text-xs text-blue-600 hover:text-blue-800 underline'
          >
            Reemplazar
          </button>
        </div>
      </div>
    );
  }
  
  // Renderizar formulario de carga (normal o reemplazo)
  return (
    <div className={`border rounded-lg p-4 mb-3 ${uploaded ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'}`}>
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2'>
          {uploaded && <CheckCircleIcon className='h-5 w-5 text-green-600' />}
          {!uploaded && !uploading && !file && <div className='h-5 w-5 rounded-full border-2 border-gray-300' />}
          {!uploaded && uploading && (
            <div className='h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin' />
          )}
          <label className='text-sm font-medium text-gray-900'>{templateName}</label>
          {wantsReplace && documentoExistente && (
            <span className='text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded'>Reemplazando</span>
          )}
        </div>

        {uploaded && (
          <span className='text-xs text-green-700 font-semibold'>✓ Subido</span>
        )}
        
        {wantsReplace && !uploaded && (
          <button
            type='button'
            onClick={() => {
              setWantsReplace(false);
              setFile(null);
              setError('');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className='text-xs text-gray-500 hover:text-gray-700'
          >
            Cancelar
          </button>
        )}
      </div>

      {!uploaded && (
        <>
          <div className='flex items-center gap-2 mb-2'>
            <input
              ref={fileInputRef}
              type='file'
              accept='application/pdf,image/*'
              onChange={handleFileChange}
              className='text-sm flex-1'
              disabled={uploading || disabled}
            />

            {!selectOnlyMode && (
            <button
              type='button'
              onClick={handleUpload}
              disabled={!file || uploading || disabled}
              className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {uploading ? (
                <>Subiendo...</>
              ) : (
                <>
                  <ArrowUpTrayIcon className='h-4 w-4' />
                  Subir
                </>
              )}
            </button>
            )}
          </div>

          {requiresExpiry && (
            <div className='mt-2'>
              <label className='block text-xs text-gray-600 mb-1'>Vencimiento *</label>
              <input
                type='date'
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  // En modo selectOnlyMode, notificar cambios de fecha
                  if (selectOnlyMode && onFileSelect && file) {
                    onFileSelect(templateId, file, e.target.value);
                  }
                }}
                className='border border-gray-300 rounded px-2 py-1 text-sm w-full'
                disabled={uploading || disabled}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          {file && !error && !uploading && (
            <p className='text-xs text-gray-500 mt-1'>
              📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </>
      )}

      {error && (
        <div className='flex items-center gap-1 text-xs text-red-600 mt-2 bg-red-50 p-2 rounded'>
          <ExclamationCircleIcon className='h-4 w-4' />
          {error}
        </div>
      )}
    </div>
  );
};

