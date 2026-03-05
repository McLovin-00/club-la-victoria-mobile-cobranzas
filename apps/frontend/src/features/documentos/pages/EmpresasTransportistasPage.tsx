import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store/store';
import { Pagination } from '../../../components/ui/Pagination';
import { Link } from 'react-router-dom';
import {
  useCreateEmpresaTransportistaMutation,
  useDeleteEmpresaTransportistaMutation,
  useGetDadoresQuery,
  useGetEmpresasTransportistasQuery,
  useGetDefaultsQuery,
  useUpdateEmpresaTransportistaMutation,
} from '@/features/documentos/api/documentosApiSlice';
import type { DadorCarga, EmpresaTransportista } from '../types/entities';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';

const ROLES_CAN_EDIT = ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'ADMIN_INTERNO', 'OPERADOR_INTERNO'];

export default function EmpresasTransportistasPage() {
  const { goBack } = useRoleBasedNavigation();
  const user = useSelector((state: RootState) => state.auth.user);
  const canEdit = Boolean(user?.role && ROLES_CAN_EDIT.includes(user.role));
  const show = (msg: string, _variant?: string) => { try { alert(msg); } catch { console.log(msg); } };
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data: dadoresResp } = useGetDadoresQuery({});
  const { data: defaults } = useGetDefaultsQuery();
  const dadores = useMemo<DadorCarga[]>(() => (dadoresResp?.list ?? []) as DadorCarga[], [dadoresResp]);
  const [dadorCargaId, setDadorCargaId] = useState<number | ''>('');
  // Resolver siempre un dador numérico válido para queries
  const effectiveDadorId: number = useMemo(() => {
    if (typeof dadorCargaId === 'number') return dadorCargaId;
    return (
      dadoresResp?.defaults?.defaultDadorId ??
      defaults?.defaultDadorId ??
      (dadores.length > 0 ? dadores[0].id : 1)
    ) as number;
  }, [dadorCargaId, dadoresResp, defaults, dadores]);

  const { data: empresasResp, refetch, isFetching } = useGetEmpresasTransportistasQuery({ dadorCargaId: effectiveDadorId, q, page, limit });
  const list = empresasResp?.data ?? [];
  const totalItems = empresasResp?.pagination?.total ?? 0;
  const [createEmpresa, { isLoading: creating }] = useCreateEmpresaTransportistaMutation();
  const [updateEmpresa, { isLoading: updating }] = useUpdateEmpresaTransportistaMutation();
  const [deleteEmpresa, { isLoading: deleting }] = useDeleteEmpresaTransportistaMutation();

  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Partial<EmpresaTransportista> | null>(null);

  const onSave = async () => {
    if (!editing) return;
    const payload = {
      dadorCargaId: Number(editing.dadorCargaId),
      razonSocial: String(editing.razonSocial ?? ''),
      cuit: String(editing.cuit ?? ''),
      activo: Boolean(editing.activo ?? true),
      notas: editing.notas ?? '',
    };
    if (!payload.razonSocial || !payload.cuit || !payload.dadorCargaId) { show('Completá Razón Social, CUIT y Dador', 'error'); return; }
    if (editing.id) {
      await updateEmpresa({ id: editing.id, ...payload });
      show('Empresa actualizada', 'success');
    } else {
      await createEmpresa(payload);
      show('Empresa creada', 'success');
    }
    setShowModal(false);
    setEditing(null);
    refetch();
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={goBack}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg transition-all duration-200"
          >
            ← Volver
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Empresas Transportistas</h1>
            <p className="text-muted-foreground">Gestión de empresas, choferes y equipos asociados.</p>
          </div>
        </div>
        {canEdit && (
        <div className="flex items-center gap-2">
          <button 
            className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-medium px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            onClick={() => { setEditing({ dadorCargaId: (typeof dadorCargaId === 'number' ? dadorCargaId : effectiveDadorId) ?? '', razonSocial: '', cuit: '', activo: true, notas: '' }); setShowModal(true); }}
          >
            Nueva Empresa
          </button>
        </div>
        )}
      </header>

      <section className="bg-card rounded-xl border p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <input className="input input-bordered py-2 px-3 rounded-md bg-background border" placeholder="Buscar por razón social o CUIT" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input input-bordered py-2 px-3 rounded-md bg-background border" value={dadorCargaId} onChange={(e) => setDadorCargaId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todos los dadores</option>
              {dadores.map((d) => <option key={d.id} value={d.id}>{d.razonSocial}</option>)}
            </select>
            <button 
              className="border border-blue-300 text-blue-600 hover:bg-blue-50 font-medium px-4 py-2 rounded-lg transition-all duration-200"
              onClick={() => refetch()} 
              disabled={isFetching}
            >
              Buscar
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Razón Social</th>
                <th className="py-2 pr-3">CUIT</th>
                <th className="py-2 pr-3">Activo</th>
                <th className="py-2 pr-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row: EmpresaTransportista) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-3">{row.id}</td>
                  <td className="py-2 pr-3">{row.razonSocial}</td>
                  <td className="py-2 pr-3">{row.cuit}</td>
                  <td className="py-2 pr-3">{row.activo ? 'Sí' : 'No'}</td>
                  <td className="py-2 pr-3 text-right">
                    <div className="inline-flex gap-2">
                      <Link 
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-md transition-colors duration-200"
                        to={`/documentos/empresas-transportistas/${row.id}`}
                      >
                        Detalle
                      </Link>
                      {canEdit && (
                      <button 
                        className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-md transition-colors duration-200"
                        onClick={() => { setEditing(row); setShowModal(true); }}
                      >
                        Editar
                      </button>
                      )}
                      {canEdit && (
                      <button 
                        className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-md transition-colors duration-200 disabled:opacity-50"
                        onClick={() => setConfirmDeleteId(row.id)} 
                        disabled={deleting}
                      >
                        Eliminar
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-muted-foreground" colSpan={5}>Sin resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Pagination currentPage={page} totalItems={totalItems} pageSize={limit} onPageChange={setPage} />
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="w-full max-w-lg rounded-xl border bg-card p-4 shadow-lg">
            <div className="text-lg font-semibold mb-2">{editing?.id ? 'Editar Empresa' : 'Nueva Empresa'}</div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Dador de Carga</label>
                <select className="input input-bordered py-2 px-3 rounded-md bg-background border w-full" value={editing?.dadorCargaId ?? ''} onChange={(e) => setEditing((s) => ({ ...(s as EmpresaTransportista), dadorCargaId: Number(e.target.value) }))}>
                  <option value="">Seleccionar…</option>
                  {dadores.map((d) => <option key={d.id} value={d.id}>{d.razonSocial}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Razón Social</label>
                <input className="input input-bordered py-2 px-3 rounded-md bg-background border w-full" value={editing?.razonSocial ?? ''} onChange={(e) => setEditing((s) => ({ ...(s as EmpresaTransportista), razonSocial: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CUIT</label>
                <input className="input input-bordered py-2 px-3 rounded-md bg-background border w-full" value={editing?.cuit ?? ''} onChange={(e) => setEditing((s) => ({ ...(s as EmpresaTransportista), cuit: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Activo</label>
                <select className="input input-bordered py-2 px-3 rounded-md bg-background border w-full" value={editing?.activo ? '1' : '0'} onChange={(e) => setEditing((s) => ({ ...(s as EmpresaTransportista), activo: e.target.value === '1' }))}>
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Notas</label>
                <textarea className="input input-bordered py-2 px-3 rounded-md bg-background border w-full min-h-[80px]" value={editing?.notas ?? ''} onChange={(e) => setEditing((s) => ({ ...(s as EmpresaTransportista), notas: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button 
                className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-6 py-2 rounded-lg transition-all duration-200"
                onClick={() => { setShowModal(false); setEditing(null); }}
              >
                Cancelar
              </button>
              <button 
                className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-medium px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                onClick={onSave} 
                disabled={creating || updating}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-lg">
            <div className="text-lg font-semibold mb-2">Confirmar eliminación</div>
            <p className="text-sm text-muted-foreground">¿Seguro que querés eliminar la empresa #{confirmDeleteId}? Esta acción no se puede deshacer.</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button 
                className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium px-6 py-2 rounded-lg transition-all duration-200"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancelar
              </button>
              <button 
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                disabled={deleting}
                onClick={async () => { await deleteEmpresa(confirmDeleteId); setConfirmDeleteId(null); refetch(); show('Empresa eliminada', 'success'); }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


