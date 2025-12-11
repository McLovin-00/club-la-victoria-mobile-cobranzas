import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useCreateClientMutation, useDeleteClientMutation, useGetClientsQuery, useUpdateClientMutation, useGetDefaultsQuery, useUpdateDefaultsMutation } from '../api/documentosApiSlice';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { goBack } = useRoleBasedNavigation();
  // ya no dependemos de empresas
  const { data: clientsData } = useGetClientsQuery({});
  const clients = clientsData?.list ?? (Array.isArray(clientsData) ? clientsData : []);
  const { data: defaults } = useGetDefaultsQuery();
  const [updateDefaults] = useUpdateDefaultsMutation();
  const [createClient] = useCreateClientMutation();
  const [updateClient] = useUpdateClientMutation();
  const [deleteClient] = useDeleteClientMutation();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [razonSocial, setRazonSocial] = useState('');
  const [cuit, setCuit] = useState('');

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={goBack} className='flex items-center'>
            <ArrowLeftIcon className='h-4 w-4 mr-2' />
            Volver
          </Button>
          <h1 className='text-2xl font-bold'>Clientes</h1>
        </div>
        <div className='flex gap-2'>
          <Input placeholder='Razón social' value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
          <Input placeholder='CUIT (11 dígitos)' value={cuit} onChange={(e) => setCuit(e.target.value.replace(/\D+/g,''))} />
          <Button onClick={async () => { if (!razonSocial || cuit.length !== 11) return; await createClient({ razonSocial, cuit }); setRazonSocial(''); setCuit(''); }}>Crear</Button>
        </div>
      </div>

      <Card className='p-4'>
        <div className='grid gap-3'>
          {defaults && (
            <div className='flex items-center gap-4 mb-2 text-sm'>
              <label className='flex items-center gap-2'>
                Delay verificación faltantes (minutos):
                <Input type='number' className='w-28' value={defaults.missingCheckDelayMinutes ?? 15}
                  onChange={async (e)=>{ await updateDefaults({ missingCheckDelayMinutes: Number(e.target.value) }); }} />
              </label>
              <label className='flex items-center gap-2'>
                Horizonte sin vencimiento (años):
                <Input type='number' className='w-28' value={defaults.noExpiryHorizonYears ?? 100}
                  onChange={async (e)=>{ await updateDefaults({ noExpiryHorizonYears: Number(e.target.value) }); }} />
              </label>
            </div>
          )}
          {clients.map((c) => (
            <div key={c.id} className='flex items-center justify-between'>
              <div className='flex flex-col'>
                <span className='font-medium'>
                  {c.razonSocial} {defaults && defaults.defaultClienteId === c.id && (
                    <span className='text-xs text-blue-600'>(por defecto)</span>
                  )}
                </span>
                <span className='text-sm text-muted-foreground'>CUIT {c.cuit} · ID {c.id}</span>
              </div>
              <div className='flex items-center gap-4'>
                <label className='flex items-center gap-2 text-sm'>
                  <input type='checkbox' checked={Boolean(defaults && defaults.defaultClienteId === c.id)} onChange={async (e)=>{
                    const val = e.target.checked ? c.id : null;
                    await updateDefaults({ defaultClienteId: val });
                  }} />
                  Cliente por defecto
                </label>
                <div className='flex gap-2'>
                <Button variant='outline' onClick={() => navigate(`/documentos/clientes/${c.id}/requirements`)}>Requisitos</Button>
                <Button variant='outline' onClick={() => updateClient({ id: c.id, activo: !c.activo })}>{c.activo ? 'Desactivar' : 'Activar'}</Button>
                <Button variant='destructive' onClick={() => setConfirmDeleteId(c.id)}>Borrar</Button>
                </div>
              </div>
            </div>
          ))}
          {clients.length === 0 && <div className='text-sm text-muted-foreground'>Sin clientes</div>}
        </div>
      </Card>

      {confirmDeleteId !== null && (
        <div className='fixed inset-0 bg-black/40 grid place-items-center z-50'>
          <div className='w-full max-w-sm rounded-xl border bg-card p-4 shadow-lg'>
            <div className='text-lg font-semibold mb-2'>Confirmar eliminación</div>
            <p className='text-sm text-muted-foreground'>¿Seguro que querés eliminar el cliente #{confirmDeleteId}? Esta acción no se puede deshacer.</p>
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button variant='outline' onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button variant='destructive' onClick={async () => { await deleteClient(confirmDeleteId as number); setConfirmDeleteId(null); }}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;


