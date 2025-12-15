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
import { useGetDadoresQuery, useGetTemplatesQuery, useGetClientsQuery, useLazySearchEquiposQuery, useGetDefaultsQuery, useLazyGetEquipoComplianceQuery, useDeleteEquipoMutation, useGetEquipoComplianceQuery, useSearchEquiposByDnisMutation, useGetEmpresasTransportistasQuery, useSearchEquiposPagedQuery, useToggleEquipoActivoMutation } from '../api/documentosApiSlice';
import { showToast } from '../../../components/ui/Toast.utils';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

type FilterType = 'todos' | 'dador' | 'cliente' | 'empresa';

export const ConsultaPage: React.FC = () => {
  const navigate = useNavigate();
  const userRole = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;
  const isChofer = userRole === 'CHOFER';
  
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
  const { data: dadoresResp } = useGetDadoresQuery({}, { skip: isChofer } as any);
  const dadores = dadoresResp?.list ?? (Array.isArray(dadoresResp) ? dadoresResp : []);
  const { data: templates = [] } = useGetTemplatesQuery(undefined as any, { skip: isChofer } as any);
  const { data: clientsResp } = useGetClientsQuery({}, { skip: isChofer } as any);
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
    { skip: isChofer }
  );
  
  const [dni, setDni] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [trailerPlate, setTrailerPlate] = useState('');
  const [params, setParams] = useState<{
    empresaId?: number;
    clienteId?: number;
    empresaTransportistaId?: number;
    // Búsqueda masiva (DNI/patentes), separado por "|"
    search?: string;
    // filtros individuales
    dni?: string;
    truckPlate?: string;
    trailerPlate?: string;
  }>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Paginación
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Filtro de activo: 'all' | 'true' | 'false'
  const [activoFilter, setActivoFilter] = useState<'all' | 'true' | 'false'>('true');
  
  // Búsqueda paginada del servidor
  const queryParams = hasSearched ? {
    page,
    limit,
    dadorCargaId: params.empresaId,
    clienteId: params.clienteId,
    empresaTransportistaId: params.empresaTransportistaId,
    search: params.search,
    dni: params.dni,
    truckPlate: params.truckPlate,
    trailerPlate: params.trailerPlate,
    activo: activoFilter,
  } : { page: 1, limit: 10 };
  
  const { data: pagedData, isFetching, isError, error } = useSearchEquiposPagedQuery(
    queryParams,
    { skip: !hasSearched }
  );
  
  const data = pagedData?.data ?? [];
  const pagination = pagedData?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  
  // Para compatibilidad con código existente
  const [trigger] = useLazySearchEquiposQuery();
  const [getCompliance] = useLazyGetEquipoComplianceQuery();
  const [deleteEquipo] = useDeleteEquipoMutation();
  const [toggleActivo] = useToggleEquipoActivoMutation();
  // CSV DNIs search
  const [searchByDnis, { isLoading: loadingCsvSearch }] = useSearchEquiposByDnisMutation();
  const [csvResults, setCsvResults] = useState<Array<any>>([]);
  const [csvInfo, setCsvInfo] = useState<{ name?: string; count?: number }>({});
  
  

  // Persistir búsqueda en URL cuando cambian los parámetros
  useEffect(() => {
    if (!hasSearched) return;
    
    const sp: any = { search: 'true', page: String(page) };
    if (params.empresaId) sp.empresaId = String(params.empresaId);
    if (params.clienteId) sp.clienteId = String(params.clienteId);
    if (params.empresaTransportistaId) sp.empresaTranspId = String(params.empresaTransportistaId);
    if (params.dni) sp.dni = params.dni;
    if (params.truckPlate) sp.truckPlate = params.truckPlate;
    if (params.trailerPlate) sp.trailerPlate = params.trailerPlate;
    setSearchParams(sp);
  }, [params, hasSearched, page, setSearchParams]);

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

      // Usar búsqueda paginada del servidor (como cliente): search=VAL1|VAL2|...
      // Esto soporta DNIs y patentes mezclados.
      const search = items.join('|');

      // Mantener filtros de entidad actuales (dador/cliente/empresa transp) + reemplazar búsqueda masiva
      const p: any = { ...params, search };
      // Limpiar filtros individuales para evitar mezclar señales
      p.dni = undefined;
      p.truckPlate = undefined;
      p.trailerPlate = undefined;

      setCsvResults([]);
      setCsvInfo({ name: `${items.length} valores ingresados`, count: items.length });
      setSearchText('');
      setShowSearchModal(false);
      setPage(1);
      setHasSearched(true);
      setParams(p);
      show(`Búsqueda masiva aplicada (${items.length} valores). Resultados paginados.`);
    } catch {
      show('Error al buscar');
    }
  };

  // Solo mostrar resultados si el usuario ha buscado
  const displayResults: Array<any> = !hasSearched ? [] : (csvResults.length > 0 ? csvResults : (data as any[]));

  const downloadAllVigentes = async () => {
    try {
      setIsDownloading(true);

      // Si viene de búsqueda masiva (csvResults), ya tenemos el listado completo
      let ids: number[] = [];
      if (csvResults.length > 0) {
        ids = csvResults.map((it: any) => (it?.equipo?.id ?? it?.id)).filter((v: any) => typeof v === 'number');
      } else {
        if (!hasSearched) {
          show('Debe realizar una búsqueda antes de descargar');
          return;
        }

        // Descargar TODOS los equipos que coinciden con los filtros actuales usando paginación del servidor
        const baseUrl = import.meta.env.VITE_DOCUMENTOS_API_URL || '';
        const take = 100; // máximo razonable por request
        let currentPage = 1;
        const allIds: number[] = [];

        // Seguridad: evitar loops infinitos
        const maxPages = 200;

        while (currentPage <= maxPages) {
          const sp = new URLSearchParams();
          sp.set('page', String(currentPage));
          sp.set('limit', String(take));
          if (params.empresaId) sp.set('dadorCargaId', String(params.empresaId));
          if (params.clienteId) sp.set('clienteId', String(params.clienteId));
          if (params.empresaTransportistaId) sp.set('empresaTransportistaId', String(params.empresaTransportistaId));
          // Importante: si la búsqueda fue por lista (DNI/patentes), está en params.search
          if (params.search) sp.set('search', String(params.search));
          if (params.dni) sp.set('dni', String(params.dni));
          if (params.truckPlate) sp.set('truckPlate', String(params.truckPlate));
          if (params.trailerPlate) sp.set('trailerPlate', String(params.trailerPlate));

          const resp = await fetch(`${baseUrl}/api/docs/equipos/search-paged?${sp.toString()}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (!resp.ok) {
            throw new Error(`search-paged failed (${resp.status})`);
          }
          const json = await resp.json();
          const pageIds = (json?.data || []).map((e: any) => e?.id).filter((v: any) => typeof v === 'number');
          allIds.push(...pageIds);

          if (!json?.pagination?.hasNext) break;
          currentPage += 1;
        }

        ids = Array.from(new Set(allIds));
      }

      if (!ids.length) {
        show('No hay equipos para descargar');
        return;
      }

      // Descarga nativa vía formulario (evita blob en JS para ZIPs grandes)
      const baseUrl = import.meta.env.VITE_DOCUMENTOS_API_URL || '';
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${baseUrl}/api/docs/equipos/download/vigentes-form`;
      form.style.display = 'none';

      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'token';
      tokenInput.value = authToken;
      form.appendChild(tokenInput);

      const idsInput = document.createElement('input');
      idsInput.type = 'hidden';
      idsInput.name = 'equipoIds';
      idsInput.value = ids.join(',');
      form.appendChild(idsInput);

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
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

        {/* Filtro de Estado (Activo/Inactivo) */}
        <div className='mb-3'>
          <Label className='text-sm font-medium mb-2 block'>Estado de equipos:</Label>
          <div className='grid grid-cols-3 gap-2'>
            <Button
              type='button'
              variant={activoFilter === 'true' ? 'default' : 'outline'}
              onClick={() => setActivoFilter('true')}
              size='sm'
            >
              Solo Activos
            </Button>
            <Button
              type='button'
              variant={activoFilter === 'false' ? 'default' : 'outline'}
              onClick={() => setActivoFilter('false')}
              size='sm'
            >
              Solo Inactivos
            </Button>
            <Button
              type='button'
              variant={activoFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setActivoFilter('all')}
              size='sm'
            >
              Todos
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
                if (isChofer) {
                  // Para CHOFER el backend filtra automáticamente por choferId
                } else if (filterType === 'todos') {
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
                setPage(1);
                setHasSearched(true);
                setParams(p);
              }}
              disabled={
                isChofer
                  ? false
                  :
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
                setPage(1);
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
      
      {/* Barra de paginación (solo para resultados del servidor, no para búsqueda masiva) */}
      {hasSearched && !isFetching && csvResults.length === 0 && displayResults.length > 0 && (
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg'>
          <div className='text-sm text-gray-600 dark:text-gray-400'>
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} equipos
          </div>
          
          <div className='flex items-center gap-3'>
            {/* Controles de paginación */}
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev}
              >
                <ChevronLeftIcon className='h-4 w-4' />
              </Button>
              <span className='text-sm px-2'>
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNext}
              >
                <ChevronRightIcon className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className='grid gap-3'>
        {displayResults.map((it: any) => {
          const eq = it.equipo || it;
          return (
            <div key={eq.id} className={`rounded-lg border bg-white dark:bg-slate-900 p-3 grid gap-3 md:grid-cols-[1fr,auto,auto] items-center ${eq.activo === false ? 'opacity-50 bg-gray-100' : ''}`}>
              <div className='space-y-1'>
                <div className='font-medium flex items-center gap-2'>
                  <span>Equipo #{eq.id}</span>
                  <span className='text-xs px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-slate-800/60 text-muted-foreground'>
                    {eq.estado || 'activa'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${eq.activo !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {eq.activo !== false ? 'Activo' : 'Inactivo'}
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
                <Button 
                  variant='outline' 
                  size='sm' 
                  className={eq.activo !== false ? 'text-orange-600 border-orange-300 hover:bg-orange-50' : 'text-green-600 border-green-300 hover:bg-green-50'}
                  onClick={async ()=>{
                    try {
                      await toggleActivo({ equipoId: eq.id, activo: eq.activo === false }).unwrap();
                      showToast(`Equipo ${eq.activo === false ? 'activado' : 'desactivado'} exitosamente`, 'success');
                    } catch (e: any) {
                      showToast(e?.data?.message || 'Error al cambiar estado', 'error');
                    }
                  }}
                >
                  {eq.activo !== false ? '⏸ Desactivar' : '▶ Activar'}
                </Button>
                <Button variant='destructive' size='sm' onClick={async ()=>{
                  const ok = await confirm({ title: 'Eliminar equipo', message: `¿Eliminar equipo #${eq.id}? Esta acción es irreversible.`, confirmText: 'Eliminar', variant: 'danger' });
                  if (!ok) return;
                  await deleteEquipo({ id: (eq as any).id });
                  showToast('Equipo eliminado', 'success');
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

