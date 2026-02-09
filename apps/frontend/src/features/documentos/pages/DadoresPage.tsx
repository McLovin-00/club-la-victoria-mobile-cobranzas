import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useCreateDadorMutation, useDeleteDadorMutation, useGetDadoresQuery, useUpdateDadorMutation, useGetDefaultsQuery, useUpdateDefaultsMutation } from '../api/documentosApiSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import type { DadorCarga } from '../types/entities';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';
import { getRuntimeEnv } from '../../../lib/runtimeEnv';

const phoneRegex = /^\+?[1-9]\d{7,14}$/;

const DadorPhonesInline: React.FC<{ dadorId: number; initial: string[]; onSave: (phones: string[])=>Promise<any> }>=({ dadorId, initial, onSave })=>{
  const [phones, setPhones] = React.useState<string[]>(initial.length ? initial : ['']);
  const [saving, setSaving] = React.useState(false);
  const canAdd = phones.length < 5;
  const valid = phones.filter(Boolean).every(p=>phoneRegex.test(p)) && phones.filter(Boolean).length>=1;
  const show = (msg: string) => { try { alert(msg); } catch { console.log(msg); } };
  const authToken = useSelector((s: RootState) => s.auth?.token);
  const empresaId = useSelector((s: RootState) => s.auth?.user?.empresaId);
  const authHeaders: HeadersInit = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
  };

  return (
    <div className='mt-1'>
      <div className='flex flex-col gap-2 max-w-md'>
        {phones.map((p, i)=> (
          <div key={`phone-input-${i}`} className='flex gap-2'>
            <Input value={p} placeholder='+54911...' onChange={(e)=>{ const arr=[...phones]; arr[i]=e.target.value; setPhones(arr); }} />
            <Button variant='outline' onClick={()=> setPhones((arr)=> arr.filter((_,idx)=> idx!==i))} disabled={phones.length<=1}>Quitar</Button>
          </div>
        ))}
        <div className='flex gap-2'>
          <Button variant='outline' onClick={()=> setPhones((arr)=> [...arr, ''])} disabled={!canAdd}>Agregar</Button>
          <Button onClick={async ()=> { if (!valid) { show('Ingrese al menos un teléfono válido', 'error'); return;} setSaving(true); try { await onSave(phones.map(p=>p.trim()).filter(Boolean)); show('Teléfonos guardados', 'success'); } finally { setSaving(false);} }}>Guardar</Button>
        </div>
        {!valid && <span className='text-xs text-red-600'>Formato WhatsApp: +[código país][número], 8–15 dígitos. Al menos uno requerido.</span>}
        {saving && <span className='text-xs text-gray-500'>Guardando...</span>}
      </div>
    </div>
  );
};

const DadoresPage: React.FC = () => {
  const { goBack } = useRoleBasedNavigation();
  const { data: dadoresResp } = useGetDadoresQuery({});
  const dadores: DadorCarga[] = (dadoresResp?.list ?? []) as DadorCarga[];
  const { data: defaults } = useGetDefaultsQuery();
  const [updateDefaults] = useUpdateDefaultsMutation();
  const [createDador] = useCreateDadorMutation();
  const [updateDador] = useUpdateDadorMutation();
  const [deleteDador] = useDeleteDadorMutation();
  const show = (msg: string) => { try { alert(msg); } catch { console.log(msg); } };
  const authToken = useSelector((s: RootState) => s.auth?.token);
  const empresaId = useSelector((s: RootState) => s.auth?.user?.empresaId);
  const authHeaders: HeadersInit = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
  };
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [razonSocial, setRazonSocial] = useState('');
  const [cuit, setCuit] = useState('');
  const [phones, setPhones] = useState<string[]>(['']);

  return (
    <>
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={goBack} className='flex items-center'>
            <ArrowLeftIcon className='h-4 w-4 mr-2' />
            Volver
          </Button>
          <h1 className='text-2xl font-bold'>Dadores de carga</h1>
        </div>
        <div className='flex gap-2'>
          <Input placeholder='Razón social' value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
          <Input placeholder='CUIT (11 dígitos)' value={cuit} onChange={(e) => setCuit(e.target.value.replace(/\D+/g,''))} />
          <div className='flex flex-col gap-2'>
            {phones.map((p, idx) => (
              <Input key={`phone-field-${idx}`} placeholder='+54911...' value={p} onChange={(e)=>{
                const v = e.target.value; const arr = [...phones]; arr[idx] = v; setPhones(arr);
              }} />
            ))}
            <div className='flex gap-2'>
              <Button variant='outline' disabled={phones.length>=5} onClick={()=> setPhones((arr)=> [...arr, ''])}>Agregar teléfono</Button>
              <Button variant='outline' disabled={phones.length<=1} onClick={()=> setPhones((arr)=> arr.slice(0,-1))}>Quitar</Button>
            </div>
          </div>
          <Button onClick={async () => {
            const validPhones = phones.map(p=>p.trim()).filter(Boolean);
            if (!razonSocial || cuit.length !== 11) return;
            if (validPhones.length < 1) { show('Al menos un teléfono es obligatorio', 'error'); return; }
            if (!validPhones.every(p=>phoneRegex.test(p))) { show('Formato de WhatsApp inválido', 'error'); return; }
            await createDador({ razonSocial, cuit, phones: validPhones });
            setRazonSocial(''); setCuit(''); setPhones(['']);
          }}>Crear</Button>
        </div>
      </div>

      <Card className='p-4'>
        <div className='grid gap-3'>
          {defaults && (
            <div className='flex items-center gap-4 mb-2 text-sm'>
              <label className='flex items-center gap-2'>
                Delay verificación faltantes (minutos):
                <Input type='number' className='w-28' value={defaults?.missingCheckDelayMinutes ?? 15}
                  onChange={async (e)=>{ await updateDefaults({ missingCheckDelayMinutes: Number(e.target.value) }); }} />
              </label>
              <label className='flex items-center gap-2'>
                Horizonte sin vencimiento (años):
                <Input type='number' className='w-28' value={defaults?.noExpiryHorizonYears ?? 100}
                  onChange={async (e)=>{ await updateDefaults({ noExpiryHorizonYears: Number(e.target.value) }); }} />
              </label>
            </div>
          )}
          {dadores.map((d) => (
            <div key={d.id} className='flex flex-col border-b pb-3'>
              <DadorEditInline 
                dador={d} 
                isDefault={Boolean(defaults && defaults.defaultDadorId === d.id)}
                onSave={async (payload)=> { await updateDador({ id: d.id, ...payload }).unwrap(); show('Dador actualizado', 'success'); }} 
                onToggleDefault={async (checked)=> { await updateDefaults({ defaultDadorId: checked ? d.id : null }); }}
                onToggleActivo={async ()=> { await updateDador({ id: d.id, activo: !d.activo }); show(d.activo ? 'Dador desactivado' : 'Dador activado', 'success'); }}
                onDelete={()=> setConfirmDeleteId(d.id)}
                authHeaders={authHeaders}
              />
              {/* Detalle inline con teléfonos */}
              <div className='mt-2 pl-1'>
                <span className='text-sm font-medium'>Teléfonos (WhatsApp):</span>
                <DadorPhonesInline dadorId={d.id} initial={d.phones ?? []} onSave={async (phones)=>{ await updateDador({ id: d.id, phones }); }} />
              </div>
              <div className='mt-2 pl-1 flex gap-6 items-center'>
                <div className='flex items-center gap-2'>
                  <input type='checkbox' defaultChecked={Boolean((d as any).notifyDriverEnabled)} onChange={async (e)=>{ await fetch(`${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/dadores/${d.id}/notifications`, { method:'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ notifyDriverEnabled: e.target.checked }) }); }} />
                  <span className='text-sm'>Enviar a chofer</span>
                </div>
                <div className='flex items-center gap-2'>
                  <input type='checkbox' defaultChecked={Boolean((d as any).notifyDadorEnabled)} onChange={async (e)=>{ await fetch(`${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/dadores/${d.id}/notifications`, { method:'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ notifyDadorEnabled: e.target.checked }) }); }} />
                  <span className='text-sm'>Enviar a dador</span>
                </div>
              </div>
            </div>
          ))}
          {dadores.length === 0 && <div className='text-sm text-muted-foreground'>Sin dadores</div>}
        </div>
      </Card>

      {confirmDeleteId !== null && (
      <div className='fixed inset-0 bg-black/40 grid place-items-center z-50'>
        <div className='w-full max-w-sm rounded-xl border bg-card p-4 shadow-lg'>
          <div className='text-lg font-semibold mb-2'>Confirmar eliminación</div>
          <p className='text-sm text-muted-foreground'>¿Seguro que querés eliminar el dador #{confirmDeleteId}? Esta acción eliminará también equipos y maestros asociados y no se puede deshacer.</p>
          <div className='mt-4 flex items-center justify-end gap-2'>
            <Button variant='outline' onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant='destructive' onClick={async () => { try { await deleteDador(confirmDeleteId as number); show('Dador eliminado', 'success'); } catch { show('No se pudo eliminar el dador', 'error'); } finally { setConfirmDeleteId(null); } }}>Eliminar</Button>
          </div>
        </div>
      </div>
    )}
    </div>
    </>
  );
};

// Editor inline para un dador (razonSocial, CUIT + acciones)
const DadorEditInline: React.FC<{ 
  dador: DadorCarga; 
  isDefault: boolean;
  onSave: (p: { razonSocial?: string; cuit?: string })=>Promise<void>; 
  onToggleDefault: (checked: boolean)=>Promise<void>;
  onToggleActivo: ()=>Promise<void>; 
  onDelete: ()=>void;
  authHeaders: HeadersInit;
}>=({ dador, isDefault, onSave, onToggleDefault, onToggleActivo, onDelete, authHeaders })=>{
  const [editing, setEditing] = useState(false);
  const [razonSocial, setRazonSocial] = useState(dador.razonSocial ?? '');
  const [cuit, setCuit] = useState(dador.cuit ?? '');
  
  return (
    <div className='flex flex-col gap-2'>
      {editing ? (
        <>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
            <Input placeholder='Razón social' value={razonSocial} onChange={(e)=> setRazonSocial(e.target.value)} />
            <Input placeholder='CUIT (11 dígitos)' value={cuit} onChange={(e)=> setCuit(e.target.value.replace(/\D+/g,''))} />
          </div>
          <div className='flex gap-2 justify-end'>
            <Button variant='outline' onClick={()=> { setEditing(false); setRazonSocial(dador.razonSocial ?? ''); setCuit(dador.cuit ?? ''); }}>Cancelar</Button>
            <Button onClick={async ()=> { 
              if (!razonSocial || cuit.length !== 11) return;
              await onSave({ razonSocial, cuit }); 
              setEditing(false); 
            }}>Guardar</Button>
          </div>
        </>
      ) : (
        <>
          <div className='flex items-center justify-between'>
            <div className='flex flex-col'>
              <span className='font-medium'>
                {dador.razonSocial} {isDefault && (
                  <span className='text-xs text-blue-600 font-semibold'>(por defecto)</span>
                )}
              </span>
              <span className='text-sm text-muted-foreground'>CUIT {dador.cuit} · ID {dador.id}</span>
            </div>
            <div className='flex gap-4 items-center'>
              <label className='flex items-center gap-2 text-sm'>
                <input type='checkbox' checked={isDefault} onChange={async (e)=>{ await onToggleDefault(e.target.checked); }} />
                Dador por defecto
              </label>
              <div className='flex gap-2'>
                <Button variant='outline' size='sm' onClick={()=> setEditing(true)}>Editar</Button>
                <Button variant='outline' size='sm' onClick={onToggleActivo}>{dador.activo ? 'Desactivar' : 'Activar'}</Button>
                <Button variant='destructive' size='sm' onClick={onDelete}>Borrar</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DadoresPage;
