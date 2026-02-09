import React from 'react';
import { useGetAdminDashboardQuery, useRefreshDashboardMutation } from '@/features/dashboard/api/dashboardApiSlice';

import { Card } from '../../../components/ui/card';
import { showToast } from '../../../components/ui/Toast.utils';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import {
  UserIcon,
  BuildingOfficeIcon,
  ArrowPathIcon as RefreshIcon,
} from '../../../components/icons';
import { ServiceWidgetsContainer } from './ServiceWidgets';

export const AdminDashboard: React.FC = () => {
  const { data, isLoading, error, refetch } = useGetAdminDashboardQuery();
  const [refreshDashboard, { isLoading: isRefreshing }] = useRefreshDashboardMutation();

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
        <Spinner className='h-8 w-8' />
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

  if (!data) {
    return (
      <div className='bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4'>
        <p>No hay datos disponibles en este momento</p>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-6'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>Panel de Administrador</h1>
        <Button variant='outline' size='sm' onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Spinner className='h-4 w-4' />
          ) : (
            <RefreshIcon className='w-4 h-4 mr-2' />
          )}
          Actualizar
        </Button>
      </div>

      {/* Estadísticas Generales */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8'>
        <Card className='p-4'>
          <div className='flex items-center'>
            <UserIcon className='w-10 h-10 text-blue-500 mr-3' />
            <div>
              <p className='text-sm text-gray-500'>Usuarios</p>
              <p className='text-2xl font-bold'>{data.usersCount}</p>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center'>
            <BuildingOfficeIcon className='w-10 h-10 text-green-500 mr-3' />
            <div>
              <p className='text-sm text-gray-500'>Bots Configurados</p>
              <p className='text-2xl font-bold'>{data.bots?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center'>
            <UserIcon className='w-10 h-10 text-purple-500 mr-3' />
            <div>
              <p className='text-sm text-gray-500'>Clientes</p>
              <p className='text-2xl font-bold'>{data.clientsCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Widgets de servicios especializados */}
      <ServiceWidgetsContainer />

      {/* Completitud de Bots */}
      {data.botCompleteness && data.botCompleteness.length > 0 && (
        <div className='mb-8'>
          <Card className='p-6'>
            <h2 className='text-lg font-semibold mb-4'>Estado de configuración de bots</h2>
            <div className='space-y-4'>
              {data.botCompleteness.map(bot => (
                <div key={bot.botId} className='space-y-2'>
                  <div className='flex justify-between items-center'>
                    <span>{bot.botName}</span>
                    <span className='text-sm font-medium'>
                      {Math.round(bot.completedPercentage * 100)}%
                    </span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2.5'>
                    <div
                      className={`h-2.5 rounded-full ${
                        bot.completedPercentage > 0.8
                          ? 'bg-green-500'
                          : bot.completedPercentage > 0.4
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${bot.completedPercentage * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Usuarios */}
      <div className='mb-8'>
        <Card className='p-6'>
          <h2 className='text-lg font-semibold mb-4'>Usuarios de la empresa</h2>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Email
                  </th>
                  <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Rol
                  </th>
                  <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Bots Habilitados
                  </th>
                  <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Última Actividad
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {data.users && data.users.length > 0 ? (
                  data.users.map(user => (
                    <tr key={user.id} className='hover:bg-muted/20'>
                      <td className='px-4 py-4 text-sm'>{user.email}</td>
                      <td className='px-4 py-4 text-sm'>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            user.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className='px-4 py-4 text-sm'>
                        <div className='flex flex-wrap gap-1'>
                          {user.botsEnabled?.map(botId => (
                            <span
                              key={botId}
                              className='px-2 py-1 bg-green-100 text-green-800 rounded text-xs'
                            >
                              Bot {botId}
                            </span>
                          ))}
                          {(!user.botsEnabled || user.botsEnabled.length === 0) && (
                            <span className='text-gray-500 text-xs'>Sin permisos</span>
                          )}
                        </div>
                      </td>
                      <td className='px-4 py-4 text-sm'>
                        {new Date(user.lastActive).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className='px-4 py-8 text-center text-gray-500'>
                      No hay usuarios en esta empresa
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Actividad Reciente */}
      <div>
        <Card className='p-6'>
          <h2 className='text-lg font-semibold mb-4'>Actividad Reciente</h2>
          <div className='space-y-4'>
            {data.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.map(item => (
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
              ))
            ) : (
              <p className='text-center text-gray-500 py-6'>No hay actividad reciente</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
