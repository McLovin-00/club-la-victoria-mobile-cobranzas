import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../components/ui/toast';
import { ConfirmContext } from '../../../contexts/confirmContext';
import { useGetDadoresQuery, useGetTemplatesQuery, useGetClientsQuery, useLazySearchEquiposQuery, useGetDefaultsQuery, useLazyGetEquipoComplianceQuery, useDeleteEquipoMutation, useGetEquipoComplianceQuery, useSearchEquiposByDnisMutation, useDownloadVigentesBulkMutation } from '../api/documentosApiSlice';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export const ConsultaPage: React.FC = () => {
  const navigate = useNavigate();
  const { show } = useToast();
  const { confirm } = useContext(ConfirmContext);
  const { data: dadoresResp } = useGetDadoresQuery({});
  const dadores = dadoresResp?.list ?? (Array.isArray(dadoresResp) ? dadoresResp : []);
  const { data: templates = [] } = useGetTemplatesQuery();
  const { data: clientsResp } = useGetClientsQuery({});
  const clients = clientsResp?.list ?? (Array.isArray(clientsResp) ? clientsResp : []);
  const empresaIdFromAuth = useSelector((s: RootState) => s.auth?.user?.empresaId) as number | undefined;
  const { data: defaults } = useGetDefaultsQuery();
  // Para búsqueda, si hay default de dador lo usamos; de lo contrario no filtramos por dador
  const dadorIdForSearch = defaults?.defaultDadorId ?? undefined;
  const authToken = useSelector((s: RootState) => s.auth?.token) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || '') : '');
  const [dni, setDni] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [trailerPlate, setTrailerPlate] = useState('');
  const [params, setParams] = useState<{ dni?: string; truckPlate?: string; trailerPlate?: string }>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [trigger, { data = [], isFetching, isError, error }] = useLazySearchEquiposQuery();
  const [getCompliance] = useLazyGetEquipoComplianceQuery();
  const [deleteEquipo] = useDeleteEquipoMutation();
  // CSV DNIs search
  const [searchByDnis, { isLoading: loadingCsvSearch }] = useSearchEquiposByDnisMutation();
  const [downloadBulk] = useDownloadVigentesBulkMutation();
  const [csvResults, setCsvResults] = useState<Array<any>>([]);
  const [csvInfo, setCsvInfo] = useState<{ name?: string; count?: number }>({});

  // Ejecutar búsqueda al cambiar parámetros válidos
  useEffect(() => {
    if ((params.dni || params.truckPlate || params.trailerPlate)) {
      console.debug('ConsultaPage: buscando equipos', { empresaId: dadorIdForSearch, ...params });
      // preferCacheValue=false para forzar request
      (trigger as any)({ empresaId: dadorIdForSearch, ...params }, false);
      // Persistir búsqueda en URL y sessionStorage
      const sp: any = {};
      if (params.dni) sp.dni = params.dni;
      if (params.truckPlate) sp.truckPlate = params.truckPlate;
      if (params.trailerPlate) sp.trailerPlate = params.trailerPlate;
      setSearchParams(sp);
      try { sessionStorage.setItem('consultaSearch', JSON.stringify(sp)); } catch {}
    }
  }, [dadorIdForSearch, params.dni, params.truckPlate, params.trailerPlate]);

  // Inicializar desde URL o sessionStorage
  useEffect(() => {
    const dniQ = searchParams.get('dni') || undefined;
    const truckQ = searchParams.get('truckPlate') || undefined;
    const trailerQ = searchParams.get('trailerPlate') || undefined;
    if (dniQ || truckQ || trailerQ) {
      setDni(dniQ || '');
      setTruckPlate(truckQ || '');
      setTrailerPlate(trailerQ || '');
      setParams({ dni: dniQ, truckPlate: truckQ, trailerPlate: trailerQ });
      return;
    }
    try {
      const saved = JSON.parse(sessionStorage.getItem('consultaSearch') || 'null');
      if (saved && (saved.dni || saved.truckPlate || saved.trailerPlate)) {
        setDni(saved.dni || '');
        setTruckPlate(saved.truckPlate || '');
        setTrailerPlate(saved.trailerPlate || '');
        setParams(saved);
      }
    } catch {}
  }, []);

  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const onCsvFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const hasHeader = /dni/i.test(lines[0]);
      const body = hasHeader ? lines.slice(1) : lines;
      const dnis = body.map((l) => (l.split(',')[0] || '').replace(/\D+/g, '')).filter(Boolean);
      setCsvInfo({ name: file.name, count: dnis.length });
      if (dnis.length === 0) { show('El CSV no contiene DNIs válidos', 'info'); return; }
      const resp = await searchByDnis({ dnis }).unwrap();
      // Uniformar a la forma esperada por el render: { equipo, clientes }
      const wrapped = (resp || []).map((eq: any) => ({ equipo: eq, clientes: [] }));
      setCsvResults(wrapped);
      show(`Se encontraron ${wrapped.length} equipos para ${dnis.length} DNI(s)`, 'success');
    } catch {
      show('Error leyendo el CSV de DNIs', 'error');
    }
  };

  const displayResults: Array<any> = csvResults.length > 0 ? csvResults : (data as any[]);

  const downloadAllVigentes = async () => {
    try {
      if (!Array.isArray(displayResults) || displayResults.length === 0) { show('No hay equipos para descargar', 'info'); return; }
      const ids = displayResults.map((it: any) => (it?.equipo?.id ?? it?.id)).filter((v: any) => typeof v === 'number');
      if (!ids.length) { show('Sin IDs válidos de equipos', 'info'); return; }
      const blob = await downloadBulk({ equipoIds: ids }).unwrap();
      const url = URL.createObjectURL(blob as any);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
      a.download = `documentacion_equipos_vigentes_${stamp}_${ids.length}equipos.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      show('No fue posible iniciar la descarga masiva', 'error');
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center gap-2 mb-4'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            // Limpiar búsqueda persistida y volver
            try { sessionStorage.removeItem('consultaSearch'); } catch {}
            setSearchParams({});
            navigate('/documentos');
          }}
          className='flex items-center'
        >
          <ArrowLeftIcon className='h-4 w-4 mr-2' />
          Volver
        </Button>
        <h1 className='text-2xl font-bold'>Consulta</h1>
      </div>
      <Card className='p-4 mb-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
          <Input placeholder='DNI Chofer' value={dni} onChange={(e) => setDni(e.target.value)} />
          <Input placeholder='Patente Camión' value={truckPlate} onChange={(e) => setTruckPlate(e.target.value)} />
          <Input placeholder='Patente Acoplado' value={trailerPlate} onChange={(e) => setTrailerPlate(e.target.value)} />
        </div>
        <div className='mt-3 flex flex-col md:flex-row gap-2 md:items-center justify-between'>
          <div className='flex gap-2'>
            <Button type='button' onClick={() => { const p = { dni: dni || undefined, truckPlate: truckPlate || undefined, trailerPlate: trailerPlate || undefined }; setCsvResults([]); setParams(p); }} disabled={!dni && !truckPlate && !trailerPlate}>Buscar</Button>
            <Button type='button' variant='outline' onClick={() => { setDni(''); setTruckPlate(''); setTrailerPlate(''); setParams({}); setCsvResults([]); }}>Limpiar</Button>
          </div>
          <div className='flex gap-2 items-center'>
            <input ref={csvInputRef} id='csvDnis' type='file' accept='.csv' className='hidden' onChange={(e)=> { const f = e.target.files?.[0]; if (f) onCsvFile(f); }} />
            <Button type='button' variant='outline' onClick={()=> csvInputRef.current?.click()}>Seleccionar CSV DNIs</Button>
            {csvInfo?.name && <span className='text-xs text-muted-foreground'>Cargado: {csvInfo.name} ({csvInfo.count || 0} DNIs)</span>}
            <Button type='button' variant='outline' onClick={downloadAllVigentes} disabled={(displayResults || []).length === 0}>Bajar documentación vigente (ZIP)</Button>
          </div>
        </div>
      </Card>

      {isFetching && <div className='text-sm text-muted-foreground'>Buscando...</div>}
      {(!isFetching && Array.isArray(displayResults) && displayResults.length === 0 && (params.dni || params.truckPlate || params.trailerPlate || csvResults.length > 0)) && (
        <div className='text-sm text-muted-foreground'>Sin resultados para los criterios ingresados.</div>
      )}
      {isError && <div className='text-sm text-red-600'>Error al buscar{(error as any)?.status ? ` (${(error as any).status})` : ''}. Revise conexión y credenciales.</div>}
      <div className='grid gap-3'>
        {displayResults.map((it: any) => {
          const eq = it.equipo || it;
          return (
            <div key={eq.id} className='rounded-lg border bg-white dark:bg-slate-900 p-3 grid gap-3 md:grid-cols-[1fr,auto,auto] items-center'>
              <div className='space-y-1'>
                <div className='font-medium flex items-center gap-2'>
                  <span>Equipo #{eq.id}</span>
                  <span className='text-xs px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-slate-800/60 text-muted-foreground'>
                    {eq.estado || 'activa'}
                  </span>
                </div>
                <div className='text-sm text-muted-foreground'>
                  DNI {eq.driverDniNorm} · Camión {eq.truckPlateNorm} · Acoplado {eq.trailerPlateNorm || '-'}
                </div>
                { Array.isArray(eq.clientes) && eq.clientes.length > 0 && (
                  <div className='text-xs text-muted-foreground'>
                    Clientes: {eq.clientes.map((rel: any) => {
                      const c = clients.find((cc: any) => cc.id === rel.clienteId);
                      const name = c?.razonSocial || `Cliente ${rel.clienteId}`;
                      return <span key={rel.clienteId} className='inline-block bg-gray-50 dark:bg-slate-800/60 border px-2 py-0.5 rounded mr-1'>{name}</span>;
                    })}
                  </div>
                )}
              </div>

              <div className='justify-self-start md:justify-self-center'>
                <EquipoSemaforo equipoId={eq.id} />
              </div>

              <div className='flex flex-wrap justify-end items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={async ()=>{
                    try {
                      const complianceResp = await getCompliance({ id: eq.id }).unwrap();
                      const docsByEntity: Record<string, any[]> = (complianceResp?.documents || {}) as Record<string, any[]>;
                      const approvedDocs: Array<number> = [];
                      Object.values(docsByEntity).forEach((arr: any[]) => {
                        arr.forEach((d: any) => { if (String(d.status).toUpperCase() === 'APROBADO') approvedDocs.push(d.id); });
                      });
                      if (approvedDocs.length === 0) { show('No hay documentación vigente para descargar', 'info'); return; }
                      const { default: JSZip } = await import('jszip');
                      const zip = new JSZip();
                      const parseFileName = (cd: string | null): string | null => {
                        if (!cd) return null;
                        const star = cd.match(/filename\*=(?:UTF-8''|)([^;]+)/i);
                        if (star && star[1]) { try { return decodeURIComponent(star[1].replace(/\"/g, '').trim()); } catch {} }
                        const normal = cd.match(/filename="?([^";]+)"?/i);
                        if (normal && normal[1]) return normal[1].trim();
                        return null;
                      };
                      for (const docId of approvedDocs) {
                        try {
                          const downloadUrl = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs/documents/${docId}/download`;
                          const resp = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${authToken}` } });
                          if (!resp.ok) continue;
                          const blob = await resp.blob();
                          const cd = resp.headers.get('Content-Disposition');
                          const originalName = parseFileName(cd) || `doc_${docId}.pdf`;
                          zip.file(originalName, blob);
                        } catch {}
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
                    } catch {
                      show('No fue posible iniciar la descarga', 'error');
                    }
                  }}
                >Bajar documentación</Button>
                <Button variant='outline' size='sm' onClick={()=> navigate(`/documentos/equipos/${eq.id}/estado`)}>Ver estado</Button>
                <Button variant='destructive' size='sm' onClick={async ()=>{
                  const ok = await confirm({ title: 'Eliminar equipo', message: `¿Eliminar equipo #${eq.id}? Esta acción es irreversible.`, confirmText: 'Eliminar', variant: 'danger' });
                  if (!ok) return;
                  await deleteEquipo({ id: (eq as any).id });
                  show('Equipo eliminado', 'success');
                }}>Eliminar</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConsultaPage;


// ---------- Semáforo por equipo (copiado de EquiposPage) ----------
const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span className={`inline-block w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: color }} />
);

const EquipoSemaforo: React.FC<{ equipoId: number }> = ({ equipoId }) => {
  const { data } = useGetEquipoComplianceQuery({ id: equipoId }, { skip: !equipoId });
  if (!data) return null;
  const now = Date.now();
  let faltantes = 0, vencidos = 0, porVencer = 0, vigentes = 0;
  const docsByEntity: Record<string, any[]> = data?.documents || {};

  const bumpFromCompliance = (entityType: 'EMPRESA_TRANSPORTISTA'|'CHOFER'|'CAMION'|'ACOPLADO', r: any) => {
    const state = String(r.state || '').toUpperCase();
    if (state === 'OK') { vigentes++; return; }
    if (state === 'PROXIMO') { porVencer++; return; }
    const list = (docsByEntity[entityType] || []) as Array<any>;
    const latest = list.find((d: any) => d.templateId === r.templateId);
    if (latest) {
      const expired = latest.expiresAt && new Date(latest.expiresAt).getTime() <= now;
      const statusExpired = String(latest.status || '').toUpperCase() === 'VENCIDO';
      if (expired || statusExpired) { vencidos++; return; }
    }
    faltantes++;
  };

  try {
    for (const c of (data?.clientes || [])) {
      for (const r of (c?.compliance || [])) {
        bumpFromCompliance(r.entityType as any, r);
      }
    }
  } catch {}

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

