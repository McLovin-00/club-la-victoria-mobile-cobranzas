import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetApprovalPendingQuery, 
  useGetApprovalStatsQuery,
  useGetEquiposQuery,
} from '../../documentos/api/documentosApiSlice';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
  DocumentCheckIcon,
  TruckIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Dashboard del Portal Dador de Carga
 * Permite gestionar equipos, aprobar documentos, ver compliance
 */
const DadorDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Datos de aprobación
  const { data: pendingData, isLoading: pendingLoading } = useGetApprovalPendingQuery({ page: 1, limit: 5 });
  const { data: statsData, isLoading: statsLoading } = useGetApprovalStatsQuery();
  
  // Datos de equipos
  const { data: equiposData, isLoading: equiposLoading } = useGetEquiposQuery({ page: 1, limit: 100 });
  
  const isLoading = pendingLoading || statsLoading || equiposLoading;
  
  const pendingDocs = pendingData?.data ?? [];
  const stats = statsData ?? { pending: 0, approved: 0, rejected: 0 };
  const equipos = equiposData?.data ?? [];
  
  // Calcular semáforo de equipos
  const semaforoEquipos = useMemo(() => {
    const resultado = { vigentes: 0, proximosVencer: 0, vencidos: 0, incompletos: 0 };
    
    for (const eq of equipos) {
      const estado = eq.estado?.toUpperCase() || 'INCOMPLETO';
      if (estado === 'VIGENTE' || estado === 'OK') {
        resultado.vigentes++;
      } else if (estado === 'PROXIMO_VENCER' || estado === 'WARNING') {
        resultado.proximosVencer++;
      } else if (estado === 'VENCIDO' || estado === 'EXPIRED') {
        resultado.vencidos++;
      } else {
        resultado.incompletos++;
      }
    }
    
    return resultado;
  }, [equipos]);
  
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Cargando dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className='container mx-auto px-4 py-8 max-w-6xl'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>Portal Dador de Carga</h1>
        <p className='text-gray-600'>Gestiona equipos, aprueba documentos y monitorea el compliance</p>
      </div>
      
      {/* Alerta de pendientes */}
      {stats.pending > 0 && (
        <div className='mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center gap-4'>
          <ClockIcon className='h-6 w-6 text-indigo-500' />
          <div className='flex-1'>
            <h3 className='font-semibold text-indigo-800'>Documentos Pendientes de Aprobación</h3>
            <p className='text-sm text-indigo-700'>
              Tienes {stats.pending} documento(s) esperando tu revisión.
            </p>
          </div>
          <Button 
            className='bg-indigo-600 hover:bg-indigo-700'
            onClick={() => navigate('/documentos/aprobacion')}
          >
            Revisar <ArrowRightIcon className='h-4 w-4 ml-1' />
          </Button>
        </div>
      )}
      
      {/* Estadísticas de Aprobación */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
        <Card className='p-4 text-center bg-yellow-50'>
          <div className='text-3xl font-bold text-yellow-600'>{stats.pending}</div>
          <div className='text-sm text-yellow-700 flex items-center justify-center gap-1'>
            <ClockIcon className='h-4 w-4' /> Pendientes
          </div>
        </Card>
        <Card className='p-4 text-center bg-green-50'>
          <div className='text-3xl font-bold text-green-600'>{stats.approved}</div>
          <div className='text-sm text-green-700 flex items-center justify-center gap-1'>
            <CheckCircleIcon className='h-4 w-4' /> Aprobados
          </div>
        </Card>
        <Card className='p-4 text-center bg-red-50'>
          <div className='text-3xl font-bold text-red-600'>{stats.rejected}</div>
          <div className='text-sm text-red-700 flex items-center justify-center gap-1'>
            <XCircleIcon className='h-4 w-4' /> Rechazados
          </div>
        </Card>
        <Card className='p-4 text-center'>
          <div className='text-3xl font-bold text-gray-800'>{equipos.length}</div>
          <div className='text-sm text-gray-500 flex items-center justify-center gap-1'>
            <TruckIcon className='h-4 w-4' /> Equipos
          </div>
        </Card>
      </div>
      
      {/* Semáforo de Equipos */}
      <Card className='p-6 mb-8'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold flex items-center gap-2'>
            <ChartBarIcon className='h-5 w-5 text-indigo-500' />
            Semáforo de Compliance
          </h2>
          <Button variant='outline' size='sm' onClick={() => navigate('/documentos/consulta')}>
            Ver detalle
          </Button>
        </div>
        
        <div className='grid grid-cols-4 gap-4'>
          <div className='text-center p-4 bg-green-100 rounded-lg'>
            <CheckCircleIcon className='h-8 w-8 text-green-600 mx-auto mb-2' />
            <div className='text-2xl font-bold text-green-700'>{semaforoEquipos.vigentes}</div>
            <div className='text-sm text-green-600'>Vigentes</div>
          </div>
          <div className='text-center p-4 bg-yellow-100 rounded-lg'>
            <ExclamationTriangleIcon className='h-8 w-8 text-yellow-600 mx-auto mb-2' />
            <div className='text-2xl font-bold text-yellow-700'>{semaforoEquipos.proximosVencer}</div>
            <div className='text-sm text-yellow-600'>Próx. a vencer</div>
          </div>
          <div className='text-center p-4 bg-red-100 rounded-lg'>
            <XCircleIcon className='h-8 w-8 text-red-600 mx-auto mb-2' />
            <div className='text-2xl font-bold text-red-700'>{semaforoEquipos.vencidos}</div>
            <div className='text-sm text-red-600'>Vencidos</div>
          </div>
          <div className='text-center p-4 bg-gray-100 rounded-lg'>
            <ClockIcon className='h-8 w-8 text-gray-600 mx-auto mb-2' />
            <div className='text-2xl font-bold text-gray-700'>{semaforoEquipos.incompletos}</div>
            <div className='text-sm text-gray-600'>Incompletos</div>
          </div>
        </div>
      </Card>
      
      {/* Accesos Rápidos */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        <Card 
          className='p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-indigo-200'
          onClick={() => navigate('/documentos/aprobacion')}
        >
          <div className='flex items-center gap-3'>
            <div className='bg-indigo-100 p-3 rounded-lg'>
              <ClipboardDocumentCheckIcon className='h-6 w-6 text-indigo-600' />
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>Aprobaciones</h3>
              <p className='text-xs text-gray-500'>Revisar documentos</p>
            </div>
          </div>
        </Card>
        
        <Card 
          className='p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200'
          onClick={() => navigate('/documentos/equipos')}
        >
          <div className='flex items-center gap-3'>
            <div className='bg-blue-100 p-3 rounded-lg'>
              <TruckIcon className='h-6 w-6 text-blue-600' />
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>Equipos</h3>
              <p className='text-xs text-gray-500'>Gestionar flota</p>
            </div>
          </div>
        </Card>
        
        <Card 
          className='p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-200'
          onClick={() => navigate('/documentos/equipos/alta-completa')}
        >
          <div className='flex items-center gap-3'>
            <div className='bg-green-100 p-3 rounded-lg'>
              <PlusCircleIcon className='h-6 w-6 text-green-600' />
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>Alta Equipo</h3>
              <p className='text-xs text-gray-500'>Nuevo equipo</p>
            </div>
          </div>
        </Card>
        
        <Card 
          className='p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-200'
          onClick={() => navigate('/documentos/empresas-transportistas')}
        >
          <div className='flex items-center gap-3'>
            <div className='bg-purple-100 p-3 rounded-lg'>
              <UserGroupIcon className='h-6 w-6 text-purple-600' />
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>Transportistas</h3>
              <p className='text-xs text-gray-500'>Ver empresas</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Documentos Pendientes (últimos) */}
      {pendingDocs.length > 0 && (
        <Card className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold flex items-center gap-2'>
              <DocumentCheckIcon className='h-5 w-5 text-yellow-500' />
              Últimos Documentos Pendientes
            </h2>
            <Button variant='outline' size='sm' onClick={() => navigate('/documentos/aprobacion')}>
              Ver todos ({stats.pending})
            </Button>
          </div>
          
          <div className='space-y-3'>
            {pendingDocs.slice(0, 5).map((doc: any) => (
              <div 
                key={doc.id} 
                className='flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer'
                onClick={() => navigate(`/documentos/aprobacion/${doc.id}`)}
              >
                <div>
                  <div className='font-medium'>{doc.template?.name || `Template ${doc.templateId}`}</div>
                  <div className='text-sm text-gray-600'>
                    {doc.entityType} - {doc.entityNaturalId || `ID ${doc.entityId}`}
                  </div>
                  <div className='text-xs text-gray-500'>
                    Subido: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('es-AR') : '-'}
                  </div>
                </div>
                <Button variant='outline' size='sm'>
                  Revisar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Info */}
      <div className='mt-8 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800'>
        <strong>💡 Tu rol:</strong> Como Dador de Carga, puedes gestionar equipos, aprobar o rechazar documentos, 
        y asignar equipos a clientes. Las empresas transportistas suben la documentación y tú validas que sea correcta.
      </div>
    </div>
  );
};

export default DadorDashboard;

