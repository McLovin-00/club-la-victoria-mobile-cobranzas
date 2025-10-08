import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { EmpresaForm } from './EmpresaForm';
import { Empresa, EmpresaCreateInput, EmpresaUpdateInput } from '../types';

interface EmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa?: Empresa;
  onSubmit: (data: EmpresaCreateInput | EmpresaUpdateInput) => void;
  isLoading?: boolean;
}

export const EmpresaModal: React.FC<EmpresaModalProps> = ({
  isOpen,
  onClose,
  empresa,
  onSubmit,
  isLoading = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{empresa ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
          <DialogDescription>
            {empresa
              ? 'Modifica los datos de la empresa existente. Los cambios se aplicarán inmediatamente.'
              : 'Completa la información requerida para crear una nueva empresa en el sistema.'}
          </DialogDescription>
        </DialogHeader>
        <EmpresaForm
          empresa={empresa}
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};
