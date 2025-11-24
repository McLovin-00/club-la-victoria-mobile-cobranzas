import { useMemo, useState } from 'react';
import { Pagination } from '../../../components/ui/Pagination';
import { Link, useNavigate } from 'react-router-dom';
import { useGetApprovalPendingQuery, useGetApprovalKpisQuery } from '../api/documentosApiSlice';
import { formatDateTime } from '../../../utils/formatters';
import type { ApprovalPendingDocument } from '../types/entities';
import { useAppSelector } from '../../../store/hooks';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

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

  const { data: kpis } = useGetApprovalKpisQuery();
  const { data: pendingResp, isFetching, refetch } = useGetApprovalPendingQuery(
    { page, limit, entityType: entityType || undefined },
    { refetchOnMountOrArgChange: true }
  );

  const list = useMemo<ApprovalPendingDocument[]>(() => {
    const arr = Array.isArray((pendingResp as any)?.data) ? (pendingResp as any).data : (Array.isArray(pendingResp) ? (pendingResp as any) : []);
    // Ordenar por uploadedAt desc para asegurar consistencia
    return [...arr].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [pendingResp]);
  const total = (pendingResp as any)?.pagination?.total ?? list.length;

  // Estado local de vencimientos seleccionados por fila (previo a aprobación)
  const [selectedExpires, setSelectedExpires] = useState<Record<number, string>>({});
  const setExpireFor = (id: number, value: string) => setSelectedExpires((m) => ({ ...m, [id]: value }));

  // Helpers para convertir fechas
  const toYmd = (dmy: string): string => {
    const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return '';
    const [_, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  };
  const toDmy = (ymd: string): string => {
    if (!ymd) return '';
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const [_, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  };

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
              onChange={(e) => setEntityType(e.target.value as EntityType)}
            >
              <option value="">Todas las entidades</option>
              <option value="EMPRESA_TRANSPORTISTA">Empresa Transportista</option>
              <option value="CHOFER">Chofer</option>
              <option value="CAMION">Camión</option>
              <option value="ACOPLADO">Semirremolque</option>
            </select>
            <button 
              className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-medium px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              onClick={() => refetch()}
            >
              Filtrar
            </button>
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
                <th className="py-2 pr-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-3">{row.id}</td>
                  <td className="py-2 pr-3">{row.classification?.detectedEntityType ?? row.entityType}</td>
                  <td className="py-2 pr-3">{row.classification?.detectedEntityId ?? row.entityId}</td>
                  <td className="py-2 pr-3">{row.classification?.detectedDocumentType ?? '-'}</td>
                  <td className="py-2 pr-3">{formatDateTime(row.uploadedAt)}</td>
                  <td className="py-2 pr-3">
                    {(() => {
                      const detected = (row as any)?.classification?.detectedExpiration as string | undefined;
                      const detectedYmd = (() => {
                        if (!detected) return '';
                        try { const d = new Date(detected); if (isNaN(d.getTime())) return ''; const yyyy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${yyyy}-${mm}-${dd}`; } catch { return ''; }
                      })();
                      const valueYmd = (selectedExpires as any)[row.id] ?? detectedYmd;
                      const valueDmy = toDmy(valueYmd);
                      return (
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="dd/mm/aaaa"
                          className="input input-bordered py-1 px-2 rounded-md bg-background border"
                          value={valueDmy}
                          onChange={(e) => {
                            const y = toYmd(e.target.value);
                            setExpireFor(row.id, y);
                          }}
                        />
                      );
                    })()}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Link
                      className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white text-xs px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                      to={`/documentos/aprobacion/${row.id}${selectedExpires[row.id] ? `?expiresAt=${selectedExpires[row.id]}` : ''}`}
                    >
                      Revisar
                    </Link>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-muted-foreground" colSpan={7}>No hay documentos pendientes.</td>
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


