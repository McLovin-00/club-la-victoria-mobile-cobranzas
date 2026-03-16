import { useState } from 'react';
import { useGetRejectedDocumentsQuery, useGetRejectedStatsQuery } from '../../features/documentos/api/documentosApiSlice';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExclamationTriangleIcon, DocumentTextIcon, FunnelIcon } from '@heroicons/react/24/outline';

export const RejectedDocumentsPage = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  // TODO: Agregar selector de dador cuando se implemente el filtro
  const [_dadorFilter, _setDadorFilter] = useState<number | undefined>(undefined);

  const { data: rejectedData, isLoading, error } = useGetRejectedDocumentsQuery({
    page,
    limit,
    entityType: entityTypeFilter ?? undefined,
    dadorId: _dadorFilter,
  });

  const { data: stats } = useGetRejectedStatsQuery();

  const documents = rejectedData?.data ?? [];
  const pagination = rejectedData?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      EMPRESA_TRANSPORTISTA: 'Empresa Transportista',
      CHOFER: 'Chofer',
      CAMION: 'Camión',
      ACOPLADO: 'Acoplado',
    };
    return labels[entityType] || entityType;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'RECHAZADO':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-800';
      case 'PENDIENTE':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800';
      case 'APROBADO':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            Documentos Rechazados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión y seguimiento de documentos que requieren corrección
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rechazados</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalRejected || 0}</p>
              </div>
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-card rounded-lg shadow p-6">
            <p className="text-sm font-medium text-muted-foreground mb-3">Por Tipo de Entidad</p>
            <div className="space-y-2">
              {stats.rejectedByEntityType?.slice(0, 3).map((item: any) => (
                <div key={item.entityType} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{getEntityTypeLabel(item.entityType)}</span>
                  <span className="font-semibold text-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg shadow p-6">
            <p className="text-sm font-medium text-muted-foreground mb-3">Principales Motivos</p>
            <div className="space-y-2">
              {stats.rejectedByReason?.slice(0, 3).map((item: any) => (
                <div key={`reason-${item.reason || 'none'}`} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[180px]" title={item.reason}>
                    {item.reason || 'Sin motivo'}
                  </span>
                  <span className="font-semibold text-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-card rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Tipo de Entidad
            </label>
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="EMPRESA_TRANSPORTISTA">Empresa Transportista</option>
              <option value="CHOFER">Chofer</option>
              <option value="CAMION">Camión</option>
              <option value="ACOPLADO">Acoplado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-muted-foreground mt-4">Cargando documentos rechazados...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">Error al cargar los documentos rechazados</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No hay documentos rechazados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tipo de Entidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Entidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Motivo de Rechazo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rechazado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {documents.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-accent transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <a
                          href={doc.previewUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center group"
                        >
                          <DocumentTextIcon className="h-5 w-5 text-muted-foreground/50 mr-2 group-hover:text-blue-500" />
                          <div>
                            <div className="text-sm font-medium text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline">
                              {doc.template?.name || `Documento #${doc.id}`}
                            </div>
                            <div className="text-xs text-muted-foreground">ID: {doc.id}</div>
                          </div>
                        </a>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-foreground">
                          {getEntityTypeLabel(doc.entityType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-foreground">
                          {doc.entityNaturalId || doc.entityId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-foreground max-w-xs truncate" title={doc.rejectionReason}>
                          {doc.rejectionReason || 'Sin motivo especificado'}
                        </div>
                        {doc.reviewNotes && (
                          <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate" title={doc.reviewNotes}>
                            {doc.reviewNotes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {doc.rejectedAt
                            ? formatDistanceToNow(new Date(doc.rejectedAt), { addSuffix: true, locale: es })
                            : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadgeColor(
                            doc.status
                          )}`}
                        >
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.pages > 1 && (
              <div className="bg-muted px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                    disabled={page === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Mostrando <span className="font-medium">{(page - 1) * limit + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> de{' '}
                      <span className="font-medium">{pagination.total}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pageNum
                                ? 'z-10 bg-blue-50 dark:bg-blue-950/30 border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'bg-card border-border text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                        disabled={page === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
