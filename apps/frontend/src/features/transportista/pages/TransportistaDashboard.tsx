import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetPortalTransportistaMisEntidadesQuery, useGetPortalTransportistaDocumentosRechazadosQuery, useResubmitDocumentMutation } from '../../documentos/api/documentosApiSlice';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
  UserIcon,
  TruckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

/**
 * Dashboard del Portal Transportista
 * Permite ver entidades, documentos pendientes/rechazados
 */
const TransportistaDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const { data: entidadesData, isLoading: entidadesLoading } = useGetPortalTransportistaMisEntidadesQuery();
  const { data: rechazadosData, isLoading: rechazadosLoading, refetch: refetchRechazados } = useGetPortalTransportistaDocumentosRechazadosQuery();
  const [resubmitDocument, { isLoading: isResubmitting }] = useResubmitDocumentMutation();
  
  const [resubmitingId, setResubmitingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleResubmit = async (docId: number) => {
    setResubmitingId(docId);
    fileInputRef.current?.click();
  };
  
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !resubmitingId) return;
    
    try {
      await resubmitDocument({ documentId: resubmitingId, file }).unwrap();
      alert('Documento resubido correctamente. Pendiente de aprobación.');
      refetchRechazados();
    } catch (err: any) {
      alert(err?.data?.message || 'Error al resubir documento');
    } finally {
      setResubmitingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const entidades = entidadesData || { empresas: [], choferes: [], camiones: [], acoplados: [], contadores: { pendientes: 0, rechazados: 0, porVencer: 0 } };
  const rechazados = rechazadosData || [];
  
  const isLoading = entidadesLoading || rechazadosLoading;
  
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Cargando dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className='container mx-auto px-4 py-8 max-w-6xl'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>Portal Transportista</h1>
        <p className='text-gray-600'>Gestiona tus equipos y documentación</p>
      </div>
      
      {/* Alertas */}
      {(entidades.contadores.rechazados > 0 || entidades.contadores.porVencer > 0) && (
        <div className='mb-6 space-y-3'>
          {entidades.contadores.rechazados > 0 && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-4'>
              <XCircleIcon className='h-6 w-6 text-red-500' />
              <div className='flex-1'>
                <h3 className='font-semibold text-red-800'>Documentos Rechazados</h3>
                <p className='text-sm text-red-700'>
                  Tienes {entidades.contadores.rechazados} documento(s) rechazado(s) que requieren atención.
                </p>
              </div>
              <Button 
                variant='outline' 
                size='sm'
                className='border-red-300 text-red-700'
                onClick={() => navigate('/transportista/rechazados')}
              >
                Ver <ArrowRightIcon className='h-4 w-4 ml-1' />
              </Button>
            </div>
          )}
          
          {entidades.contadores.porVencer > 0 && (
            <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-4'>
              <ExclamationTriangleIcon className='h-6 w-6 text-yellow-500' />
              <div className='flex-1'>
                <h3 className='font-semibold text-yellow-800'>Documentos por Vencer</h3>
                <p className='text-sm text-yellow-700'>
                  Tienes {entidades.contadores.porVencer} documento(s) que vencen en los próximos 30 días.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Contadores */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
        <Card className='p-4 text-center'>
          <div className='text-3xl font-bold text-gray-800'>{entidades.choferes.length}</div>
          <div className='text-sm text-gray-500 flex items-center justify-center gap-1'>
            <UserIcon className='h-4 w-4' /> Choferes
          </div>
        </Card>
        <Card className='p-4 text-center'>
          <div className='text-3xl font-bold text-gray-800'>{entidades.camiones.length}</div>
          <div className='text-sm text-gray-500 flex items-center justify-center gap-1'>
            <TruckIcon className='h-4 w-4' /> Camiones
          </div>
        </Card>
        <Card className='p-4 text-center'>
          <div className='text-3xl font-bold text-gray-800'>{entidades.acoplados.length}</div>
          <div className='text-sm text-gray-500 flex items-center justify-center gap-1'>
            <TruckIcon className='h-4 w-4' /> Acoplados
          </div>
        </Card>
        <Card className='p-4 text-center bg-blue-50'>
          <div className='text-3xl font-bold text-blue-600'>{entidades.contadores.pendientes}</div>
          <div className='text-sm text-blue-700 flex items-center justify-center gap-1'>
            <ClockIcon className='h-4 w-4' /> Pendientes
          </div>
        </Card>
      </div>
      
      {/* Accesos Rápidos */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        <Card 
          className='p-6 cursor-pointer hover:shadow-lg transition-shadow'
          onClick={() => navigate('/documentos/equipos')}
        >
          <div className='flex items-center gap-4'>
            <div className='bg-blue-100 p-3 rounded-lg'>
              <TruckIcon className='h-8 w-8 text-blue-600' />
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>Mis Equipos</h3>
              <p className='text-sm text-gray-500'>Ver y gestionar equipos</p>
            </div>
          </div>
        </Card>
        
        <Card 
          className='p-6 cursor-pointer hover:shadow-lg transition-shadow'
          onClick={() => navigate('/documentos/choferes')}
        >
          <div className='flex items-center gap-4'>
            <div className='bg-green-100 p-3 rounded-lg'>
              <UserIcon className='h-8 w-8 text-green-600' />
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>Choferes</h3>
              <p className='text-sm text-gray-500'>Gestionar documentos de choferes</p>
            </div>
          </div>
        </Card>
        
        <Card 
          className='p-6 cursor-pointer hover:shadow-lg transition-shadow'
          onClick={() => navigate('/documentos/equipos/alta-completa')}
        >
          <div className='flex items-center gap-4'>
            <div className='bg-purple-100 p-3 rounded-lg'>
              <DocumentTextIcon className='h-8 w-8 text-purple-600' />
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>Subir Documentos</h3>
              <p className='text-sm text-gray-500'>Alta de equipo completa</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Input oculto para seleccionar archivo */}
      <input
        type='file'
        ref={fileInputRef}
        className='hidden'
        accept='.pdf,.jpg,.jpeg,.png'
        onChange={handleFileSelected}
      />
      
      {/* Documentos Rechazados (si hay) */}
      {rechazados.length > 0 && (
        <Card className='p-6'>
          <h2 className='text-lg font-semibold mb-4 flex items-center gap-2 text-red-800'>
            <XCircleIcon className='h-5 w-5' />
            Documentos Rechazados (últimos)
          </h2>
          
          <div className='space-y-3'>
            {rechazados.slice(0, 5).map((doc: any) => (
              <div key={doc.id} className='flex items-center justify-between p-3 bg-red-50 rounded-lg'>
                <div>
                  <div className='font-medium'>{doc.templateName}</div>
                  <div className='text-sm text-gray-600'>{doc.entityType} - {doc.entityName}</div>
                  <div className='text-xs text-red-600 mt-1'>
                    Motivo: {doc.motivoRechazo}
                  </div>
                </div>
                <Button 
                  variant='outline' 
                  size='sm'
                  onClick={() => handleResubmit(doc.id)}
                  disabled={isResubmitting && resubmitingId === doc.id}
                >
                  {isResubmitting && resubmitingId === doc.id ? 'Subiendo...' : 'Resubir'}
                </Button>
              </div>
            ))}
          </div>
          
          {rechazados.length > 5 && (
            <div className='mt-4 text-center'>
              <Button variant='outline' onClick={() => navigate('/transportista/rechazados')}>
                Ver todos los rechazados ({rechazados.length})
              </Button>
            </div>
          )}
        </Card>
      )}
      
      {/* Nota informativa */}
      <div className='mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800'>
        <strong>💡 Nota:</strong> Los documentos que subas quedan pendientes de aprobación por el Dador de Carga. 
        Recibirás una notificación cuando sean aprobados o rechazados.
      </div>
    </div>
  );
};

export default TransportistaDashboard;

