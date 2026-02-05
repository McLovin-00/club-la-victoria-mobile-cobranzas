import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TableCellsIcon,
  BuildingOfficeIcon,
  UserIcon,
  TruckIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useGetExtractedDataListQuery } from '../api/documentosApiSlice';
import { useAppSelector } from '../../../store/hooks';

type EntityType = 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';

const ENTITY_TYPES: { value: EntityType | ''; label: string; icon: React.ElementType }[] = [
  { value: '', label: 'Todas las entidades', icon: TableCellsIcon },
  { value: 'EMPRESA_TRANSPORTISTA', label: 'Empresas Transportistas', icon: BuildingOfficeIcon },
  { value: 'CHOFER', label: 'Choferes', icon: UserIcon },
  { value: 'CAMION', label: 'Camiones', icon: TruckIcon },
  { value: 'ACOPLADO', label: 'Acoplados', icon: TruckIcon },
];

const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case 'EMPRESA_TRANSPORTISTA': return BuildingOfficeIcon;
    case 'CHOFER': return UserIcon;
    case 'CAMION':
    case 'ACOPLADO': return TruckIcon;
    default: return TableCellsIcon;
  }
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

export default function ExtractedDataPage() {
  const [entityType, setEntityType] = useState<EntityType | ''>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const user = useAppSelector((state) => state.auth?.user);
  const userRole = user?.role ?? '';
  
  // Solo admins pueden ver esta página
  const canView = ['SUPERADMIN', 'ADMIN_INTERNO'].includes(userRole);

  const { data, isLoading, isFetching } = useGetExtractedDataListQuery(
    { entityType: entityType ?? undefined, page, limit },
    { skip: !canView }
  );

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Acceso Restringido
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Esta página solo está disponible para administradores.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/documentos"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver a Documentos
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <TableCellsIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Datos Extraídos por IA
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Información consolidada extraída de los documentos analizados
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value as EntityType | '');
                  setPage(1);
                }}
                className="appearance-none pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {ENTITY_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            
            {pagination && (
              <div className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
                {pagination.total} entidades con datos extraídos
              </div>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              Cargando datos...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay datos extraídos disponibles
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Última Extracción
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Último Documento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Confianza
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Datos Destacados
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {items.map((item: any) => {
                    const Icon = getEntityIcon(item.entityType);
                    
                    // Datos destacados según tipo
                    const destacados: string[] = [];
                    if (item.entityType === 'CHOFER') {
                      if (item.cuil) destacados.push(`CUIL: ${item.cuil}`);
                      if (item.clasesLicencia) destacados.push(`Clases: ${item.clasesLicencia}`);
                    } else if (item.entityType === 'CAMION' || item.entityType === 'ACOPLADO') {
                      if (item.anioFabricacion) destacados.push(`Año: ${item.anioFabricacion}`);
                      if (item.numeroMotor) destacados.push(`Motor: ${item.numeroMotor.slice(0, 10)}...`);
                    } else if (item.entityType === 'EMPRESA_TRANSPORTISTA') {
                      if (item.condicionIva) destacados.push(item.condicionIva);
                      if (item.cantidadEmpleados) destacados.push(`${item.cantidadEmpleados} empleados`);
                    }
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {item.entityType.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            #{item.entityId}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {formatDate(item.ultimaExtraccionAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {item.ultimoDocumentoTipo || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.confianzaPromedio ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              item.confianzaPromedio >= 0.8 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : item.confianzaPromedio >= 0.5
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {Math.round(item.confianzaPromedio * 100)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {destacados.length > 0 ? destacados.map((d) => (
                              <span key={`destacado-${d}`} className="inline-flex px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">
                                {d}
                              </span>
                            )) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/documentos/datos-extraidos/${item.entityType}/${item.entityId}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            <EyeIcon className="h-4 w-4" />
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Paginación */}
          {pagination && pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Página {pagination.page} de {pagination.pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages || isFetching}
                  className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

