import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetAuditLogsQuery } from '../../documentos/api/documentosApiSlice';
import { useAppSelector } from '../../../store/hooks';
import { showToast } from '../../../components/ui/Toast.utils';

const toInt = (s: string | null, def: number): number => {
  const n = s ? parseInt(s, 10) : NaN;
  return Number.isNaN(n) ? def : n;
};

const TextInput: React.FC<{ label: string; name: string; value?: string; onChange: (v: string) => void; placeholder?: string; type?: string }> = ({ label, name, value, onChange, placeholder, type }) => (
  <div className='flex flex-col gap-1'>
    <label htmlFor={name} className='text-sm text-muted-foreground'>{label}</label>
    <input id={name} name={name} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className='border rounded px-2 py-1 text-sm' type={type || 'text'} />
  </div>
);

const NumberInput: React.FC<{ label: string; name: string; value?: number | undefined; onChange: (v: string) => void; placeholder?: string }> = ({ label, name, value, onChange, placeholder }) => (
  <div className='flex flex-col gap-1'>
    <label htmlFor={name} className='text-sm text-muted-foreground'>{label}</label>
    <input id={name} name={name} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className='border rounded px-2 py-1 text-sm' inputMode='numeric' />
  </div>
);

const SelectInput: React.FC<{ label: string; name: string; value?: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }> = ({ label, name, value, onChange, options }) => (
  <div className='flex flex-col gap-1'>
    <label htmlFor={name} className='text-sm text-muted-foreground'>{label}</label>
    <select id={name} name={name} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className='border rounded px-2 py-1 text-sm'>
      <option value=''>Todos</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Pager: React.FC<{ page: number; totalPages: number; onPage: (p: number) => void }> = ({ page, totalPages, onPage }) => (
  <div className='flex items-center gap-2'>
    <button className='border rounded px-2 py-1 text-sm disabled:opacity-50' disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
    <span className='text-sm'>Página {page} / {Math.max(1, totalPages)}</span>
    <button className='border rounded px-2 py-1 text-sm disabled:opacity-50' disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Siguiente</button>
  </div>
);

const AuditLogsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const token = useAppSelector((s) => (s as any).auth?.token) as string | undefined;
  const empresaId = useAppSelector((s) => (s as any).auth?.user?.empresaId) as number | undefined;
  const [downloading, setDownloading] = React.useState<null | 'csv' | 'xlsx'>(null);
  const page = toInt(params.get('page'), 1);
  const limit = toInt(params.get('limit'), 20);
  const query = {
    page,
    limit,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    userId: params.get('userId') ? Number(params.get('userId')) : undefined,
    userRole: params.get('userRole') || undefined,
    method: params.get('method') || undefined,
    statusCode: params.get('statusCode') ? Number(params.get('statusCode')) : undefined,
    action: params.get('action') || undefined,
    entityType: params.get('entityType') || undefined,
    entityId: params.get('entityId') ? Number(params.get('entityId')) : undefined,
    pathContains: params.get('pathContains') || undefined,
  };
  const { data, isLoading } = useGetAuditLogsQuery(query);
  const [visibleCols, setVisibleCols] = React.useState<Record<string, boolean>>({
    fecha: true, accion: true, metodo: true, status: true, usuario: true, rol: true, entidad: true, ruta: true,
  });
  const toggleCol = (k: string) => setVisibleCols((c) => ({ ...c, [k]: !c[k] }));

  const set = (k: string, v: string | number | undefined) => {
    const next = new URLSearchParams(params);
    if (v === undefined || v === '') next.delete(k);
    else next.set(k, String(v));
    if (k !== 'page') next.set('page', '1');
    setParams(next, { replace: true });
  };

  const download = async (fmt: 'csv' | 'xlsx') => {
    setDownloading(fmt);
    const base = import.meta.env.VITE_DOCUMENTOS_API_URL;
    const qs = new URLSearchParams(params as any).toString();
    const url = `${base}/api/docs/audit/logs.${fmt}?${qs}`;
    const headers: Record<string, string> = {};
    if (token) headers['authorization'] = `Bearer ${token}`;
    if (empresaId) headers['x-tenant-id'] = String(empresaId);
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = fmt === 'csv' ? 'audit_logs.csv' : 'audit_logs.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      showToast(fmt === 'csv' ? 'CSV descargado' : 'Excel descargado', 'success');
    } catch {
      showToast('No se pudo descargar el archivo de auditoría', 'error');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className='container mx-auto px-4 py-6'>
      <h1 className='text-2xl font-semibold mb-4'>Auditoría</h1>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-3 mb-4'>
        <TextInput label='Desde' name='from' value={params.get('from') ?? ''} onChange={(v) => set('from', v)} type='datetime-local' />
        <TextInput label='Hasta' name='to' value={params.get('to') ?? ''} onChange={(v) => set('to', v)} type='datetime-local' />
        <NumberInput label='User ID' name='userId' value={params.get('userId') ? Number(params.get('userId')) : undefined} onChange={(v) => set('userId', v)} />
        <TextInput label='Rol' name='userRole' value={params.get('userRole') ?? ''} onChange={(v) => set('userRole', v)} placeholder='ADMIN' />
        <SelectInput label='Método' name='method' value={params.get('method') ?? ''} onChange={(v) => set('method', v)} options={[
          { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }, { value: 'DELETE', label: 'DELETE' },
        ]} />
        <NumberInput label='Status' name='statusCode' value={params.get('statusCode') ? Number(params.get('statusCode')) : undefined} onChange={(v) => set('statusCode', v)} />
        <TextInput label='Acción' name='action' value={params.get('action') ?? ''} onChange={(v) => set('action', v)} placeholder='APPROVAL_APPROVE' />
        <TextInput label='Entidad' name='entityType' value={params.get('entityType') ?? ''} onChange={(v) => set('entityType', v)} placeholder='DOCUMENT' />
        <NumberInput label='Entidad ID' name='entityId' value={params.get('entityId') ? Number(params.get('entityId')) : undefined} onChange={(v) => set('entityId', v)} />
        <TextInput label='Ruta contiene' name='pathContains' value={params.get('pathContains') ?? ''} onChange={(v) => set('pathContains', v)} placeholder='/api/docs' />
      </div>
      <div className='flex items-center justify-between mb-3'>
        <Pager page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPage={(p) => set('page', p)} />
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>Límite</span>
          <select className='border rounded px-2 py-1 text-sm' value={String(limit)} onChange={(e) => set('limit', e.target.value)}>
            {['10','20','50','100'].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className='border rounded px-2 py-1 text-sm disabled:opacity-60' disabled={downloading !== null} onClick={() => download('csv')}>
            {downloading === 'csv' ? 'Descargando…' : 'Descargar CSV'}
          </button>
          <button className='border rounded px-2 py-1 text-sm disabled:opacity-60' disabled={downloading !== null} onClick={() => download('xlsx')}>
            {downloading === 'xlsx' ? 'Descargando…' : 'Descargar Excel'}
          </button>
        </div>
      </div>
      <div className='flex items-center gap-2 mb-3'>
        <span className='text-sm text-muted-foreground'>Rápidos:</span>
        <button className='border rounded px-2 py-1 text-xs' onClick={() => { const d = new Date(); d.setHours(0,0,0,0); set('from', d.toISOString().slice(0,16)); set('to', undefined); }}>Hoy</button>
        <button className='border rounded px-2 py-1 text-xs' onClick={() => { const d = new Date(Date.now()-7*864e5); set('from', d.toISOString().slice(0,16)); set('to', undefined); }}>Últimos 7 días</button>
        <span className='ml-3 text-sm text-muted-foreground'>Columnas:</span>
        {[
          ['fecha','Fecha'], ['accion','Acción'], ['metodo','Método'], ['status','Status'], ['usuario','Usuario'], ['rol','Rol'], ['entidad','Entidad'], ['ruta','Ruta'],
        ].map(([k,label]) => (
          <label key={k} className='text-xs flex items-center gap-1'>
            <input type='checkbox' checked={!!visibleCols[k]} onChange={() => toggleCol(k)} /> {label}
          </label>
        ))}
      </div>

      <div className='border rounded overflow-auto'>
        <table className='min-w-full text-sm'>
          <thead className='bg-muted'>
            <tr>
              {visibleCols.fecha && <th className='text-left px-2 py-2'>Fecha</th>}
              {visibleCols.accion && <th className='text-left px-2 py-2'>Acción</th>}
              {visibleCols.metodo && <th className='text-left px-2 py-2'>Método</th>}
              {visibleCols.status && <th className='text-left px-2 py-2'>Status</th>}
              {visibleCols.usuario && <th className='text-left px-2 py-2'>Usuario</th>}
              {visibleCols.rol && <th className='text-left px-2 py-2'>Rol</th>}
              {visibleCols.entidad && <th className='text-left px-2 py-2'>Entidad</th>}
              {visibleCols.ruta && <th className='text-left px-2 py-2'>Ruta</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className='px-2 py-4 text-center text-muted-foreground'>Cargando...</td></tr>
            ) : (data?.data ?? []).length === 0 ? (
              <tr><td colSpan={8} className='px-2 py-4 text-center text-muted-foreground'>Sin resultados</td></tr>
            ) : (
              (data?.data ?? []).map((row: any) => (
                <tr key={row.id} className='border-t'>
                  {visibleCols.fecha && <td className='px-2 py-2'>{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</td>}
                  {visibleCols.accion && <td className='px-2 py-2'>{row.accion}</td>}
                  {visibleCols.metodo && <td className='px-2 py-2'>{row.method}</td>}
                  {visibleCols.status && <td className='px-2 py-2'>{row.statusCode}</td>}
                  {visibleCols.usuario && <td className='px-2 py-2'>{row.userId ?? ''}</td>}
                  {visibleCols.rol && <td className='px-2 py-2'>{row.userRole ?? ''}</td>}
                  {visibleCols.entidad && <td className='px-2 py-2'>
                    {row.entityType}{row.entityId ? `#${row.entityId}` : ''}
                    {String(row.entityType || '').toUpperCase() === 'EQUIPO' && row.entityId ? (
                      <a href={`/documentos/equipos/${row.entityId}/estado`} className='ml-2 underline text-blue-600'>ver</a>
                    ) : null}
                  </td>}
                  {visibleCols.ruta && <td className='px-2 py-2'>{row.path}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogsPage;


