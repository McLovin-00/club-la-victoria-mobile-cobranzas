import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Pagination } from '../../../components/ui/Pagination';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useCreateAcopladoMutation, useDeleteAcopladoMutation, useGetAcopladosQuery, useUpdateAcopladoMutation, useGetDadoresQuery } from '../api/documentosApiSlice';
import { useToast } from '../../../hooks/useToast';
import type { Acoplado, DadorCarga } from '../types/entities';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';

const AcopladosPage: React.FC = () => {
  const { goBack } = useRoleBasedNavigation();
  const { show } = useToast();
  const { data: dadoresResp } = useGetDadoresQuery({});
  const dadores = useMemo<DadorCarga[]>(() => (dadoresResp?.list ?? []) as DadorCarga[], [dadoresResp]);
  const defaultDadorId = useMemo(() => dadores[0]?.id || 0, [dadores]);
  const [dadorId, setDadorId] = useState<number>(defaultDadorId);
  useEffect(() => {
    if (defaultDadorId && dadorId !== defaultDadorId) setDadorId(defaultDadorId);
  }, [defaultDadorId, dadorId]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const { data } = useGetAcopladosQuery({ empresaId: dadorId, q, page, limit }, { skip: !dadorId });
  const acoplados = (data?.data ?? []) as Acoplado[];
  const total = data?.pagination?.total ?? 0;
  const [createAcoplado] = useCreateAcopladoMutation();
  const [updateAcoplado] = useUpdateAcopladoMutation();
  const [deleteAcoplado] = useDeleteAcopladoMutation();

  const [patente, setPatente] = useState('');
  const [tipo, setTipo] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  // Por ahora no se carga tipo

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={goBack} className='flex items-center'>
            <ArrowLeftIcon className='h-4 w-4 mr-2' />
            Volver
          </Button>
          <h1 className='text-2xl font-bold'>Acoplados</h1>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-6 gap-2 items-end'>
          <select
            className='p-2 border rounded-md md:col-span-2 bg-background text-foreground'
            value={dadorId ?? ''}
            onChange={(e) => setDadorId(Number(e.target.value))}
          >
            <option value='' disabled>
              Seleccionar dador de carga
            </option>
            {dadores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.razonSocial} · CUIT {d.cuit}
              </option>
            ))}
          </select>
          <Input className='md:col-span-4' placeholder='Buscar por patente o tipo' value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className='mb-4 grid grid-cols-1 md:grid-cols-8 gap-2 items-end'>
        <Input className='md:col-span-3' placeholder='Patente' value={patente} onChange={(e) => setPatente(e.target.value.toUpperCase())} />
        <Input className='md:col-span-3' placeholder='Tipo (opcional)' value={tipo} onChange={(e)=> setTipo(e.target.value)} />
        <div className='md:col-span-2 flex justify-end'>
          <Button disabled={!dadorId || !patente} onClick={async () => {
            if (!dadorId || !patente) return;
            try {
              await createAcoplado({ dadorCargaId: dadorId, patente, tipo: tipo ?? undefined }).unwrap();
              show('Acoplado creado', 'success');
              setPatente(''); setTipo('');
            } catch (error: any) {
              console.error('Error creating acoplado:', error);
              const rawMsg = ((error?.data?.message || error?.data?.error || error?.error) ?? '') as string;
              const msg = (rawMsg ?? '').toString();
              const isDuplicate = msg.includes('Unique constraint failed') || msg.includes('P2002') || msg.toLowerCase().includes('unique constraint') || msg.toLowerCase().includes('ya existe');
              if (isDuplicate) {
                show(`La patente ${patente} ya existe para el dador seleccionado.`, 'error');
              } else {
                show('Error al crear el semirremolque. Intente nuevamente.', 'error');
              }
            }
          }}>Crear</Button>
        </div>
      </div>

      {!dadorId && (
        <div className='mb-4 text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded p-3'>
          Seleccioná un dador de carga para ver y crear acoplados.
        </div>
      )}

      <Card className='p-4 bg-card'>
        <div className='grid gap-3'>
          {acoplados.map((v) => (
            <div key={v.id} className='flex flex-col border-b pb-3'>
              <div className='flex flex-col'>
                <span className='font-medium'>Patente {v.patente}</span>
                <span className='text-sm text-muted-foreground'>{(v as any).tipo ? `${(v as any).tipo} · ` : ''}ID {v.id}</span>
              </div>
              <AcopladoEditInline acoplado={v} onSave={async (payload)=> { await updateAcoplado({ id: v.id, ...payload }).unwrap(); show('Acoplado actualizado', 'success'); }} onToggleActivo={async ()=> { await updateAcoplado({ id: v.id, activo: !v.activo }); show(v.activo ? 'Acoplado desactivado' : 'Acoplado activado', 'success'); }} onDelete={()=> setConfirmDeleteId(v.id)} />
            </div>
          ))}
          {acoplados.length === 0 && <div className='text-sm text-muted-foreground'>Sin acoplados</div>}
        </div>
        <div className='flex justify-between items-center mt-4'>
          <span className='text-sm text-muted-foreground'>Total: {total}</span>
          <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />
        </div>
      </Card>

      {confirmDeleteId !== null && (
        <div className='fixed inset-0 bg-black/40 grid place-items-center z-50'>
          <div className='w-full max-w-sm rounded-xl border bg-card p-4 shadow-lg'>
            <div className='text-lg font-semibold mb-2'>Confirmar eliminación</div>
            <p className='text-sm text-muted-foreground'>¿Seguro que querés eliminar el semirremolque #{confirmDeleteId}? Esta acción no se puede deshacer.</p>
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button variant='outline' onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button variant='destructive' onClick={async () => { await deleteAcoplado(confirmDeleteId as number); setConfirmDeleteId(null); show('Acoplado eliminado', 'success'); }}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcopladosPage;

// Editor inline para un acoplado (patente y tipo + acciones)
const AcopladoEditInline: React.FC<{ acoplado: Acoplado; onSave: (p: { patente?: string; tipo?: string })=>Promise<void>; onToggleActivo: ()=>Promise<void>; onDelete: ()=>void }>=({ acoplado, onSave, onToggleActivo, onDelete })=>{
  const [editing, setEditing] = useState(false);
  const [patente, setPatente] = useState(acoplado.patente ?? '');
  const [tipo, setTipo] = useState((acoplado as any).tipo ?? '');
  return (
    <div className='mt-2 grid grid-cols-1 md:grid-cols-8 gap-2 items-end'>
      {editing ? (
        <>
          <Input className='md:col-span-3' placeholder='Patente' value={patente} onChange={(e)=> setPatente(e.target.value.toUpperCase())} />
          <Input className='md:col-span-3' placeholder='Tipo' value={tipo} onChange={(e)=> setTipo(e.target.value)} />
          <div className='md:col-span-8 flex gap-2 justify-end'>
            <Button variant='outline' onClick={()=> { setEditing(false); setPatente(acoplado.patente ?? ''); setTipo((acoplado as any).tipo ?? ''); }}>Cancelar</Button>
            <Button onClick={async ()=> { await onSave({ patente, tipo: tipo ?? undefined }); setEditing(false); }}>Guardar</Button>
          </div>
        </>
      ) : (
        <div className='md:col-span-8 flex gap-2 justify-end'>
          <Button variant='outline' onClick={()=> setEditing(true)}>Editar</Button>
          <Button variant='outline' onClick={onToggleActivo}>{(acoplado as any).activo ? 'Desactivar' : 'Activar'}</Button>
          <Button variant='destructive' onClick={onDelete}>Borrar</Button>
        </div>
      )}
    </div>
  );
};



