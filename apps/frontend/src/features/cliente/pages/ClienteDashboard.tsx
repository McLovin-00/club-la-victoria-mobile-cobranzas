import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetPortalClienteEquiposQuery } from '../../documentos/api/documentosApiSlice';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

/**
 * Dashboard del Portal Cliente
 * Vista de solo lectura de equipos asignados
 */
const ClienteDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetPortalClienteEquiposQuery();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  
  const equipos = data?.equipos ?? [];
  const resumen = data?.resumen ?? { total: 0, vigentes: 0, proximosVencer: 0, vencidos: 0, incompletos: 0 };
  
  // Filtrar equipos
  const equiposFiltrados = useMemo(() => {
    return equipos.filter(eq => {
      // Filtro por búsqueda
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        eq.identificador.toLowerCase().includes(searchLower) ||
        eq.camion?.patente?.toLowerCase().includes(searchLower) ||
        eq.chofer?.dni?.toLowerCase().includes(searchLower) ||
        eq.chofer?.nombre?.toLowerCase().includes(searchLower) ||
        eq.chofer?.apellido?.toLowerCase().includes(searchLower);
      
      // Filtro por estado
      const matchEstado = filtroEstado === 'TODOS' || eq.estadoCompliance === filtroEstado;
      
      return matchSearch && matchEstado;
    });
  }, [equipos, searchTerm, filtroEstado]);
  
  // Obtener estilo según estado
  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'VIGENTE':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon, label: 'Vigente' };
      case 'PROXIMO_VENCER':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: ExclamationTriangleIcon, label: 'Próximo a vencer' };
      case 'VENCIDO':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: XCircleIcon, label: 'Vencido' };
      case 'INCOMPLETO':
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: ExclamationTriangleIcon, label: 'Incompleto' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-500', icon: ExclamationTriangleIcon, label: estado };
    }
  };
  
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Cargando equipos...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Card className='p-8 text-center'>
          <XCircleIcon className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold text-gray-800 mb-2'>Error al cargar datos</h2>
          <p className='text-gray-600'>No se pudieron obtener los equipos asignados.</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className='container mx-auto px-4 py-8 max-w-6xl'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>Portal Cliente</h1>
        <p className='text-gray-600'>Consulta el estado documental de tus equipos asignados</p>
      </div>
      
      {/* Resumen */}
      <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-8'>
        <Card className='p-4 text-center'>
          <div className='text-3xl font-bold text-gray-800'>{resumen.total}</div>
          <div className='text-sm text-gray-500'>Total</div>
        </Card>
        <Card className='p-4 text-center bg-green-50'>
          <div className='text-3xl font-bold text-green-600'>{resumen.vigentes}</div>
          <div className='text-sm text-green-700'>Vigentes</div>
        </Card>
        <Card className='p-4 text-center bg-yellow-50'>
          <div className='text-3xl font-bold text-yellow-600'>{resumen.proximosVencer}</div>
          <div className='text-sm text-yellow-700'>Próx. a vencer</div>
        </Card>
        <Card className='p-4 text-center bg-red-50'>
          <div className='text-3xl font-bold text-red-600'>{resumen.vencidos}</div>
          <div className='text-sm text-red-700'>Vencidos</div>
        </Card>
        <Card className='p-4 text-center bg-gray-50'>
          <div className='text-3xl font-bold text-gray-600'>{resumen.incompletos}</div>
          <div className='text-sm text-gray-700'>Incompletos</div>
        </Card>
      </div>
      
      {/* Filtros */}
      <Card className='p-4 mb-6'>
        <div className='flex flex-col md:flex-row gap-4'>
          {/* Búsqueda */}
          <div className='flex-1 relative'>
            <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar por patente, DNI, nombre...'
              className='w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filtro por estado */}
          <select
            className='border rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500'
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value='TODOS'>Todos los estados</option>
            <option value='VIGENTE'>✅ Vigentes</option>
            <option value='PROXIMO_VENCER'>⚠️ Próximos a vencer</option>
            <option value='VENCIDO'>🔴 Vencidos</option>
            <option value='INCOMPLETO'>⚪ Incompletos</option>
          </select>
        </div>
      </Card>
      
      {/* Lista de Equipos */}
      {equiposFiltrados.length === 0 ? (
        <Card className='p-12 text-center'>
          <TruckIcon className='h-16 w-16 text-gray-300 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-gray-700 mb-2'>No hay equipos</h3>
          <p className='text-gray-500'>
            {searchTerm || filtroEstado !== 'TODOS' 
              ? 'No se encontraron equipos con los filtros aplicados.' 
              : 'No tienes equipos asignados actualmente.'}
          </p>
        </Card>
      ) : (
        <div className='space-y-4'>
          {equiposFiltrados.map((equipo) => {
            const estilo = getEstadoStyle(equipo.estadoCompliance);
            const IconoEstado = estilo.icon;
            
            return (
              <Card 
                key={equipo.id} 
                className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${estilo.bg}`}
                onClick={() => navigate(`/cliente/equipos/${equipo.id}`)}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <IconoEstado className={`h-8 w-8 ${estilo.text}`} />
                    <div>
                      <div className='font-semibold text-gray-900'>
                        {equipo.camion?.patente || 'Sin patente'}
                        {equipo.acoplado?.patente && ` / ${equipo.acoplado.patente}`}
                      </div>
                      <div className='text-sm text-gray-600'>
                        {equipo.chofer 
                          ? `${equipo.chofer.nombre || ''} ${equipo.chofer.apellido || ''} - DNI ${equipo.chofer.dni}`
                          : 'Sin chofer asignado'}
                      </div>
                      {equipo.empresaTransportista && (
                        <div className='text-xs text-gray-500'>
                          {equipo.empresaTransportista.razonSocial}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className='flex items-center gap-4'>
                    <div className='text-right'>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${estilo.bg} ${estilo.text}`}>
                        {estilo.label}
                      </span>
                      {equipo.proximoVencimiento && (
                        <div className='text-xs text-gray-500 mt-1'>
                          Próx. venc: {new Date(equipo.proximoVencimiento).toLocaleDateString('es-AR')}
                        </div>
                      )}
                    </div>
                    <Button variant='outline' size='sm'>
                      <DocumentArrowDownIcon className='h-4 w-4 mr-1' />
                      Ver docs
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Footer informativo */}
      <div className='mt-8 text-center text-sm text-gray-500'>
        <p>Este portal es de solo lectura. Para modificaciones, contacte al administrador.</p>
      </div>
    </div>
  );
};

export default ClienteDashboard;

