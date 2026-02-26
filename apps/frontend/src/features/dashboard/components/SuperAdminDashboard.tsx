import React, { useState } from 'react';
import {
  useGetSuperAdminDashboardQuery,
  useRefreshDashboardMutation,
  SuperAdminDashboardData,
} from '../api/dashboardApiSlice';

import { Card } from '../../../components/ui/card';
import { showToast } from '../../../components/ui/Toast.utils';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import {
  UserIcon,
  ServerIcon,
  BuildingOfficeIcon,
  ArrowPathIcon as RefreshIcon,
} from '../../../components/icons';
import { ServiceWidgetsContainer } from './ServiceWidgets';

type EmpresaRow = SuperAdminDashboardData['empresas'][0];

// Hook para prefetching inteligente
const useIntelligentPrefetch = () => {
  React.useEffect(() => {
    const prefetchTimer = setTimeout(() => {
      // Prefetch de datos de páginas probables a visitar
      import('../../../features/empresas/api/empresasApiSlice').then(({ empresasApiSlice }) => {
        // Prefetch empresas después de 2 segundos en dashboard
        empresasApiSlice.util.prefetch('getEmpresas', undefined, { force: false });
      });
      
      // Prefetch usuarios después de 3 segundos
      setTimeout(() => {
        import('../../../features/users/api/usersApiSlice').then(({ usersApiSlice }) => {
          usersApiSlice.util.prefetch('getUsuarios', undefined, { force: false });
        });

        // Prefetch también de componentes lazy de usuarios
        setTimeout(() => {
          import('../../../pages/UsuariosPage.lazy').then(() => {
            import('../../../pages/UsuariosPage').then(() => {
              import('../../../features/users/components/UserTable.lazy');
            });
          });
        }, 500);
      }, 1000);
    }, 2000);

    return () => clearTimeout(prefetchTimer);
  }, []);
};

export const SuperAdminDashboard: React.FC = () => {
  const { data, isLoading, error, refetch } = useGetSuperAdminDashboardQuery();
  const [refreshDashboard, { isLoading: isRefreshing }] = useRefreshDashboardMutation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Usar prefetching inteligente
  useIntelligentPrefetch();

  const handleRefresh = async () => {
    try {
      await refreshDashboard().unwrap();
      await refetch();
      showToast('Dashboard actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error al actualizar dashboard:', error);
      showToast('Error al actualizar dashboard', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Spinner className='w-8 h-8' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
        <p>Error al cargar los datos del panel de control</p>
      </div>
    );
  }

  if (!data || !data.empresas || !data.systemActivity) {
    return (
      <div className='bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4'>
        <p>No hay datos disponibles en este momento</p>
      </div>
    );
  }

  // Calcular índices para la paginación
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmpresas = data.empresas.slice(startIndex, endIndex);
  const totalPages = Math.ceil(data.empresas.length / itemsPerPage);

  const tableColumns = [
    {
      header: 'Nombre',
      accessorKey: 'nombre' as keyof EmpresaRow,
    },
    {
      header: 'Descripción',
      accessorKey: 'descripcion' as keyof EmpresaRow,
    },
    {
      header: 'Usuarios',
      accessorKey: 'usuariosCount' as keyof EmpresaRow,
      cell: (info: { getValue: () => unknown; row: { original: EmpresaRow } }) =>
        `${info.row.original.usuariosCount || 0}`,
    },
    {
      header: 'Fecha de Creación',
      accessorKey: 'createdAt' as keyof EmpresaRow,
      cell: (info: { getValue: () => unknown; row: { original: EmpresaRow } }) =>
        new Date(info.row.original.createdAt).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div className='container mx-auto px-4 py-6'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>Panel de Superadministrador</h1>
        <Button variant='outline' size='sm' onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Spinner className='w-4 h-4 mr-2' />
          ) : (
            <RefreshIcon className='w-4 h-4 mr-2' />
          )}
          Actualizar
        </Button>
      </div>

      {/* Estadísticas Generales */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        <Card className='p-4'>
          <div className='flex items-center'>
            <BuildingOfficeIcon className='w-10 h-10 text-blue-500 mr-3' />
            <div>
              <p className='text-sm text-gray-500'>Empresas</p>
              <p className='text-2xl font-bold'>{data.empresasCount}</p>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center'>
            <UserIcon className='w-10 h-10 text-green-500 mr-3' />
            <div>
              <p className='text-sm text-gray-500'>Usuarios Totales</p>
              <p className='text-2xl font-bold'>{data.totalUsersCount}</p>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center'>
            <ServerIcon className='w-10 h-10 text-purple-500 mr-3' />
            <div>
              <p className='text-sm text-gray-500'>Actividades Recientes</p>
              <p className='text-2xl font-bold'>{data.systemActivity.length}</p>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div>
            <p className='text-sm text-gray-500 mb-1'>Uso de Memoria (RSS)</p>
            <div className='w-full bg-gray-200 rounded-full h-2.5 mb-1'>
              <div
                className={`h-2.5 rounded-full ${
                  data.serverUsage > 80
                    ? 'bg-red-500'
                    : data.serverUsage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${data.serverUsage}%` }}
              ></div>
            </div>
            <p className='text-xs text-right'>{data.serverUsage}%</p>
          </div>
        </Card>
      </div>

      {/* Widgets de servicios especializados */}
      <ServiceWidgetsContainer />

      {/* Información de Empresas */}
      <div className='mb-8'>
        <Card className='p-6'>
          <h2 className='text-lg font-semibold mb-4'>Resumen de Empresas</h2>
          <p className='text-muted-foreground'>
            Total de Empresas registradas: {data.empresas.length}
          </p>
        </Card>
      </div>

      {/* Tabla de Empresas */}
      <div className='mb-8'>
        <Card className='p-6'>
          <h2 className='text-lg font-semibold mb-4'>Listado de Empresas</h2>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-muted/50'>
                <tr>
                  {tableColumns.map((column) => (
                    <th
                      key={String(column.accessorKey)}
                      className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {paginatedEmpresas.map((row) => (
                  <tr key={row.id || row.nombre} className='hover:bg-muted/20'>
                    {tableColumns.map((column) => {
                      return (
                        <td key={String(column.accessorKey)} className='px-4 py-4 text-sm'>
                          {column.cell
                            ? column.cell({
                                getValue: () => row[column.accessorKey],
                                row: { original: row },
                              })
                            : row[column.accessorKey]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación simple */}
          <div className='flex items-center justify-between border-t p-3 mt-4'>
            <div className='text-sm text-muted-foreground'>
              Página {currentPage} de {totalPages}
            </div>
            <div className='flex space-x-2'>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className='px-3 py-1 text-sm bg-muted rounded-md disabled:opacity-50'
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className='px-3 py-1 text-sm bg-muted rounded-md disabled:opacity-50'
              >
                Siguiente
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Actividad Reciente */}
      <div>
        <Card className='p-6'>
          <h2 className='text-lg font-semibold mb-4'>Actividad Reciente del Sistema</h2>
          <div className='space-y-4'>
            {data.systemActivity.map(item => (
              <div key={item.id} className='border-b pb-3 last:border-b-0'>
                <div className='flex justify-between'>
                  <span className='font-medium'>{item.action}</span>
                  <span className='text-sm text-gray-500'>
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className='text-sm text-gray-600 mt-1'>{item.description}</p>
                <p className='text-xs text-gray-500 mt-1'>Usuario: {item.user}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className='mt-8'>
        <Card className='p-6'>
          <h2 className='text-lg font-semibold mb-4'>Información de Empresas</h2>
          <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <BuildingOfficeIcon className='h-8 w-8 text-blue-600' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 dark:text-gray-400 truncate'>
                    Total Empresas
                  </dt>
                  <dd className='text-lg font-medium text-gray-900 dark:text-white'>
                    {data.empresas.length}
                  </dd>
                </dl>
              </div>
            </div>
            <div className='mt-4'>
              <p className='text-sm text-gray-500'>Empresas</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
