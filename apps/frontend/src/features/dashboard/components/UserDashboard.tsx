import React from 'react';
import { useGetUserDashboardQuery, useRefreshDashboardMutation } from '../api/dashboardApiSlice';

import { Card } from '../../../components/ui/card';
import { showToast } from '../../../components/ui/Toast.utils';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { ArrowPathIcon as RefreshIcon } from '../../../components/icons';

export const UserDashboard: React.FC = () => {
  const { data, isLoading, error, refetch } = useGetUserDashboardQuery();
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
        <h1 className='text-2xl font-bold'>Mi Dashboard</h1>
        <Button variant='outline' size='sm' onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Spinner className='h-4 w-4' />
          ) : (
            <RefreshIcon className='w-4 h-4 mr-2' />
          )}
          Actualizar
        </Button>
      </div>

      {/* Actividad Reciente */}
      <div>
        <Card className='p-6'>
          <h2 className='text-lg font-semibold mb-4'>Actividad Reciente</h2>
          {data.recentActivity.length > 0 ? (
            <div className='space-y-4'>
              {data.recentActivity.map(item => (
                <div key={item.id} className='border-b pb-3 last:border-b-0'>
                  <div className='flex justify-between'>
                    <span className='font-medium'>{item.action}</span>
                    <span className='text-sm text-gray-500'>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className='text-sm text-gray-600 mt-1'>{item.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-center text-gray-500 py-6'>No hay actividad reciente</p>
          )}
        </Card>
      </div>
    </div>
  );
};
