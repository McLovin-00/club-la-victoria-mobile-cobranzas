import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { useAppSelector } from '../../../store/hooks';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { ConfirmContext } from '../../../contexts/confirmContext';
import { useGetDadoresQuery, useGetTemplatesQuery, useGetClientsQuery, useLazySearchEquiposQuery, useGetDefaultsQuery, useLazyGetEquipoComplianceQuery, useDeleteEquipoMutation, useGetEquipoComplianceQuery, useSearchEquiposByDnisMutation, useDownloadVigentesBulkMutation, useGetEmpresasTransportistasQuery } from '../api/documentosApiSlice';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

type FilterType = 'todos' | 'dador' | 'cliente' | 'empresa';

export const ConsultaPage: React.FC = () => {
  const navigate = useNavigate();
  const userRole = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;
  
  // Determinar ruta de volver según el rol
  const getBackRoute = () => {
    switch (userRole) {
      case 'ADMIN_INTERNO':
        return '/portal/admin-interno';
      case 'DADOR_DE_CARGA':
        return '/portal/dadores';
      case 'TRANSPORTISTA':
      case 'CHOFER':
        return '/portal/transportistas';
      default:
        return '/documentos';
    }
  };
  
  const show = (msg: string) => { try { alert(msg); } catch { console.log(msg); } };
  const { confirm } = useContext(ConfirmContext);
  const { data: dadoresResp } = useGetDadoresQuery({});
  const dadores = dadoresResp?.list ?? (Array.isArray(dadoresResp) ? dadoresResp : []);
  const { data: templates = [] } = useGetTemplatesQuery();
  const { data: clientsResp } = useGetClientsQuery({});
  const clients = clientsResp?.list ?? (Array.isArray(clientsResp) ? clientsResp : []);
  const empresaIdFromAuth = useSelector((s: RootState) => s.auth?.user?.empresaId) as number | undefined;
  const { data: defaults } = useGetDefaultsQuery();
  // Para búsqueda, usar default del dador si existe; si no, caer al empresaId del usuario
  const dadorIdForSearch = (defaults?.defaultDadorId ?? empresaIdFromAuth ?? undefined);
  const authToken = useSelector((s: RootState) => s.auth?.token) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || '') : '');
  
  // Estados de filtros
  const [filterType, setFilterType] = useState<FilterType>('dador');
  const [selectedDadorId, setSelectedDadorId] = useState<number | undefined>(dadorIdForSearch);
  const [selectedClienteId, setSelectedClienteId] = useState<number | undefined>();
  const [selectedEmpresaTranspId, setSelectedEmpresaTranspId] = useState<number | undefined>();
  const [empresaSearchText, setEmpresaSearchText] = useState('');
  
  // Obtener empresas transportistas - para admins sin filtro, para dadores con su ID
  const { data: empresasTransp = [] } = useGetEmpresasTransportistasQuery(
    { 
      dadorCargaId: selectedDadorId || dadorIdForSearch || undefined,
      q: empresaSearchText || undefined,
      limit: 100 // Traer hasta 100 empresas que coincidan
    },
    { skip: false }
  );
  
  const [dni, setDni] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [trailerPlate, setTrailerPlate] = useState('');
  const [params, setParams] = useState<{ empresaId?: number; clienteId?: number; empresaTransportistaId?: number; dni?: string; truckPlate?: string; trailerPlate?: string }>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [trigger, { data = [], isFetching, isError, error }] = useLazySearchEquiposQuery();
  const [getCompliance] = useLazyGetEquipoComplianceQuery();
  const [deleteEquipo] = useDeleteEquipoMutation();
  // CSV DNIs search
  const [searchByDnis, { isLoading: loadingCsvSearch }] = useSearchEquiposByDnisMutation();
  const [downloadBulk] = useDownloadVigentesBulkMutation();
  const [csvResults, setCsvResults] = useState<Array<any>>([]);
  const [csvInfo, setCsvInfo] = useState<{ name?: string; count?: number }>({});

  // Ejecutar búsqueda al cambiar parámetros válidos SOLO si el usuario ha hecho click en buscar
  useEffect(() => {
    if (!hasSearched) return; // No buscar hasta que el usuario haga click
    
    // Permitir búsqueda con cualquier filtro de entidad (empresaId, clienteId, empresaTransportistaId)
    // incluso si no hay parámetros de búsqueda adicionales (dni, patentes)
    const hasFilters = params.empresaId || params.clienteId || params.empresaTransportistaId;
    const hasSearchParams = params.dni || params.truckPlate || params.trailerPlate;
    
    // Ejecutar búsqueda si hay al menos un filtro de entidad
    if (hasFilters || hasSearchParams) {
      console.debug('ConsultaPage: buscando equipos', params);
      // preferCacheValue=false para forzar request
      (trigger as any)(params, false);
      // Persistir búsqueda en URL con flag de búsqueda activa
      const sp: any = { search: 'true' };
      if (params.empresaId) sp.empresaId = String(params.empresaId);
      if (params.clienteId) sp.clienteId = String(params.clienteId);
      if (params.empresaTransportistaId) sp.empresaTranspId = String(params.empresaTransportistaId);
      if (params.dni) sp.dni = params.dni;
      if (params.truckPlate) sp.truckPlate = params.truckPlate;
      if (params.trailerPlate) sp.trailerPlate = params.trailerPlate;
      setSearchParams(sp);
    }
  }, [params, hasSearched, setSearchParams, trigger]);

  // Inicializar desde URL o sessionStorage SOLO en montaje inicial
  useEffect(() => {
    // Solo buscar automáticamente si hay un flag explícito en URL
    const autoSearch = searchParams.get('search') === 'true';
    const empresaIdQ = searchParams.get('empresaId') ? Number(searchParams.get('empresaId')) : undefined;
    const clienteIdQ = searchParams.get('clienteId') ? Number(searchParams.get('clienteId')) : undefined;
    const empresaTranspIdQ = searchParams.get('empresaTranspId') ? Number(searchParams.get('empresaTranspId')) : undefined;
    const dniQ = searchParams.get('dni') || undefined;
    const truckQ = searchParams.get('truckPlate') || undefined;
    const trailerQ = searchParams.get('trailerPlate') || undefined;
    
    if (empresaIdQ || clienteIdQ || empresaTranspIdQ || dniQ || truckQ || trailerQ) {
      // Restaurar valores en los selectores y campos
      if (empresaIdQ) { 
        setSelectedDadorId(empresaIdQ);
        setFilterType('dador');
      }
      if (clienteIdQ) {
        setSelectedClienteId(clienteIdQ);
        setFilterType('cliente');
      }
      if (empresaTranspIdQ) {
        setSelectedEmpresaTranspId(empresaTranspIdQ);
        setFilterType('empresa');
      }
      setDni(dniQ || '');
      setTruckPlate(truckQ || '');
      setTrailerPlate(trailerQ || '');
      
      // Solo ejecutar búsqueda si viene con flag explícito
      if (autoSearch) {
        setParams({ 
          empresaId: empresaIdQ, 
          clienteId: clienteIdQ, 
          empresaTransportistaId: empresaTranspIdQ,
          dni: dniQ, 
          truckPlate: truckQ, 
          trailerPlate: trailerQ 
        });
        setHasSearched(true);
      }
      return;
    }
    // No cargar desde sessionStorage para evitar búsquedas automáticas
  }, [searchParams]);

  // Estado para búsqueda por texto (DNIs o Patentes)
  const [searchText, setSearchText] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState<number | null>(null);

  const onSearchByText = async () => {
    try {
      if (!searchText.trim()) { show('Ingrese al menos un DNI o patente'); return; }
      // Parsear el texto: puede ser DNIs o patentes separados por coma, espacio o salto de línea
      const items = searchText.split(/[,\s\n]+/).map((l) => l.trim().toUpperCase()).filter(Boolean);
      if (items.length === 0) { show('No se encontraron valores válidos'); return; }
      
      // Detectar si son DNIs (solo números) o patentes (alfanuméricos)
      const dnis = items.filter((i) => /^\d{7,8}$/.test(i.replace(/\D/g, '')));
      const patentes = items.filter((i) => /^[A-Z0-9]{5,10}$/.test(i));
      
      if (dnis.length > 0) {
        // Buscar por DNIs
        const cleanDnis = dnis.map((d) => d.replace(/\D/g, ''));
        setCsvInfo({ name: `${cleanDnis.length} DNIs ingresados`, count: cleanDnis.length });
        const resp = await searchByDnis({ dnis: cleanDnis }).unwrap();
      const wrapped = (resp || []).map((eq: any) => ({ equipo: eq, clientes: [] }));
      setCsvResults(wrapped);
        setSearchText(''); // Limpiar textarea
        setShowSearchModal(false);
        if (wrapped.length === 0) {
          setHasSearched(false);
          show(`No se encontraron equipos para los DNIs ingresados`);
        } else {
          setHasSearched(true);
          show(`Se encontraron ${wrapped.length} equipos para ${cleanDnis.length} DNI(s)`);
        }
      } else if (patentes.length > 0) {
        // Buscar por patentes (una por una con el filtro de truckPlate)
        const results: any[] = [];
        for (const patente of patentes) {
          const resp = await (trigger as any)({ truckPlate: patente }, false);
          if (resp?.data) {
            results.push(...resp.data);
          }
        }
        const wrapped = results.map((eq: any) => ({ equipo: eq.equipo || eq, clientes: eq.clientes || [] }));
        setCsvResults(wrapped);
        setSearchText(''); // Limpiar textarea
        setShowSearchModal(false);
        setCsvInfo({ name: `${patentes.length} patentes ingresadas`, count: patentes.length });
        if (wrapped.length === 0) {
          setHasSearched(false);
          show(`No se encontraron equipos para las patentes ingresadas`);
        } else {
          setHasSearched(true);
          show(`Se encontraron ${wrapped.length} equipos para ${patentes.length} patente(s)`);
        }
      } else {
        show('No se reconocieron DNIs ni patentes válidas');
      }
    } catch {
      show('Error al buscar');
    }
  };

  // Solo mostrar resultados si el usuario ha buscado
  const displayResults: Array<any> = !hasSearched ? [] : (csvResults.length > 0 ? csvResults : (data as any[]));

  const downloadAllVigentes = async () => {
    try {
      if (!Array.isArray(displayResults) || displayResults.length === 0) { show('No hay equipos para descargar'); return; }
      const ids = displayResults.map((it: any) => (it?.equipo?.id ?? it?.id)).filter((v: any) => typeof v === 'number');
      if (!ids.length) { show('Sin IDs válidos de equipos'); return; }
      
      setIsDownloading(true);
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
      show('No fue posible iniciar la descarga masiva');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center gap-2 mb-4'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            // Limpiar búsqueda y volver
            setSearchParams({});
            navigate(getBackRoute());
          }}
          className='flex items-center'
        >
          <ArrowLeftIcon className='h-4 w-4 mr-2' />
          Volver
        </Button>
        <h1 className='text-2xl font-bold'>Consulta</h1>
      </div>
      <Card className='p-4 mb-6'>
        {/* Tipo de Filtro */}
        <div className='mb-4'>
          <Label className='text-sm font-medium mb-2 block'>Filtrar por:</Label>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
            <Button
              type='button'
              variant={filterType === 'todos' ? 'default' : 'outline'}
              onClick={() => setFilterType('todos')}
              size='sm'
            >
              Todos los equipos
            </Button>
            <Button
              type='button'
              variant={filterType === 'dador' ? 'default' : 'outline'}
              onClick={() => setFilterType('dador')}
              size='sm'
            >
              Por Dador
            </Button>
            <Button
              type='button'
              variant={filterType === 'cliente' ? 'default' : 'outline'}
              onClick={() => setFilterType('cliente')}
              size='sm'
            >
              Por Cliente
            </Button>
            <Button
              type='button'
              variant={filterType === 'empresa' ? 'default' : 'outline'}
              onClick={() => setFilterType('empresa')}
              size='sm'
            >
              Por Empresa Transp.
            </Button>
          </div>
        </div>

        {/* Selector de Filtro Principal */}
        {filterType !== 'todos' && (
          <div className='mb-3'>
            {filterType === 'dador' && (
              <div>
                <Label className='text-sm mb-1 block'>Dador de Carga</Label>
                <select
                  className='w-full border rounded px-3 py-2 text-sm'
                  value={selectedDadorId || ''}
                  onChange={(e) => setSelectedDadorId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value=''>Seleccione un dador</option>
                  {dadores.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.razonSocial || d.nombre || `Dador #${d.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {filterType === 'cliente' && (
              <div>
                <Label className='text-sm mb-1 block'>Cliente</Label>
                <select
                  className='w-full border rounded px-3 py-2 text-sm'
                  value={selectedClienteId || ''}
                  onChange={(e) => setSelectedClienteId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value=''>Seleccione un cliente</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial || c.nombre || `Cliente #${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {filterType === 'empresa' && (
              <div className='space-y-2'>
                <Label className='text-sm mb-1 block'>Empresa Transportista</Label>
                <Input
                  placeholder='Buscar por nombre o CUIT...'
                  value={empresaSearchText}
                  onChange={(e) => setEmpresaSearchText(e.target.value)}
                  className='mb-2'
                />
                <select
                  className='w-full border rounded px-3 py-2 text-sm'
                  value={selectedEmpresaTranspId || ''}
                  onChange={(e) => setSelectedEmpresaTranspId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value=''>Seleccione una empresa transportista ({(empresasTransp as any[]).length} encontradas)</option>
                  {(empresasTransp as any[]).map((et: any) => (
                    <option key={et.id} value={et.id}>
                      {et.razonSocial || `Empresa #${et.id}`} - {et.cuit}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Filtros adicionales por DNI/Patentes */}
        <div className='mb-3'>
          <Label className='text-sm mb-1 block'>Filtros adicionales (opcionales)</Label>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
          <Input placeholder='DNI Chofer' value={dni} onChange={(e) => setDni(e.target.value)} />
          <Input placeholder='Patente Camión' value={truckPlate} onChange={(e) => setTruckPlate(e.target.value)} />
          <Input placeholder='Patente Acoplado' value={trailerPlate} onChange={(e) => setTrailerPlate(e.target.value)} />
        </div>
        </div>

        {/* Botones de Acción */}
        <div className='flex flex-col md:flex-row gap-2 md:items-center justify-between'>
          <div className='flex gap-2'>
            <Button 
              type='button' 
              onClick={() => {
                const p: any = {
                  dni: dni || undefined,
                  truckPlate: truckPlate || undefined,
                  trailerPlate: trailerPlate || undefined
                };
                if (filterType === 'todos') {
                  // Para "todos", usar el dador por defecto o dejar sin filtro de entidad
                  p.empresaId = dadorIdForSearch;
                } else if (filterType === 'dador') {
                  p.empresaId = selectedDadorId;
                } else if (filterType === 'cliente') {
                  p.clienteId = selectedClienteId;
                } else if (filterType === 'empresa') {
                  p.empresaTransportistaId = selectedEmpresaTranspId;
                }
                setCsvResults([]);
                setHasSearched(true);
                setParams(p);
              }}
              disabled={
                (filterType === 'dador' && !selectedDadorId) ||
                (filterType === 'cliente' && !selectedClienteId) ||
                (filterType === 'empresa' && !selectedEmpresaTranspId)
              }
            >
              Buscar
            </Button>
            <Button 
              type='button' 
              variant='outline' 
              onClick={() => { 
                setDni(''); 
                setTruckPlate(''); 
                setTrailerPlate(''); 
                setSelectedDadorId(dadorIdForSearch);
                setSelectedClienteId(undefined);
                setSelectedEmpresaTranspId(undefined);
                setFilterType('dador');
                setParams({}); 
                setCsvResults([]);
                setCsvInfo({});
                setSearchText('');
                setHasSearched(false);
                setSearchParams({});
              }}
            >
              Limpiar
            </Button>
          </div>
          <div className='flex gap-2 items-center flex-wrap'>
            <Button type='button' variant='outline' onClick={() => setShowSearchModal(true)} size='sm'>
              🔍 Buscar por DNIs o Patentes
            </Button>
            {csvInfo?.name && <span className='text-xs text-muted-foreground'>{csvInfo.name}</span>}
            <Button 
              type='button' 
              variant='outline' 
              onClick={downloadAllVigentes} 
              disabled={(displayResults || []).length === 0 || isDownloading} 
              size='sm'
            >
              {isDownloading ? '⏳ Preparando archivos...' : 'Bajar documentación vigente (ZIP)'}
            </Button>
          </div>
          
          {/* Modal de búsqueda por texto */}
          {showSearchModal && (
            <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50' onClick={() => setShowSearchModal(false)}>
              <div className='bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md shadow-xl' onClick={(e) => e.stopPropagation()}>
                <h3 className='text-lg font-semibold mb-4'>Buscar Equipos por DNIs o Patentes</h3>
                <p className='text-sm text-muted-foreground mb-3'>
                  Ingrese uno o más DNIs de choferes o patentes de camiones, separados por coma, espacio o salto de línea.
                </p>
                <textarea
                  className='w-full h-32 border rounded-md p-3 text-sm resize-none'
                  placeholder='Ej: 40219122, 35123456&#10;o: MHB277, ABC123'
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  autoFocus
                />
                <div className='flex justify-end gap-2 mt-4'>
                  <Button variant='outline' onClick={() => { setShowSearchModal(false); setSearchText(''); }}>
                    Cancelar
                  </Button>
                  <Button onClick={onSearchByText} disabled={loadingCsvSearch || !searchText.trim()}>
                    {loadingCsvSearch ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {isFetching && <div className='text-sm text-muted-foreground'>Buscando...</div>}
      {(!isFetching && Array.isArray(displayResults) && displayResults.length === 0 && Object.keys(params).length > 0 && !csvResults.length) && (
        <div className='text-sm text-muted-foreground'>Sin resultados para los criterios de filtro seleccionados.</div>
      )}
      {isError && <div className='text-sm text-red-600'>Error al buscar{(error as any)?.status ? ` (${(error as any).status})` : ''}. Revise los filtros seleccionados.</div>}
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
                  disabled={isDownloadingSingle === eq.id}
                  onClick={async ()=>{
                    try {
                      setIsDownloadingSingle(eq.id);
                      const baseUrl = import.meta.env.VITE_DOCUMENTOS_API_URL || '';
                      const zipUrl = `${baseUrl}/api/docs/clients/equipos/${eq.id}/zip`;
                      const resp = await fetch(zipUrl, { headers: { 'Authorization': `Bearer ${authToken}` } });
                      if (!resp.ok) { show('Error al descargar documentación'); return; }
                      const blob = await resp.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      const cd = resp.headers.get('Content-Disposition');
                      const match = cd?.match(/filename=([^;]+)/);
                      a.download = match?.[1]?.replace(/"/g, '') || `equipo_${eq.id}.zip`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch {
                      show('No fue posible iniciar la descarga');
                    } finally {
                      setIsDownloadingSingle(null);
                    }
                  }}
                >{isDownloadingSingle === eq.id ? '⏳ Preparando...' : 'Bajar documentación'}</Button>
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
  
  // Set para deduplicar por entityType-templateId (evita contar múltiples veces por cliente)
  const processedTemplates = new Set<string>();

  const bumpFromCompliance = (entityType: 'EMPRESA_TRANSPORTISTA'|'CHOFER'|'CAMION'|'ACOPLADO', r: any) => {
    // Deduplicar: si ya procesamos este template para esta entidad, ignorar
    const key = `${entityType}-${r.templateId}`;
    if (processedTemplates.has(key)) return;
    processedTemplates.add(key);
    
    const state = String(r.state || '').toUpperCase();
    // Manejar todos los estados detallados del backend
    if (state === 'OK' || state === 'VIGENTE') { vigentes++; return; }
    if (state === 'PROXIMO') { porVencer++; return; }
    if (state === 'VENCIDO') { vencidos++; return; }
    if (state === 'FALTANTE') { faltantes++; return; }
    // Para estados desconocidos (PENDIENTE, RECHAZADO, etc.), contar como faltante
    faltantes++;
  };

  try {
    for (const c of (data?.clientes || [])) {
      for (const r of (c?.compliance || [])) {
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

