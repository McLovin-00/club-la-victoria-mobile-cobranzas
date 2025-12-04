import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Pagination } from '../../../components/ui/Pagination';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useCreateChoferMutation, useDeleteChoferMutation, useGetChoferesQuery, useUpdateChoferMutation, useGetDadoresQuery } from '../api/documentosApiSlice';
import type { Chofer, DadorCarga } from '../types/entities';
import { useToast } from '../../../hooks/useToast';
import { validatePhone } from '../../../utils/validators';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';

const ChoferPhonesInline: React.FC<{ choferId: number; initial: string[]; onSave: (phones: string[])=>Promise<any> }>=({ choferId, initial, onSave })=>{
  const [phones, setPhones] = useState<string[]>(initial.length ? initial : ['']);
  const [saving, setSaving] = useState(false);
  const canAdd = phones.length < 3;
  const valid = phones.filter(Boolean).every(p=>validatePhone(p)) && phones.filter(Boolean).length>=1;
  const { show } = useToast();
  return (
    <div className='mt-1'>
      <div className='flex flex-col gap-2 max-w-md'>
        {phones.map((p, i)=> (
          <div key={i} className='flex gap-2'>
            <Input value={p} placeholder='+54911...' onChange={(e)=>{ const arr=[...phones]; arr[i]=e.target.value; setPhones(arr); }} />
            <Button variant='outline' onClick={()=> setPhones((arr)=> arr.filter((_,idx)=> idx!==i))} disabled={phones.length<=1}>Quitar</Button>
          </div>
        ))}
        <div className='flex gap-2'>
          <Button variant='outline' onClick={()=> setPhones((arr)=> [...arr, ''])} disabled={!canAdd}>Agregar</Button>
          <Button onClick={async ()=> { if (!valid) { show('Teléfonos inválidos', 'error'); return;} setSaving(true); try { await onSave(phones.map(p=>p.trim()).filter(Boolean)); show('Teléfonos actualizados', 'success'); } finally { setSaving(false);} }}>Guardar</Button>
        </div>
        {!valid && <span className='text-xs text-red-600'>Formato WhatsApp: +[código país][número], 8–15 dígitos. Al menos uno requerido.</span>}
        {saving && <span className='text-xs text-muted-foreground'>Guardando...</span>}
      </div>
    </div>
  );
};

const ChoferesPage: React.FC = () => {
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
  const { data } = useGetChoferesQuery({ empresaId: dadorId, q, page, limit }, { skip: !dadorId });
  const choferes = (data?.data ?? []) as Chofer[];
  const total = data?.pagination?.total ?? 0;
  const [createChofer] = useCreateChoferMutation();
  const [updateChofer] = useUpdateChoferMutation();
  const [deleteChofer] = useDeleteChoferMutation();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Estado de edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDni, setEditDni] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editApellido, setEditApellido] = useState('');

  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [phones, setPhones] = useState<string[]>(['']);

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={goBack} className='flex items-center'>
            <ArrowLeftIcon className='h-4 w-4 mr-2' />
            Volver
          </Button>
          <h1 className='text-2xl font-bold'>Choferes</h1>
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
          <Input className='md:col-span-4' placeholder='Buscar por DNI, nombre o apellido' value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Formulario de creación */}
      <div className='mb-2 grid grid-cols-1 md:grid-cols-6 gap-2 items-end'>
        <Input className='md:col-span-1' placeholder='DNI' value={dni} onChange={(e) => setDni(e.target.value.replace(/\D+/g,''))} />
        <Input className='md:col-span-2' placeholder='Nombre' value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input className='md:col-span-2' placeholder='Apellido' value={apellido} onChange={(e) => setApellido(e.target.value)} />
        <div className='hidden md:block' />
      </div>

      <div className='mb-4 grid grid-cols-1 md:grid-cols-6 gap-2 items-end'>
        <div className='flex flex-col gap-2 md:col-span-5'>
          {phones.map((p, idx) => (
            <Input key={idx} placeholder='+54911...' value={p} onChange={(e)=>{
              const v = e.target.value; const arr = [...phones]; arr[idx] = v; setPhones(arr);
            }} />
          ))}
          <div className='flex gap-2'>
            <Button variant='outline' disabled={phones.length>=3} onClick={()=> setPhones((arr)=> [...arr, ''])}>Agregar teléfono</Button>
            <Button variant='outline' disabled={phones.length<=1} onClick={()=> setPhones((arr)=> arr.slice(0,-1))}>Quitar</Button>
          </div>
        </div>
        <Button className='md:col-span-1' disabled={!dadorId || dni.length < 6} onClick={async () => {
          const validPhones = phones.map(p=>p.trim()).filter(Boolean);
          if (!dadorId || dni.length < 6) return;
          if (validPhones.length < 1) { show('Al menos un teléfono es obligatorio', 'error'); return; }
          if (!validPhones.every((p)=> validatePhone(p))) { show('Formato de WhatsApp inválido', 'error'); return; }
          try {
            await createChofer({ dadorCargaId: dadorId, dni, nombre, apellido, phones: validPhones }).unwrap();
            show('Chofer creado', 'success');
            setDni(''); setNombre(''); setApellido(''); setPhones(['']);
          } catch (error: any) {
            console.error('Error creating chofer:', error);
            const rawMsg = (error?.data?.message || error?.data?.error || error?.error || '') as string;
            const msg = (rawMsg || '').toString();
            const isDuplicate = msg.includes('Unique constraint failed') || msg.includes('P2002') || msg.toLowerCase().includes('unique constraint') || msg.toLowerCase().includes('ya existe');
            if (isDuplicate) {
              show(`El DNI ${dni} ya existe para el dador seleccionado.`, 'error');
            } else {
              show('Error al crear el chofer. Intente nuevamente.', 'error');
            }
          }
        }}>Crear</Button>
      </div>

      {!dadorId && (
        <div className='mb-4 text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded p-3'>
          Seleccioná un dador de carga para ver y crear choferes.
        </div>
      )}

      <Card className='p-4 bg-card'>
        <div className='grid gap-3'>
          {choferes.map((c) => (
            <div key={c.id} className='flex flex-col border-b pb-3'>
              <div className='flex items-center justify-between'>
                <div className='flex flex-col'>
                  <span className='font-medium'>DNI {c.dni}</span>
                  <span className='text-sm text-muted-foreground'>{c.apellido ?? ''} {c.nombre ?? ''} · ID {c.id}</span>
                </div>
                <div className='flex gap-2'>
                  <Button variant='outline' onClick={() => { setEditingId(c.id); setEditDni(c.dni); setEditNombre(c.nombre || ''); setEditApellido(c.apellido || ''); }}>Editar</Button>
                  <Button variant='outline' onClick={() => updateChofer({ id: c.id, activo: !c.activo })}>{c.activo ? 'Desactivar' : 'Activar'}</Button>
                  <Button variant='destructive' onClick={() => setConfirmDeleteId(c.id)}>Borrar</Button>
                </div>
              </div>
              {editingId === c.id && (
                <div className='mt-2 grid grid-cols-1 md:grid-cols-6 gap-2 items-end'>
                  <Input className='md:col-span-2' placeholder='DNI' value={editDni} onChange={(e)=> setEditDni(e.target.value.replace(/\D+/g,''))} />
                  <Input className='md:col-span-2' placeholder='Nombre' value={editNombre} onChange={(e)=> setEditNombre(e.target.value)} />
                  <Input className='md:col-span-2' placeholder='Apellido' value={editApellido} onChange={(e)=> setEditApellido(e.target.value)} />
                  <div className='md:col-span-6 flex gap-2'>
                    <Button variant='outline' onClick={()=> { setEditingId(null); }}>Cancelar</Button>
                    <Button onClick={async ()=> {
                      if (editDni.length < 6) { show('DNI inválido', 'error'); return; }
                      try {
                        await updateChofer({ id: c.id, dni: editDni, nombre: editNombre || undefined, apellido: editApellido || undefined }).unwrap();
                        show('Chofer actualizado', 'success');
                        setEditingId(null);
                      } catch (e: any) {
                        const msg = (e?.data?.message || e?.error || 'No se pudo actualizar el chofer').toString();
                        show(msg, 'error');
                      }
                    }}>Guardar</Button>
                  </div>
                </div>
              )}
              {/* Detalle inline con teléfonos */}
              <div className='mt-2 pl-1'>
                <span className='text-sm font-medium'>Teléfonos (WhatsApp):</span>
                <ChoferPhonesInline choferId={c.id} initial={c.phones || []} onSave={async (phones)=>{ await updateChofer({ id: c.id, phones }); }} />
              </div>
            </div>
          ))}
          {choferes.length === 0 && <div className='text-sm text-muted-foreground'>Sin choferes</div>}
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
            <p className='text-sm text-muted-foreground'>¿Seguro que querés eliminar el chofer #{confirmDeleteId}? Esta acción no se puede deshacer.</p>
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button variant='outline' onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button variant='destructive' onClick={async () => { try { await deleteChofer(confirmDeleteId as number); show('Chofer eliminado', 'success'); } catch { show('No se pudo eliminar el chofer', 'error'); } finally { setConfirmDeleteId(null); } }}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChoferesPage;

// Confirmación de borrado
// Modal inline para confirmar eliminación de chofer
// Se coloca al final del componente para mantener la estructura consistente con otras páginas



