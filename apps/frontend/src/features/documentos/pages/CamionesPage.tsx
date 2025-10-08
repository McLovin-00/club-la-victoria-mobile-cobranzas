import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Pagination } from '../../../components/ui/Pagination';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useCreateCamionMutation, useDeleteCamionMutation, useGetCamionesQuery, useUpdateCamionMutation, useGetDadoresQuery } from '../api/documentosApiSlice';
import { useToast } from '../../../components/ui/toast';
import type { Camion, DadorCarga } from '../types/entities';

const CamionesPage: React.FC = () => {
  const navigate = useNavigate();
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
  const { data } = useGetCamionesQuery({ empresaId: dadorId, q, page, limit }, { skip: !dadorId });
  const camiones = (data?.data ?? []) as Camion[];
  const total = data?.pagination?.total ?? 0;
  const [createCamion] = useCreateCamionMutation();
  const [updateCamion] = useUpdateCamionMutation();
  const [deleteCamion] = useDeleteCamionMutation();

  const [patente, setPatente] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  // Por ahora no se cargan marca/modelo

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => navigate('/documentos')} className='flex items-center'>
            <ArrowLeftIcon className='h-4 w-4 mr-2' />
            Volver
          </Button>
          <h1 className='text-2xl font-bold'>Camiones/Tractores</h1>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-6 gap-2 items-end'>
          <select
            className='p-2 border rounded-md md:col-span-2 bg-background text-foreground'
            value={dadorId || ''}
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
          <Input className='md:col-span-4' placeholder='Buscar por patente o marca' value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className='mb-4 grid grid-cols-1 md:grid-cols-6 gap-2 items-end'>
        <div className='md:col-span-4' />
        <div className='flex gap-2 md:col-span-2'>
          <Input className='flex-1' placeholder='Patente' value={patente} onChange={(e) => setPatente(e.target.value.toUpperCase())} />
          <Button disabled={!dadorId || !patente} onClick={async () => { 
            if (!dadorId || !patente) return; 
            try {
              await createCamion({ dadorCargaId: dadorId, patente }).unwrap(); 
              show('Camión creado', 'success'); 
              setPatente(''); 
            } catch (error: any) {
              console.error('Error creating camion:', error);
              const rawMsg = (
                error?.data?.message ||
                error?.data?.error ||
                error?.error ||
                ''
              ) as string;
              const msg = (rawMsg || '').toString();
              const isDuplicate =
                msg.includes('Unique constraint failed') ||
                msg.includes('P2002') ||
                msg.toLowerCase().includes('unique constraint') ||
                msg.toLowerCase().includes('ya existe');

              if (isDuplicate) {
                show(`La patente ${patente} ya existe para el dador seleccionado.`, 'error');
              } else {
                show('Error al crear el camión. Intente nuevamente.', 'error');
              }
            }
          }}>Crear</Button>
        </div>
      </div>

      {!dadorId && (
        <div className='mb-4 text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded p-3'>
          Seleccioná un dador de carga para ver y crear camiones.
        </div>
      )}

      <Card className='p-4 bg-card'>
        <div className='grid gap-3'>
          {camiones.map((v) => (
            <div key={v.id} className='flex items-center justify-between'>
              <div className='flex flex-col'>
                <span className='font-medium'>Patente {v.patente}</span>
                <span className='text-sm text-muted-foreground'>{v.marca ?? ''} {v.modelo ?? ''} · ID {v.id}</span>
              </div>
              <div className='flex gap-2'>
                <Button variant='outline' onClick={async () => { await updateCamion({ id: v.id, activo: !v.activo }); show(v.activo ? 'Camión desactivado' : 'Camión activado', 'success'); }}>{v.activo ? 'Desactivar' : 'Activar'}</Button>
                <Button variant='destructive' onClick={() => setConfirmDeleteId(v.id)}>Borrar</Button>
              </div>
            </div>
          ))}
          {camiones.length === 0 && <div className='text-sm text-muted-foreground'>Sin camiones</div>}
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
            <p className='text-sm text-muted-foreground'>¿Seguro que querés eliminar el camión #{confirmDeleteId}? Esta acción no se puede deshacer.</p>
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button variant='outline' onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button variant='destructive' onClick={async () => { await deleteCamion(confirmDeleteId as number); setConfirmDeleteId(null); show('Camión eliminado', 'success'); }}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CamionesPage;



