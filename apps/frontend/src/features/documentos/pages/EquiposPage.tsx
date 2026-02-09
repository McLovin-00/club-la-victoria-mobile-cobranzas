import React, { useEffect, useMemo, useState, useContext } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store/store';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/card';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';
import { getRuntimeEnv } from '../../../lib/runtimeEnv';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useAssociateEquipoClienteMutation, useAttachEquipoComponentsMutation, useCreateEquipoMutation, useDetachEquipoComponentsMutation, useGetClientsQuery, useGetDadoresQuery, useGetDefaultsQuery, useGetEquiposQuery, useCreateChoferMutation, useCreateCamionMutation, useCreateAcopladoMutation, useGetEmpresasTransportistasQuery, useUpdateEquipoMutation, useGetChoferesQuery, useGetCamionesQuery, useGetAcopladosQuery, useDeleteEquipoMutation, useSearchEquiposQuery, useGetEquipoHistoryQuery, useGetEquipoKpisQuery, useGetEquipoComplianceQuery, useLazyGetEquipoComplianceQuery, useImportCsvEquiposMutation } from '../api/documentosApiSlice';
import { validatePhone } from '../../../utils/validators';
import { getApiErrorMessage } from '../../../utils/apiErrors';
import type { Cliente, DadorCarga, EquipoWithExtras } from '../types/entities';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ConfirmContext } from '../../../contexts/confirmContext';

// Roles que pueden crear equipos completos
// TRANSPORTISTA puede crear equipos, CHOFER no tiene acceso directo a esta opción
const ROLES_CAN_CREATE_EQUIPO = ['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'];

export const EquiposPage: React.FC = () => {
  const navigate = useNavigate();
  const { goBack } = useRoleBasedNavigation();
  const user = useSelector((state: RootState) => state.auth.user);
  const canCreateEquipo = user?.role && ROLES_CAN_CREATE_EQUIPO.includes(user.role);
  const show = (msg: string) => { try { alert(msg); } catch { console.log(msg); } };
  const { confirm } = useContext(ConfirmContext);
  const { data: dadoresResp } = useGetDadoresQuery({});
  const dadores = useMemo<DadorCarga[]>(() => (dadoresResp?.list ?? []) as DadorCarga[], [dadoresResp]);
  const { data: defaults } = useGetDefaultsQuery();
  const initialDadorId = useMemo(()=> defaults?.defaultDadorId || dadores[0]?.id, [defaults, dadores]);
  const [dadorCargaId, setDadorCargaId] = useState<number | undefined>(initialDadorId);
  useEffect(()=>{ if (initialDadorId && (dadorCargaId === undefined || dadorCargaId === null)) setDadorCargaId(initialDadorId); }, [initialDadorId, dadorCargaId]);
  const dadorId = dadorCargaId || initialDadorId || 1;
  // KPIs de equipos (creados, swaps, eliminados)
  const { data: equipoKpis } = useGetEquipoKpisQuery({});
  const { data: equipos = [] } = useGetEquiposQuery({ empresaId: dadorId });
  // Import CSV state
  const [_csvOpen, _setCsvOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const [dryRun, setDryRun] = useState(true);
  const [importCsv, { isLoading: importing }] = useImportCsvEquiposMutation();
  const downloadCsvTemplate = () => {
    const example = 'external_id,empresa_transportista_cuit,empresa_transportista_nombre,chofer_dni,chofer_nombre,camion_patente,acoplado_patente,chofer_phones\n'
      + 'EQ-001,30712345678,Transporte Sur,21039117,Juan Perez,AB123CD,AA001BB,+5491144444444;+5491155555555';
    const blob = new Blob([example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipos_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Buscador (DNI / patente camión / patente acoplado)
  const [dniSearch, setDniSearch] = useState('');
  const [truckSearch, setTruckSearch] = useState('');
  const [trailerSearch, setTrailerSearch] = useState('');
  const normalizePlate = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const dniQ = dniSearch.trim();
  const truckQ = normalizePlate(truckSearch);
  const trailerQ = normalizePlate(trailerSearch);
  const dniValid = dniQ.length >= 6;
  const truckValid = truckQ.length >= 5;
  const trailerValid = trailerQ.length >= 5;
  const hasValidFilters = (dniQ && dniValid) || (truckQ && truckValid) || (trailerQ && trailerValid);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const { data: searchResults = [], isFetching: searching } = useSearchEquiposQuery({ empresaId: dadorId, dni: dniValid ? dniQ : undefined, truckPlate: truckValid ? truckQ : undefined, trailerPlate: trailerValid ? trailerQ : undefined }, { skip: !searchTriggered || !hasValidFilters });
  const results = (searchTriggered && hasValidFilters) ? (searchResults as any[]).map((obj: any)=> (obj?.equipo ?? obj)) : equipos;
  const triggerSearch = () => { if (hasValidFilters) setSearchTriggered(true); };
  const clearSearch = () => { setDniSearch(''); setTruckSearch(''); setTrailerSearch(''); setSearchTriggered(false); };
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); triggerSearch(); }
  };
  const { data: clientsResp } = useGetClientsQuery({});
  const clients = useMemo<Cliente[]>(() => (clientsResp?.list ?? []) as Cliente[], [clientsResp]);
  const initialClienteId = useMemo(()=> defaults?.defaultClienteId || clients[0]?.id, [defaults, clients]);
  const [createEquipo] = useCreateEquipoMutation();
  const [updateEquipo] = useUpdateEquipoMutation();
  // Empresas transportistas por dador
  const { data: empresasTransp = [] } = useGetEmpresasTransportistasQuery({ dadorCargaId: dadorId });
  const [empresaTransportistaId, setEmpresaTransportistaId] = useState<number | ''>('');
  const idToCuit = useMemo(() => {
    const m = new Map<number, string>();
    (empresasTransp as any[]).forEach((e: any) => { if (e && typeof e.id === 'number') m.set(e.id, e.cuit); });
    return m;
  }, [empresasTransp]);
  const [associate] = useAssociateEquipoClienteMutation();
  const [attachEquipo, { isLoading: attaching }] = useAttachEquipoComponentsMutation();
  const [detachEquipo, { isLoading: detaching }] = useDetachEquipoComponentsMutation();
  const [deleteEquipo] = useDeleteEquipoMutation();
  const [createChofer] = useCreateChoferMutation();
  const [createCamion] = useCreateCamionMutation();
  const [createAcoplado] = useCreateAcopladoMutation();
  const [getEquipoComplianceLazy] = useLazyGetEquipoComplianceQuery();
  const authToken = useSelector((s: RootState) => s.auth?.token) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('token') ?? '') : '');

  // Catálogos para selección (dropdowns)
  // Paginación de maestros: choferes, camiones, acoplados
  const [choferPage, setChoferPage] = useState(1);
  const [camionPage, setCamionPage] = useState(1);
  const [acopladoPage, setAcopladoPage] = useState(1);
  const limitPerPage = 50;
  const { data: choferesResp } = useGetChoferesQuery({ empresaId: dadorId, page: choferPage, limit: limitPerPage });
  const { data: camionesResp } = useGetCamionesQuery({ empresaId: dadorId, page: camionPage, limit: limitPerPage });
  const { data: acopladosResp } = useGetAcopladosQuery({ empresaId: dadorId, page: acopladoPage, limit: limitPerPage });
  const [choferes, setChoferes] = useState<Array<{ id: number; dni: string; nombre?: string; apellido?: string }>>([]);
  const [camiones, setCamiones] = useState<Array<{ id: number; patente: string }>>([]);
  const [acoplados, setAcoplados] = useState<Array<{ id: number; patente: string }>>([]);
  const choferTotal = choferesResp?.pagination?.total || 0;
  const camionTotal = camionesResp?.pagination?.total || 0;
  const acopladoTotal = acopladosResp?.pagination?.total || 0;
  const choferHasMore = choferPage * limitPerPage < choferTotal;
  const camionHasMore = camionPage * limitPerPage < camionTotal;
  const acopladoHasMore = acopladoPage * limitPerPage < acopladoTotal;
  // Reset al cambiar dador
  useEffect(() => {
    setChoferPage(1); setCamionPage(1); setAcopladoPage(1);
    setChoferes([]); setCamiones([]); setAcoplados([]);
    setDriverIdSel(''); setTruckIdSel(''); setTrailerIdSel('');
  }, [dadorId]);
  // Merge incremental por página
  useEffect(() => {
    const list = (choferesResp?.data ?? []) as Array<{ id: number; dni: string; nombre?: string; apellido?: string }>;
    if (!list.length) return;
    setChoferes(prev => {
      const map = new Map<number, any>();
      prev.forEach(i => map.set(i.id, i));
      list.forEach(i => map.set(i.id, i));
      return Array.from(map.values());
    });
  }, [choferesResp]);
  useEffect(() => {
    const list = (camionesResp?.data ?? []) as Array<{ id: number; patente: string }>;
    if (!list.length) return;
    setCamiones(prev => {
      const map = new Map<number, any>();
      prev.forEach(i => map.set(i.id, i));
      list.forEach(i => map.set(i.id, i));
      return Array.from(map.values());
    });
  }, [camionesResp]);
  useEffect(() => {
    const list = (acopladosResp?.data ?? []) as Array<{ id: number; patente: string }>;
    if (!list.length) return;
    setAcoplados(prev => {
      const map = new Map<number, any>();
      prev.forEach(i => map.set(i.id, i));
      list.forEach(i => map.set(i.id, i));
      return Array.from(map.values());
    });
  }, [acopladosResp]);

  const [driverIdSel, setDriverIdSel] = useState<number | ''>('');
  const [truckIdSel, setTruckIdSel] = useState<number | ''>('');
  const [trailerIdSel, setTrailerIdSel] = useState<number | ''>('');

  // Para compatibilidad con alta mínima, mantenemos campos opcionales
  const [dni, _setDni] = useState('');
  const [truckPlate, _setTruckPlate] = useState('');
  const [trailerPlate, _setTrailerPlate] = useState('');
  const [clienteId, setClienteId] = useState<number | undefined>(initialClienteId);
  useEffect(()=>{ if (initialClienteId && (clienteId === undefined || clienteId === null)) setClienteId(initialClienteId); }, [initialClienteId, clienteId]);
  const [equipoId, setEquipoId] = useState<number | undefined>(equipos[0]?.id);
  const [phones, setPhones] = useState<string[]>(['']);
  // Validación de teléfonos unificada en utils/validators

  // Modal de gestión de componentes
  const [manageOpen, setManageOpen] = useState(false);
  const [manageEquipoId, setManageEquipoId] = useState<number | null>(null);
  const [manageMode, setManageMode] = useState<'attach'|'detach'>('attach');
  const [componentType, setComponentType] = useState<'driver'|'truck'|'trailer'|'empresa'>('driver');
  const byId = false; // Identificación fija por DNI/Patente
  const [inputValue, setInputValue] = useState('');
  const [detachTrailer, setDetachTrailer] = useState(true);
  // Historial
  const [historyEquipoId, setHistoryEquipoId] = useState<number | null>(null);
  const { data: historyRows = [] } = useGetEquipoHistoryQuery({ id: historyEquipoId ?? 0 }, { skip: !historyEquipoId });
  const [historyFilter, setHistoryFilter] = useState<'all'|'create'|'swap'|'attach'|'close'|'detach'|'reopen'|'delete'>('all');
  const labelAction: Record<string,string> = { create: 'Creación', swap: 'Swap', attach: 'Adjuntar', close: 'Cerrar', detach: 'Desasociar', reopen: 'Reabrir', delete: 'Eliminar' };
  const labelComponent: Record<string,string> = { driver: 'Chofer', truck: 'Camión', trailer: 'Acoplado', empresa: 'Empresa', system: 'Sistema', unknown: 'Componente' };
  const filteredHistory = (Array.isArray(historyRows) ? historyRows : []).filter((r: any)=> historyFilter==='all' ? true : r.action === historyFilter);

  // Equipo seleccionado en el modal y su identificador actual según componente
  const selectedEquipo = useMemo(() => equipos.find((e: any) => e.id === manageEquipoId) as EquipoWithExtras | undefined, [equipos, manageEquipoId]);
  const currentIdentifier = useMemo(() => {
    if (!selectedEquipo) return '-';
    if (componentType === 'driver') return selectedEquipo.driverDniNorm || '-';
    if (componentType === 'truck') return selectedEquipo.truckPlateNorm || '-';
    if (componentType === 'trailer') return selectedEquipo.trailerPlateNorm || '-';
    const empId = (selectedEquipo as any).empresaTransportistaId as number | undefined;
    return (empId ? idToCuit.get(empId) : undefined) || '-';
  }, [selectedEquipo, componentType, idToCuit]);

  const openManage = (equipoId: number) => {
    setManageEquipoId(equipoId);
    setManageMode('attach');
    setComponentType('driver');
    setInputValue('');
    setDetachTrailer(true);
    setManageOpen(true);
  };

  const submitManage = async () => {
    if (!manageEquipoId) return;
    if (manageMode === 'detach') {
      // Solo se permite detach de trailer desde UI
      if (!detachTrailer) { show('Solo es posible desasociar el semirremolque en equipos activos. Para chofer/camión, cerrar el equipo y crear uno nuevo.', 'error'); return; }
      await detachEquipo({ id: manageEquipoId, trailer: true });
      setManageOpen(false);
      return;
    }
    // ATTACH / SWAP
    if (componentType === 'empresa') {
      const selected = inputValue.trim();
      const newId = selected === '' ? 0 : Number(selected);
      await updateEquipo({ id: manageEquipoId, empresaTransportistaId: newId });
      setManageOpen(false);
      return;
    }
    const body: any = {};
    if (componentType === 'driver') {
      if (byId) body.driverId = Number(inputValue);
      else body.driverDni = inputValue.trim();
    } else if (componentType === 'truck') {
      if (byId) body.truckId = Number(inputValue);
      else body.truckPlate = inputValue.trim();
    } else if (componentType === 'trailer') {
      if (byId) body.trailerId = Number(inputValue);
      else body.trailerPlate = inputValue.trim();
    }
    try {
      await attachEquipo({ id: manageEquipoId, ...body }).unwrap();
      setManageOpen(false);
    } catch (err: any) {
      const notFound = err?.status === 404;
      const conflict = err?.status === 409;
      if (!notFound || byId) {
        show(conflict ? (err?.data?.message || 'Componente ya pertenece a otro equipo') : 'No fue posible adjuntar el componente. Verifique los datos.', 'error');
        return;
      }

      if (componentType === 'driver') {
        const ok = await confirm({
          title: 'Chofer no encontrado',
          message: `No existe un chofer con DNI ${inputValue.trim()} en el dador seleccionado. ¿Desea crearlo y asociarlo al equipo?`,
          confirmText: 'Crear chofer',
          variant: 'primary',
        });
        if (!ok) return;
        try {
          await createChofer({ dadorCargaId: dadorId, dni: inputValue.trim(), phones: [] }).unwrap();
          await attachEquipo({ id: manageEquipoId, driverDni: inputValue.trim() }).unwrap();
          show('Chofer creado y asociado al equipo.', 'success');
          setManageOpen(false);
        } catch {
          show('Error al crear/adjuntar chofer.', 'error');
        }
      } else if (componentType === 'truck') {
        const ok = await confirm({
          title: 'Camión no encontrado',
          message: `No existe un camión con patente ${inputValue.trim()} en el dador seleccionado. ¿Desea crearlo y asociarlo al equipo?`,
          confirmText: 'Crear camión',
          variant: 'primary',
        });
        if (!ok) return;
        try {
          await createCamion({ dadorCargaId: dadorId, patente: inputValue.trim() }).unwrap();
          await attachEquipo({ id: manageEquipoId, truckPlate: inputValue.trim() }).unwrap();
          show('Camión creado y asociado al equipo.', 'success');
          setManageOpen(false);
        } catch {
          show('Error al crear/adjuntar camión.', 'error');
        }
      } else if (componentType === 'trailer') {
        const ok = await confirm({
          title: 'Acoplado no encontrado',
          message: `No existe un semirremolque con patente ${inputValue.trim()} en el dador seleccionado. ¿Desea crearlo y asociarlo al equipo?`,
          confirmText: 'Crear semirremolque',
          variant: 'primary',
        });
        if (!ok) return;
        try {
          await createAcoplado({ dadorCargaId: dadorId, patente: inputValue.trim() }).unwrap();
          await attachEquipo({ id: manageEquipoId, trailerPlate: inputValue.trim() }).unwrap();
          show('Acoplado creado y asociado al equipo.', 'success');
          setManageOpen(false);
        } catch {
          show('Error al crear/adjuntar semirremolque.', 'error');
        }
      }
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={goBack} className='flex items-center'>
            <ArrowLeftIcon className='h-4 w-4 mr-2' />
            Volver
          </Button>
          <h1 className='text-2xl font-bold'>Asociación de Equipos</h1>
        </div>
        {canCreateEquipo && (
          <Button 
            variant='default' 
            size='sm' 
            onClick={() => navigate('/documentos/equipos/alta-completa')}
            className='bg-green-600 hover:bg-green-700 text-white'
          >
            📄 Alta Completa con Documentos
          </Button>
        )}
      </div>

      {/* Importación CSV */}
      <Card className='p-4 mb-6 bg-card'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>Importar equipos desde CSV</h2>
          <Button variant='outline' size='sm' onClick={downloadCsvTemplate}>Descargar plantilla</Button>
        </div>
        <div className='mt-3 grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div className='flex flex-col'>
            <Label>Archivo CSV</Label>
            <input ref={csvInputRef} id='csvEquipos' type='file' accept='.csv' className='hidden' onChange={(e)=> setCsvFile(e.target.files?.[0] || null)} />
            <div className='flex items-center gap-2'>
              <Button variant='outline' type='button' onClick={()=> csvInputRef.current?.click()}>Seleccionar archivo</Button>
              <span className='text-sm text-muted-foreground'>{csvFile?.name ?? 'Ningún archivo seleccionado'}</span>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <input id='dryrun' type='checkbox' checked={dryRun} onChange={(e)=> setDryRun(e.target.checked)} />
            <Label htmlFor='dryrun'>Simular (dry‑run)</Label>
          </div>
          <div className='flex items-end'>
            <Button disabled={!csvFile || importing} onClick={async ()=>{
              if (!csvFile) return;
              try {
                const resp = await importCsv({ dadorId, file: csvFile, dryRun }).unwrap();
                const created = resp?.created ?? 0;
                const total = resp?.total ?? 0;
                show(`${dryRun ? 'Simulación' : 'Importación'}: ${created}/${total} filas OK`, created>0?'success':'info');
                if (resp?.errorsCsv) {
                  const blob = new Blob([resp.errorsCsv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'errores_import.csv';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }
              } catch (e: any) {
                show(getApiErrorMessage(e), 'error');
              }
            }}>{importing ? 'Procesando…' : (dryRun ? 'Simular' : 'Importar')}</Button>
          </div>
        </div>
        <p className='text-xs text-muted-foreground mt-2'>Formato recomendado: external_id,empresa_transportista_cuit,empresa_transportista_nombre,chofer_dni,chofer_nombre,camion_patente,acoplado_patente,chofer_phones</p>
      </Card>

      <Card className='p-4 mb-6 bg-card'>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <div>
            <Label htmlFor='selChofer'>Chofer</Label>
            <select id='selChofer' className='border rounded px-2 h-10 w-full bg-background text-foreground' value={driverIdSel}
              onChange={(e)=> setDriverIdSel(e.target.value? Number(e.target.value) : '')}>
              <option value=''>Seleccionar chofer</option>
              {choferes.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.apellido ? `${ch.apellido}, ${ch.nombre ?? ''}`.trim() : ch.nombre ?? ''} · DNI {ch.dni}</option>
              ))}
            </select>
            <div className='mt-1 flex items-center justify-between'>
              <span className='text-xs text-muted-foreground'>Mostrando {choferes.length}{choferTotal?` de ${choferTotal}`:''}</span>
              <Button variant='outline' size='sm' disabled={!choferHasMore} onClick={()=> setChoferPage(p=> p+1)}>Cargar más</Button>
            </div>
          </div>
          <div>
            <Label htmlFor='selCamion'>Camión</Label>
            <select id='selCamion' className='border rounded px-2 h-10 w-full bg-background text-foreground' value={truckIdSel}
              onChange={(e)=> setTruckIdSel(e.target.value? Number(e.target.value) : '')}>
              <option value=''>Seleccionar camión</option>
              {camiones.map(tr => (<option key={tr.id} value={tr.id}>{tr.patente}</option>))}
            </select>
            <div className='mt-1 flex items-center justify-between'>
              <span className='text-xs text-muted-foreground'>Mostrando {camiones.length}{camionTotal?` de ${camionTotal}`:''}</span>
              <Button variant='outline' size='sm' disabled={!camionHasMore} onClick={()=> setCamionPage(p=> p+1)}>Cargar más</Button>
            </div>
          </div>
          <div>
            <Label htmlFor='selAcoplado'>Acoplado</Label>
            <select id='selAcoplado' className='border rounded px-2 h-10 w-full bg-background text-foreground' value={trailerIdSel}
              onChange={(e)=> setTrailerIdSel(e.target.value? Number(e.target.value) : '')}>
              <option value=''>Sin acoplado</option>
              {acoplados.map(ac => (<option key={ac.id} value={ac.id}>{ac.patente}</option>))}
            </select>
            <div className='mt-1 flex items-center justify-between'>
              <span className='text-xs text-muted-foreground'>Mostrando {acoplados.length}{acopladoTotal?` de ${acopladoTotal}`:''}</span>
              <Button variant='outline' size='sm' disabled={!acopladoHasMore} onClick={()=> setAcopladoPage(p=> p+1)}>Cargar más</Button>
            </div>
          </div>
          <div>
            <Label htmlFor='empresaTransp'>Empresa Transportista (opcional)</Label>
            <select id='empresaTransp' className='border rounded px-2 h-10 w-full bg-background text-foreground' value={empresaTransportistaId}
              onChange={(e)=> setEmpresaTransportistaId(e.target.value ? Number(e.target.value) : '')}>
              <option value=''>Sin empresa</option>
              {empresasTransp.map((emp: any)=> (
                <option key={emp.id} value={emp.id}>{emp.razonSocial} · CUIT {emp.cuit}</option>
              ))}
            </select>
          </div>
        </div>
        <div className='mt-3'>
          <Label>Teléfonos del Chofer (WhatsApp)</Label>
          <div className='flex flex-col gap-2 max-w-md mt-1'>
            {phones.map((p, idx)=> (
              <div key={`phone-input-${idx}`} className='flex gap-2'>
                <Input placeholder='+54911...' value={p} onChange={(e)=>{ const arr=[...phones]; arr[idx]=e.target.value; setPhones(arr); }} />
                <Button variant='outline' onClick={()=> setPhones(arr=> arr.filter((_,i)=> i!==idx))} disabled={phones.length<=1}>Quitar</Button>
              </div>
            ))}
            <div className='flex gap-2'>
              <Button variant='outline' disabled={phones.length>=3} onClick={()=> setPhones(arr=> [...arr, ''])}>Agregar</Button>
            </div>
            {!phones.filter(Boolean).every(p=>validatePhone(p)) && (
              <span className='text-xs text-red-600'>Formato WhatsApp: +[código país][número], 8–15 dígitos.</span>
            )}
          </div>
        </div>
        {/* Create button row */}
        <div className='mt-4 flex gap-2'>
          <Button aria-label='Crear equipo' onClick={async () => {
            // Si hay selección por dropdown, priorizarla; si no, usar alta mínima
            const hasDropdowns = Boolean(driverIdSel) && Boolean(truckIdSel);
            const validPhones = phones.map(p=>p.trim()).filter(Boolean);
            if (validPhones.length>0 && !validPhones.every(p=>validatePhone(p))) {
              show('Teléfonos inválidos. Use formato WhatsApp.', 'error');
              return;
            }
            if (hasDropdowns) {
              const ch = choferes.find(c=> c.id === driverIdSel);
              const tr = camiones.find(t=> t.id === truckIdSel);
              const ac = trailerIdSel ? acoplados.find(a=> a.id === trailerIdSel) : undefined;
              try {
                await createEquipo({
                  dadorCargaId: dadorId,
                  driverId: Number(driverIdSel),
                  truckId: Number(truckIdSel),
                  trailerId: trailerIdSel ? Number(trailerIdSel) : undefined,
                  empresaTransportistaId: empresaTransportistaId ?? undefined,
                  driverDni: ch?.dni ?? '',
                  truckPlate: tr?.patente ?? '',
                  trailerPlate: ac?.patente,
                  validFrom: new Date().toISOString(),
                }).unwrap();
                show('Equipo creado', 'success');
              } catch (e: any) {
                const msg = getApiErrorMessage(e);
                if (String(e?.status) === '409') {
                  const ok = await confirm({
                    title: 'Componentes en uso',
                    message: `${msg}. ¿Mover componentes y cerrar el equipo origen automaticamente?`,
                    confirmText: 'Mover y crear',
                    variant: 'primary'
                  });
                  if (!ok) { show('Operación cancelada', 'info'); return; }
                  try {
                    await createEquipo({
                      dadorCargaId: dadorId,
                      driverId: Number(driverIdSel),
                      truckId: Number(truckIdSel),
                      trailerId: trailerIdSel ? Number(trailerIdSel) : undefined,
                      empresaTransportistaId: empresaTransportistaId ?? undefined,
                      driverDni: ch?.dni ?? '',
                      truckPlate: tr?.patente ?? '',
                      trailerPlate: ac?.patente,
                      validFrom: new Date().toISOString(),
                      forceMove: true as any,
                    }).unwrap();
                    show('Equipo creado moviendo componentes', 'success');
                    return;
                  } catch (e2: any) {
                    show(getApiErrorMessage(e2), 'error');
                    return;
                  }
                }
                show(msg, 'error');
              }
              return;
            }
            // Fallback: alta mínima por DNI/patentes si no se seleccionó por dropdown
            if (!dni || !truckPlate) {
              show('Seleccioná chofer/camión o completa DNI y patente.', 'error');
              return;
            }
            try {
              const { useCreateEquipoMinimalMutation } = await import('../api/documentosApiSlice');
              const [createEquipoMinimal] = (useCreateEquipoMinimalMutation as any)();
              await createEquipoMinimal({ dadorCargaId: dadorId, dniChofer: dni, patenteTractor: truckPlate, patenteAcoplado: trailerPlate || null, choferPhones: validPhones }).unwrap();
              show('Equipo creado', 'success');
            } catch (e: any) {
              const msg = e?.data?.message || e?.error || 'No se pudo crear el equipo';
              show(msg, 'error');
            }
          }}>Crear equipo</Button>
        </div>
        {/* Assign row */}
        <div className='mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end'>
          <div className='flex flex-col self-end'>
            <Label htmlFor='clienteSelect'>Cliente</Label>
            <select id='clienteSelect' className='border rounded px-2 h-10 w-full bg-background text-foreground' value={clienteId ?? ''} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value=''>Seleccionar cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}{defaults?.defaultClienteId===c.id ? ' (por defecto)' : ''}</option>)}
            </select>
            {defaults?.defaultClienteId && <span className='text-xs text-muted-foreground mt-1'>Seleccionado por defecto</span>}
          </div>
          <div className='flex flex-col self-end'>
            <Label htmlFor='dadorSelect'>Dador de carga</Label>
            <select id='dadorSelect' className='border rounded px-2 h-10 w-full bg-background text-foreground' value={dadorCargaId ?? ''} onChange={(e) => setDadorCargaId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value=''>Seleccionar dador</option>
              {dadores.map((d) => <option key={d.id} value={d.id}>{d.razonSocial}{defaults?.defaultDadorId===d.id ? ' (por defecto)' : ''}</option>)}
            </select>
            {defaults?.defaultDadorId && <span className='text-xs text-muted-foreground mt-1'>Seleccionado por defecto</span>}
          </div>
          <div className='flex flex-col self-end'>
            <Label htmlFor='equipoSelect'>Equipo</Label>
            <select id='equipoSelect' className='border rounded px-2 h-10 w-full bg-background text-foreground' value={equipoId} onChange={(e) => setEquipoId(Number(e.target.value))}>
              {equipos.map(e => <option key={e.id} value={e.id}>#{e.id} · DNI {e.driverDniNorm} · {e.truckPlateNorm}</option>)}
            </select>
          </div>
          <Button className='self-end' aria-label='Asignar equipo a cliente' onClick={async () => { if (!clienteId || !equipoId) return; await associate({ equipoId, clienteId, asignadoDesde: new Date().toISOString() }); }}>Asignar equipo a cliente</Button>
        </div>
        <p className='text-xs text-muted-foreground mt-2'>
          Al crear, si el chofer o los vehículos no existen para el dador seleccionado, el sistema te ofrecerá crearlos y asociarlos automáticamente.
        </p>
      </Card>

      <Card className='p-4 bg-card'>
        {/* KPIs mínimos */}
        <div className='mb-4 grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div className='rounded border p-3'><div className='text-xs text-muted-foreground'>Equipos creados (7d)</div><div className='text-xl font-semibold'>{equipoKpis?.created ?? 0}</div></div>
          <div className='rounded border p-3'><div className='text-xs text-muted-foreground'>Swaps/movimientos (7d)</div><div className='text-xl font-semibold'>{equipoKpis?.swaps ?? 0}</div></div>
          <div className='rounded border p-3'><div className='text-xs text-muted-foreground'>Eliminados (7d)</div><div className='text-xl font-semibold'>{equipoKpis?.deleted ?? 0}</div></div>
        </div>
        {/* Buscador de equipos */}
        <div className='grid grid-cols-1 md:grid-cols-5 gap-3 mb-3'>
          <div>
            <Label htmlFor='searchDni'>Buscar por DNI</Label>
            <Input id='searchDni' placeholder='DNI' value={dniSearch} onChange={(e)=> setDniSearch(e.target.value)} onKeyDown={onSearchKeyDown} />
            {!!dniQ && !dniValid && (
              <span className='text-xs text-muted-foreground'>Mínimo 6 dígitos</span>
            )}
          </div>
          <div>
            <Label htmlFor='searchTruck'>Patente Camión</Label>
            <Input id='searchTruck' placeholder='ABC123 o AA123AA' value={truckSearch} onChange={(e)=> setTruckSearch(e.target.value)} onKeyDown={onSearchKeyDown} />
            {!!truckQ && !truckValid && (
              <span className='text-xs text-muted-foreground'>Mínimo 5 caracteres</span>
            )}
          </div>
          <div>
            <Label htmlFor='searchTrailer'>Patente Acoplado</Label>
            <Input id='searchTrailer' placeholder='XYZ987 o AA987AA' value={trailerSearch} onChange={(e)=> setTrailerSearch(e.target.value)} onKeyDown={onSearchKeyDown} />
            {!!trailerQ && !trailerValid && (
              <span className='text-xs text-muted-foreground'>Mínimo 5 caracteres</span>
            )}
          </div>
          <div className='flex items-end gap-2'>
            <Button onClick={triggerSearch} disabled={!hasValidFilters}>Buscar</Button>
            <Button variant='outline' onClick={clearSearch}>Limpiar</Button>
            {searching && <span className='text-xs text-muted-foreground'>Buscando…</span>}
          </div>
        </div>
        <div className='grid gap-3'>
          {results.map((eq: EquipoWithExtras) => (
            <div key={eq.id} className='rounded-lg border bg-white dark:bg-slate-900 p-3 grid gap-3 md:grid-cols-[1fr,auto,auto] items-center'>
              {/* Columna izquierda: Identificación */}
              <div className='space-y-1'>
                <div className='font-medium flex items-center gap-2'>
                  <span>Equipo #{eq.id}</span>
                  <span className='text-xs px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-slate-800/60 text-muted-foreground'>
                    {(eq.estado === 'finalizada') ? 'inactivo' : 'activo'}
                  </span>
                </div>
                <div className='text-sm text-muted-foreground'>
                  DNI {eq.driverDniNorm} · Camión {eq.truckPlateNorm} · Acoplado {eq.trailerPlateNorm || '-'}
                </div>
                <div className='text-xs text-muted-foreground flex flex-wrap gap-2'>
                  { eq.dador && (
                    <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-slate-800/60'>
                      <span className='opacity-70'>Dador</span> {eq.dador.razonSocial}
                    </span>
                  )}
                  { (() => { const empId = (eq as any).empresaTransportistaId as number | undefined; const cuit = empId ? idToCuit.get(empId) : undefined; return (
                    <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-slate-800/60'>
                      <span className='opacity-70'>Emp.Transp</span> {cuit || '-'}
                    </span>
                  ); })() }
                </div>
                { Array.isArray(eq.clientes) && eq.clientes.length > 0 && (
                  <div className='text-xs text-muted-foreground'>
                    Clientes: {eq.clientes.map((rel) => {
                      const c = clients.find(cc => cc.id === rel.clienteId);
                      const name = c?.razonSocial || `Cliente ${rel.clienteId}`;
                      return <span key={rel.clienteId} className='inline-block bg-gray-50 dark:bg-slate-800/60 border px-2 py-0.5 rounded mr-1'>{name}</span>;
                    })}
                  </div>
                )}
              </div>

              {/* Columna centro: Semáforo */}
              <div className='justify-self-start md:justify-self-center'>
                <EquipoSemaforo equipoId={eq.id} />
              </div>

              {/* Columna derecha: Acciones */}
              <div className='flex flex-wrap justify-end items-center gap-2'>
                <Button
                  variant='default'
                  size='sm'
                  onClick={() => navigate(`/documentos/equipos/${eq.id}/editar`)}
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  ✏️ Editar
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={async ()=> {
                    try {
                      const url = `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/equipos/${eq.id}/zip`;
                      const resp = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
                      if (!resp.ok) throw new Error('ZIP');
                      const blob = await resp.blob();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `equipo_${eq.id}_vigentes.zip`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    } catch { show('No se pudo descargar el ZIP de vigentes', 'error'); }
                  }}
                >
                  ZIP vigentes
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={async ()=> {
                    try {
                      const url = `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/equipos/${eq.id}/summary.xlsx`;
                      const resp = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
                      if (!resp.ok) throw new Error('XLSX');
                      const blob = await resp.blob();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `equipo_${eq.id}_resumen.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    } catch { show('No se pudo descargar el Excel de resumen', 'error'); }
                  }}
                >
                  Excel
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={async ()=>{
                    try {
                      const complianceResp = await getEquipoComplianceLazy({ id: eq.id }).unwrap();
                      const docsByEntity: Record<string, any[]> = (complianceResp?.documents || {}) as Record<string, any[]>;
                      const approvedDocs: Array<number> = [];
                      Object.values(docsByEntity).forEach((arr: any[]) => {
                        arr.forEach((d: any) => { if (String(d.status).toUpperCase() === 'APROBADO') approvedDocs.push(d.id); });
                      });
                      if (approvedDocs.length === 0) { show('No hay documentación vigente para descargar', 'info'); return; }
                      // Descargar como ZIP en frontend (conservando nombres originales)
                      const { default: JSZip } = await import('jszip');
                      const zip = new JSZip();
                      const parseFileName = (cd: string | null): string | null => {
                        if (!cd) return null;
                        // filename* (RFC 5987)
                        const star = cd.match(/filename\*=(?:UTF-8''|)([^;]+)/i);
                        if (star && star[1]) {
                          try { return decodeURIComponent(star[1].replace(/\"/g, '').trim()); } catch { /* ignore */ }
                        }
                        // filename="name.pdf"
                        const normal = cd.match(/filename="?([^";]+)"?/i);
                        if (normal && normal[1]) return normal[1].trim();
                        return null;
                      };
                      for (const docId of approvedDocs) {
                        try {
                          const downloadUrl = `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/documents/${docId}/download`;
                          const resp = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${authToken}` } });
                          if (!resp.ok) continue;
                          const blob = await resp.blob();
                          const cd = resp.headers.get('Content-Disposition');
                          const originalName = parseFileName(cd) || `doc_${docId}.pdf`;
                          zip.file(originalName, blob);
                        } catch (e) { /* noop */ }
                      }
                      const content = await zip.generateAsync({ type: 'blob' });
                      const url = window.URL.createObjectURL(content);
                      const a = document.createElement('a');
                      a.href = url;
                      const dni = (eq as any).driverDniNorm || 'sin_dni';
                      a.download = `equipo_${eq.id}_DNI_${dni}.zip`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (e) {
                      show('No fue posible iniciar la descarga', 'error');
                    }
                  }}
                >Bajar documentación</Button>
                <Button variant='outline' size='sm' onClick={()=> navigate(`/documentos/equipos/${eq.id}/estado?only=vencidos`)}>Ver estado</Button>
                <Button variant='outline' size='sm' onClick={()=> openManage(eq.id)}>Gestionar componentes</Button>
                <Button variant='outline' size='sm' onClick={()=> setHistoryEquipoId(eq.id)}>Historial</Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={async ()=>{
                    const current = (eq as any).estado || 'activa';
                    const target = current === 'finalizada' ? 'activa' : 'finalizada';
                    if (target === 'finalizada') {
                      const ok = await confirm({
                        title: 'Desactivar equipo',
                        message: `¿Desactivar equipo #${(eq as any).id}?`,
                        confirmText: 'Desactivar',
                        variant: 'danger',
                      });
                      if (!ok) return;
                    }
                    await updateEquipo({ id: (eq as any).id, estado: target as any });
                    show(target === 'finalizada' ? 'Equipo desactivado' : 'Equipo activado', 'success');
                  }}
                >{(eq as any).estado === 'finalizada' ? 'Activar' : 'Desactivar'}</Button>
                <Button variant='destructive' size='sm' onClick={async ()=>{
                  const ok = await confirm({ title: 'Eliminar equipo', message: `¿Eliminar equipo #${eq.id}? Esta acción es irreversible.`, confirmText: 'Eliminar', variant: 'danger' });
                  if (!ok) return;
                  await deleteEquipo({ id: (eq as any).id });
                  show('Equipo eliminado', 'success');
                }}>Eliminar</Button>
              </div>
            </div>
          ))}
          {equipos.length === 0 && <div className='text-sm text-muted-foreground'>Sin equipos</div>}
        </div>
      </Card>

      {historyEquipoId && (
        <div className='fixed inset-0 bg-black/40 grid place-items-center z-50'>
          <div className='w-full max-w-2xl rounded-xl border bg-card p-4 shadow-lg'>
            <div className='flex items-center justify-between mb-2'>
              <div className='text-lg font-semibold'>Historial de equipo #{historyEquipoId}</div>
              <Button variant='outline' size='sm' onClick={()=> setHistoryEquipoId(null)}>Cerrar</Button>
            </div>
            <div className='flex items-center gap-2 mb-2'>
              <label className='text-xs text-muted-foreground'>Filtrar</label>
              <select className='border rounded px-2 h-8' value={historyFilter} onChange={(e)=> setHistoryFilter(e.target.value as any)}>
                <option value='all'>Todos</option>
                <option value='create'>Creación</option>
                <option value='swap'>Swap</option>
                <option value='attach'>Adjuntar</option>
                <option value='close'>Cerrar</option>
                <option value='detach'>Desasociar</option>
                <option value='reopen'>Reabrir</option>
                <option value='delete'>Eliminar</option>
              </select>
            </div>
            <div className='max-h-[60vh] overflow-auto'>
              {filteredHistory.length === 0 ? (
                <div className='text-sm text-muted-foreground'>Sin movimientos registrados</div>
              ) : (
                <div className='divide-y'>
                  {filteredHistory.map((row: any) => (
                    <div key={row.id} className='py-2 text-sm flex items-center justify-between'>
                      <div>
                        <div className='font-medium' title={row?.payload ? JSON.stringify(row.payload) : undefined}>
                          {labelAction[row.action] || row.action} · {labelComponent[row.component] || row.component}
                        </div>
                        {row.originEquipoId ? (
                          <div className='text-xs text-muted-foreground'>Origen equipo #{row.originEquipoId}</div>
                        ) : null}
                      </div>
                      <div className='text-xs text-muted-foreground'>{new Date(row.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {manageOpen && (
        <div className='fixed inset-0 bg-black/40 grid place-items-center z-50'>
          <div className='w-full max-w-xl rounded-xl border bg-card p-4 shadow-lg'>
            <div className='text-lg font-semibold mb-2'>Gestionar componentes del equipo #{manageEquipoId}</div>
            <div className='space-y-3'>
              <div className='flex items-center gap-3'>
                <label className='text-sm font-medium'>Acción</label>
                <span className='text-sm'>Adjuntar / Swap</span>
              </div>
              <div className='flex items-center gap-3'>
                <label className='text-sm font-medium'>Componente</label>
                <select className='input input-bordered py-2 px-3 rounded-md bg-background border'
                  value={componentType} onChange={(e)=> setComponentType(e.target.value as 'driver'|'truck'|'trailer'|'empresa')}>
                  <option value='driver'>Chofer</option>
                  <option value='truck'>Camión</option>
                  <option value='trailer'>Acoplado</option>
                  <option value='empresa'>Empresa Transportista</option>
                </select>
                <span className='text-xs text-muted-foreground'>Actual: {currentIdentifier}</span>
              </div>
              {componentType !== 'empresa' ? (
                <div className='flex items-center gap-3'>
                  <label className='text-sm font-medium'>Cambiar por</label>
                  <span className='text-sm'>DNI/Patente</span>
                  <input className='input input-bordered py-2 px-3 rounded-md bg-background border flex-1' placeholder={componentType==='driver'?'DNI':'Patente'}
                    value={inputValue} onChange={(e)=> setInputValue(e.target.value)} />
                </div>
              ) : (
                <div className='flex items-center gap-3'>
                  <label className='text-sm font-medium'>Seleccionar empresa</label>
                  <select className='input input-bordered py-2 px-3 rounded-md bg-background border flex-1'
                    value={inputValue} onChange={(e)=> setInputValue(e.target.value)}>
                    <option value=''>Sin empresa</option>
                    {empresasTransp.map((emp: any)=> (
                      <option key={emp.id} value={emp.id}>{emp.razonSocial} · CUIT {emp.cuit}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className='text-xs text-muted-foreground'>La operación es atómica: reemplaza el componente sin dejar campos nulos.</div>
            </div>
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button variant='outline' onClick={()=> setManageOpen(false)}>Cancelar</Button>
              <Button onClick={submitManage} disabled={attaching || detaching}>
                {manageMode === 'attach' ? (attaching ? 'Aplicando...' : 'Aplicar') : (detaching ? 'Desasociando...' : 'Desasociar')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquiposPage;

// ---------- Semáforo por equipo ----------
const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span className={`inline-block w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: color }} />
);

const EquipoSemaforo: React.FC<{ equipoId: number }> = ({ equipoId }) => {
  const _navigate = useNavigate();
  const { data } = useGetEquipoComplianceQuery({ id: equipoId }, { skip: !equipoId });
  if (!data) return null;
  const now = Date.now();
  let faltantes = 0, vencidos = 0, porVencer = 0, vigentes = 0;
  const docsByEntity: Record<string, any[]> = data?.documents || {};

  const bumpFromCompliance = (entityType: 'EMPRESA_TRANSPORTISTA'|'CHOFER'|'CAMION'|'ACOPLADO', r: any) => {
    const state = String(r.state ?? '').toUpperCase();
    if (state === 'OK') { vigentes++; return; }
    if (state === 'PROXIMO') { porVencer++; return; }
    // FALTANTE: decidir si es vencido o faltante puro
    const list = (docsByEntity[entityType] ?? []) as Array<any>;
    const latest = list.find((d: any) => d.templateId === r.templateId);
    if (latest) {
      const expired = latest.expiresAt && new Date(latest.expiresAt).getTime() <= now;
      const statusExpired = String(latest.status ?? '').toUpperCase() === 'VENCIDO';
      if (expired || statusExpired) { vencidos++; return; }
    }
    faltantes++;
  };

  try {
    for (const c of (data?.clientes ?? [])) {
      for (const r of (c?.compliance ?? [])) {
        bumpFromCompliance(r.entityType as any, r);
      }
    }
  } catch (e) { /* noop */ }

  return (
    <div className='mt-1 flex items-center gap-4 text-xs'>
      <span className='flex items-center gap-1' title='Documentación faltante'>
        <Dot color='#ef4444' />
        <span>Faltantes</span>
        <strong>{faltantes}</strong>
      </span>
      <span className='flex items-center gap-1' title='Documentación vencida'>
        <Dot color='#fb923c' />
        <span>Vencidos</span>
        <strong>{vencidos}</strong>
      </span>
      <span className='flex items-center gap-1' title='Documentación por vencer'>
        <Dot color='#f59e0b' />
        <span>Por vencer</span>
        <strong>{porVencer}</strong>
      </span>
      <span className='flex items-center gap-1' title='Documentación vigente'>
        <Dot color='#22c55e' />
        <span>Vigentes</span>
        <strong>{vigentes}</strong>
      </span>
    </div>
  );
};



