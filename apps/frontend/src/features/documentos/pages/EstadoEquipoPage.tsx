import React, { useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeftIcon, DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, ClockIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useGetEquipoComplianceQuery, useGetTemplatesQuery } from '../api/documentosApiSlice';
import { useState } from 'react';
import { getRuntimeEnv } from '../../../lib/runtimeEnv';

const getStatusConfig = (state?: string) => {
  const v = String(state ?? '').toUpperCase();
  switch (v) {
    case 'OK':
    case 'VIGENTE':
      return { label: 'Vigente', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircleIcon };
    case 'PROXIMO':
      return { label: 'Por vencer', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: ClockIcon };
    case 'FALTANTE':
      return { label: 'Faltante', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircleIcon };
    case 'VENCIDO':
      return { label: 'Vencido', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: ExclamationTriangleIcon };
    case 'PENDIENTE':
      return { label: 'Pendiente', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: ClockIcon };
    case 'RECHAZADO':
      return { label: 'Rechazado', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircleIcon };
    default:
      return { label: v || '-', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: DocumentTextIcon };
  }
};

const Section: React.FC<{ title: string; items: Array<{ templateId: number; templateName?: string; state?: string; expiresAt?: string | null; documentId?: number; id?: number }>; onPreview?: (docId: number) => void }> = ({ title, items, onPreview }) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const totalCount = items.length;
  const faltantes = items.filter(item => item.state?.toUpperCase() === 'FALTANTE').length;
  const vigentes = items.filter(item => ['OK', 'VIGENTE'].includes(item.state?.toUpperCase())).length;
  const porVencer = items.filter(item => item.state?.toUpperCase() === 'PROXIMO').length;
  const vencidos = items.filter(item => item.state?.toUpperCase() === 'VENCIDO').length;

  return (
    <Card className='overflow-hidden'>
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 px-3 sm:px-6 py-4 border-b'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <h3 className='font-semibold text-lg text-gray-900'>{title}</h3>
          <div className='flex flex-wrap items-center gap-2'>
            {totalCount > 0 && (
              <>
                {vigentes > 0 && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs sm:text-sm">{vigentes} vigentes</Badge>}
                {porVencer > 0 && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs sm:text-sm">{porVencer} por vencer</Badge>}
                {vencidos > 0 && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs sm:text-sm">{vencidos} vencidos</Badge>}
                {faltantes > 0 && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs sm:text-sm">{faltantes} faltantes</Badge>}
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className='p-3 sm:p-6'>
        {items.length === 0 ? (
          <div className='text-center py-8'>
            <DocumentTextIcon className='h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3' />
            <p className='text-xs sm:text-sm text-muted-foreground'>Sin documentos requeridos</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {items.map((item, idx) => {
              const config = getStatusConfig(item.state);
              const Icon = config.icon;
              const docId = item.documentId || item.id;
              const canPreview = docId && item.state?.toUpperCase() !== 'FALTANTE';
              
              return (
                <div key={`doc-${item.templateId || item.id || idx}`} className='group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border hover:shadow-sm transition-all duration-200 hover:border-blue-200 gap-3'>
                  <div className='flex items-center gap-3 min-w-0 flex-1'>
                    <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${config.color.replace('text-', 'text-').replace('bg-', 'bg-').replace('border-', '')}`}>
                      <Icon className='h-3 w-3 sm:h-4 sm:w-4' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='font-medium text-gray-900 text-sm sm:text-base truncate'>{item.templateName || `Plantilla #${item.templateId}`}</div>
                      {item.expiresAt && (
                        <div className='text-xs text-muted-foreground mt-1'>
                          Vencimiento: {formatDate(item.expiresAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className='flex items-center gap-2 flex-shrink-0'>
                    {canPreview && onPreview && (
                      <button
                        onClick={() => onPreview(docId!)}
                        className='p-1.5 rounded-full hover:bg-blue-100 text-blue-600 transition-colors'
                        title='Ver documento'
                      >
                        <EyeIcon className='h-4 w-4 sm:h-5 sm:w-5' />
                      </button>
                    )}
                    <Badge variant="outline" className={`${config.color} text-xs sm:text-sm`}>
                      {config.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

export const EstadoEquipoPage: React.FC = () => {
  const { id } = useParams();
  const equipoId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { goBack } = useRoleBasedNavigation();
  const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
  const [textFilter, setTextFilter] = useState('');
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const prevUrlRef = React.useRef<string | null>(null);

  // Cargar preview cuando se selecciona un documento
  React.useEffect(() => {
    // Limpiar URL anterior si existe
    if (prevUrlRef.current) {
      try { URL.revokeObjectURL(prevUrlRef.current); } catch { /* Ignorar error de revocación */ }
      prevUrlRef.current = null;
    }

    if (!previewDocId) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewUrl(null);
      try {
        const resp = await fetch(
          `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/documents/${previewDocId}/download?inline=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resp.ok) throw new Error('Error cargando documento');
        const blob = await resp.blob();
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          prevUrlRef.current = url;
          setPreviewUrl(url);
        }
      } catch {
        if (!cancelled) setPreviewUrl(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };
    loadPreview();

    return () => { cancelled = true; };
  }, [previewDocId, token]);
  const onlyParam = useMemo(()=> {
    try { return new URLSearchParams(location.search).get('only') ?? ''; } catch { return ''; }
  }, [location.search]);
  const setOnlyParam = (val: string) => {
    try {
      const sp = new URLSearchParams(location.search);
      if (!val || val === 'all') sp.delete('only'); else sp.set('only', val);
      navigate({ pathname: location.pathname, search: sp.toString() });
    } catch {
      // fallback
      navigate(val && val !== 'all' ? `${location.pathname}?only=${encodeURIComponent(val)}` : location.pathname);
    }
  };
  const { data, isLoading, error } = useGetEquipoComplianceQuery({ id: equipoId }, { skip: !equipoId, refetchOnMountOrArgChange: true, refetchOnFocus: true });
  const { data: templates = [] } = useGetTemplatesQuery();

  const downloadZipVigentes = async () => {
    try {
      const url = `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/equipos/${equipoId}/zip`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `equipo_${equipoId}_vigentes.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert('No fue posible descargar el ZIP de vigentes');
    }
  };

  const downloadExcelResumen = async () => {
    try {
      const url = `${getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || ''}/api/docs/equipos/${equipoId}/summary.xlsx`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `equipo_${equipoId}_resumen.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert('No fue posible descargar el Excel de resumen');
    }
  };

  const templateNameById = useMemo(() => {
    const m = new Map<number, string>();
    (templates as any[]).forEach((t: any) => { if (t?.id) m.set(t.id, (t.nombre ?? t.name ?? `Plantilla #${t.id}`)); });
    return m;
  }, [templates]);
  const getTemplateName = useCallback((templateId?: number) => {
    if (!templateId) return '';
    return templateNameById.get(templateId) ?? '';
  }, [templateNameById]);

  const complianceByEntidad = useMemo(() => {
    const map: Record<string, Array<any>> = { EMPRESA_TRANSPORTISTA: [], CHOFER: [], CAMION: [], ACOPLADO: [] };
    // Set para deduplicar por entityType + templateId
    const seen: Record<string, Set<number>> = { EMPRESA_TRANSPORTISTA: new Set(), CHOFER: new Set(), CAMION: new Set(), ACOPLADO: new Set() };
    try {
      const clientes = (data?.clientes ?? []) as Array<{ clienteId: number; compliance: any[] }>;
      for (const c of clientes) {
        for (const r of c.compliance ?? []) {
          const list = (map[r.entityType] = map[r.entityType] ?? []);
          const seenSet = (seen[r.entityType] = seen[r.entityType] || new Set());
          // Solo agregar si no hemos visto este templateId para esta entidad
          if (!seenSet.has(r.templateId)) {
            seenSet.add(r.templateId);
            list.push(r);
          }
        }
      }
    } catch (e) { /* noop */ }
    // Filtrado opcional por estado
    const only = String(onlyParam ?? '').toUpperCase().trim();
    const filterFn = (arr: any[]) => {
      if (!only || only === 'ALL' || only === 'TODOS') return arr;
      const state = (x: any) => String(x.state ?? '').toUpperCase();
      if (only === 'VENCIDOS' || only === 'VENCIDO') return arr.filter((x) => state(x) === 'VENCIDO');
      if (only === 'VIGENTES' || only === 'OK' || only === 'VIGENTE') return arr.filter((x) => ['OK', 'VIGENTE'].includes(state(x)));
      if (only === 'POR_VENCER' || only === 'PROXIMO' || only === 'PRÓXIMO') return arr.filter((x) => state(x) === 'PROXIMO');
      if (only === 'FALTANTES' || only === 'FALTANTE') return arr.filter((x) => state(x) === 'FALTANTE');
      return arr;
    };
    const text = String(textFilter ?? '').toLowerCase().trim();
    const filterByText = (arr: any[]) => {
      if (!text) return arr;
      return arr.filter((x) => getTemplateName(x.templateId).toLowerCase().includes(text));
    };
    if (only) {
      return {
        EMPRESA_TRANSPORTISTA: filterByText(filterFn(map.EMPRESA_TRANSPORTISTA)),
        CHOFER: filterByText(filterFn(map.CHOFER)),
        CAMION: filterByText(filterFn(map.CAMION)),
        ACOPLADO: filterByText(filterFn(map.ACOPLADO)),
      };
    }
    return {
      EMPRESA_TRANSPORTISTA: filterByText(map.EMPRESA_TRANSPORTISTA),
      CHOFER: filterByText(map.CHOFER),
      CAMION: filterByText(map.CAMION),
      ACOPLADO: filterByText(map.ACOPLADO),
    };
  }, [data, onlyParam, textFilter, getTemplateName]);

  const totalDocs = Object.values(complianceByEntidad).flat().length;
  const faltantesTotal = Object.values(complianceByEntidad).flat().filter(r => r.state?.toUpperCase() === 'FALTANTE').length;
  const vigentesTotal = Object.values(complianceByEntidad).flat().filter(r => ['OK', 'VIGENTE'].includes(r.state?.toUpperCase())).length;
  const porVencerTotal = Object.values(complianceByEntidad).flat().filter(r => r.state?.toUpperCase() === 'PROXIMO').length;
  const vencidosTotal = Object.values(complianceByEntidad).flat().filter(r => r.state?.toUpperCase() === 'VENCIDO').length;

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-slate-900'>
      <div className='container mx-auto px-3 sm:px-4 py-4 sm:py-8'>
        {/* Header */}
        <div className='flex flex-col gap-4 mb-6 sm:mb-8 sm:flex-row sm:items-center'>
          <Button variant='outline' size='sm' onClick={goBack} className='flex items-center hover:bg-white self-start'>
            <ArrowLeftIcon className='h-4 w-4 mr-2' /> Volver
          </Button>
          <div className='flex-1'>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Estado Documental del Equipo</h1>
            <p className='text-sm sm:text-base text-muted-foreground mt-1'>Resumen completo de la documentación requerida</p>
          </div>
          <div className='flex gap-2 self-start sm:self-auto'>
            <Button variant='outline' size='sm' onClick={downloadZipVigentes}>Descargar ZIP vigentes</Button>
            <Button size='sm' onClick={downloadExcelResumen}>Descargar Excel</Button>
          </div>
        </div>
        {/* Filtros rápidos */}
        <div className='mb-4 flex flex-wrap items-center gap-2'>
          <span className='text-xs text-muted-foreground'>Filtro:</span>
          <Button variant={(!onlyParam || onlyParam==='all') ? 'default' : 'outline'} size='sm' onClick={()=> setOnlyParam('all')}>Todos</Button>
          <Button variant={(onlyParam||'').toLowerCase().startsWith('venc') ? 'default' : 'outline'} size='sm' onClick={()=> setOnlyParam('vencidos')}>Vencidos</Button>
          <Button variant={(onlyParam||'').toLowerCase().includes('por') ? 'default' : 'outline'} size='sm' onClick={()=> setOnlyParam('por_vencer')}>Por vencer</Button>
          <Button variant={(onlyParam||'').toLowerCase().startsWith('vigen') || (onlyParam||'').toLowerCase()==='ok' ? 'default' : 'outline'} size='sm' onClick={()=> setOnlyParam('vigentes')}>Vigentes</Button>
          <Button variant={(onlyParam||'').toLowerCase().startsWith('falta') ? 'default' : 'outline'} size='sm' onClick={()=> setOnlyParam('faltantes')}>Faltantes</Button>
          <div className='ml-auto flex items-center gap-2'>
            <label htmlFor='textFilter' className='text-xs text-muted-foreground'>Documento</label>
            <input
              id='textFilter'
              value={textFilter}
              onChange={(e)=> setTextFilter(e.target.value)}
              placeholder='Filtrar por nombre de documento'
              className='border rounded px-3 py-2 text-sm w-64 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400'
              aria-label='Filtrar por nombre de documento'
            />
          </div>
        </div>

        {/* Loading y Error */}
        {isLoading && (
          <div className='flex items-center justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <span className='ml-3 text-muted-foreground'>Cargando información...</span>
          </div>
        )}
        
        {error && (
          <Card className='p-6 border-red-200 bg-red-50'>
            <div className='flex items-center gap-3'>
              <XCircleIcon className='h-6 w-6 text-red-600' />
              <div>
                <h3 className='font-medium text-red-900'>Error al cargar</h3>
                <p className='text-sm text-red-700 mt-1'>No se pudo obtener la información del equipo</p>
              </div>
            </div>
          </Card>
        )}

        {/* Resumen general */}
        {!isLoading && data && totalDocs > 0 && (
          <Card className='mb-6 sm:mb-8 overflow-hidden' aria-live='polite'>
            <div className='bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-6 py-4'>
              <h2 className='text-lg sm:text-xl font-semibold'>Resumen General</h2>
              <p className='text-blue-100 mt-1 text-sm sm:text-base'>Equipo #{equipoId}</p>
            </div>
            <div className='p-4 sm:p-6'>
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
                <div className='text-center p-3 sm:p-4 rounded-lg bg-green-50 border border-green-200'>
                  <div className='text-xl sm:text-2xl font-bold text-green-700'>{vigentesTotal}</div>
                  <div className='text-xs sm:text-sm text-green-600'>Vigentes</div>
                </div>
                <div className='text-center p-3 sm:p-4 rounded-lg bg-yellow-50 border border-yellow-200'>
                  <div className='text-xl sm:text-2xl font-bold text-yellow-700'>{porVencerTotal}</div>
                  <div className='text-xs sm:text-sm text-yellow-600'>Por vencer</div>
                </div>
                <div className='text-center p-3 sm:p-4 rounded-lg bg-orange-50 border border-orange-200'>
                  <div className='text-xl sm:text-2xl font-bold text-orange-700'>{vencidosTotal}</div>
                  <div className='text-xs sm:text-sm text-orange-600'>Vencidos</div>
                </div>
                <div className='text-center p-3 sm:p-4 rounded-lg bg-red-50 border border-red-200'>
                  <div className='text-xl sm:text-2xl font-bold text-red-700'>{faltantesTotal}</div>
                  <div className='text-xs sm:text-sm text-red-600'>Faltantes</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Secciones por entidad */}
        {!isLoading && data && (
          <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6'>
            <Section title='Empresa Transportista' items={(complianceByEntidad['EMPRESA_TRANSPORTISTA'] ?? []).map((r: any)=> ({ ...r, templateName: templateNameById.get(r.templateId) }))} onPreview={setPreviewDocId} />
            <Section title='Chofer' items={(complianceByEntidad['CHOFER'] ?? []).map((r: any)=> ({ ...r, templateName: templateNameById.get(r.templateId) }))} onPreview={setPreviewDocId} />
            <Section title='Camión' items={(complianceByEntidad['CAMION'] ?? []).map((r: any)=> ({ ...r, templateName: templateNameById.get(r.templateId) }))} onPreview={setPreviewDocId} />
            <Section title='Acoplado' items={(complianceByEntidad['ACOPLADO'] ?? []).map((r: any)=> ({ ...r, templateName: templateNameById.get(r.templateId) }))} onPreview={setPreviewDocId} />
          </div>
        )}
        
        {/* Modal de vista previa simple por ID */}
        {previewDocId && (
          <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4' onClick={() => setPreviewDocId(null)} onKeyDown={(e) => e.key === 'Escape' && setPreviewDocId(null)} role="button" tabIndex={0} aria-label="Cerrar preview">
            <div className='bg-white rounded-lg shadow-xl max-w-5xl w-full h-[85vh] flex flex-col' onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="dialog">
              <div className='flex items-center justify-between p-4 border-b bg-gray-50'>
                <h2 className='font-semibold text-gray-900'>Vista Previa del Documento</h2>
                <button onClick={() => setPreviewDocId(null)} className='p-2 hover:bg-gray-200 rounded-full text-xl'>
                  ✕
                </button>
              </div>
              <div className='flex-1 overflow-hidden bg-gray-100'>
                {previewLoading && (
                  <div className='flex items-center justify-center h-full'>
                    <div className='text-center'>
                      <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3'></div>
                      <p className='text-gray-600'>Cargando documento...</p>
                    </div>
                  </div>
                )}
                {!previewLoading && previewUrl && (
                  <iframe
                    src={previewUrl}
                    className='w-full h-full border-0'
                    title='Vista previa del documento'
                  />
                )}
                {!previewLoading && !previewUrl && (
                  <div className='flex items-center justify-center h-full'>
                    <p className='text-gray-600'>No se pudo cargar el documento</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!isLoading && data && totalDocs === 0 && (
          <Card className='p-8 sm:p-12 text-center'>
            <DocumentTextIcon className='h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4' />
            <h3 className='text-base sm:text-lg font-medium text-gray-900 mb-2'>Sin documentos configurados</h3>
            <p className='text-sm sm:text-base text-muted-foreground'>No hay documentos requeridos para este equipo</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EstadoEquipoPage;


