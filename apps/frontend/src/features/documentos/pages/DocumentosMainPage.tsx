import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useGetDadoresQuery, useGetDashboardDataQuery, useGetPendingSummaryQuery } from '../api/documentosApiSlice';
import {
  DocumentTextIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export const DocumentosMainPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: dadoresResp, isLoading: dadoresLoading } = useGetDadoresQuery({});
  const dadores = dadoresResp?.list ?? (Array.isArray(dadoresResp) ? dadoresResp : []);
  const { data: dashboardData, isLoading: dashboardLoading } = useGetDashboardDataQuery();
  const { data: pendingSummaryData } = useGetPendingSummaryQuery();

  // Procesamiento (jobs) - se lee del endpoint público /health/detailed del microservicio documentos
  const [jobs, setJobs] = React.useState<{ total: number; completed: number; failed: number }>({ total: 0, completed: 0, failed: 0 });
  React.useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const base = import.meta.env.VITE_DOCUMENTOS_API_URL?.replace(/\/$/, '') || '';
        const res = await fetch(`${base}/health/detailed`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const completed = Number((data?.queue?.completed ?? 0) as any) || 0;
        const failed = Number((data?.queue?.failed ?? 0) as any) || 0;
        setJobs({ completed, failed, total: completed + failed });
      } catch { /* noop */ }
    };
    load();
    const id = setInterval(load, 15000);
    return () => { controller.abort(); clearInterval(id); };
  }, []);

  // Siempre devolver un arreglo, incluso si la API aún no respondió
  const semaforos = dashboardData?.semaforos ?? [];


  const handleDadorClick = (dadorId: number) => {
    navigate(`/dadores/${dadorId}/documentos`);
  };

  const getDadorStats = (dadorId: number) => {
    if (!dashboardData) return { red: 0, yellow: 0, green: 0 };
    const dadorSemaforos = semaforos.filter((item: any) => item.empresaId === dadorId);

    return dadorSemaforos.reduce(
      (acc: { red: number; yellow: number; green: number }, item: any) => {
        const rojo = Array.isArray(item?.statusCounts?.rojo) ? item.statusCounts.rojo : [0, 0, 0, 0];
        const amarillo = Array.isArray(item?.statusCounts?.amarillo) ? item.statusCounts.amarillo : [0, 0, 0, 0];
        const verde = Array.isArray(item?.statusCounts?.verde) ? item.statusCounts.verde : [0, 0, 0, 0];
        return {
          red: acc.red + rojo.reduce((s: number, v: number) => s + Number(v || 0), 0),
          yellow: acc.yellow + amarillo.reduce((s: number, v: number) => s + Number(v || 0), 0),
          green: acc.green + verde.reduce((s: number, v: number) => s + Number(v || 0), 0),
        };
      },
      { red: 0, yellow: 0, green: 0 }
    );
  };

  const getStatusColor = (stats: { red: number; yellow: number; green: number }) => {
    if (stats.red > 0) return 'border-red-500 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30';
    if (stats.yellow > 0) return 'border-yellow-500 bg-yellow-50 dark:border-yellow-900/60 dark:bg-yellow-950/30';
    if (stats.green > 0) return 'border-green-500 bg-green-50 dark:border-green-900/60 dark:bg-green-950/30';
    return 'border-gray-300 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60';
  };

  if (dadoresLoading || dashboardLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Header */}
      <div className='mb-8'>
        {/* Título arriba */}
        <div className='flex items-center space-x-4'>
          <DocumentTextIcon className='h-8 w-8 text-blue-600' />
          <div>
            <h1 className='text-3xl font-bold text-foreground'>
              Gestión de Documentos
            </h1>
            <p className='text-muted-foreground mt-2'>
              Administra la documentación por dador de carga
            </p>
          </div>
        </div>
        {/* Pestañas un renglón más abajo */}
        <div className='mt-4 flex items-center gap-2 flex-wrap'>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/clientes')}>
            Clientes
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/empresas-transportistas')}>
            Empresas Transportistas
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/choferes')}>
            Choferes
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/camiones')}>
            Camiones
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/acoplados')}>
            Acoplados
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/equipos')}>
            Equipos
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/dadores')}>
            Dadores
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/consulta')}>
            Consulta
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/auditoria')}>
            Auditoría
          </Button>
          <Button size='sm' onClick={() => navigate('/documentos/carga')}>
            Subir documentos
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/plantillas')} className='flex items-center'>
            <DocumentTextIcon className='h-4 w-4 mr-2' />
            Plantillas
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/configuracion/flowise')} className='flex items-center'>
            <DocumentTextIcon className='h-4 w-4 mr-2' />
            Flowise
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/configuracion/evolution')} className='flex items-center'>
            <DocumentTextIcon className='h-4 w-4 mr-2' />
            Evolution API
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/configuracion/notificaciones')} className='flex items-center'>
            <DocumentTextIcon className='h-4 w-4 mr-2' />
            Notificaciones
          </Button>
          <Button size='sm' variant='outline' onClick={() => navigate('/documentos/dashboard')} className='flex items-center'>
            <DocumentTextIcon className='h-4 w-4 mr-2' />
            Dashboard
          </Button>
          <Button size='sm' className='bg-blue-600 hover:bg-blue-700 text-white' onClick={() => navigate('/documentos/aprobacion')}>
            Aprobación Manual
          </Button>
        </div>
      </div>

      {/* Indicador de pendientes de aprobación */}
      <div className='mb-8'>
        <Card className='p-6 bg-card'>
          <div className='flex items-baseline justify-between'>
            <h2 className='text-xl font-semibold'>Pendientes de aprobación</h2>
            <span className='text-3xl font-bold'>{pendingSummaryData?.total ?? 0}</span>
          </div>
          <div className='mt-3 grid grid-cols-1 md:grid-cols-2 gap-2'>
            {(pendingSummaryData?.top || []).map((t) => (
              <div key={t.templateId} className='flex items-center justify-between text-sm'>
                <span className='truncate mr-2'>{t.templateName}</span>
                <span className='px-2 py-0.5 rounded bg-amber-50 border text-amber-700'>{t.count}</span>
              </div>
            ))}
            {(!pendingSummaryData?.top || pendingSummaryData.top.length === 0) && (
              <div className='text-sm text-muted-foreground'>Sin pendientes</div>
            )}
          </div>
          <div className='mt-4'>
            <Button size='sm' variant='outline' onClick={()=> navigate('/documentos/aprobacion')}>Revisar ahora</Button>
          </div>
        </Card>
      </div>

      {/* Estadísticas Generales */}
      {dashboardData && (
        <div className='mb-8'>
          <Card className='p-6 bg-card'>
            <h2 className='text-xl font-semibold mb-4 flex items-center'>
              <ChartBarIcon className='h-6 w-6 mr-2 text-blue-600' />
              Resumen General
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-red-600'>
                  {semaforos.reduce((acc: number, item: any) => acc + (Array.isArray(item?.statusCounts?.rojo) ? item.statusCounts.rojo.reduce((s: number, v: number) => s + Number(v || 0), 0) : 0), 0)}
                </div>
                <p className='text-sm text-muted-foreground'>Documentos Vencidos</p>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-yellow-600'>
                  {semaforos.reduce((acc: number, item: any) => acc + (Array.isArray(item?.statusCounts?.amarillo) ? item.statusCounts.amarillo.reduce((s: number, v: number) => s + Number(v || 0), 0) : 0), 0)}
                </div>
                <p className='text-sm text-muted-foreground'>Por Vencer</p>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-green-600'>
                  {semaforos.reduce((acc: number, item: any) => acc + (Array.isArray(item?.statusCounts?.verde) ? item.statusCounts.verde.reduce((s: number, v: number) => s + Number(v || 0), 0) : 0), 0)}
                </div>
                <p className='text-sm text-muted-foreground'>Vigentes</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tarjeta sencilla de Lotes */}
      <div className='mb-8'>
        <Card className='p-6 bg-card'>
          <h2 className='text-xl font-semibold mb-4'>Lotes de Procesamiento</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='text-center border border-border rounded bg-background p-4'>
              <div className='text-2xl font-bold'>{jobs.total}</div>
              <p className='text-sm text-muted-foreground'>Total</p>
            </div>
            <div className='text-center border border-border rounded bg-background p-4'>
              <div className='text-2xl font-bold text-green-500 dark:text-green-400'>{jobs.completed}</div>
              <p className='text-sm text-muted-foreground'>Completados</p>
            </div>
            <div className='text-center border border-border rounded bg-background p-4'>
              <div className='text-2xl font-bold text-red-500 dark:text-red-400'>{jobs.failed}</div>
              <p className='text-sm text-muted-foreground'>Fallidos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de Dadores de carga */}
      <div>
        <h2 className='text-xl font-semibold mb-4'>Dadores de carga</h2>
        {dadores.length === 0 ? (
          <Card className='p-8 text-center bg-card'>
            <BuildingOfficeIcon className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='text-lg font-medium text-foreground mb-2'>
              No hay dadores de carga
            </h3>
            <p className='text-muted-foreground'>
              No se encontraron dadores para gestionar documentos.
            </p>
          </Card>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {dadores.map((dador) => {
              const stats = getDadorStats(dador.id);
              const totalDocs = stats.red + stats.yellow + stats.green;
              
              return (
                <Card
                  key={dador.id}
                  className={`p-6 hover:shadow-lg transition-all cursor-pointer border-2 ${getStatusColor(stats)}`}
                  onClick={() => handleDadorClick(dador.id)}
                >
                  <div className='flex items-start justify-between mb-4'>
                    <div className='flex items-center space-x-3'>
                      <div className='flex-shrink-0 h-10 w-10'>
                        <div className='h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center'>
                          <BuildingOfficeIcon className='h-5 w-5 text-blue-600 dark:text-blue-300' />
                        </div>
                      </div>
                      <div>
                        <h3 className='font-semibold text-foreground'>
                          {dador.razonSocial}
                        </h3>
                        <p className='text-sm text-muted-foreground'>
                          CUIT: {dador.cuit}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas por Empresa */}
                  <div className='grid grid-cols-3 gap-2 mb-4'>
                    <div className='text-center'>
                      <div className='w-8 h-8 bg-red-500 rounded-full mx-auto mb-1 flex items-center justify-center'>
                        <span className='text-white text-sm font-bold'>{stats.red}</span>
                      </div>
                      <p className='text-xs text-muted-foreground'>Vencidos</p>
                    </div>
                    <div className='text-center'>
                      <div className='w-8 h-8 bg-yellow-500 rounded-full mx-auto mb-1 flex items-center justify-center'>
                        <span className='text-white text-sm font-bold'>{stats.yellow}</span>
                      </div>
                      <p className='text-xs text-muted-foreground'>Por vencer</p>
                    </div>
                    <div className='text-center'>
                      <div className='w-8 h-8 bg-green-500 rounded-full mx-auto mb-1 flex items-center justify-center'>
                        <span className='text-white text-sm font-bold'>{stats.green}</span>
                      </div>
                      <p className='text-xs text-muted-foreground'>Vigentes</p>
                    </div>
                  </div>

                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'>
                      {totalDocs} documento{totalDocs !== 1 ? 's' : ''}
                    </span>
                    <Button
                      size='sm'
                      className='bg-blue-600 hover:bg-blue-700'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDadorClick(dador.id);
                      }}
                    >
                      Ver Documentos
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};