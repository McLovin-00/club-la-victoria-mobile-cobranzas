import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetPortalClienteEquipoDetalleQuery } from '../../documentos/api/documentosApiSlice';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
  ArrowLeftIcon,
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  DocumentArrowDownIcon,
  ArchiveBoxArrowDownIcon,
  TruckIcon,
  UserIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

/**
 * Detalle de Equipo para Portal Cliente
 * Vista de solo lectura con documentos descargables
 */
const ClienteEquipoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const equipoId = Number(id);
  
  const { data, isLoading, error } = useGetPortalClienteEquipoDetalleQuery(
    { id: equipoId },
    { skip: !equipoId }
  );
  
  const equipo = data?.equipo;
  const documentos = data?.documentos ?? [];
  
  // Agrupar documentos por entidad
  const documentosPorEntidad = useMemo(() => {
    const grupos: Record<string, typeof documentos> = {};
    for (const doc of documentos) {
      const key = `${doc.entityType}-${doc.entityName}`;
      if (!grupos[key]) {
        grupos[key] = [];
      }
      grupos[key].push(doc);
    }
    return grupos;
  }, [documentos]);
  
  // Resumen de estados
  const resumenDocs = useMemo(() => {
    return {
      total: documentos.length,
      vigentes: documentos.filter(d => d.estado === 'VIGENTE').length,
      proximosVencer: documentos.filter(d => d.estado === 'PROXIMO_VENCER').length,
      vencidos: documentos.filter(d => d.estado === 'VENCIDO').length,
    };
  }, [documentos]);
  
  // Estilo según estado
  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'VIGENTE':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon, label: 'Vigente' };
      case 'PROXIMO_VENCER':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: ExclamationTriangleIcon, label: 'Próximo a vencer' };
      case 'VENCIDO':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: XCircleIcon, label: 'Vencido' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-500', icon: ExclamationTriangleIcon, label: estado };
    }
  };
  
  // Icono según tipo de entidad
  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'CHOFER':
        return UserIcon;
      case 'CAMION':
      case 'ACOPLADO':
        return TruckIcon;
      case 'EMPRESA_TRANSPORTISTA':
        return BuildingOfficeIcon;
      default:
        return DocumentArrowDownIcon;
    }
  };
  
  // Label de tipo de entidad
  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case 'CHOFER': return 'Chofer';
      case 'CAMION': return 'Camión';
      case 'ACOPLADO': return 'Acoplado';
      case 'EMPRESA_TRANSPORTISTA': return 'Empresa Transportista';
      default: return entityType;
    }
  };
  
  // Descargar documento individual
  const handleDownload = (docId: number, fileName: string) => {
    const token = localStorage.getItem('token');
    const url = `/api/docs/portal-cliente/equipos/${equipoId}/documentos/${docId}/download`;
    
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      })
      .catch(err => {
        console.error('Error descargando:', err);
        alert('Error al descargar el documento');
      });
  };
  
  // Descargar todos como ZIP
  const handleDownloadAll = () => {
    const token = localStorage.getItem('token');
    const url = `/api/docs/portal-cliente/equipos/${equipoId}/download-all`;
    
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `equipo_${equipoId}_documentos.zip`;
        link.click();
      })
      .catch(err => {
        console.error('Error descargando ZIP:', err);
        alert('Error al descargar los documentos');
      });
  };
  
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Cargando detalle...</p>
        </div>
      </div>
    );
  }
  
  if (error || !equipo) {
    return (
      <div className='container mx-auto px-4 py-8 max-w-4xl'>
        <Button variant='outline' onClick={() => navigate('/cliente')} className='mb-4'>
          <ArrowLeftIcon className='h-4 w-4 mr-2' />
          Volver
        </Button>
        <Card className='p-8 text-center'>
          <XCircleIcon className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold text-gray-800 mb-2'>Error</h2>
          <p className='text-gray-600'>No se pudo cargar el detalle del equipo.</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' onClick={() => navigate('/cliente')}>
            <ArrowLeftIcon className='h-4 w-4 mr-2' />
            Volver
          </Button>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Equipo {equipo.camion?.patente || 'Sin patente'}
            </h1>
            <p className='text-gray-600'>Detalle de documentación</p>
          </div>
        </div>
        
        {documentos.length > 0 && (
          <Button onClick={handleDownloadAll}>
            <ArchiveBoxArrowDownIcon className='h-4 w-4 mr-2' />
            Descargar todo (ZIP)
          </Button>
        )}
      </div>
      
      {/* Info del Equipo */}
      <Card className='p-6 mb-6'>
        <h2 className='text-lg font-semibold mb-4'>Información del Equipo</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <span className='text-gray-500 text-sm'>Camión:</span>
            <div className='font-medium'>
              {equipo.camion?.patente || '-'}
              {equipo.camion?.marca && ` (${equipo.camion.marca} ${equipo.camion.modelo || ''})`}
            </div>
          </div>
          <div>
            <span className='text-gray-500 text-sm'>Acoplado:</span>
            <div className='font-medium'>{equipo.acoplado?.patente || '-'}</div>
          </div>
          <div>
            <span className='text-gray-500 text-sm'>Chofer:</span>
            <div className='font-medium'>
              {equipo.chofer 
                ? `${equipo.chofer.nombre || ''} ${equipo.chofer.apellido || ''} - DNI ${equipo.chofer.dni}`
                : '-'}
            </div>
          </div>
          <div>
            <span className='text-gray-500 text-sm'>Empresa Transportista:</span>
            <div className='font-medium'>
              {equipo.empresaTransportista?.razonSocial || '-'}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Resumen de Documentos */}
      <div className='grid grid-cols-4 gap-4 mb-6'>
        <Card className='p-3 text-center'>
          <div className='text-2xl font-bold text-gray-800'>{resumenDocs.total}</div>
          <div className='text-xs text-gray-500'>Total</div>
        </Card>
        <Card className='p-3 text-center bg-green-50'>
          <div className='text-2xl font-bold text-green-600'>{resumenDocs.vigentes}</div>
          <div className='text-xs text-green-700'>Vigentes</div>
        </Card>
        <Card className='p-3 text-center bg-yellow-50'>
          <div className='text-2xl font-bold text-yellow-600'>{resumenDocs.proximosVencer}</div>
          <div className='text-xs text-yellow-700'>Próx. vencer</div>
        </Card>
        <Card className='p-3 text-center bg-red-50'>
          <div className='text-2xl font-bold text-red-600'>{resumenDocs.vencidos}</div>
          <div className='text-xs text-red-700'>Vencidos</div>
        </Card>
      </div>
      
      {/* Documentos agrupados por entidad */}
      {Object.keys(documentosPorEntidad).length === 0 ? (
        <Card className='p-8 text-center'>
          <DocumentArrowDownIcon className='h-12 w-12 text-gray-300 mx-auto mb-4' />
          <p className='text-gray-500'>No hay documentos aprobados disponibles.</p>
        </Card>
      ) : (
        <div className='space-y-6'>
          {Object.entries(documentosPorEntidad).map(([key, docs]) => {
            const firstDoc = docs[0];
            const EntityIcon = getEntityIcon(firstDoc.entityType);
            const entityLabel = getEntityLabel(firstDoc.entityType);
            
            return (
              <Card key={key} className='p-4'>
                <div className='flex items-center gap-3 mb-4 pb-3 border-b'>
                  <EntityIcon className='h-6 w-6 text-gray-600' />
                  <div>
                    <div className='font-semibold'>{entityLabel}</div>
                    <div className='text-sm text-gray-500'>{firstDoc.entityName}</div>
                  </div>
                </div>
                
                <div className='space-y-2'>
                  {docs.map((doc) => {
                    const estilo = getEstadoStyle(doc.estado);
                    const IconoEstado = estilo.icon;
                    
                    return (
                      <div 
                        key={doc.id} 
                        className={`flex items-center justify-between p-3 rounded-lg ${estilo.bg}`}
                      >
                        <div className='flex items-center gap-3'>
                          <IconoEstado className={`h-5 w-5 ${estilo.text}`} />
                          <div>
                            <div className='font-medium text-gray-900'>{doc.templateName}</div>
                            <div className='text-xs text-gray-500'>
                              {doc.expiresAt 
                                ? `Vence: ${new Date(doc.expiresAt).toLocaleDateString('es-AR')}`
                                : 'Sin vencimiento'}
                            </div>
                          </div>
                        </div>
                        
                        <div className='flex items-center gap-3'>
                          <span className={`text-sm font-medium ${estilo.text}`}>
                            {estilo.label}
                          </span>
                          <Button 
                            variant='outline' 
                            size='sm'
                            onClick={() => handleDownload(doc.id, `${doc.templateName}.pdf`)}
                          >
                            <DocumentArrowDownIcon className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Footer */}
      <div className='mt-8 text-center text-sm text-gray-500'>
        <p>Asignado desde: {equipo.asignadoDesde ? new Date(equipo.asignadoDesde).toLocaleDateString('es-AR') : '-'}</p>
      </div>
    </div>
  );
};

export default ClienteEquipoDetalle;

