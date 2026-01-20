import React from 'react';
import { DocumentoField } from './DocumentoField';

export interface Template {
  id: number;
  name: string;
  entityType: 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';
}

export interface SeccionDocumentosProps {
  titulo: string;
  templates: Template[];
  entityType: 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';
  entityId: string;
  dadorCargaId: number;
  onUploadSuccess: (templateId: number, expiryDate?: string) => void;
  uploadMutation: any;
  disabled?: boolean;
  uploadedTemplateIds: number[];
  selectOnlyMode?: boolean; // Modo solo selección de archivos
  onFileSelect?: (templateId: number, file: File | null, expiryDate?: string) => void;
}

// TODOS los documentos requieren fecha de vencimiento
// Si en el futuro hay templates que no requieren vencimiento, agregarlos aquí
const TEMPLATES_WITHOUT_EXPIRY: string[] = [
  // Ejemplo: 'CONTRATO_INDEFINIDO', 'HABILITACION_PERMANENTE'
];

/**
 * Componente que agrupa documentos por tipo de entidad
 */
export const SeccionDocumentos: React.FC<SeccionDocumentosProps> = ({
  titulo,
  templates,
  entityType,
  entityId,
  dadorCargaId,
  onUploadSuccess,
  uploadMutation,
  disabled = false,
  uploadedTemplateIds,
  selectOnlyMode = false,
  onFileSelect,
}) => {
  const templatesCount = templates.length;
  const uploadedCount = templates.filter((t) => uploadedTemplateIds.includes(t.id)).length;

  return (
    <div className='border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-gray-900'>{titulo}</h3>
        <span className='text-sm text-gray-600'>
          {uploadedCount}/{templatesCount} documentos
        </span>
      </div>

      {!entityId || entityId === '0' ? (
        <div className='bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800'>
          ⚠️ Completá primero los datos básicos para habilitar esta sección
        </div>
      ) : (
        <div className='space-y-2'>
          {templates.map((template) => {
            // TODOS requieren vencimiento EXCEPTO los que están explícitamente excluidos
            const requiresExpiry = !TEMPLATES_WITHOUT_EXPIRY.some((keyword) =>
              template.name.includes(keyword)
            );

            return (
              <DocumentoField
                key={template.id}
                templateId={template.id}
                templateName={template.name}
                entityType={entityType}
                entityId={entityId}
                dadorCargaId={dadorCargaId}
                requiresExpiry={requiresExpiry}
                onUploadSuccess={onUploadSuccess}
                uploadMutation={uploadMutation}
                disabled={disabled}
                selectOnlyMode={selectOnlyMode}
                onFileSelect={onFileSelect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

