import React, { useState, useCallback } from 'react';
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
  ListBulletIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

/**
 * Dashboard del Portal Cliente
 * Vista de solo lectura de equipos asignados
 * No carga equipos por defecto - requiere búsqueda o "Listar todos"
 */
const ClienteDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Estado para controlar si se debe cargar data
  const [shouldFetch, setShouldFetch] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  
  // Solo ejecutar query si shouldFetch es true
  const { data, isLoading, isFetching, error } = useGetPortalClienteEquiposQuery(
    { page, limit, search: searchTerm, estado: filtroEstado === 'TODOS' ? '' : filtroEstado },
    { skip: !shouldFetch }
  );
  
  const equipos = data?.equipos ?? [];
  const resumen = data?.resumen ?? { total: 0, vigentes: 0, proximosVencer: 0, vencidos: 0, incompletos: 0 };
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  
  // Buscar (al presionar Enter o botón)
  const handleSearch = useCallback(() => {
    setSearchTerm(searchInput.trim());
    setPage(1);
    setShouldFetch(true);
  }, [searchInput]);
  
  // Manejar Enter en el input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);
  
  // Volver atrás
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);
  
  // Listar todos
  const handleListAll = useCallback(() => {
    setSearchInput('');
    setSearchTerm('');
    setFiltroEstado('TODOS');
    setPage(1);
    setShouldFetch(true);
  }, []);
  
  // Cambiar filtro de estado
  const handleEstadoChange = useCallback((estado: string) => {
    setFiltroEstado(estado);
    setPage(1);
    if (shouldFetch) {
      // Si ya estamos mostrando data, refrescar con el nuevo filtro
    }
  }, [shouldFetch]);
  
  // Paginación
  const handleNextPage = useCallback(() => {
    if (pagination.hasNext) {
      setPage(p => p + 1);
    }
  }, [pagination.hasNext]);
  
  const handlePrevPage = useCallback(() => {
    if (pagination.hasPrev) {
      setPage(p => p - 1);
    }
  }, [pagination.hasPrev]);
  
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
  
  return (
    <div className='container mx-auto px-4 py-8 max-w-6xl'>
      {/* Header con botón volver */}
      <div className='mb-8'>
        <Button 
          variant='ghost' 
          onClick={handleBack}
          className='mb-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
        >
          <ArrowLeftIcon className='h-4 w-4 mr-2' />
          Volver
        </Button>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2'>Portal Cliente</h1>
        <p className='text-gray-600 dark:text-gray-400'>Consulta el estado documental de tus equipos asignados</p>
      </div>
      
      {/* Resumen - siempre visible si hay data */}
      {shouldFetch && !isLoading && !error && (
        <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-8'>
          <Card className='p-4 text-center'>
            <div className='text-3xl font-bold text-gray-800 dark:text-gray-200'>{resumen.total}</div>
            <div className='text-sm text-gray-500 dark:text-gray-400'>Total</div>
          </Card>
          <Card className='p-4 text-center bg-green-50 dark:bg-green-900/20'>
            <div className='text-3xl font-bold text-green-600'>{resumen.vigentes}</div>
            <div className='text-sm text-green-700 dark:text-green-400'>Vigentes</div>
          </Card>
          <Card className='p-4 text-center bg-yellow-50 dark:bg-yellow-900/20'>
            <div className='text-3xl font-bold text-yellow-600'>{resumen.proximosVencer}</div>
            <div className='text-sm text-yellow-700 dark:text-yellow-400'>Próx. a vencer</div>
          </Card>
          <Card className='p-4 text-center bg-red-50 dark:bg-red-900/20'>
            <div className='text-3xl font-bold text-red-600'>{resumen.vencidos}</div>
            <div className='text-sm text-red-700 dark:text-red-400'>Vencidos</div>
          </Card>
          <Card className='p-4 text-center bg-gray-50 dark:bg-gray-800'>
            <div className='text-3xl font-bold text-gray-600 dark:text-gray-300'>{resumen.incompletos}</div>
            <div className='text-sm text-gray-700 dark:text-gray-400'>Incompletos</div>
          </Card>
        </div>
      )}
      
      {/* Barra de búsqueda y acciones */}
      <Card className='p-4 mb-6'>
        <div className='flex flex-col md:flex-row gap-4'>
          {/* Búsqueda */}
          <div className='flex-1 flex gap-2'>
            <div className='flex-1 relative'>
              <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por patente, DNI, nombre...'
                className='w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} className='whitespace-nowrap'>
              <MagnifyingGlassIcon className='h-4 w-4 mr-1' />
              Buscar
            </Button>
          </div>
          
          {/* Botón Listar Todos */}
          <Button 
            variant='outline' 
            onClick={handleListAll}
            className='whitespace-nowrap'
          >
            <ListBulletIcon className='h-4 w-4 mr-1' />
            Listar Todos
          </Button>
          
          {/* Filtro por estado */}
          {shouldFetch && (
            <select
              className='border rounded-lg px-4 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500'
              value={filtroEstado}
              onChange={(e) => handleEstadoChange(e.target.value)}
            >
              <option value='TODOS'>Todos los estados</option>
              <option value='VIGENTE'>✅ Vigentes</option>
              <option value='PROXIMO_VENCER'>⚠️ Próximos a vencer</option>
              <option value='VENCIDO'>🔴 Vencidos</option>
              <option value='INCOMPLETO'>⚪ Incompletos</option>
            </select>
          )}
        </div>
      </Card>
      
      {/* Estado inicial - sin búsqueda */}
      {!shouldFetch && (
        <Card className='p-12 text-center'>
          <TruckIcon className='h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-6' />
          <h3 className='text-xl font-medium text-gray-700 dark:text-gray-300 mb-3'>
            Busca o lista tus equipos asignados
          </h3>
          <p className='text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto'>
            Utiliza el campo de búsqueda para encontrar un equipo específico por patente, DNI o nombre,
            o haz clic en "Listar Todos" para ver todos tus equipos asignados.
          </p>
          <Button onClick={handleListAll} size='lg'>
            <ListBulletIcon className='h-5 w-5 mr-2' />
            Listar Todos los Equipos
          </Button>
        </Card>
      )}
      
      {/* Loading */}
      {shouldFetch && (isLoading || isFetching) && (
        <Card className='p-12 text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Cargando equipos...</p>
        </Card>
      )}
      
      {/* Error */}
      {shouldFetch && error && !isLoading && (
        <Card className='p-8 text-center'>
          <XCircleIcon className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2'>Error al cargar datos</h2>
          <p className='text-gray-600 dark:text-gray-400'>No se pudieron obtener los equipos asignados.</p>
          <Button variant='outline' className='mt-4' onClick={handleListAll}>
            Reintentar
          </Button>
        </Card>
      )}
      
      {/* Lista de Equipos */}
      {shouldFetch && !isLoading && !isFetching && !error && (
        <>
          {equipos.length === 0 ? (
            <Card className='p-12 text-center'>
              <TruckIcon className='h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-700 dark:text-gray-300 mb-2'>No hay equipos</h3>
              <p className='text-gray-500 dark:text-gray-400'>
                {searchTerm 
                  ? `No se encontraron equipos que coincidan con "${searchTerm}".` 
                  : 'No tienes equipos asignados actualmente.'}
              </p>
            </Card>
          ) : (
            <>
              {/* Información de resultados */}
              <div className='mb-4 text-sm text-gray-600 dark:text-gray-400'>
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination.total)} de {pagination.total} equipos
                {searchTerm && <span className='ml-2'>(búsqueda: "{searchTerm}")</span>}
              </div>
              
              {/* Lista */}
              <div className='space-y-4'>
                {equipos.map((equipo) => {
                  const estilo = getEstadoStyle(equipo.estadoCompliance);
                  const IconoEstado = estilo.icon;
                  
                  return (
                    <Card 
                      key={equipo.id} 
                      className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${estilo.bg} dark:bg-opacity-20`}
                      onClick={() => navigate(`/cliente/equipos/${equipo.id}`)}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                          <IconoEstado className={`h-8 w-8 ${estilo.text}`} />
                          <div>
                            <div className='font-semibold text-gray-900 dark:text-gray-100'>
                              {equipo.camion?.patente || 'Sin patente'}
                              {equipo.acoplado?.patente && ` / ${equipo.acoplado.patente}`}
                            </div>
                            <div className='text-sm text-gray-600 dark:text-gray-400'>
                              {equipo.chofer 
                                ? `${equipo.chofer.nombre || ''} ${equipo.chofer.apellido || ''} - DNI ${equipo.chofer.dni}`
                                : 'Sin chofer asignado'}
                            </div>
                            {equipo.empresaTransportista && (
                              <div className='text-xs text-gray-500 dark:text-gray-500'>
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
                              <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
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
              
              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className='flex items-center justify-center gap-4 mt-6'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handlePrevPage}
                    disabled={!pagination.hasPrev}
                  >
                    <ChevronLeftIcon className='h-4 w-4 mr-1' />
                    Anterior
                  </Button>
                  
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleNextPage}
                    disabled={!pagination.hasNext}
                  >
                    Siguiente
                    <ChevronRightIcon className='h-4 w-4 ml-1' />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
      
      {/* Footer informativo */}
      <div className='mt-8 text-center text-sm text-gray-500 dark:text-gray-400'>
        <p>Este portal es de solo lectura. Para modificaciones, contacte al administrador.</p>
      </div>
    </div>
  );
};

export default ClienteDashboard;
