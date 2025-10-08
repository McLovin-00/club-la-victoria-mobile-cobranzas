import React, { useState } from 'react';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Empresa } from '../types';
import { PencilIcon, TrashIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface EmpresaTableProps {
  empresas: Empresa[];
  onEdit: (empresa: Empresa) => void;
  onDelete: (id: number) => void;
  // onDocuments removed
  isLoading?: boolean;
}

export const EmpresaTable: React.FC<EmpresaTableProps> = ({
  empresas,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { confirm } = useConfirmDialog();

  const handleDelete = async (id: number) => {
    const ok = await confirm({ message: '¿Estás seguro de que deseas eliminar esta empresa?', confirmText: 'Eliminar' });
    if (!ok) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <Card className='p-8 text-center'>
        <BuildingOfficeIcon className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
        <h3 className='text-lg font-medium text-foreground mb-2'>No hay empresas</h3>
        <p className='text-muted-foreground'>Comienza creando tu primera empresa.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-border'>
          <thead className='bg-muted/50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                Empresa
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                Descripción
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                Fecha de Creación
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className='bg-background divide-y divide-border'>
            {empresas.map(empresa => (
              <tr key={empresa.id} className='hover:bg-muted/50 transition-colors'>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <div className='flex items-center'>
                    <div className='flex-shrink-0 h-10 w-10'>
                      <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'>
                        <BuildingOfficeIcon className='h-5 w-5 text-primary' />
                      </div>
                    </div>
                    <div className='ml-4'>
                      <div className='text-sm font-medium text-foreground'>{empresa.nombre}</div>
                      <div className='text-sm text-muted-foreground'>ID: {empresa.id}</div>
                    </div>
                  </div>
                </td>
                <td className='px-6 py-4'>
                  <div className='text-sm text-foreground max-w-xs truncate'>
                    {empresa.descripcion || 'Sin descripción'}
                  </div>
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-muted-foreground'>
                  {formatDate(empresa.createdAt)}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                  <div className='flex justify-end space-x-2'>
                    {/* Documentos button removed as requested */}
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => onEdit(empresa)}
                      disabled={deletingId === empresa.id}
                    >
                      <PencilIcon className='h-4 w-4 mr-1' />
                      Editar
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDelete(empresa.id)}
                      disabled={deletingId === empresa.id}
                      className='text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20'
                    >
                      {deletingId === empresa.id ? (
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-destructive'></div>
                      ) : (
                        <>
                          <TrashIcon className='h-4 w-4 mr-1' />
                          Eliminar
                        </>
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
