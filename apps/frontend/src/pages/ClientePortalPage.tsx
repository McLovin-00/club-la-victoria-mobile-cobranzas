import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useGetClientsQuery } from '../features/documentos/api/documentosApiSlice';
import type { Cliente, EquipoDocumento, EquipoWithExtras } from '../features/documentos/types/entities';
import { useGetClienteEquiposQuery, useGetDocumentosPorEquipoQuery, useGetClientRequirementsQuery, useBulkSearchPlatesMutation, useRequestClientsBulkZipMutation, useGetClientsZipJobQuery } from '../features/documentos/api/documentosApiSlice';
import { showToast } from '../components/ui/Toast.utils';
import { useRoleBasedNavigation } from '../hooks/useRoleBasedNavigation';
import { useNavigate } from 'react-router-dom';
import { 
  BuildingOfficeIcon,
  TruckIcon,
  DocumentCheckIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export const ClientePortalPage: React.FC = () => {
  const _navigate = useNavigate();
  const { goBack } = useRoleBasedNavigation();
  const { data: clientsResp } = useGetClientsQuery({});
  const clients = useMemo<Cliente[]>(() => (clientsResp?.list ?? []) as Cliente[], [clientsResp]);
  const [clienteId, setClienteId] = useState<number | undefined>(clients[0]?.id);
  const resolvedClienteId = useMemo(() => clienteId ?? clients[0]?.id, [clienteId, clients]);
  const { data: equipos = [], refetch } = useGetClienteEquiposQuery(
    { clienteId: Number(resolvedClienteId || 0) },
    { skip: !resolvedClienteId }
  );
  const { data: reqs = [] } = useGetClientRequirementsQuery({ clienteId: Number(resolvedClienteId || 0) }, { skip: !resolvedClienteId });
  const docsCacheRef = useRef<Map<number, EquipoDocumento[]>>(new Map());

  const [estadoFilter, setEstadoFilter] = useState<'TODOS'|'VIGENTE'|'PROXIMO'|'VENCIDO'|'FALTANTE'>('TODOS');

  // Búsqueda masiva por patentes (cliente)
  const [platesInput, setPlatesInput] = useState('');
  const [plateType, setPlateType] = useState<'both'|'truck'|'trailer'>('both');
  const [bulkResults, setBulkResults] = useState<Array<{ id: number; truckPlateNorm?: string|null; trailerPlateNorm?: string|null }>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [invalidLines, setInvalidLines] = useState<string[]>([]);
  const [requestZip, { isLoading: isZipLoading }] = useRequestClientsBulkZipMutation();
  const [bulkSearch, { isLoading: isBulkLoading }] = useBulkSearchPlatesMutation();
  const [zipJobId, setZipJobId] = useState<string | null>(null);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const { data: zipJobData } = useGetClientsZipJobQuery(
    { jobId: zipJobId ?? '' },
    { skip: !zipJobId, pollingInterval: 1000 }
  );

  const normalizePlate = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const parsePlates = () => {
    const lines = platesInput.split(/\r?\n/).map(l => normalizePlate(l.trim())).filter(Boolean);
    const unique = Array.from(new Set(lines));
    const invalid = unique.filter(p => p.length < 5);
    setInvalidLines(invalid);
    return unique.filter(p => p.length >= 5);
  };
  const handleBulkSearch = async () => {
    const plates = parsePlates();
    if (plates.length === 0) {
      setBulkResults([]);
      setSelectedIds(new Set());
      return;
    }
    const type = plateType === 'both' ? undefined : (plateType as 'truck'|'trailer');
    try {
      const data = await bulkSearch({ plates, type }).unwrap();
      setBulkResults(Array.isArray(data) ? data : []);
      setSelectedIds(new Set());
      showToast(`Búsqueda completada: ${Array.isArray(data) ? data.length : 0} equipos`, 'success');
    } catch {
      showToast('No se pudo completar la búsqueda. Reintentá más tarde.', 'error');
      setBulkResults([]);
      setSelectedIds(new Set());
    }
  };
  const handleGenerateZip = async () => {
    const pick = Array.from(selectedIds);
    const equipoIds = (pick.length ? pick : Array.from(new Set(bulkResults.map(r => r.id)))).slice(0, 200);
    if (equipoIds.length === 0) return;
    try {
      showToast('Generando ZIP, te avisamos cuando esté listo…');
      const r = await requestZip({ equipoIds }).unwrap();
      setZipJobId(r.jobId);
    } catch {
      showToast('No fue posible iniciar la generación del ZIP', 'error');
    }
  };
  useEffect(()=> {
    if (zipJobId && zipJobData?.job?.signedUrl) {
      showToast('ZIP listo para descargar', 'success');
    } else if (zipJobId && zipJobData?.job?.status === 'failed') {
      showToast('Falló la generación del ZIP', 'error');
    }
  }, [zipJobId, zipJobData]);

  const exportCsv = () => {
    const rows: string[] = ['equipoId,entityType,templateId,templateName,estado,venceEl'];
    for (const e of equipos) {
      const equipo = e.equipo || e;
      const docs = docsCacheRef.current.get(equipo.id) ?? [];
      for (const r of reqs as any[]) {
        const found = docs.find(d => d.templateId === r.templateId && d.entityType === r.entityType);
        const vence = found?.expiresAt ? new Date(found.expiresAt) : null;
        const now = new Date();
        const diffDays = vence ? Math.ceil((vence.getTime() - now.getTime())/86400000) : null;
        const estado = found ? (vence ? (diffDays! <= 0 ? 'VENCIDO' : (diffDays! <= 30 ? 'PROXIMO' : 'VIGENTE')) : 'VIGENTE') : 'FALTANTE';
        rows.push([equipo.id, r.entityType, r.templateId, r.template?.name ?? '', estado, vence ? vence.toLocaleDateString() : ''].join(','));
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'compliance_cliente.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header moderno y amigable */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant='outline' 
              size='sm' 
              onClick={goBack} 
              className='flex items-center gap-2 hover:bg-emerald-50 transition-all duration-200 rounded-full px-4'
            >
              ← Volver
            </Button>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 p-4 rounded-2xl shadow-lg">
                  <BuildingOfficeIcon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2">
                    ¡Bienvenido, Cliente! 🏢
                  </h1>
                  <p className="text-gray-600 dark:text-slate-300 text-base sm:text-lg">
                    Consulta y seguimiento de equipos habilitados y documentación
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Control */}
        <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <FunnelIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Panel de Control</h2>
                <p className="text-emerald-100 text-sm">Selección de cliente y filtros de estado</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <select
                  className="w-full h-12 text-base rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-emerald-500 transition-colors"
                  value={resolvedClienteId ?? ''}
                  onChange={(e) => setClienteId(Number(e.target.value))}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.razonSocial}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Filtrar por Estado</label>
                <select 
                  className="w-full h-12 text-base rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-emerald-500 transition-colors" 
                  value={estadoFilter} 
                  onChange={(e)=> setEstadoFilter(e.target.value as any)}
                >
                  <option value='TODOS'>Todos los estados</option>
                  <option value='VIGENTE'>✅ Vigente</option>
                  <option value='PROXIMO'>⚠️ Próximo a vencer</option>
                  <option value='VENCIDO'>❌ Vencido</option>
                  <option value='FALTANTE'>📋 Faltante</option>
                </select>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="h-12 border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-100 rounded-xl font-semibold"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Button 
                  variant="outline"
                  onClick={()=>{
                    try {
                      exportCsv();
                      showToast('CSV generado', 'success');
                    } catch {
                      showToast('No se pudo generar el CSV', 'error');
                    }
                  }}
                  className="h-12 border-2 border-cyan-300 text-cyan-600 hover:bg-cyan-100 rounded-xl font-semibold"
                >
                  <DocumentCheckIcon className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={async ()=>{
                    if (!resolvedClienteId) return;
                    try {
                      setIsExcelLoading(true);
                      const url = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs/clients/${resolvedClienteId}/summary.xlsx`;
                      const resp = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } });
                      if (!resp.ok) throw new Error('XLSX');
                      const blob = await resp.blob();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `cliente_${resolvedClienteId}_resumen.xlsx`;
                      document.body.appendChild(a); a.click(); a.remove();
                      showToast('Excel descargado', 'success');
                    } catch {
                      showToast('No se pudo descargar el Excel del cliente', 'error');
                    } finally {
                      setIsExcelLoading(false);
                    }
                  }}
                  className="h-12 border-2 border-blue-300 text-blue-600 hover:bg-blue-100 rounded-xl font-semibold"
                >
                  {isExcelLoading ? 'Descargando…' : 'Excel cliente'}
                </Button>
                <Button
                  onClick={async ()=>{
                    if (zipJobData?.job?.signedUrl) { window.open(zipJobData.job.signedUrl, '_blank'); return; }
                    const equipoIds = Array.isArray(equipos) ? (equipos as any[]).map((e: any)=> (e.equipo?.id ?? e.id)).slice(0, 200) : [];
                    if (!equipoIds.length) return;
                    try {
                      const r = await requestZip({ equipoIds }).unwrap();
                      setZipJobId(r.jobId);
                      showToast('Generando ZIP, te avisamos cuando esté listo…');
                    } catch {
                      showToast('No se pudo iniciar el ZIP masivo', 'error');
                    }
                  }}
                  disabled={isZipLoading}
                  className="h-12 border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-100 rounded-xl font-semibold"
                >
                  {isZipLoading ? 'Generando ZIP…' : 'ZIP masivo'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Búsqueda masiva por patentes */}
        <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <TruckIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Búsqueda masiva por patentes</h2>
                <p className="text-emerald-100 text-sm">Pegá una lista de patentes (una por línea). Se normalizan automáticamente.</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <textarea
                  value={platesInput}
                  onChange={(e) => setPlatesInput(e.target.value)}
                  placeholder="Ejemplo:\nAB123CD\nAA000BB\nABC123"
                  className="w-full min-h-[140px] rounded-xl border-2 border-gray-200 p-3 text-gray-800 focus:outline-none focus:border-emerald-500"
                />
                {invalidLines.length > 0 && (
                  <p className="mt-2 text-sm text-red-600">Líneas inválidas (min 5 chars): {invalidLines.join(', ')}</p>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de patente</label>
                  <select
                    value={plateType}
                    onChange={(e)=> setPlateType(e.target.value as any)}
                    className="w-full h-11 text-base rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="both">Tractor y Acoplado</option>
                    <option value="truck">Solo Tractor</option>
                    <option value="trailer">Solo Acoplado</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleBulkSearch}
                    disabled={isBulkLoading}
                    className="h-11 border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-100 rounded-xl font-semibold"
                  >
                    Buscar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateZip}
                    disabled={bulkResults.length === 0 || isZipLoading}
                    className="h-11 border-2 border-cyan-300 text-cyan-600 hover:bg-cyan-100 rounded-xl font-semibold"
                  >
                    Generar ZIP
                  </Button>
                </div>
                {zipJobId && (
                  <div className="text-sm text-gray-600">
                    Estado ZIP: {zipJobData?.job?.status || '...'} · Progreso: {Math.round((zipJobData?.job?.progress || 0)*100)}%
                    {zipJobData?.job?.signedUrl && (
                      <div className="mt-2">
                        <a href={zipJobData.job.signedUrl} target="_blank" rel="noreferrer" className="text-cyan-600 underline">Descargar ZIP</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {bulkResults.length > 0 && (
              <div className="mt-4">
                <h3 className="text-gray-800 font-semibold mb-2">Resultados ({bulkResults.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bulkResults.map((r) => {
                    const checked = selectedIds.has(r.id);
                    return (
                      <label key={r.id} className="border-2 border-gray-200 rounded-xl p-3 text-sm bg-gray-50 flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e)=> {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(r.id); else next.delete(r.id);
                              return next;
                            });
                          }}
                          className="mt-0.5"
                          aria-label={`Seleccionar equipo ${r.id}`}
                        />
                        <div>
                          <div className="font-semibold text-gray-800">Equipo #{r.id}</div>
                          <div className="text-gray-600">Tractor: <strong>{r.truckPlateNorm || '-'}</strong></div>
                          <div className="text-gray-600">Acoplado: <strong>{r.trailerPlateNorm || '-'}</strong></div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-600" aria-live="polite">
                  {selectedIds.size > 0 ? `${selectedIds.size} seleccionados` : 'Sin selección: se exportarán todos los resultados (hasta 200).'}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Equipos */}
        <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <TruckIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Equipos Habilitados</h2>
                <p className="text-cyan-100 text-sm">Estado de cumplimiento documental por equipo</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {!resolvedClienteId ? (
              <div className="text-center py-12">
                <div className="bg-emerald-100 rounded-full p-6 w-20 h-20 mx-auto mb-6">
                  <BuildingOfficeIcon className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Seleccione un Cliente</h3>
                <p className="text-gray-600 text-lg">Elija un cliente para ver sus equipos habilitados</p>
              </div>
            ) : equipos.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-cyan-100 rounded-full p-6 w-20 h-20 mx-auto mb-6">
                  <TruckIcon className="h-8 w-8 text-cyan-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">No hay equipos asignados</h3>
                <p className="text-gray-600 text-lg">Este cliente no tiene equipos habilitados actualmente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipos.map((e: EquipoWithExtras | { equipo: EquipoWithExtras }) => (
                  <EquipoCard 
                    key={`${(e as any).equipoId || (e as any).equipo?.id || (e as EquipoWithExtras).id}`} 
                    equipo={'equipo' in e ? e.equipo : (e as EquipoWithExtras)} 
                    clienteId={Number(resolvedClienteId)} 
                    reqs={reqs as any[]} 
                    estadoFilter={estadoFilter} 
                    onDocsLoaded={(id, docs)=>{ 
                      const m = docsCacheRef.current; 
                      m.set(id, docs); 
                      docsCacheRef.current = m; 
                    }} 
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

const EquipoCard: React.FC<{ equipo: any; clienteId: number; reqs: any[]; estadoFilter: 'TODOS'|'VIGENTE'|'PROXIMO'|'VENCIDO'|'FALTANTE'; onDocsLoaded: (equipoId: number, docs: any[])=>void }> = ({ equipo, clienteId: _clienteId, reqs, estadoFilter, onDocsLoaded }) => {
  const [open, setOpen] = useState(false);
  const { data: docs = [] } = useGetDocumentosPorEquipoQuery({ equipoId: equipo.id }, { skip: !equipo?.id || !open });
  React.useEffect(()=>{ if (open && equipo?.id && Array.isArray(docs)) onDocsLoaded(equipo.id, docs); }, [open, equipo?.id, docs, onDocsLoaded]);

  const calcEstado = (r: any) => {
    const found = docs.find((d: any) => d.templateId === r.templateId && d.entityType === r.entityType);
    if (!found) return 'FALTANTE';
    if (!found.expiresAt) return 'VIGENTE';
    const vence = new Date(found.expiresAt);
    const diffDays = Math.ceil((vence.getTime() - Date.now())/86400000);
    if (diffDays <= 0) return 'VENCIDO';
    if (diffDays <= 30) return 'PROXIMO';
    return 'VIGENTE';
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'VIGENTE': return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'PROXIMO': return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'VENCIDO': return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'FALTANTE': return <ClockIcon className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'VIGENTE': return 'bg-green-100 text-green-700 border-green-200';
      case 'PROXIMO': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'VENCIDO': return 'bg-red-100 text-red-700 border-red-200';
      case 'FALTANTE': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredReqs = reqs
    .filter((r: any)=> ['CHOFER','CAMION','ACOPLADO'].includes(r.entityType))
    .map((r: any)=> ({ r, est: calcEstado(r) }))
    .filter(({ est })=> estadoFilter==='TODOS' || est===estadoFilter);

  // No mostrar la tarjeta si no hay requisitos que coincidan con el filtro
  if (filteredReqs.length === 0 && estadoFilter !== 'TODOS') {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Header del equipo */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <TruckIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Equipo #{equipo.id}</h3>
            <p className="text-cyan-100 text-sm">DNI: {equipo.driverDniNorm}</p>
          </div>
        </div>
        
        <div className="text-sm text-cyan-100 space-y-1">
          <div>🚛 Tractor: <span className="font-medium">{equipo.truckPlateNorm}</span></div>
          <div>🚚 Acoplado: <span className="font-medium">{equipo.trailerPlateNorm || 'No asignado'}</span></div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-5 space-y-4">
        {/* Estado de cumplimiento */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <DocumentCheckIcon className="h-5 w-5 text-cyan-500" />
              Estado de Cumplimiento
            </h4>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={()=> window.open(`/api/docs/clients/equipos/${equipo.id}/zip`, '_blank')}
              className="border-2 border-cyan-300 text-cyan-600 hover:bg-cyan-100 rounded-xl font-semibold"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              ZIP
            </Button>
          </div>
          
          <div className="space-y-2">
            {filteredReqs.map(({ r, est }, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border-2 border-gray-100">
                {getEstadoIcon(est)}
                <div className="flex-1 text-sm">
                  <span className="font-semibold text-gray-700">{r.entityType}</span>
                  <span className="text-gray-500"> · {(r.template?.name) || `Template ${r.templateId}`}</span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border-2 font-semibold ${getEstadoBadgeColor(est)}`}>
                  {est}
                </span>
              </div>
            ))}
            
            {filteredReqs.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <SparklesIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No hay documentos que coincidan con el filtro seleccionado</p>
              </div>
            )}
          </div>
        </div>

        {/* Botón para ver documentos */}
        <div className="pt-4 border-t-2 border-gray-100">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setOpen(v=>!v)}
            className="w-full h-12 border-2 border-gray-300 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold"
          >
            {open ? <EyeSlashIcon className="h-4 w-4 mr-2" /> : <EyeIcon className="h-4 w-4 mr-2" />}
            {open ? 'Ocultar Documentos' : 'Ver Documentos Detallados'}
          </Button>
        </div>

        {/* Lista de documentos expandible */}
        {open && (
          <div className="space-y-3 pt-4 border-t-2 border-gray-100">
            {docs.length > 0 ? (
              docs.map((d: any) => <DocumentoRow key={d.id} doc={d} />)
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                <DocumentCheckIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">📋 No hay documentos cargados para este equipo</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const DocumentoRow: React.FC<{ doc: any }> = ({ doc }) => {
  const handleDownload = async () => {
    const res = await fetch(`/api/docs/documents/${doc.id}/download`, { credentials: 'include' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName || `documento-${doc.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APROBADO':
        return <span className="text-xs px-3 py-1 rounded-full border-2 bg-green-100 text-green-700 border-green-200 font-semibold">✅ Aprobado</span>;
      case 'RECHAZADO':
        return <span className="text-xs px-3 py-1 rounded-full border-2 bg-red-100 text-red-700 border-red-200 font-semibold">❌ Rechazado</span>;
      case 'CLASIFICANDO':
        return <span className="text-xs px-3 py-1 rounded-full border-2 bg-blue-100 text-blue-700 border-blue-200 font-semibold">🤖 Clasificando</span>;
      case 'PENDIENTE_APROBACION':
        return <span className="text-xs px-3 py-1 rounded-full border-2 bg-yellow-100 text-yellow-700 border-yellow-200 font-semibold">🕒 Pend. Aprobación</span>;
      case 'PENDIENTE':
        return <span className="text-xs px-3 py-1 rounded-full border-2 bg-yellow-100 text-yellow-700 border-yellow-200 font-semibold">⏳ Pendiente</span>;
      default:
        return <span className="text-xs px-3 py-1 rounded-full border-2 bg-gray-100 text-gray-700 border-gray-200 font-semibold">{status || 'Sin estado'}</span>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <DocumentCheckIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-bold text-gray-800">
              Documento #{doc.id}
            </span>
            {getStatusBadge(doc.status)}
          </div>
          
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span>📄 Template: <strong>{(doc as any)?.template?.name || `ID ${doc.templateId}`}</strong></span>
              <span>📅 Vence: <strong>{formatDate(doc.expiresAt)}</strong></span>
            </div>
            {doc.fileName && (
              <div className="text-gray-500">📎 <strong>{doc.fileName}</strong></div>
            )}
          </div>
        </div>
        
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleDownload}
          className="ml-3 border-2 border-cyan-300 text-cyan-600 hover:bg-cyan-100 rounded-xl font-semibold"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
          Descargar
        </Button>
      </div>
    </div>
  )
}

export default ClientePortalPage;


