import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  useGetDadoresQuery, 
  useGetPendingDocumentsQuery,
  useGetEquiposQuery 
} from '../features/documentos/api/documentosApiSlice';
import { 
  DocumentTextIcon, 
  TruckIcon, 
  BuildingOffice2Icon, 
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export const AdminInternoPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDadorId, setSelectedDadorId] = useState<number | undefined>();

  // Queries
  const { data: dadoresResp, isLoading: dadoresLoading } = useGetDadoresQuery({});
  const { data: pendingDocsResp, isLoading: pendingLoading } = useGetPendingDocumentsQuery({ 
    dadorCargaId: selectedDadorId 
  });
  const { data: equiposResp, isLoading: equiposLoading } = useGetEquiposQuery({ 
    dadorCargaId: selectedDadorId,
    page: 1,
    limit: 10 
  });

  const dadores = dadoresResp?.data || [];
  const pendingDocs = pendingDocsResp?.data || [];
  const equipos = equiposResp?.data || [];
  const totalEquipos = equiposResp?.pagination?.total || 0;

  // Calcular estadísticas
  const totalPending = pendingDocs.length;

  return (
    <div className='container mx-auto px-4 py-6 max-w-7xl'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-foreground flex items-center gap-3'>
              <UserGroupIcon className='h-8 w-8 text-blue-600' />
              Portal Admin Interno
            </h1>
            <p className='text-muted-foreground mt-2'>
              Gestión completa de equipos y documentación de todos los dadores
            </p>
          </div>
          <div className='flex gap-2'>
            <Button 
              variant='outline' 
              onClick={() => navigate('/documentos')}
            >
              Panel Completo
            </Button>
          </div>
        </div>
      </div>

      {/* Selector de Dador */}
      <Card className='mb-6 p-6'>
        <div className='flex items-center gap-4'>
          <BuildingOffice2Icon className='h-6 w-6 text-blue-600' />
          <div className='flex-1'>
            <label className='block text-sm font-medium mb-2'>
              Seleccionar Dador de Carga
            </label>
            <select
              className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700'
              value={selectedDadorId || ''}
              onChange={(e) => setSelectedDadorId(e.target.value ? Number(e.target.value) : undefined)}
              disabled={dadoresLoading}
            >
              <option value=''>Todos los dadores</option>
              {dadores.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} {d.cuit ? `(CUIT: ${d.cuit})` : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedDadorId && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setSelectedDadorId(undefined)}
            >
              Ver Todos
            </Button>
          )}
        </div>
      </Card>

      {/* Dashboard de Estadísticas */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        {/* Total Equipos */}
        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground'>Total Equipos</p>
              <p className='text-3xl font-bold text-foreground'>
                {equiposLoading ? '...' : totalEquipos}
              </p>
            </div>
            <TruckIcon className='h-12 w-12 text-blue-500 opacity-20' />
          </div>
          <Button
            variant='ghost'
            size='sm'
            className='mt-4 w-full'
            onClick={() => navigate('/documentos/equipos')}
          >
            Ver Equipos
          </Button>
        </Card>

        {/* Documentos Pendientes */}
        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground'>Docs Pendientes</p>
              <p className='text-3xl font-bold text-yellow-600'>
                {pendingLoading ? '...' : totalPending}
              </p>
            </div>
            <ClockIcon className='h-12 w-12 text-yellow-500 opacity-20' />
          </div>
          <Button
            variant='ghost'
            size='sm'
            className='mt-4 w-full'
            onClick={() => navigate('/documentos/approval/pending')}
          >
            Revisar Pendientes
          </Button>
        </Card>

        {/* Dadores Activos */}
        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground'>Dadores Activos</p>
              <p className='text-3xl font-bold text-foreground'>
                {dadoresLoading ? '...' : dadores.length}
              </p>
            </div>
            <BuildingOffice2Icon className='h-12 w-12 text-green-500 opacity-20' />
          </div>
          <Button
            variant='ghost'
            size='sm'
            className='mt-4 w-full'
            onClick={() => navigate('/documentos/dadores')}
          >
            Ver Dadores
          </Button>
        </Card>

        {/* Acciones Rápidas */}
        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-muted-foreground'>Acciones</p>
              <p className='text-3xl font-bold text-foreground'>Rápidas</p>
            </div>
            <ChartBarIcon className='h-12 w-12 text-purple-500 opacity-20' />
          </div>
          <Button
            variant='ghost'
            size='sm'
            className='mt-4 w-full'
            onClick={() => navigate('/documentos/auditoria')}
          >
            Ver Auditoría
          </Button>
        </Card>
      </div>

      {/* Acciones Principales */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
        {/* Alta de Equipos */}
        <Card className='p-6 hover:shadow-lg transition-shadow cursor-pointer'
          onClick={() => navigate('/documentos/equipos/alta-completa')}
        >
          <div className='flex items-start gap-4'>
            <div className='p-3 bg-blue-100 dark:bg-blue-900 rounded-lg'>
              <TruckIcon className='h-6 w-6 text-blue-600 dark:text-blue-300' />
            </div>
            <div className='flex-1'>
              <h3 className='font-semibold text-lg mb-1'>Alta de Equipo</h3>
              <p className='text-sm text-muted-foreground'>
                Crear nuevo equipo completo con todos sus documentos
              </p>
            </div>
          </div>
        </Card>

        {/* Carga de Documentos */}
        <Card className='p-6 hover:shadow-lg transition-shadow cursor-pointer'
          onClick={() => navigate('/documentos/carga')}
        >
          <div className='flex items-start gap-4'>
            <div className='p-3 bg-green-100 dark:bg-green-900 rounded-lg'>
              <DocumentTextIcon className='h-6 w-6 text-green-600 dark:text-green-300' />
            </div>
            <div className='flex-1'>
              <h3 className='font-semibold text-lg mb-1'>Carga de Documentos</h3>
              <p className='text-sm text-muted-foreground'>
                Subir documentos individuales o en lote con IA
              </p>
            </div>
          </div>
        </Card>

        {/* Gestión de Dadores */}
        <Card className='p-6 hover:shadow-lg transition-shadow cursor-pointer'
          onClick={() => navigate('/documentos/dadores')}
        >
          <div className='flex items-start gap-4'>
            <div className='p-3 bg-purple-100 dark:bg-purple-900 rounded-lg'>
              <BuildingOffice2Icon className='h-6 w-6 text-purple-600 dark:text-purple-300' />
            </div>
            <div className='flex-1'>
              <h3 className='font-semibold text-lg mb-1'>Gestión de Dadores</h3>
              <p className='text-sm text-muted-foreground'>
                Crear y gestionar dadores de carga
              </p>
            </div>
          </div>
        </Card>

        {/* Aprobación de Documentos */}
        <Card className='p-6 hover:shadow-lg transition-shadow cursor-pointer'
          onClick={() => navigate('/documentos/approval/pending')}
        >
          <div className='flex items-start gap-4'>
            <div className='p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg'>
              <CheckCircleIcon className='h-6 w-6 text-yellow-600 dark:text-yellow-300' />
            </div>
            <div className='flex-1'>
              <h3 className='font-semibold text-lg mb-1'>Aprobar Documentos</h3>
              <p className='text-sm text-muted-foreground'>
                Revisar y aprobar documentos pendientes
              </p>
              {totalPending > 0 && (
                <div className='mt-2 inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 rounded text-xs font-medium text-yellow-700 dark:text-yellow-300'>
                  <ExclamationTriangleIcon className='h-4 w-4' />
                  {totalPending} pendientes
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Consulta de Maestros */}
        <Card className='p-6 hover:shadow-lg transition-shadow cursor-pointer'
          onClick={() => navigate('/documentos/empresas-transportistas')}
        >
          <div className='flex items-start gap-4'>
            <div className='p-3 bg-cyan-100 dark:bg-cyan-900 rounded-lg'>
              <UserGroupIcon className='h-6 w-6 text-cyan-600 dark:text-cyan-300' />
            </div>
            <div className='flex-1'>
              <h3 className='font-semibold text-lg mb-1'>Consultar Maestros</h3>
              <p className='text-sm text-muted-foreground'>
                Ver empresas, choferes, camiones y acoplados
              </p>
            </div>
          </div>
        </Card>

        {/* Auditoría */}
        <Card className='p-6 hover:shadow-lg transition-shadow cursor-pointer'
          onClick={() => navigate('/documentos/auditoria')}
        >
          <div className='flex items-start gap-4'>
            <div className='p-3 bg-red-100 dark:bg-red-900 rounded-lg'>
              <ChartBarIcon className='h-6 w-6 text-red-600 dark:text-red-300' />
            </div>
            <div className='flex-1'>
              <h3 className='font-semibold text-lg mb-1'>Auditoría</h3>
              <p className='text-sm text-muted-foreground'>
                Ver logs de actividad y cambios del sistema
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Últimos Equipos (si hay dador seleccionado) */}
      {selectedDadorId && equipos.length > 0 && (
        <Card className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-semibold flex items-center gap-2'>
              <TruckIcon className='h-5 w-5 text-blue-600' />
              Últimos Equipos
            </h2>
            <Button
              variant='outline'
              size='sm'
              onClick={() => navigate('/documentos/equipos')}
            >
              Ver Todos
            </Button>
          </div>

          <div className='space-y-3'>
            {equipos.slice(0, 5).map((equipo: any) => (
              <div
                key={equipo.id}
                className='flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer'
                onClick={() => navigate(`/documentos/equipos/${equipo.id}/estado`)}
              >
                <div className='flex-1'>
                  <div className='font-medium'>
                    Equipo #{equipo.id}
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    {equipo.chofer?.nombre || 'Sin chofer'} - {equipo.camion?.patente || 'Sin patente'}
                  </div>
                </div>
                <Button variant='outline' size='sm'>
                  Ver Detalle
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mensaje si no hay dador seleccionado */}
      {!selectedDadorId && (
        <Card className='p-12 text-center'>
          <BuildingOffice2Icon className='h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30' />
          <h3 className='text-lg font-semibold mb-2'>Selecciona un Dador de Carga</h3>
          <p className='text-muted-foreground mb-6'>
            Elige un dador para ver estadísticas y equipos específicos, o usa las acciones rápidas arriba.
          </p>
          <Button onClick={() => navigate('/documentos')}>
            Ir al Panel Completo
          </Button>
        </Card>
      )}
    </div>
  );
};

