import { useMemo, useState, useEffect } from 'react';
import { Pagination } from '../../../components/ui/Pagination';
import { Link, useNavigate } from 'react-router-dom';
import { useGetApprovalPendingQuery, useGetApprovalKpisQuery } from '../api/documentosApiSlice';
import { formatDateTime } from '../../../utils/formatters';
import type { ApprovalPendingDocument } from '../types/entities';
import { useAppSelector } from '../../../store/hooks';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline';

type EntityType = 'DADOR' | 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO' | '';

export default function ApprovalQueuePage() {
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
  
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [entityType, setEntityType] = useState<EntityType>('');

  // Resetear página cuando cambia el filtro de entidad
  const handleEntityTypeChange = (newEntityType: EntityType) => {
    setEntityType(newEntityType);
    setPage(1); // Resetear a primera página
  };

  const { data: kpis } = useGetApprovalKpisQuery();
  const { data: pendingResp, isFetching, refetch } = useGetApprovalPendingQuery(
    { page, limit, entityType: entityType || undefined },
    { refetchOnMountOrArgChange: true }
  );

  // Auto-refresh cada 5 segundos para detectar cambios de IA
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const list = useMemo<ApprovalPendingDocument[]>(() => {
    const arr = Array.isArray((pendingResp as any)?.data) ? (pendingResp as any).data : (Array.isArray(pendingResp) ? (pendingResp as any) : []);
    // Ordenar por uploadedAt desc para asegurar consistencia
    return [...arr].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [pendingResp]);
  const total = (pendingResp as any)?.pagination?.total ?? list.length;

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(getBackRoute())}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">Aprobación de Documentos</h1>
          <p className="text-muted-foreground">Revisá y aprobá o rechazá documentos clasificados por la IA.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Pendientes" value={kpis?.pending ?? 0} />
          <KpiCard label="Aprobados hoy" value={kpis?.approvedToday ?? 0} />
          <KpiCard label="Rechazados hoy" value={kpis?.rejectedToday ?? 0} />
          <KpiCard label="T. medio revisión (m)" value={kpis?.avgReviewMinutes ?? 0} />
        </div>
      </header>

      <section className="bg-card rounded-xl border p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              className="input input-bordered py-2 px-3 rounded-md bg-background border"
              value={entityType}
              onChange={(e) => handleEntityTypeChange(e.target.value as EntityType)}
            >
              <option value="">Todas las entidades</option>
              <option value="EMPRESA_TRANSPORTISTA">Empresa Transportista</option>
              <option value="CHOFER">Chofer</option>
              <option value="CAMION">Camión</option>
              <option value="ACOPLADO">Acoplado</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="border border-blue-300 text-blue-600 hover:bg-blue-50 font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
              onClick={() => refetch()} 
              disabled={isFetching}
            >
              Refrescar
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Entidad</th>
                <th className="py-2 pr-3">Identidad</th>
                <th className="py-2 pr-3">Tipo Doc</th>
                <th className="py-2 pr-3">Subido</th>
                <th className="py-2 pr-3">Vence</th>
                <th className="py-2 pr-3">Validación IA</th>
                <th className="py-2 pr-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const disparidades = (row as any).classification?.disparidades as any[] | null;
                const hasDisparidades = Array.isArray(disparidades) && disparidades.length > 0;
                
                return (
                  <tr key={row.id} className="border-b hover:bg-muted/30 align-top">
                    <td className="py-3 pr-3">{row.id}</td>
                    <td className="py-3 pr-3">{row.classification?.detectedEntityType ?? row.entityType}</td>
                    <td className="py-3 pr-3">{(row as any).entityNaturalId ?? row.classification?.detectedEntityId ?? row.entityId}</td>
                    <td className="py-3 pr-3">{row.classification?.detectedDocumentType ?? (row as any).template?.name ?? '-'}</td>
                    <td className="py-3 pr-3">{formatDateTime(row.uploadedAt)}</td>
                    <td className="py-3 pr-3">
                      {(() => {
                        const detected = (row as any)?.classification?.detectedExpiration as string | undefined;
                        const docExpires = (row as any)?.expiresAt as string | undefined;
                        const dateStr = detected || docExpires;
                        if (!dateStr) return <span className="text-muted-foreground">-</span>;
                        try {
                          const d = new Date(dateStr);
                          if (isNaN(d.getTime())) return <span className="text-muted-foreground">-</span>;
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                        } catch { return <span className="text-muted-foreground">-</span>; }
                      })()}
                    </td>
                    <td className="py-3 pr-3 max-w-md">
                      {hasDisparidades ? (
                        <div className="space-y-1">
                          {disparidades.map((d: any, idx: number) => (
                            <div
                              key={idx}
                              className={`text-xs p-2 rounded border ${
                                d.severidad === 'critica' 
                                  ? 'bg-red-50 border-red-200' 
                                  : d.severidad === 'advertencia'
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-blue-50 border-blue-200'
                              }`}
                            >
                              <div className={`font-semibold ${
                                d.severidad === 'critica' ? 'text-red-700' : d.severidad === 'advertencia' ? 'text-amber-700' : 'text-blue-700'
                              }`}>
                                {d.severidad?.toUpperCase()} - {d.campo}
                              </div>
                              <div className="text-gray-600 mt-0.5">{d.mensaje}</div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Sistema: <strong>{String(d.valorEnSistema ?? '-')}</strong> | Doc: <strong>{String(d.valorEnDocumento ?? '-')}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <IAValidationBadge iaValidation={(row as any).iaValidation} />
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <Link
                        className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white text-xs px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                        to={`/documentos/aprobacion/${row.id}`}
                      >
                        Revisar
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-muted-foreground" colSpan={8}>No hay documentos pendientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Pagination currentPage={page} totalItems={total} pageSize={limit} onPageChange={setPage} />
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

interface IAValidation {
  validationStatus: string | null;
  hasDisparities: boolean;
  disparitiesCount: number;
  disparitiesSeverity: 'critica' | 'advertencia' | 'info' | null;
}

function IAValidationBadge({ iaValidation }: { iaValidation: IAValidation | null }) {
  // Si no hay iaValidation o validationStatus es null, está pendiente
  if (!iaValidation || !iaValidation.validationStatus) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 text-gray-500 text-xs font-medium" title="Pendiente de validación IA">
        <MinusCircleIcon className="h-4 w-4" />
        Pendiente
      </span>
    );
  }

  // Si hubo error
  if (iaValidation.validationStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-medium border border-red-200" title="Error en validación IA">
        <XCircleIcon className="h-4 w-4" />
        Error
      </span>
    );
  }

  // Si fue validado y NO tiene disparidades = OK
  if (!iaValidation.hasDisparities) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 text-green-600 text-xs font-medium border border-green-200" title="Validado por IA - Sin incongruencias">
        <CheckCircleIcon className="h-4 w-4" />
        OK
      </span>
    );
  }

  // Tiene disparidades - no debería llegar aquí porque se muestran inline
  return null;
}


