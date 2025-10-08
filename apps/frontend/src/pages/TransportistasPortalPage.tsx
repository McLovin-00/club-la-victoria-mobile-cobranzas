import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useGetDadoresQuery, useCreateEquipoMinimalMutation, useUploadBatchDocsTransportistasMutation, useGetJobStatusQuery, useGetDefaultsQuery } from '../features/documentos/api/documentosApiSlice';
import { showToast } from '../components/ui/Toast.utils';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { 
  TruckIcon, 
  UserIcon, 
  DocumentIcon, 
  PhoneIcon,
  PlusIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// Importar nuevos componentes mobile-first
import { DashboardCumplimiento } from '../components/transportistas/DashboardCumplimiento';
import { PerfilMobile } from '../components/transportistas/PerfilMobile';
import { CalendarioInteligente } from '../components/transportistas/CalendarioInteligente';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export const TransportistasPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: dadoresResp } = useGetDadoresQuery({});
  const dadores = useMemo(() => (dadoresResp as any)?.list ?? (Array.isArray(dadoresResp) ? dadoresResp : []), [dadoresResp]);
  const { data: defaults } = useGetDefaultsQuery();
  const [defaultDadorId, setDefaultDadorId] = useState<number | undefined>(undefined);
  useEffect(()=>{ const id = (defaults as any)?.defaultDadorId ?? dadores[0]?.id; if (id) setDefaultDadorId(id); },[dadores, defaults]);
  const [dni, setDni] = useState('');
  const [tractor, setTractor] = useState('');
  const [acoplado, setAcoplado] = useState('');
  const [createMinimal, { isLoading }] = useCreateEquipoMinimalMutation();
  const [phones, setPhones] = useState<string[]>(['']);
  const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  const [misEquipos, setMisEquipos] = useState<any[]>([]);
  const authToken = useSelector((s: RootState) => (s as any)?.auth?.token);
  const empresaId = useSelector((s: RootState) => (s as any)?.auth?.user?.empresaId);
  const authHeaders: HeadersInit = useMemo(() => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
  }), [authToken, empresaId]);
  const baseUrl = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs`;
  const [tabValue, setTabValue] = useState<'dashboard'|'registro'|'documentos'|'equipos'|'calendario'|'perfil'>('dashboard');
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const tabsTriggersRef = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(()=>{ (async ()=>{ try { const res = await fetch(`${baseUrl}/transportistas/mis-equipos`, { credentials:'include', headers: authHeaders }); const data = await res.json(); setMisEquipos(Array.isArray(data?.data)? data.data : []); } catch (e) { console.debug('mis-equipos fetch failed', e); } })(); },[authHeaders, baseUrl]);

  // Mantener el tab seleccionado centrado (o al borde si es el primero/último)
  useEffect(()=>{
    const scroller = tabsScrollRef.current;
    const active = tabsTriggersRef.current[tabValue];
    if (!scroller || !active) return;
    const sRect = scroller.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const currentScroll = scroller.scrollLeft;
    const targetCenter = currentScroll + (aRect.left - sRect.left) + aRect.width / 2;
    const desiredScrollLeft = Math.max(0, targetCenter - sRect.width / 2);
    scroller.scrollTo({ left: desiredScrollLeft, behavior: 'smooth' });
  }, [tabValue]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-yellow-50 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      {/* Importar CSS tokens mobile-first */}
      <style>{`
        @import url('/src/styles/mobile-tokens.css');
      `}</style>
      
      {/* Navegación por tabs mobile-friendly */}
      <Tabs value={tabValue} onValueChange={(v)=> setTabValue(v as any)} className="w-full">
        {/* Tab Navigation - Fixed en mobile */}
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 px-2 pt-safe">
          <div className="relative">
            <div className="overflow-x-auto no-scrollbar" ref={tabsScrollRef}>
              <TabsList className="flex w-max min-w-full gap-1 rounded-xl p-1 bg-gray-100 dark:bg-slate-800">
                <TabsTrigger value="dashboard" className="rounded-lg px-3 py-2 text-[11px] whitespace-nowrap dark:text-slate-200" ref={(el)=> (tabsTriggersRef.current['dashboard']=el)}>📊 Panel</TabsTrigger>
                <TabsTrigger value="registro" className="rounded-lg px-3 py-2 text-[11px] whitespace-nowrap dark:text-slate-200" ref={(el)=> (tabsTriggersRef.current['registro']=el)}>➕ Registro</TabsTrigger>
                <TabsTrigger value="documentos" className="rounded-lg px-3 py-2 text-[11px] whitespace-nowrap dark:text-slate-200" ref={(el)=> (tabsTriggersRef.current['documentos']=el)}>📄 Docs</TabsTrigger>
                <TabsTrigger value="equipos" className="rounded-lg px-3 py-2 text-[11px] whitespace-nowrap dark:text-slate-200" ref={(el)=> (tabsTriggersRef.current['equipos']=el)}>🚛 Equipos</TabsTrigger>
                <TabsTrigger value="calendario" className="rounded-lg px-3 py-2 text-[11px] whitespace-nowrap dark:text-slate-200" ref={(el)=> (tabsTriggersRef.current['calendario']=el)}>📅 Calendario</TabsTrigger>
                <TabsTrigger value="perfil" className="rounded-lg px-3 py-2 text-[11px] whitespace-nowrap dark:text-slate-200" ref={(el)=> (tabsTriggersRef.current['perfil']=el)}>👤 Perfil</TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value="dashboard" className="mt-0">
          <div className="dark:text-slate-100">
            <DashboardCumplimiento />
          </div>
        </TabsContent>

        <TabsContent value="registro" className="mt-0">
          <RegistroEquipoTab 
            dadores={dadores}
            defaultDadorId={defaultDadorId}
            setDefaultDadorId={setDefaultDadorId}
            dni={dni}
            setDni={setDni}
            tractor={tractor}
            setTractor={setTractor}
            acoplado={acoplado}
            setAcoplado={setAcoplado}
            phones={phones}
            setPhones={setPhones}
            phoneRegex={phoneRegex}
            createMinimal={createMinimal}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="documentos" className="mt-0">
          <DocumentosTab />
        </TabsContent>

        <TabsContent value="equipos" className="mt-0">
          <MisEquiposTab misEquipos={misEquipos} />
        </TabsContent>

        <TabsContent value="calendario" className="mt-0">
          <CalendarioTab />
        </TabsContent>

        <TabsContent value="perfil" className="mt-0">
          <PerfilTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente para tab de registro (código existente refactorizado)
const RegistroEquipoTab: React.FC<any> = ({
  dadores, defaultDadorId, setDefaultDadorId, dni, setDni, tractor, setTractor,
  acoplado, setAcoplado, phones, setPhones, phoneRegex, createMinimal, isLoading
}) => {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header moderno y amigable */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-xl border-0 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-orange-400/20 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-orange-500 p-4 rounded-2xl shadow-lg">
                  <TruckIcon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                    ¡Bienvenido, Transportista! 🚛
                  </h1>
                  <p className="text-gray-600 text-base sm:text-lg">
                    Gestiona tus equipos y documentos de forma rápida y sencilla
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Registro de Equipo - Diseño moderno y amigable */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-3 rounded-xl">
                  <PlusIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Registrar Equipo</h2>
                  <p className="text-blue-100 text-sm">Agrega un nuevo vehículo rápidamente</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Datos del Chofer */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <UserIcon className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Datos del Chofer</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DNI del Chofer</label>
                    <Input 
                      placeholder="Ej: 12345678" 
                      value={dni} 
                      onChange={(e)=>setDni(e.target.value)}
                      className="w-full h-12 text-base rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 transition-colors"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Patente Tractor</label>
                      <Input 
                        placeholder="AA123BB" 
                        value={tractor} 
                        onChange={(e)=>setTractor(e.target.value)}
                        className="w-full h-12 text-base rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Patente Acoplado</label>
                      <Input 
                        placeholder="AC456CD (opcional)" 
                        value={acoplado} 
                        onChange={(e)=>setAcoplado(e.target.value)}
                        className="w-full h-12 text-base rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Teléfonos WhatsApp */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <PhoneIcon className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">Teléfonos WhatsApp</h3>
                </div>
                
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 space-y-3">
                  {phones.map((p, idx)=> (
                    <div key={idx} className="flex gap-3">
                      <Input 
                        placeholder="+54911234567" 
                        value={p} 
                        onChange={(e)=>{ const arr=[...phones]; arr[idx]=e.target.value; setPhones(arr); }}
                        className="flex-1 h-12 text-base rounded-xl border-2 border-green-200 focus:border-green-500 focus:ring-0"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={()=> setPhones(arr=> arr.filter((_,i)=> i!==idx))} 
                        disabled={phones.length<=1}
                        className="h-12 px-3 border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    disabled={phones.length>=3} 
                    onClick={()=> setPhones(arr=> [...arr, ''])}
                    className="w-full h-12 border-2 border-green-300 text-green-600 hover:bg-green-100 rounded-xl"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Agregar Teléfono
                  </Button>
                  
                  {!phones.filter(Boolean).every(p=>phoneRegex.test(p)) && (
                    <div className="bg-yellow-100 border-2 border-yellow-300 rounded-xl p-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Formato requerido:</strong> +[código país][número], 8-15 dígitos<br />
                        Ejemplo: +5491123456789
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dador y Botón de Crear */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dador de Carga</label>
                  <select 
                    className="w-full h-12 text-base rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors" 
                    value={defaultDadorId || ''} 
                    onChange={(e)=>setDefaultDadorId(Number(e.target.value))}
                  >
                    {dadores.map((d:any)=> (
                      <option key={d.id} value={d.id}>{d.razonSocial || `Dador #${d.id}`}</option>
                    ))}
                  </select>
                </div>
                
                <Button 
                  disabled={!defaultDadorId || !dni || !tractor || isLoading} 
                  onClick={async ()=>{
                    if (!defaultDadorId) return;
                    const validPhones = phones.map(p=>p.trim()).filter(Boolean);
                    if (validPhones.length>0 && !validPhones.every(p=>phoneRegex.test(p))) {
                      return showToast('Teléfonos inválidos. Use formato WhatsApp.', 'error');
                    }
                    await createMinimal({ dadorCargaId: defaultDadorId, dniChofer: dni, patenteTractor: tractor, patenteAcoplado: acoplado || undefined, choferPhones: validPhones } as any);
                    setDni(''); setTractor(''); setAcoplado('');
                    setPhones(['']);
                  }}
                  className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Creando Equipo...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircleIcon className="h-6 w-6" />
                      <span>¡Crear Equipo!</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Carga de Documentos */}
          <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-3 rounded-xl">
                  <CloudArrowUpIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Subir Documentos</h2>
                  <p className="text-orange-100 text-sm">Carga masiva con IA inteligente</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center py-8">
                <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <SparklesIcon className="h-8 w-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Procesamiento Inteligente</h3>
                <p className="text-gray-600 mb-6">Sube múltiples documentos y nuestra IA los clasificará automáticamente</p>
                <TransportistaBatchUploader />
              </div>
            </div>
          </Card>
        </div>
    </div>
  );
};

// Componente para tab de calendario
const CalendarioTab: React.FC = () => {
  return (
    <div className="p-4">
      <CalendarioInteligente />
    </div>
  );
};

// Componente para tab de perfil
const PerfilTab: React.FC = () => {
  return <PerfilMobile />;
};

const TransportistaBatchUploader: React.FC = () => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [start, { data: job, isLoading }] = useUploadBatchDocsTransportistasMutation();
  const jobId = job?.jobId;
  const { data: status } = useGetJobStatusQuery({ jobId: jobId || '' }, { skip: !jobId, pollingInterval: 1500 });
  const progress = Math.round((status?.job?.progress ?? 0) * 100);
  const state = status?.job?.status || (isLoading ? 'queued' : 'idle');
  const navigate = useNavigate();
  const notified = useRef<Set<number>>(new Set());
  const [onlyErrors, setOnlyErrors] = useState(false);

  useEffect(() => {
    if (status?.job?.status === 'completed' && Array.isArray((status as any)?.job?.results)) {
      for (const r of (status as any).job.results as any[]) {
        if (!notified.current.has(r.documentId)) {
          const variant = r.status === 'APROBADO' ? 'success' : r.status === 'RECHAZADO' ? 'error' : 'default';
          const msg = `${r.fileName}: ${r.status}${r.comprobante ? ` · ${r.comprobante}` : ''}${r.vencimiento ? ` · vence ${new Date(r.vencimiento).toLocaleDateString()}` : ''}`;
          showToast(msg, variant, 5000);
          notified.current.add(r.documentId);
        }
      }
    }
  }, [status]);
  return (
    <div>
      <div className="border-dashed border rounded p-6 text-center text-muted-foreground">
        <input type="file" multiple onChange={(e)=>setFiles(e.target.files)} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button disabled={!files || isLoading} onClick={async ()=>{ if (!files) return; await start({ files }); }}>Subir documentos</Button>
        {jobId && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-40 h-2 bg-muted rounded overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-muted-foreground">{state} {progress}%</span>
          </div>
        )}
      </div>
      {status?.job?.items && status.job.items.length > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          Archivos en proceso: {status.job.items.length}
        </div>
      )}
      {status?.job?.status === 'completed' && (
        <div className="mt-3 text-sm">
          <span className="text-green-600">Proceso finalizado.</span>
          <Button size="sm" className="ml-3" variant="outline" onClick={() => navigate('/documentos')}>Ver en Documentos</Button>
          {Array.isArray((status as any)?.job?.results) && (
            <div className="mt-3 border rounded">
              <div className="p-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>Resultados</span>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyErrors} onChange={(e)=>setOnlyErrors(e.target.checked)} />
                  <span>Solo errores</span>
                </label>
                <Button size="sm" variant="outline" onClick={async ()=>{
                  await fetch(`/api/docs/jobs/${jobId}/retry-failed`, { method: 'POST', credentials: 'include' });
                  showToast('Reintentando documentos rechazados', 'default');
                }}>Reintentar fallidos</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const rows = (status as any).job.results as any[];
                  const filtered = onlyErrors ? rows.filter(r => r.status === 'RECHAZADO') : rows;
                  const csv = ['fileName,status,comprobante,vencimiento,documentId']
                    .concat(filtered.map(r => [r.fileName, r.status, r.comprobante || '', r.vencimiento ? new Date(r.vencimiento).toLocaleDateString() : '', r.documentId].map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')))
                    .join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `reporte_batch_${jobId}.csv`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}>Descargar CSV</Button>
              </div>
              <div className="divide-y">
                {((status as any).job.results as any[]).filter((r:any)=>!onlyErrors || r.status==='RECHAZADO').map((r: any) => {
                  const badge = r.status === 'APROBADO'
                    ? 'bg-green-100 text-green-700'
                    : r.status === 'RECHAZADO'
                    ? 'bg-red-100 text-red-700'
                    : (r.status === 'CLASIFICANDO' ? 'bg-blue-100 text-blue-700' : r.status === 'PENDIENTE_APROBACION' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600');
                  return (
                    <div key={r.documentId} className="p-2 flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{r.fileName}</div>
                        <div className="text-xs text-muted-foreground">Comprobante: {r.comprobante || '-'}</div>
                        <div className="text-xs text-muted-foreground">Vencimiento: {r.vencimiento ? new Date(r.vencimiento).toLocaleDateString() : '-'}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${badge}`}>{r.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente para tab de documentos
const DocumentosTab: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
      <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-3 rounded-xl">
              <CloudArrowUpIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Subir Documentos</h2>
              <p className="text-orange-100 text-sm">Carga masiva con IA inteligente</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center py-8">
            <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
              <SparklesIcon className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Procesamiento Inteligente</h3>
            <p className="text-gray-600 mb-6">Sube múltiples documentos y nuestra IA los clasificará automáticamente</p>
            <TransportistaBatchUploader />
          </div>
        </div>
      </Card>
    </div>
  );
};

// Componente para tab de equipos
const MisEquiposTab: React.FC<{ misEquipos: any[] }> = ({ misEquipos }) => {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
      <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-3 rounded-xl">
              <TruckIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Mis Equipos</h2>
              <p className="text-green-100 text-sm">Vehículos registrados en tu cuenta</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {misEquipos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {misEquipos.map((e: any) => (
                <div key={e.id} className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-5 border-2 border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-r from-green-500 to-teal-500 p-2 rounded-xl">
                      <TruckIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">Equipo #{e.id}</h3>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Activo</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-green-500" />
                      <span>DNI: <strong>{e.driverDniNorm}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TruckIcon className="h-4 w-4 text-green-500" />
                      <span>Tractor: <strong>{e.truckPlateNorm}</strong></span>
                    </div>
                    {e.trailerPlateNorm && (
                      <div className="flex items-center gap-2">
                        <DocumentIcon className="h-4 w-4 text-green-500" />
                        <span>Acoplado: <strong>{e.trailerPlateNorm}</strong></span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(`/api/docs/clients/equipos/${e.id}/zip`, '_blank')}
                    className="w-full h-12 border-2 border-green-300 text-green-600 hover:bg-green-100 rounded-xl font-semibold"
                  >
                    <DocumentIcon className="h-4 w-4 mr-2" />
                    Descargar Documentos
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-green-100 rounded-full p-6 w-20 h-20 mx-auto mb-6">
                <TruckIcon className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">¡Registra tu primer equipo!</h3>
              <p className="text-gray-600 mb-6 text-lg">Aún no tienes vehículos registrados en tu cuenta</p>
              <Button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="h-12 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Registrar Primer Equipo
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TransportistasPortalPage;
