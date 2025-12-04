import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  isLoading?: boolean;
  documentName?: string;
}

const MOTIVOS_COMUNES = [
  'Documento ilegible',
  'Documento vencido',
  'Datos incorrectos',
  'Documento incompleto',
  'No corresponde al tipo solicitado',
  'Firma o sello faltante',
];

/**
 * Modal simple para rechazar documentos con motivo obligatorio
 */
const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  documentName,
}) => {
  const [motivo, setMotivo] = useState('');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    const motivoFinal = motivo === 'otro' ? motivoPersonalizado : motivo;
    if (motivoFinal.trim().length >= 3) {
      onConfirm(motivoFinal.trim());
    }
  };
  
  const motivoValido = motivo === 'otro' 
    ? motivoPersonalizado.trim().length >= 3
    : motivo.trim().length >= 3;
  
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-md mx-4'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b'>
          <h3 className='text-lg font-semibold text-gray-900'>Rechazar Documento</h3>
          <button onClick={onClose} className='text-gray-500 hover:text-gray-700'>
            <XMarkIcon className='h-5 w-5' />
          </button>
        </div>
        
        {/* Body */}
        <div className='p-4 space-y-4'>
          {documentName && (
            <p className='text-sm text-gray-600'>
              Documento: <strong>{documentName}</strong>
            </p>
          )}
          
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Motivo del rechazo *
            </label>
            <select
              className='w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500'
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            >
              <option value=''>Seleccionar motivo...</option>
              {MOTIVOS_COMUNES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value='otro'>Otro (especificar)</option>
            </select>
          </div>
          
          {motivo === 'otro' && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Especificar motivo *
              </label>
              <textarea
                className='w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500'
                rows={3}
                placeholder='Describe el motivo del rechazo...'
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
              />
            </div>
          )}
          
          <p className='text-xs text-gray-500'>
            El transportista recibirá este motivo y podrá resubir el documento corregido.
          </p>
        </div>
        
        {/* Footer */}
        <div className='flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg'>
          <Button variant='outline' onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant='destructive'
            onClick={handleConfirm}
            disabled={!motivoValido || isLoading}
          >
            {isLoading ? 'Rechazando...' : 'Confirmar Rechazo'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;

