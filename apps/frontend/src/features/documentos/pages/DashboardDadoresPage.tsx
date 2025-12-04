import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useGetApprovalKpisQuery, useUploadBatchDocsDadorMutation } from '../api/documentosApiSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { useRoleBasedNavigation } from '../../../hooks/useRoleBasedNavigation';

const baseUrl = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs`;

const StatusDot: React.FC<{ count: number; color: 'red' | 'yellow' | 'green' }> = ({ count, color }) => {
  const colorClass = color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className='flex items-center gap-2'>
      <span className={`inline-block w-3 h-3 rounded-full ${colorClass}`} />
      <span className='text-sm'>{count}</span>
    </div>
  );
};

type SemaforoStatusCounts = {
  verde: number[];
  amarillo: number[];
  rojo: number[];
};

type Semaforo = {
  empresaId: number;
  overallStatus: 'rojo' | 'amarillo' | 'verde';
  statusCounts?: SemaforoStatusCounts;
  red?: number;
  yellow?: number;
  green?: number;
};

const DashboardDadoresPage: React.FC = () => {
  const { goBack } = useRoleBasedNavigation();
  const authToken = useSelector((s: RootState) => s.auth?.token);
  const empresaId = useSelector((s: RootState) => s.auth?.user?.empresaId);
  const headers: HeadersInit = useMemo(() => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
  }), [authToken, empresaId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ semaforos: Semaforo[]; userRole: string | null; userEmpresaId: number | null }>({ semaforos: [], userRole: null, userEmpresaId: null });
  const { data: approvalKpis } = useGetApprovalKpisQuery();
  const [uploadBatchDador] = useUploadBatchDocsDadorMutation();
  const [skipDedupe, setSkipDedupe] = useState<boolean>(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/dashboard/semaforos`, { headers, credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Error de servidor');
        if (!cancelled) setData({ semaforos: (json.semaforos || []) as Semaforo[], userRole: json.userRole ?? null, userEmpresaId: json.userEmpresaId ?? null });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Error cargando dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [authToken, empresaId, headers]);

  const totals = useMemo(() => {
    const sumArray = (arr: number[] | undefined) => (arr ? arr.reduce((a, v) => a + v, 0) : 0);
    const red = data.semaforos.reduce((acc: number, s: Semaforo) => acc + (s.statusCounts ? sumArray(s.statusCounts.rojo) : (s.red ?? 0)), 0);
    const yellow = data.semaforos.reduce((acc: number, s: Semaforo) => acc + (s.statusCounts ? sumArray(s.statusCounts.amarillo) : (s.yellow ?? 0)), 0);
    const green = data.semaforos.reduce((acc: number, s: Semaforo) => acc + (s.statusCounts ? sumArray(s.statusCounts.verde) : (s.green ?? 0)), 0);
    return { red, yellow, green };
  }, [data.semaforos]);

  const headerBadge = (label: string, value: number, color: 'red'|'yellow'|'green') => (
    <div className={`rounded-xl border px-4 py-3 shadow-sm text-sm flex items-center gap-2 ${
      color==='red'
        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'
        : color==='yellow'
          ? 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/40 dark:bg-yellow-950/30 dark:text-yellow-300'
          : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300'
    }`}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color==='red'?'bg-red-500':color==='yellow'?'bg-yellow-500':'bg-green-500'}`} />
      <div className='flex flex-col leading-none'>
        <span className='text-[11px] opacity-70'>{label}</span>
        <span className='text-lg font-semibold'>{value}</span>
      </div>
    </div>
  );

  const prettyCard = (s: Semaforo) => {
    const verde = s?.statusCounts?.verde || [0,0,0,0];
    const amarillo = s?.statusCounts?.amarillo || [0,0,0,0];
    const rojo = s?.statusCounts?.rojo || [0,0,0,0];
    const cats = ['Empresa', 'Choferes', 'Camiones', 'Acoplados'];

    const totals = {
      red: rojo.reduce((a, v) => a + v, 0),
      yellow: amarillo.reduce((a, v) => a + v, 0),
      green: verde.reduce((a, v) => a + v, 0),
    };
    const totalAll = totals.red + totals.yellow + totals.green || 1;

    return (
      <Card key={s.empresaId} className='p-5 hover:shadow-lg transition-all border border-gray-200 dark:border-slate-700 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800/60 rounded-2xl'>
        <div className='flex items-center justify-between mb-4'>
          <div className='font-semibold text-lg'>Dador #{s.empresaId}</div>
          <div className={`text-xs px-3 py-1 rounded-full tracking-wide ${
            s.overallStatus==='rojo'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              : s.overallStatus==='amarillo'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
          }`}>{s.overallStatus.toUpperCase()}</div>
        </div>
        <div className='h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4'>
          <div className='h-full bg-red-400 inline-block' style={{ width: `${(totals.red/totalAll)*100}%` }} />
          <div className='h-full bg-yellow-400 inline-block' style={{ width: `${(totals.yellow/totalAll)*100}%` }} />
          <div className='h-full bg-green-500 inline-block' style={{ width: `${(totals.green/totalAll)*100}%` }} />
        </div>
        <div className='space-y-3 text-sm'>
          {cats.map((label, i) => (
            <div key={i} className='rounded-xl border bg-card dark:border-slate-700 px-3 py-2 flex justify-between items-center'>
              <div className='font-medium'>{label}</div>
              <div className='flex items-center gap-3 text-xs'>
                <button
                  className='flex items-center gap-1 hover:opacity-80'
                  title='Ver vencidos'
                  onClick={() => navigate(`/dadores/${s.empresaId}/documentos?status=VENCIDO`)}
                >
                  <span className='inline-block w-2 h-2 rounded-full bg-red-500' />{rojo[i] || 0}
                </button>
                <button
                  className='flex items-center gap-1 hover:opacity-80'
                  title='Ver por vencer'
                  onClick={() => navigate(`/dadores/${s.empresaId}/documentos?due=soon`)}
                >
                  <span className='inline-block w-2 h-2 rounded-full bg-yellow-500' />{amarillo[i] || 0}
                </button>
                <button
                  className='flex items-center gap-1 hover:opacity-80'
                  title='Ver vigentes'
                  onClick={() => navigate(`/dadores/${s.empresaId}/documentos?status=APROBADO`)}
                >
                  <span className='inline-block w-2 h-2 rounded-full bg-green-500' />{verde[i] || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className='mt-5 flex justify-end'>
          <Button size='sm' variant='outline' onClick={()=> navigate(`/dadores/${s.empresaId}/documentos`)}>Ver Documentos</Button>
        </div>
      </Card>
    );
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={goBack} className='flex items-center'><span className='mr-2'>←</span>Volver</Button>
          <h1 className='text-2xl font-bold'>Dashboard de Dadores</h1>
        </div>
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='outline' onClick={()=> window.location.reload()}>Actualizar</Button>
          <Button size='sm' variant='default' onClick={()=> navigate('/documentos/aprobacion')}>Ir a aprobación</Button>
        </div>
      </div>

      <Card className='p-6 mb-6 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-slate-900 dark:to-slate-800/60'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <div className='flex items-center gap-4'>
            {headerBadge('Vencidos', totals.red, 'red')}
            {headerBadge('Por vencer', totals.yellow, 'yellow')}
            {headerBadge('Vigentes', totals.green, 'green')}
          </div>
          <div className='flex items-center gap-3'>
            <div className='rounded-xl border bg-card px-4 py-3 shadow-sm text-sm' title='Documentos en estado PENDIENTE_APROBACION'>
              <div className='text-[11px] text-muted-foreground'>Pendientes aprobación</div>
              <div className='text-xl font-semibold'>{Number((approvalKpis as any)?.pending ?? 0)}</div>
            </div>
            <div className='rounded-xl border bg-card px-4 py-3 shadow-sm text-sm'>
              <div className='text-[11px] text-muted-foreground'>Aprobados hoy</div>
              <div className='text-xl font-semibold'>{Number((approvalKpis as any)?.approvedToday ?? 0)}</div>
            </div>
            <div className='rounded-xl border bg-card px-4 py-3 shadow-sm text-sm'>
              <div className='text-[11px] text-muted-foreground'>Rechazados hoy</div>
              <div className='text-xl font-semibold'>{Number((approvalKpis as any)?.rejectedToday ?? 0)}</div>
            </div>
            <div className='rounded-xl border bg-card px-4 py-3 shadow-sm text-sm'>
              <div className='text-[11px] text-muted-foreground'>T. medio (min)</div>
              <div className='text-xl font-semibold'>{Number((approvalKpis as any)?.avgReviewMinutes ?? 0)}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Carga masiva - sólo aquí */}
      <Card className='p-6 mb-6 bg-card'>
        <h2 className='text-lg font-semibold mb-3'>Carga masiva de documentos</h2>
        <div className='grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end'>
          <div className='flex items-center gap-3'>
            <input ref={fileInputRef} id='batchFiles' type='file' multiple className='hidden' onChange={(e)=> setFiles(e.target.files)} />
            <Button size='sm' variant='outline' onClick={()=> fileInputRef.current?.click()}>Seleccionar archivos</Button>
            <span className='text-sm text-muted-foreground'>{files && files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : 'No hay archivos seleccionados'}</span>
            <label className='flex items-center gap-2 text-sm'>
              <input type='checkbox' checked={skipDedupe} onChange={(e)=> setSkipDedupe(e.target.checked)} />
              Evitar deduplicación
            </label>
          </div>
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={()=> { setFiles(null); if (fileInputRef.current) fileInputRef.current.value=''; }}>Limpiar</Button>
            <Button size='sm' onClick={async ()=>{
              try {
                const dador = data.userEmpresaId || empresaId;
                if (!dador) return;
                if (!files || files.length === 0) return;
                const { jobId } = await uploadBatchDador({ dadorId: Number(dador), files, skipDedupe }).unwrap();
                alert(`Lote enviado. Job: ${jobId}`);
              } catch (e) {
                alert('No se pudo enviar el lote');
              }
            }}>Enviar lote</Button>
          </div>
        </div>
        <p className='text-xs text-muted-foreground mt-2'>Sólo aquí se muestra “Evitar deduplicación”. Si no marcas la casilla, archivos idénticos por contenido (checksum) se omiten.</p>
      </Card>

      {loading && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {[...Array(3)].map((_, i) => (
            <Card key={i} className='p-5 bg-card'>
              <div className='animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4' />
              <div className='h-2 bg-gray-200 dark:bg-slate-700 rounded-full mb-4' />
              <div className='grid grid-cols-2 gap-3'>
                {[...Array(4)].map((__, j) => (<div key={j} className='h-10 bg-gray-100 dark:bg-slate-800 rounded' />))}
              </div>
            </Card>
          ))}
        </div>
      )}
      {error && <div className='text-red-600 text-sm'>{error}</div>}

      {!loading && !error && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {data.semaforos.map((s: Semaforo) => prettyCard(s))}
        </div>
      )}
    </div>
  );
};

export default DashboardDadoresPage;


