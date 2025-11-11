import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useGetDadoresQuery, useCreateEquipoMinimalMutation, useImportCsvEquiposMutation, useUploadBatchDocsDadorMutation, useGetJobStatusQuery, useGetChoferesQuery, useGetCamionesQuery, useGetAcopladosQuery, useGetEquiposQuery } from '../features/documentos/api/documentosApiSlice';
import { showToast } from '../components/ui/Toast.utils';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { 
  BuildingOffice2Icon,
  TruckIcon,
  DocumentArrowUpIcon,
  CloudArrowUpIcon,
  CogIcon,
  PlusIcon,
  SparklesIcon,
  UserIcon
} from '@heroicons/react/24/outline';

export const DadoresPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: dadoresResp } = useGetDadoresQuery({});
  const dadores = useMemo(() => (dadoresResp as any)?.list ?? (Array.isArray(dadoresResp) ? dadoresResp : []), [dadoresResp]);
  const [dadorId, setDadorId] = useState<number | undefined>(dadores[0]?.id);
  const resolvedDadorId = useMemo(() => dadorId ?? dadores[0]?.id, [dadorId, dadores]);
  const [dni, setDni] = useState('');
  const [tractor, setTractor] = useState('');
  const [acoplado, setAcoplado] = useState('');
  const [createMinimal, { isLoading }] = useCreateEquipoMinimalMutation();
  const { data: equiposList = [] } = useGetEquiposQuery({ empresaId: Number(resolvedDadorId || 0) }, { skip: !resolvedDadorId });
  const [uploadBatch, { isLoading: uploadingBatch }] = useUploadBatchDocsDadorMutation();
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const { data: batchJob } = useGetJobStatusQuery({ jobId: batchJobId || '' }, { skip: !batchJobId, pollingInterval: 1500 });
  const [zipVigLoading, setZipVigLoading] = useState(false);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header moderno y amigable */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant='outline' 
              size='sm' 
              onClick={()=> navigate('/documentos')} 
              className='flex items-center gap-2 hover:bg-purple-50 transition-all duration-200 rounded-full px-4'
            >
              ← Volver
            </Button>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-indigo-400/20 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-2xl shadow-lg">
                  <BuildingOffice2Icon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2">
                    ¡Bienvenido, Dador de Carga! 📦
                  </h1>
                  <p className="text-gray-600 dark:text-slate-300 text-base sm:text-lg">
                    Centro de control logístico para gestión integral de equipos
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={zipVigLoading}
                    onClick={async ()=>{
                      const ids = Array.isArray(equiposList) ? (equiposList as any[]).map((e: any)=> (e.id ?? e.equipo?.id)).filter(Boolean).slice(0,200) : [];
                      if (!ids.length) return;
                      try {
                        setZipVigLoading(true);
                        const resp = await fetch(`${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs/equipos/download/vigentes`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
                          body: JSON.stringify({ equipoIds: ids }),
                        });
                        if (!resp.ok) throw new Error('ZIP');
                        const blob = await resp.blob();
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `dador_${resolvedDadorId}_vigentes.zip`;
                        document.body.appendChild(a); a.click(); a.remove();
                        showToast('ZIP descargado', 'success');
                      } catch { showToast('No se pudo descargar el ZIP de vigentes', 'error'); }
                      finally { setZipVigLoading(false); }
                    }}
                  >
                    {zipVigLoading ? 'Descargando…' : 'ZIP vigentes'}
                  </Button>
                  <Button
                    size='sm'
                    onClick={()=>{
                      // CSV resumen como alternativa liviana de Excel
                      const rows: string[] = ['equipoId'];
                      (Array.isArray(equiposList) ? equiposList as any[] : []).forEach((e: any)=> rows.push(String(e.id ?? e.equipo?.id)));
                      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `dador_${resolvedDadorId}_resumen.csv`;
                      document.body.appendChild(a); a.click(); a.remove();
                      showToast('CSV generado', 'success');
                    }}
                  >
                    Resumen CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cards principales - Diseño moderno */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Alta rápida de equipo */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-3 rounded-xl">
                  <PlusIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Alta Rápida de Equipo</h2>
                  <p className="text-purple-100 text-sm">Registro inmediato sin fricción</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Datos del Chofer */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <UserIcon className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold">Datos del Chofer</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DNI del Chofer</label>
                    <Input 
                      placeholder="Ej: 12345678" 
                      value={dni} 
                      onChange={(e) => setDni(e.target.value)}
                      className="w-full h-12 text-base rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 transition-colors"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Patente Tractor</label>
                      <Input 
                        placeholder="AA123BB" 
                        value={tractor} 
                        onChange={(e) => setTractor(e.target.value)}
                        className="w-full h-12 text-base rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Patente Acoplado</label>
                      <Input 
                        placeholder="AC456CD (opcional)" 
                        value={acoplado} 
                        onChange={(e) => setAcoplado(e.target.value)}
                        className="w-full h-12 text-base rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dador y Botón de Crear */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dador de Carga</label>
                  <select 
                    className="w-full h-12 text-base rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors" 
                    value={resolvedDadorId || ''} 
                    onChange={(e) => setDadorId(Number(e.target.value))}
                  >
                    {dadores.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.razonSocial || `Dador #${d.id}`}</option>
                    ))}
                  </select>
                </div>
                
                <Button 
                  disabled={!resolvedDadorId || !dni || !tractor || isLoading} 
                  onClick={async () => {
                    if (!resolvedDadorId) return;
                    await createMinimal({ dadorCargaId: resolvedDadorId, dniChofer: dni, patenteTractor: tractor, patenteAcoplado: acoplado || undefined });
                    setDni(''); setTractor(''); setAcoplado('');
                  }}
                  className="w-full h-14 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Creando Equipo...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <TruckIcon className="h-6 w-6" />
                      <span>¡Crear Equipo!</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Importar CSV */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-3 rounded-xl">
                  <DocumentArrowUpIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Importación Masiva CSV</h2>
                  <p className="text-indigo-100 text-sm">Carga múltiples equipos de una vez</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center py-8">
                <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <DocumentArrowUpIcon className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Carga Masiva</h3>
                <p className="text-gray-600 mb-6">Sube un CSV con múltiples equipos para procesar en lote</p>
                <CsvUploader dadorId={resolvedDadorId} />
              </div>
            </div>
          </Card>

        {/* Carga inicial por planilla (multi-documento) */}
        <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-lime-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <DocumentArrowUpIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Carga Inicial por Planilla</h2>
                <p className="text-emerald-100 text-sm">Subí múltiples documentos (PDF/imagenes) en una sola tanda</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Adjuntá todos los archivos requeridos de la planilla (empresa, chofer, tractor, semi). El backend validará consistencia y creará los equipos si corresponde.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="batchDocs"
                type="file"
                multiple
                accept="application/pdf,image/*"
                className="text-sm"
                onChange={async (e) => {
                  const files = e.currentTarget.files;
                  if (!files || !resolvedDadorId || files.length === 0) return;
                  try {
                    const r = await uploadBatch({ dadorId: Number(resolvedDadorId), files }).unwrap();
                    setBatchJobId(r.jobId);
                  } catch {
                    showToast('No fue posible iniciar la carga batch', 'error');
                  } finally {
                    e.currentTarget.value = '';
                  }
                }}
                aria-label="Seleccionar archivos de la planilla"
              />
              <Button disabled className="h-10" title="Los archivos se suben automáticamente al seleccionarlos">
                Subir selección
              </Button>
            </div>
            {uploadingBatch && <div className="text-sm text-gray-600">Subiendo archivos...</div>}
            {batchJobId && (
              <div className="text-sm text-gray-700" aria-live="polite">
                Job #{batchJobId} · Estado: {batchJob?.job?.status || '...'} · Progreso: {Math.round((batchJob?.job?.progress || 0)*100)}%
              </div>
            )}
          </div>
        </Card>
        </div>

        {/* Aprobación - acceso acotado por flag (validación en backend) */}
        <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <CogIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Aprobación de Documentos</h2>
                <p className="text-fuchsia-100 text-sm">Disponible si está habilitado para tu Dador</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={()=> navigate('/documentos/aprobacion')} className="h-12 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white font-semibold">
                Ir a Aprobación
              </Button>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Si no está habilitado, el backend rechazará la acción con un mensaje claro.
              </p>
            </div>
          </div>
        </Card>

        {/* Maestros readonly (scoped al dador) */}
        <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <TruckIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Maestros (Solo Lectura)</h2>
                <p className="text-teal-100 text-sm">Choferes, Camiones y Acoplados asociados</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <MaestrosReadonly dadorId={resolvedDadorId} />
          </div>
        </Card>

        {/* Carga masiva de documentos */}
        <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <CloudArrowUpIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Procesamiento Inteligente de Documentos</h2>
                <p className="text-orange-100 text-sm">IA avanzada para clasificación automática</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="text-center py-8">
              <div className="bg-orange-100 rounded-full p-6 w-20 h-20 mx-auto mb-6">
                <SparklesIcon className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">IA Inteligente</h3>
              <p className="text-gray-600 mb-6 text-lg">Los archivos se analizan automáticamente para clasificar y actualizar vencimientos</p>
              <BatchUploader dadorId={resolvedDadorId} />
            </div>
          </div>
        </Card>

        {/* Acciones por Equipo */}
        <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <CogIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Centro de Control de Equipos</h2>
                <p className="text-green-100 text-sm">Gestión automática de solicitudes</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="text-center py-8">
              <div className="bg-green-100 rounded-full p-6 w-20 h-20 mx-auto mb-6">
                <CogIcon className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Control Automatizado</h3>
              <p className="text-gray-600 mb-6 text-lg">Revisión de faltantes y solicitud automática de documentación</p>
              <EquipoActions dadorId={resolvedDadorId} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DadoresPortalPage;

// ------------------------
// Helpers de carga con progreso
// ------------------------

const MaestrosReadonly: React.FC<{ dadorId?: number }> = ({ dadorId }) => {
  const [limit] = React.useState(10);
  const [pageChoferes, setPageChoferes] = React.useState(1);
  const [pageCamiones, setPageCamiones] = React.useState(1);
  const [pageAcoplados, setPageAcoplados] = React.useState(1);

  const { data: choferesResp, isFetching: loadingChoferes } = useGetChoferesQuery({ empresaId: Number(dadorId || 0), page: pageChoferes, limit }, { skip: !dadorId });
  const { data: camionesResp, isFetching: loadingCamiones } = useGetCamionesQuery({ empresaId: Number(dadorId || 0), page: pageCamiones, limit }, { skip: !dadorId });
  const { data: acopladosResp, isFetching: loadingAcoplados } = useGetAcopladosQuery({ empresaId: Number(dadorId || 0), page: pageAcoplados, limit }, { skip: !dadorId });
  const choferes = (choferesResp as any)?.data ?? [];
  const camiones = (camionesResp as any)?.data ?? [];
  const acoplados = (acopladosResp as any)?.data ?? [];
  const chPag = (choferesResp as any)?.pagination;
  const caPag = (camionesResp as any)?.pagination;
  const acPag = (acopladosResp as any)?.pagination;
  const totalPages = (p: any) => p?.pages || (p?.total && p?.limit ? Math.max(1, Math.ceil(p.total / p.limit)) : undefined);
  const chPages = totalPages(chPag);
  const caPages = totalPages(caPag);
  const acPages = totalPages(acPag);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <h3 className="text-gray-800 font-semibold mb-2">Choferes</h3>
        <div className="space-y-2">
          {loadingChoferes && <div role="status" aria-live="polite" className="text-sm text-gray-500">Cargando...</div>}
          {!loadingChoferes && choferes.length === 0 && <div className="text-sm text-gray-500">Sin registros</div>}
          {choferes.map((c: any) => (
            <div key={c.id} className="p-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-700">
              DNI <strong>{c.dni}</strong> · {c.nombre || ''} {c.apellido || ''}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500">Página {pageChoferes}{chPages ? ` / ${chPages}` : ''}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pageChoferes<=1} onClick={()=> setPageChoferes(p => Math.max(1, p-1))}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={chPages ? pageChoferes>=chPages : choferes.length < limit} onClick={()=> setPageChoferes(p => p+1)}>Siguiente</Button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-gray-800 font-semibold mb-2">Camiones</h3>
        <div className="space-y-2">
          {loadingCamiones && <div role="status" aria-live="polite" className="text-sm text-gray-500">Cargando...</div>}
          {!loadingCamiones && camiones.length === 0 && <div className="text-sm text-gray-500">Sin registros</div>}
          {camiones.map((m: any) => (
            <div key={m.id} className="p-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-700">
              Patente <strong>{m.patente}</strong> · {m.marca || ''} {m.modelo || ''}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500">Página {pageCamiones}{caPages ? ` / ${caPages}` : ''}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pageCamiones<=1} onClick={()=> setPageCamiones(p => Math.max(1, p-1))}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={caPages ? pageCamiones>=caPages : camiones.length < limit} onClick={()=> setPageCamiones(p => p+1)}>Siguiente</Button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-gray-800 font-semibold mb-2">Acoplados</h3>
        <div className="space-y-2">
          {loadingAcoplados && <div role="status" aria-live="polite" className="text-sm text-gray-500">Cargando...</div>}
          {!loadingAcoplados && acoplados.length === 0 && <div className="text-sm text-gray-500">Sin registros</div>}
          {acoplados.map((a: any) => (
            <div key={a.id} className="p-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-700">
              Patente <strong>{a.patente}</strong> · {a.tipo || ''}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500">Página {pageAcoplados}{acPages ? ` / ${acPages}` : ''}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pageAcoplados<=1} onClick={()=> setPageAcoplados(p => Math.max(1, p-1))}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={acPages ? pageAcoplados>=acPages : acoplados.length < limit} onClick={()=> setPageAcoplados(p => p+1)}>Siguiente</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CsvUploader: React.FC<{ dadorId?: number }> = ({ dadorId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importCsv, { data, isLoading }] = useImportCsvEquiposMutation();
  return (
    <div>
      <div className="border-dashed border rounded p-6 text-center text-muted-foreground">
        <input type="file" accept=".csv" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
      </div>
      <div className="mt-4 flex gap-2 items-center">
        <Button type="button" variant="outline" onClick={() => {
          const a = document.createElement('a');
          const blob = new Blob([`dni_chofer,patente_tractor,patente_acoplado\n12345678,AA123BB,AC456CD`], { type: 'text/csv' });
          a.href = URL.createObjectURL(blob); a.download = 'plantilla_equipos.csv'; a.click(); URL.revokeObjectURL(a.href);
        }}>Descargar plantilla</Button>
        <Button disabled={!dadorId || !file || isLoading} onClick={async ()=>{
          if (!dadorId || !file) return;
          await importCsv({ dadorId, file });
        }}>Cargar CSV</Button>
        {data && (
          <span className="text-sm text-muted-foreground">Creados: {data.created}/{data.total}</span>
        )}
      </div>
    </div>
  );
}

const EquipoActions: React.FC<{ dadorId?: number }> = ({ dadorId }) => {
  const [equipoId, setEquipoId] = useState<number | ''>('' as any);
  const [estado, setEstado] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<any[]>([]);
  const baseUrl = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs`;
  const authToken = useSelector((s: RootState) => (s as any)?.auth?.token);
  const empresaId = useSelector((s: RootState) => (s as any)?.auth?.user?.empresaId);
  const headers: HeadersInit = React.useMemo(() => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
  }), [authToken, empresaId]);
  useEffect(()=>{ (async ()=>{ try { if (!dadorId) { setEquipos([]); return; } const res = await fetch(`${baseUrl}/equipos?dadorCargaId=${dadorId}`, { credentials:'include', headers }); const data = await res.json(); const list = Array.isArray(data?.data) ? data.data : []; setEquipos(list); if (list.length && !equipoId) setEquipoId(list[0].id); } catch (e) { console.debug('equipos fetch failed', e); } })(); }, [dadorId, baseUrl, headers, equipoId]);
  const run = async (path: string) => {
    setEstado(null);
    if (!equipoId) return;
    const res = await fetch(`${baseUrl}/equipos/${equipoId}/${path}`, { method: 'POST', credentials: 'include', headers });
    const data = await res.json();
    setEstado(res.ok ? JSON.stringify(data?.data || data) : (data?.message || 'Error'));
  };
  return (
    <div className='flex flex-wrap items-end gap-2'>
      <select className='border rounded px-2 py-2' value={equipoId as any} onChange={(e)=> setEquipoId(Number(e.target.value) || '' as any)}>
        {equipos.map((e:any)=> (
          <option key={e.id} value={e.id}>#{e.id} · DNI {e.driverDniNorm} · {e.truckPlateNorm}</option>
        ))}
      </select>
      <Button variant='outline' onClick={()=> run('check-missing-now')}>Revisar faltantes ahora</Button>
      <Button onClick={()=> run('request-missing')}>Solicitar documentación</Button>
      <Button variant='outline' onClick={()=> { if (!equipoId) return; window.open(`${baseUrl}/clients/equipos/${equipoId}/zip`, '_blank'); }}>Descargar ZIP</Button>
      {estado && <span className='text-xs text-muted-foreground ml-2 break-all'>{estado}</span>}
    </div>
  );
}

const BatchUploader: React.FC<{ dadorId?: number }> = ({ dadorId }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [start, { data: job, isLoading }] = useUploadBatchDocsDadorMutation();
  const jobId = job?.jobId;
  const { data: status } = useGetJobStatusQuery({ jobId: jobId || '' }, { skip: !jobId, pollingInterval: 1500 });
  const progress = Math.round((status?.job?.progress ?? 0) * 100);
  const state = status?.job?.status || (isLoading ? 'queued' : 'idle');
  const navigate = useNavigate();
  const notified = useRef<Set<number>>(new Set());
  const [onlyErrors, setOnlyErrors] = useState(false);

  // Enviar toasts por archivo una sola vez cuando termina
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
        <Button disabled={!dadorId || !files || isLoading} onClick={async ()=>{
          if (!dadorId || !files) return;
          await start({ dadorId, files });
        }}>Subir documentos</Button>
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
          {dadorId && (
            <Button size="sm" className="ml-3" variant="outline" onClick={() => navigate(`/dadores/${dadorId}/documentos`)}>Ver en Documentos</Button>
          )}
          {Array.isArray((status as any)?.job?.results) && (
            <Button size="sm" className="ml-3" variant="outline" onClick={() => {
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
            }}>Descargar reporte CSV</Button>
          )}
          {Array.isArray((status as any)?.job?.results) && (
            <div className="mt-3 border rounded">
              <div className="p-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>Resultados</span>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyErrors} onChange={(e)=>setOnlyErrors(e.target.checked)} />
                  <span>Solo errores</span>
                </label>
                <Button size="sm" variant="outline" onClick={async ()=>{
                  // Reintentar fallidos
                  await fetch(`/api/docs/jobs/${jobId}/retry-failed`, { method: 'POST', credentials: 'include' });
                  showToast('Reintentando documentos rechazados', 'default');
                }}>Reintentar fallidos</Button>
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


