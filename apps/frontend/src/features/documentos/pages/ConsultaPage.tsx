import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { useAppSelector } from '../../../store/hooks';
import { getRuntimeEnv } from '../../../lib/runtimeEnv';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { ConfirmContext } from '../../../contexts/confirmContext';
import { useGetDadoresQuery, useGetTemplatesQuery, useGetClientsQuery, useLazySearchEquiposQuery, useGetDefaultsQuery, useLazyGetEquipoComplianceQuery, useDeleteEquipoMutation, useGetEquipoComplianceQuery, useSearchEquiposByDnisMutation, useGetEmpresasTransportistasQuery, useSearchEquiposPagedQuery, useToggleEquipoActivoMutation } from '../api/documentosApiSlice';
import { showToast } from '../../../components/ui/Toast.utils';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon, ClockIcon, DocumentTextIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

type FilterType = 'todos' | 'dador' | 'cliente' | 'empresa';
type ComplianceFilter = 'all' | 'faltantes' | 'vencidos' | 'por_vencer';

const SEVERIDAD_CLASSES: Record<string, string> = {
  critica: 'bg-red-50 text-red-700',
  advertencia: 'bg-yellow-50 text-yellow-700',
  default: 'bg-blue-50 text-blue-700',
};

function getSeveridadClass(severidad: string | undefined): string {
  return SEVERIDAD_CLASSES[severidad || 'default'] || SEVERIDAD_CLASSES.default;
}

// Helper para construir query params de búsqueda de equipos
function buildEquipoSearchParams(
  params: { empresaId?: number; clienteId?: number; empresaTransportistaId?: number; search?: string; dni?: string; truckPlate?: string; trailerPlate?: string },
  page: number,
  take: number
): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('limit', String(take));
  
  const mappings: Array<[keyof typeof params, string]> = [
    ['empresaId', 'dadorCargaId'],
    ['clienteId', 'clienteId'],
    ['empresaTransportistaId', 'empresaTransportistaId'],
    ['search', 'search'],
    ['dni', 'dni'],
    ['truckPlate', 'truckPlate'],
    ['trailerPlate', 'trailerPlate'],
  ];
  
  for (const [key, paramName] of mappings) {
    const val = params[key];
    if (val !== undefined && val !== null) sp.set(paramName, String(val));
  }
  
  return sp;
}

// Helper para obtener IDs de equipos paginados desde el servidor
async function fetchAllEquipoIds(
  params: { empresaId?: number; clienteId?: number; empresaTransportistaId?: number; search?: string; dni?: string; truckPlate?: string; trailerPlate?: string },
  authToken: string
): Promise<number[]> {
  const baseUrl = import.meta.env.VITE_DOCUMENTOS_API_URL ?? '';
  const take = 100;
  const maxPages = 200;
  const allIds: number[] = [];

  for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
    const sp = buildEquipoSearchParams(params, currentPage, take);
    const resp = await fetch(`${baseUrl}/api/docs/equipos/search-paged?${sp.toString()}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!resp.ok) throw new Error(`search-paged failed (${resp.status})`);
    
    const json = await resp.json();
    const pageIds = (json?.data ?? []).map((e: any) => e?.id).filter((v: any) => typeof v === 'number');
    allIds.push(...pageIds);

    if (!json?.pagination?.hasNext) break;
  }

  return Array.from(new Set(allIds));
}

// Helper para descargar via formulario POST
function downloadViaForm(action: string, authToken: string, equipoIds: number[]): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';

  const tokenInput = document.createElement('input');
  tokenInput.type = 'hidden';
  tokenInput.name = 'token';
  tokenInput.value = authToken;
  form.appendChild(tokenInput);

  const idsInput = document.createElement('input');
  idsInput.type = 'hidden';
  idsInput.name = 'equipoIds';
  idsInput.value = equipoIds.join(',');
  form.appendChild(idsInput);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

const ROLES_CAN_EDIT = ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'ADMIN_INTERNO', 'OPERADOR_INTERNO'];

export const ConsultaPage: React.FC = () => {
  const navigate = useNavigate();
  const userRole = useAppSelector((s) => (s as any).auth?.user?.role) as string | undefined;
  const userDadorCargaId = useAppSelector((s) => (s as any).auth?.user?.dadorCargaId) as number | undefined;
  const isChofer = userRole === 'CHOFER';
  const isDadorDeCarga = userRole === 'DADOR_DE_CARGA';
  const canEdit = Boolean(userRole && ROLES_CAN_EDIT.includes(userRole));
  
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
  
  const show = (msg: string) => {
    const isError = msg.toLowerCase().includes('error') || msg.toLowerCase().includes('no hay') || msg.toLowerCase().includes('no fue posible') || msg.toLowerCase().includes('debe realizar');
    const isSuccess = msg.toLowerCase().includes('correctamente') || msg.toLowerCase().includes('exitosa');
    const variant = isError ? 'error' : isSuccess ? 'success' : 'default';
    showToast(msg, variant);
  };
  const { confirm } = useContext(ConfirmContext);
  const { data: dadoresResp } = useGetDadoresQuery({}, { skip: isChofer } as any);
  const dadoresRaw = dadoresResp?.list ?? (Array.isArray(dadoresResp) ? dadoresResp : []);
  // Para DADOR_DE_CARGA, filtrar para que solo vea su propio dador
  const dadores = isDadorDeCarga && userDadorCargaId
    ? dadoresRaw.filter((d: any) => d.id === userDadorCargaId)
    : dadoresRaw;
  const { data: _templates = [] } = useGetTemplatesQuery(undefined as any, { skip: isChofer } as any);
  const { data: clientsResp } = useGetClientsQuery({}, { skip: isChofer } as any);
  const clients = clientsResp?.list ?? (Array.isArray(clientsResp) ? clientsResp : []);
  const empresaIdFromAuth = useSelector((s: RootState) => s.auth?.user?.empresaId) as number | undefined;
  const { data: defaults } = useGetDefaultsQuery();
  // Para DADOR_DE_CARGA, usar su dadorCargaId; para otros, usar default o empresaId
  const dadorIdForSearch = isDadorDeCarga && userDadorCargaId
    ? userDadorCargaId
    : (defaults?.defaultDadorId ?? empresaIdFromAuth ?? undefined);
  const authToken = useSelector((s: RootState) => s.auth?.token) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('token') ?? '') : '');
  
  // Estados de filtros
  const [filterType, setFilterType] = useState<FilterType>('dador');
  const [selectedDadorId, setSelectedDadorId] = useState<number | undefined>(dadorIdForSearch);
  const [selectedClienteId, setSelectedClienteId] = useState<number | undefined>();
  const [selectedEmpresaTranspId, setSelectedEmpresaTranspId] = useState<number | undefined>();
  const [empresaSearchText, setEmpresaSearchText] = useState('');
  
  // Obtener empresas transportistas - para admins sin filtro, para dadores con su ID
  const { data: empresasTranspResp } = useGetEmpresasTransportistasQuery(
    { 
      dadorCargaId: (selectedDadorId || dadorIdForSearch) ?? undefined,
      q: empresaSearchText ?? undefined,
      limit: 100
    },
    { skip: isChofer }
  );
  const empresasTransp = empresasTranspResp?.data ?? [];
  
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
  // Por defecto "Todos" para usuarios internos (admins, dadores, transportistas)
  const [activoFilter, setActivoFilter] = useState<'all' | 'true' | 'false'>('all');
  
  // Filtro por estado de compliance documental
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('all');
  
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
    complianceFilter: complianceFilter !== 'all' ? complianceFilter : undefined,
  } : { page: 1, limit: 10 };
  
  const { data: pagedData, isFetching, isError, error } = useSearchEquiposPagedQuery(
    queryParams,
    { skip: !hasSearched }
  );
  
  const data = pagedData?.data ?? [];
  const pagination = pagedData?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  const serverStats = pagedData?.stats;
  
  // Para compatibilidad con código existente
  const [_trigger] = useLazySearchEquiposQuery();
  const [_getCompliance] = useLazyGetEquipoComplianceQuery();
  const [deleteEquipo] = useDeleteEquipoMutation();
  const [toggleActivo, { isLoading: _isTogglingActivo }] = useToggleEquipoActivoMutation();
  const [togglingEquipoId, setTogglingEquipoId] = useState<number | null>(null);
  // CSV DNIs search
  const [_searchByDnis, { isLoading: loadingCsvSearch }] = useSearchEquiposByDnisMutation();
  const [csvResults, setCsvResults] = useState<Array<any>>([]);
  const [csvInfo, setCsvInfo] = useState<{ name?: string; count?: number }>({});
  
  // Para DADOR_DE_CARGA, forzar su dadorCargaId como único seleccionable
  useEffect(() => {
    if (isDadorDeCarga && userDadorCargaId && selectedDadorId !== userDadorCargaId) {
      setSelectedDadorId(userDadorCargaId);
    }
  }, [isDadorDeCarga, userDadorCargaId, selectedDadorId]);

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
    if (filterType !== 'dador') sp.filterType = filterType;
    if (activoFilter !== 'all') sp.activoFilter = activoFilter;
    if (complianceFilter !== 'all') sp.complianceFilter = complianceFilter;
    setSearchParams(sp);
  }, [params, hasSearched, page, filterType, activoFilter, complianceFilter, setSearchParams]);

  // Inicializar desde URL o sessionStorage SOLO en montaje inicial
  useEffect(() => {
    // Solo buscar automáticamente si hay un flag explícito en URL
    const autoSearch = searchParams.get('search') === 'true';
    const empresaIdQ = searchParams.get('empresaId') ? Number(searchParams.get('empresaId')) : undefined;
    const clienteIdQ = searchParams.get('clienteId') ? Number(searchParams.get('clienteId')) : undefined;
    const empresaTranspIdQ = searchParams.get('empresaTranspId') ? Number(searchParams.get('empresaTranspId')) : undefined;
    const dniQ = searchParams.get('dni') ?? undefined;
    const truckQ = searchParams.get('truckPlate') ?? undefined;
    const trailerQ = searchParams.get('trailerPlate') ?? undefined;
    const filterTypeQ = searchParams.get('filterType') as FilterType | null;
    const activoFilterQ = searchParams.get('activoFilter') as 'all' | 'true' | 'false' | null;
    const complianceFilterQ = searchParams.get('complianceFilter') as ComplianceFilter | null;
    
    if (empresaIdQ || clienteIdQ || empresaTranspIdQ || dniQ || truckQ || trailerQ || autoSearch) {
      // Restaurar filtros de tipo, estado y compliance
      if (filterTypeQ && ['todos', 'dador', 'cliente', 'empresa'].includes(filterTypeQ)) {
        setFilterType(filterTypeQ);
      }
      if (activoFilterQ && ['all', 'true', 'false'].includes(activoFilterQ)) {
        setActivoFilter(activoFilterQ);
      }
      if (complianceFilterQ && ['all', 'faltantes', 'vencidos', 'por_vencer'].includes(complianceFilterQ)) {
        setComplianceFilter(complianceFilterQ);
      }

      // Restaurar valores en los selectores y campos
      if (empresaIdQ) { 
        setSelectedDadorId(empresaIdQ);
        if (!filterTypeQ) setFilterType('dador');
      }
      if (clienteIdQ) {
        setSelectedClienteId(clienteIdQ);
        if (!filterTypeQ) setFilterType('cliente');
      }
      if (empresaTranspIdQ) {
        setSelectedEmpresaTranspId(empresaTranspIdQ);
        if (!filterTypeQ) setFilterType('empresa');
      }
      setDni(dniQ ?? '');
      setTruckPlate(truckQ ?? '');
      setTrailerPlate(trailerQ ?? '');
      
      if (autoSearch) {
        const adminRoles = ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'];
        const isAdmin = Boolean(userRole && adminRoles.includes(userRole));
        const resolvedFilterType = filterTypeQ ?? (empresaIdQ ? 'dador' : 'todos');
        const skipDador = isAdmin && resolvedFilterType === 'todos';
        setParams({ 
          empresaId: skipDador ? undefined : empresaIdQ, 
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
  
  // Estado para modal de datos extraídos por IA
  const [showIADataModal, setShowIADataModal] = useState(false);
  const [iaDataEquipo, setIaDataEquipo] = useState<any>(null);
  const [iaDataLoading, setIaDataLoading] = useState(false);
  const [iaData, setIaData] = useState<{
    empresaTransportista: any | null;
    chofer: any | null;
    camion: any | null;
    acoplado: any | null;
  }>({ empresaTransportista: null, chofer: null, camion: null, acoplado: null });
  const [confirmDelete, setConfirmDelete] = useState<{ entityType: string; entityId: number } | null>(null);
  const [editingEntity, setEditingEntity] = useState<{ entityType: string; entityId: number; data: any } | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, string>>({});
  
  // Verificar si el usuario puede ver datos IA
  const canViewIAData = ['SUPERADMIN', 'ADMIN_INTERNO'].includes(userRole ?? '');
  
  const fetchIAData = async (equipo: any) => {
    setIaDataEquipo(equipo);
    setShowIADataModal(true);
    setIaDataLoading(true);
    setIaData({ empresaTransportista: null, chofer: null, camion: null, acoplado: null });
    
    const baseUrl = getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || '';
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
      // Buscar datos de empresa transportista
      const empresaId = equipo.empresaTransportistaId || equipo.empresa_transportista_id;
      if (empresaId) {
        try {
          const resp = await fetch(`${baseUrl}/api/docs/entities/EMPRESA_TRANSPORTISTA/${empresaId}/extracted-data`, { headers });
          if (resp.ok) {
            const json = await resp.json();
            setIaData(prev => ({ ...prev, empresaTransportista: json?.data || json }));
          }
        } catch { /* ignore */ }
      }
      
      // Buscar datos del chofer - el backend devuelve driverId
      const choferId = equipo.driverId || equipo.choferIdDb || equipo.choferId || equipo.driver_id;
      if (choferId) {
        try {
          const resp = await fetch(`${baseUrl}/api/docs/entities/CHOFER/${choferId}/extracted-data`, { headers });
          if (resp.ok) {
            const json = await resp.json();
            setIaData(prev => ({ ...prev, chofer: json?.data || json }));
          }
        } catch { /* ignore */ }
      }
      
      // Buscar datos del camión - el backend devuelve truckId
      const camionId = equipo.truckId || equipo.camionIdDb || equipo.camionId || equipo.truck_id;
      if (camionId) {
        try {
          const resp = await fetch(`${baseUrl}/api/docs/entities/CAMION/${camionId}/extracted-data`, { headers });
          if (resp.ok) {
            const json = await resp.json();
            setIaData(prev => ({ ...prev, camion: json?.data || json }));
          }
        } catch { /* ignore */ }
      }
      
      // Buscar datos del acoplado - el backend devuelve trailerId
      const acopladoId = equipo.trailerId || equipo.acopladoIdDb || equipo.acopladoId || equipo.trailer_id;
      if (acopladoId) {
        try {
          const resp = await fetch(`${baseUrl}/api/docs/entities/ACOPLADO/${acopladoId}/extracted-data`, { headers });
          if (resp.ok) {
            const json = await resp.json();
            setIaData(prev => ({ ...prev, acoplado: json?.data || json }));
          }
        } catch { /* ignore */ }
      }
    } finally {
      setIaDataLoading(false);
    }
  };
  
  const handleDeleteIAData = async (entityType: string, entityId: number) => {
    const baseUrl = getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || '';
    try {
      const resp = await fetch(`${baseUrl}/api/docs/entities/${entityType}/${entityId}/extracted-data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (resp.ok) {
        show('Datos IA eliminados correctamente');
        setConfirmDelete(null);
        // Recargar datos
        if (iaDataEquipo) fetchIAData(iaDataEquipo);
      } else {
        show('Error al eliminar datos IA');
      }
    } catch {
      show('Error al eliminar datos IA');
    }
  };
  
  const handleSaveEdit = async () => {
    if (!editingEntity) return;
    const baseUrl = getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || '';
    try {
      const resp = await fetch(`${baseUrl}/api/docs/entities/${editingEntity.entityType}/${editingEntity.entityId}/extracted-data`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: editFormData }),
      });
      if (resp.ok) {
        show('Datos actualizados correctamente');
        setEditingEntity(null);
        setEditFormData({});
        // Recargar datos
        if (iaDataEquipo) fetchIAData(iaDataEquipo);
      } else {
        show('Error al actualizar datos');
      }
    } catch {
      show('Error al actualizar datos');
    }
  };
  
  const startEditing = (entityType: string, entityId: number, data: any) => {
    setEditingEntity({ entityType, entityId, data });
    // Extraer datos extraídos para el form
    const extractedData = data?.extractedData || {};
    setEditFormData({ ...extractedData });
  };
  
  // Componente helper para renderizar datos de una entidad
  const EntityDataSection = ({ 
    title, 
    icon, 
    identifier, 
    data, 
    entityType, 
    entityId 
  }: { 
    title: string; 
    icon: string; 
    identifier: string; 
    data: any | null; 
    entityType: string; 
    entityId: number | undefined;
  }) => {
    if (!entityId) return null;
    
    const hasData = data && (
      (data.extractedData && Object.keys(data.extractedData).length > 0) ||
      (data.disparidades && data.disparidades.length > 0)
    );
    
    return (
      <div className='border rounded-lg p-4'>
        <div className='flex items-center justify-between mb-2'>
          <h4 className='font-medium text-sm text-gray-600'>{icon} {title} ({identifier})</h4>
          {hasData && (
            <div className='flex gap-1'>
              <button
                onClick={() => startEditing(entityType, entityId, data)}
                className='text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100'
                title='Editar datos'
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => setConfirmDelete({ entityType, entityId })}
                className='text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100'
                title='Borrar datos IA'
              >
                🗑️ Borrar
              </button>
            </div>
          )}
        </div>
        
        {hasData ? (
          <div className='space-y-2'>
            {/* Datos extraídos agrupados por documento */}
            {data.extractedDataByDocument && data.extractedDataByDocument.length > 0 ? (
              <div className='space-y-3'>
                {data.extractedDataByDocument.map((docData: any) => (
                  <div key={`${docData.templateName || 'doc'}-${docData.uploadedAt || docData.id || ''}`} className='bg-gray-50 rounded p-2'>
                    <p className='text-xs font-semibold text-blue-700 mb-1 border-b border-blue-200 pb-1'>
                      📄 {docData.templateName || 'Documento sin plantilla'}
                      {docData.uploadedAt && (
                        <span className='text-gray-500 font-normal ml-2'>
                          ({new Date(docData.uploadedAt).toLocaleDateString()})
                        </span>
                      )}
                    </p>
                    <div className='text-sm space-y-1'>
                      {Object.entries(docData.data).map(([key, value]) => (
                        <p key={key}>
                          <span className='font-medium capitalize'>{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : data.extractedData && Object.keys(data.extractedData).length > 0 ? (
              <div className='text-sm space-y-1'>
                {Object.entries(data.extractedData).map(([key, value]) => (
                  <p key={key}>
                    <span className='font-medium capitalize'>{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </p>
                ))}
              </div>
            ) : null}
            
            {/* Disparidades */}
            {data.disparidades && data.disparidades.length > 0 && (
              <div className='mt-2 pt-2 border-t'>
                <p className='text-xs font-medium text-orange-600 mb-1'>⚠️ Disparidades detectadas:</p>
                <div className='space-y-1'>
                  {data.disparidades.map((d: any) => (
                    <div key={`${d.campo}-${d.templateName || ''}-${d.mensaje?.slice(0, 15) || ''}`} className={`text-xs p-2 rounded ${getSeveridadClass(d.severidad)}`}>
                      <strong>{d.campo}:</strong> {d.mensaje}
                      {d.templateName && (
                        <span className='block text-xs opacity-70 italic'>
                          📄 Fuente: {d.templateName}
                        </span>
                      )}
                      {d.valorEnSistema && d.valorEnDocumento && (
                        <span className='block text-xs opacity-80'>
                          Sistema: {d.valorEnSistema} | Documento: {d.valorEnDocumento}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {data.lastValidation && (
              <p className='text-xs text-gray-400 mt-2'>
                Última validación: {new Date(data.lastValidation).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className='text-gray-400 text-sm'>No hay datos extraídos por IA para esta entidad</p>
        )}
      </div>
    );
  };

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
  
  // Stats del dashboard (del servidor)
  const dashboardStats = useMemo(() => {
    if (serverStats) {
      return {
        total: serverStats.total,
        conFaltantes: serverStats.conFaltantes,
        conVencidos: serverStats.conVencidos,
        conPorVencer: serverStats.conPorVencer
      };
    }
    return { total: pagination.total, conFaltantes: 0, conVencidos: 0, conPorVencer: 0 };
  }, [serverStats, pagination.total]);

  // Helper interno para obtener IDs de equipos para descarga
  const getEquipoIdsForDownload = async (): Promise<number[]> => {
    if (csvResults.length > 0) {
      return csvResults.map((it: any) => (it?.equipo?.id ?? it?.id)).filter((v: any) => typeof v === 'number');
    }
    if (!hasSearched) {
      throw new Error('NO_SEARCH');
    }
    return fetchAllEquipoIds(params, authToken);
  };

  const downloadAllVigentes = async () => {
    try {
      setIsDownloading(true);
      const ids = await getEquipoIdsForDownload();
      
      if (!ids.length) {
        show('No hay equipos para descargar');
        return;
      }

      const baseUrl = import.meta.env.VITE_DOCUMENTOS_API_URL ?? '';
      downloadViaForm(`${baseUrl}/api/docs/equipos/download/vigentes-form`, authToken, ids);
    } catch (err: any) {
      if (err?.message === 'NO_SEARCH') {
        show('Debe realizar una búsqueda antes de descargar');
      } else {
        if (!hasSearched) {
          show('Debe realizar una búsqueda antes de descargar');
          return;
        }

        // Descargar TODOS los equipos que coinciden con los filtros actuales usando paginación del servidor
        const baseUrl = getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || '';
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

        const fallbackIds = Array.from(new Set(allIds));
        const baseUrl2 = getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || '';
        downloadViaForm(`${baseUrl2}/api/docs/equipos/download/vigentes-form`, authToken, fallbackIds);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadExcelOnly = async () => {
    try {
      setIsDownloading(true);
      const ids = await getEquipoIdsForDownload();
      
      if (!ids.length) {
        show('No hay equipos para descargar');
        return;
      }

      // Descarga nativa vía formulario (evita blob en JS para ZIPs grandes)
      const baseUrl = getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || '';
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
                  value={selectedDadorId ?? ''}
                  onChange={(e) => setSelectedDadorId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={isDadorDeCarga}
                >
                  {isDadorDeCarga ? null : <option value=''>Seleccione un dador</option>}
                  {dadores.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.razonSocial || d.nombre || `Dador #${d.id}`}
                    </option>
                  ))}
                </select>
                {isDadorDeCarga && (
                  <p className='text-xs text-muted-foreground mt-1'>Solo puede consultar equipos de su dador asignado</p>
                )}
              </div>
            )}
            {filterType === 'cliente' && (
              <div>
                <Label className='text-sm mb-1 block'>Cliente</Label>
                <select
                  className='w-full border rounded px-3 py-2 text-sm'
                  value={selectedClienteId ?? ''}
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
                  value={selectedEmpresaTranspId ?? ''}
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
                  dni: dni ?? undefined,
                  truckPlate: truckPlate ?? undefined,
                  trailerPlate: trailerPlate ?? undefined
                };
                const rolesWithoutDadorFilter = ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'];
                const isAdminRole = Boolean(userRole && rolesWithoutDadorFilter.includes(userRole));
                if (isChofer) {
                  // Para CHOFER el backend filtra automáticamente por choferId
                } else if (filterType === 'todos') {
                  if (!isAdminRole) {
                    p.empresaId = dadorIdForSearch;
                  }
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
                setActivoFilter('all');
                setComplianceFilter('all');
                setEmpresaSearchText('');
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
              disabled={(displayResults ?? []).length === 0 || isDownloading} 
              size='sm'
            >
              {isDownloading ? '⏳ Preparando...' : '📦 Documentación (ZIP)'}
            </Button>
            <Button 
              type='button' 
              variant='outline' 
              onClick={downloadExcelOnly} 
              disabled={(displayResults ?? []).length === 0 || isDownloading} 
              size='sm'
            >
              {isDownloading ? '⏳ Preparando...' : '📊 Solo Excel'}
            </Button>
          </div>
          
          {/* Modal de búsqueda por texto */}
          {showSearchModal && (
            <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50' onClick={() => setShowSearchModal(false)} onKeyDown={(e) => e.key === 'Escape' && setShowSearchModal(false)} role='button' tabIndex={0}>
              <div className='bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md shadow-xl' onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role='dialog'>
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

      {/* Solo mostrar spinner global en primera carga, no en refetch */}
      {isFetching && displayResults.length === 0 && (
        <div className='flex flex-col items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4'></div>
          <div className='text-lg font-medium text-gray-600'>Buscando equipos...</div>
          <div className='text-sm text-muted-foreground'>Calculando estado de compliance</div>
        </div>
      )}
      {(!isFetching && Array.isArray(displayResults) && displayResults.length === 0 && Object.keys(params).length > 0 && !csvResults.length) && (
        <div className='text-sm text-muted-foreground'>Sin resultados para los criterios de filtro seleccionados.</div>
      )}
      {isError && <div className='text-sm text-red-600'>Error al buscar{(error as any)?.status ? ` (${(error as any).status})` : ''}. Revise los filtros seleccionados.</div>}
      
      {/* Dashboard de estado documental - siempre visible si hay datos */}
      {hasSearched && dashboardStats.total > 0 && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
          <button
            onClick={() => { setComplianceFilter('all'); setPage(1); }}
            className={`p-4 rounded-lg border-2 transition-all ${complianceFilter === 'all' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-blue-300 bg-white dark:bg-slate-800'}`}
          >
            <div className='flex items-center gap-2 mb-1'>
              <DocumentTextIcon className='h-5 w-5 text-blue-600' />
              <span className='text-sm font-medium text-gray-600 dark:text-gray-300'>Total</span>
            </div>
            <div className='text-2xl font-bold text-blue-600'>{dashboardStats.total}</div>
            <div className='text-xs text-gray-500'>equipos</div>
          </button>
          
          <button
            onClick={() => { setComplianceFilter(complianceFilter === 'faltantes' ? 'all' : 'faltantes'); setPage(1); }}
            className={`p-4 rounded-lg border-2 transition-all ${complianceFilter === 'faltantes' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 hover:border-red-300 bg-white dark:bg-slate-800'}`}
          >
            <div className='flex items-center gap-2 mb-1'>
              <ExclamationTriangleIcon className='h-5 w-5 text-red-600' />
              <span className='text-sm font-medium text-gray-600 dark:text-gray-300'>Faltantes</span>
            </div>
            <div className='text-2xl font-bold text-red-600'>{dashboardStats.conFaltantes}</div>
            <div className='text-xs text-gray-500'>con doc. faltante</div>
          </button>
          
          <button
            onClick={() => { setComplianceFilter(complianceFilter === 'vencidos' ? 'all' : 'vencidos'); setPage(1); }}
            className={`p-4 rounded-lg border-2 transition-all ${complianceFilter === 'vencidos' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 hover:border-orange-300 bg-white dark:bg-slate-800'}`}
          >
            <div className='flex items-center gap-2 mb-1'>
              <ClockIcon className='h-5 w-5 text-orange-600' />
              <span className='text-sm font-medium text-gray-600 dark:text-gray-300'>Vencidos</span>
            </div>
            <div className='text-2xl font-bold text-orange-600'>{dashboardStats.conVencidos}</div>
            <div className='text-xs text-gray-500'>con doc. vencida</div>
          </button>
          
          <button
            onClick={() => { setComplianceFilter(complianceFilter === 'por_vencer' ? 'all' : 'por_vencer'); setPage(1); }}
            className={`p-4 rounded-lg border-2 transition-all ${complianceFilter === 'por_vencer' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 hover:border-yellow-300 bg-white dark:bg-slate-800'}`}
          >
            <div className='flex items-center gap-2 mb-1'>
              <ClockIcon className='h-5 w-5 text-yellow-600' />
              <span className='text-sm font-medium text-gray-600 dark:text-gray-300'>Por Vencer</span>
            </div>
            <div className='text-2xl font-bold text-yellow-600'>{dashboardStats.conPorVencer}</div>
            <div className='text-xs text-gray-500'>con doc. por vencer</div>
          </button>
        </div>
      )}
      
      {/* Indicador de filtro activo */}
      {complianceFilter !== 'all' && (
        <div className='mb-3 flex items-center gap-2'>
          <span className='text-sm text-gray-600'>Filtrando por:</span>
          <span className={`px-2 py-1 rounded text-sm font-medium ${
            complianceFilter === 'faltantes' ? 'bg-red-100 text-red-700' :
            complianceFilter === 'vencidos' ? 'bg-orange-100 text-orange-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {complianceFilter === 'faltantes' ? 'Doc. Faltante' :
             complianceFilter === 'vencidos' ? 'Doc. Vencida' : 'Doc. Por Vencer'}
          </span>
          <button onClick={() => { setComplianceFilter('all'); setPage(1); }} className='text-sm text-blue-600 hover:underline'>
            Quitar filtro
          </button>
        </div>
      )}
      
      {/* Barra de paginación (solo para resultados del servidor, no para búsqueda masiva) */}
      {hasSearched && csvResults.length === 0 && displayResults.length > 0 && (
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
      
      {/* Modal de Datos Extraídos por IA */}
      {showIADataModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50' onClick={() => setShowIADataModal(false)} onKeyDown={(e) => e.key === 'Escape' && setShowIADataModal(false)} role='button' tabIndex={0}>
          <div className='bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-y-auto' onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role='dialog'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold flex items-center gap-2'>
                <SparklesIcon className='h-5 w-5 text-purple-600' />
                Datos Extraídos por IA - Equipo #{iaDataEquipo?.id}
              </h3>
              <button onClick={() => setShowIADataModal(false)} className='p-1 hover:bg-gray-100 rounded'>
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>
            
            {iaDataLoading ? (
              <div className='text-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2'></div>
                <p className='text-sm text-gray-500'>Cargando datos extraídos...</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {/* Empresa Transportista */}
                <EntityDataSection
                  title='Empresa Transportista'
                  icon='🏢'
                  identifier={iaDataEquipo?.empresaTransportistaNombre || `ID: ${iaDataEquipo?.empresaTransportistaId || '-'}`}
                  data={iaData.empresaTransportista}
                  entityType='EMPRESA_TRANSPORTISTA'
                  entityId={iaDataEquipo?.empresaTransportistaId}
                />
                
                {/* Chofer */}
                <EntityDataSection
                  title='Chofer'
                  icon='👤'
                  identifier={`DNI: ${iaDataEquipo?.driverDniNorm || '-'}`}
                  data={iaData.chofer}
                  entityType='CHOFER'
                  entityId={iaDataEquipo?.driverId}
                />
                
                {/* Camión */}
                <EntityDataSection
                  title='Camión'
                  icon='🚛'
                  identifier={`Patente: ${iaDataEquipo?.truckPlateNorm || '-'}`}
                  data={iaData.camion}
                  entityType='CAMION'
                  entityId={iaDataEquipo?.truckId}
                />
                
                {/* Acoplado */}
                {iaDataEquipo?.trailerPlateNorm && (
                  <EntityDataSection
                    title='Acoplado'
                    icon='🚚'
                    identifier={`Patente: ${iaDataEquipo?.trailerPlateNorm || '-'}`}
                    data={iaData.acoplado}
                    entityType='ACOPLADO'
                    entityId={iaDataEquipo?.trailerId}
                  />
                )}
                
                {!iaData.empresaTransportista && !iaData.chofer && !iaData.camion && !iaData.acoplado && (
                  <div className='text-center py-4 text-gray-500'>
                    <SparklesIcon className='h-12 w-12 mx-auto mb-2 opacity-30' />
                    <p>No hay datos extraídos por IA disponibles para este equipo.</p>
                    <p className='text-sm'>Los datos se extraen automáticamente cuando se procesan documentos con IA.</p>
                  </div>
                )}
              </div>
            )}
            
            <div className='mt-4 flex justify-end'>
              <Button variant='outline' onClick={() => setShowIADataModal(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmación de borrado */}
      {confirmDelete && (
        <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-[60]' onClick={() => setConfirmDelete(null)} onKeyDown={(e) => e.key === 'Escape' && setConfirmDelete(null)} role='button' tabIndex={0}>
          <div className='bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md shadow-xl' onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role='dialog'>
            <h4 className='text-lg font-semibold mb-4 text-red-600'>⚠️ Confirmar eliminación</h4>
            <p className='text-sm text-gray-600 mb-4'>
              ¿Estás seguro de que deseas eliminar todos los datos extraídos por IA de esta entidad?
              Esta acción no se puede deshacer.
            </p>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button 
                variant='destructive'
                onClick={() => handleDeleteIAData(confirmDelete.entityType, confirmDelete.entityId)}
              >
                Eliminar datos
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de edición */}
      {editingEntity && (
        <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-[60]' onClick={() => setEditingEntity(null)} onKeyDown={(e) => e.key === 'Escape' && setEditingEntity(null)} role='button' tabIndex={0}>
          <div className='bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto' onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role='dialog'>
            <h4 className='text-lg font-semibold mb-4'>✏️ Editar datos extraídos</h4>
            <p className='text-xs text-gray-500 mb-4'>
              {editingEntity.entityType} #{editingEntity.entityId}
            </p>
            <div className='space-y-3'>
              {Object.entries(editFormData).map(([key, value]) => (
                <div key={key}>
                  <label className='block text-sm font-medium text-gray-700 mb-1 capitalize'>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type='text'
                    value={value ?? ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, [key]: e.target.value }))}
                    className='w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500'
                  />
                </div>
              ))}
              {Object.keys(editFormData).length === 0 && (
                <p className='text-gray-500 text-sm'>No hay datos para editar.</p>
              )}
            </div>
            <div className='flex justify-end gap-2 mt-4'>
              <Button variant='outline' onClick={() => setEditingEntity(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className='grid gap-3'>
        {displayResults.map((it: any) => {
          const eq = it.equipo || it;
          const isToggling = togglingEquipoId === eq.id;
          return (
            <div key={eq.id} className={`relative rounded-lg border bg-white dark:bg-slate-900 p-3 grid gap-3 md:grid-cols-[1fr,auto,auto] items-center ${eq.activo === false ? 'opacity-50 bg-gray-100 dark:bg-slate-800/50' : ''} ${isToggling ? 'ring-2 ring-blue-400' : ''}`}>
              {/* Overlay de carga durante toggle */}
              {isToggling && (
                <div className='absolute inset-0 bg-white/70 dark:bg-slate-900/70 rounded-lg flex items-center justify-center z-10'>
                  <div className='flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg border'>
                    <span className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600'></span>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-200'>
                      {eq.activo !== false ? 'Desactivando...' : 'Activando...'}
                    </span>
                  </div>
                </div>
              )}
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
                {canViewIAData && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => fetchIAData(eq)}
                    className='text-purple-600 border-purple-300 hover:bg-purple-50'
                    title='Ver datos extraídos por IA'
                  >
                    <SparklesIcon className='h-4 w-4 mr-1' />
                    Datos IA
                  </Button>
                )}
                {canEdit && (
                <Button
                  variant='default'
                  size='sm'
                  onClick={() => navigate(`/documentos/equipos/${eq.id}/editar`)}
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  ✏️ Editar
                </Button>
                )}
                <Button
                  variant='outline'
                  size='sm'
                  disabled={isDownloadingSingle === eq.id}
                  onClick={async ()=>{
                    try {
                      setIsDownloadingSingle(eq.id);
                      const baseUrl = getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || '';
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
                {canEdit && (
                <Button 
                  variant='outline' 
                  size='sm' 
                  className={eq.activo !== false ? 'text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950' : 'text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950'}
                  disabled={togglingEquipoId === eq.id}
                  onClick={async ()=>{
                    try {
                      setTogglingEquipoId(eq.id);
                      const startTime = Date.now();
                      await toggleActivo({ equipoId: eq.id, activo: eq.activo === false }).unwrap();
                      const elapsed = Date.now() - startTime;
                      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));
                      showToast(`Equipo ${eq.activo === false ? 'activado' : 'desactivado'} exitosamente`, 'success');
                    } catch (e: any) {
                      showToast(e?.data?.message || 'Error al cambiar estado', 'error');
                    } finally {
                      setTogglingEquipoId(null);
                    }
                  }}
                >
                  {togglingEquipoId === eq.id ? (
                    <span className='flex items-center gap-1'>
                      <span className='animate-spin rounded-full h-3 w-3 border-b-2 border-current'></span>
                      Procesando...
                    </span>
                  ) : (
                    eq.activo !== false ? '⏸ Desactivar' : '▶ Activar'
                  )}
                </Button>
                )}
                {canEdit && (
                <Button variant='destructive' size='sm' onClick={async ()=>{
                  const ok = await confirm({ title: 'Eliminar equipo', message: `¿Eliminar equipo #${eq.id}? Esta acción es irreversible.`, confirmText: 'Eliminar', variant: 'danger' });
                  if (!ok) return;
                  await deleteEquipo({ id: (eq as any).id });
                  showToast('Equipo eliminado', 'success');
                }}>Eliminar</Button>
                )}
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
  
  let faltantes = 0, vencidos = 0, porVencer = 0, vigentes = 0;
  const processedTemplates = new Set<string>();

  try {
    for (const c of (data?.clientes ?? [])) {
      for (const r of (c?.compliance ?? [])) {
        const key = `${r.entityType}-${r.templateId}`;
        if (processedTemplates.has(key)) continue;
        processedTemplates.add(key);
        
        const state = String(r.state ?? '').toUpperCase();
        if (state === 'OK' || state === 'VIGENTE') { vigentes++; }
        else if (state === 'PROXIMO') { porVencer++; }
        else if (state === 'VENCIDO') { vencidos++; }
        else { faltantes++; }
      }
    }
  } catch { /* noop */ }

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

