import React from 'react';
import { Card } from '../../../components/ui/card';
import { useGetDashboardDataQuery } from '../api/documentosApiSlice';

interface DocumentsSemaforoProps {
  empresaId: number;
}

export const DocumentsSemaforo: React.FC<DocumentsSemaforoProps> = ({
  empresaId,
}) => {
  const { data, isLoading, error } = useGetDashboardDataQuery();

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className='p-4'>
            <div className='animate-pulse'>
              <div className='h-4 bg-gray-200 rounded mb-2'></div>
              <div className='h-8 bg-gray-200 rounded'></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='text-center py-8'>
        <p className='text-muted-foreground'>
          Error al cargar el estado de documentación
        </p>
      </div>
    );
  }

  // Filtrar datos por empresa (id del dador/tenant)
  const empresaSemaforos = data.semaforos.filter(
    (item) => item.empresaId === empresaId
  );

  // Calcular totales por categoría
  const totales = {
    empresa: { red: 0, yellow: 0, green: 0 },
    chofer: { red: 0, yellow: 0, green: 0 },
    camion: { red: 0, yellow: 0, green: 0 },
    acoplado: { red: 0, yellow: 0, green: 0 },
  };

  // Backend devuelve un resumen por empresa con statusCounts = { verde:[empresa,chofer,camion,acoplado], amarillo:[...], rojo:[...] }
  empresaSemaforos.forEach((summary: any) => {
    const verde = Array.isArray(summary?.statusCounts?.verde) ? summary.statusCounts.verde : [0,0,0,0];
    const amarillo = Array.isArray(summary?.statusCounts?.amarillo) ? summary.statusCounts.amarillo : [0,0,0,0];
    const rojo = Array.isArray(summary?.statusCounts?.rojo) ? summary.statusCounts.rojo : [0,0,0,0];

    // Empresa (transportista)
    totales.empresa.green += Number(verde[0] || 0);
    totales.empresa.yellow += Number(amarillo[0] || 0);
    totales.empresa.red += Number(rojo[0] || 0);

    // Choferes
    totales.chofer.green += Number(verde[1] || 0);
    totales.chofer.yellow += Number(amarillo[1] || 0);
    totales.chofer.red += Number(rojo[1] || 0);

    // Camiones
    totales.camion.green += Number(verde[2] || 0);
    totales.camion.yellow += Number(amarillo[2] || 0);
    totales.camion.red += Number(rojo[2] || 0);

    // Acoplados
    totales.acoplado.green += Number(verde[3] || 0);
    totales.acoplado.yellow += Number(amarillo[3] || 0);
    totales.acoplado.red += Number(rojo[3] || 0);
  });

  const SemaforoCard: React.FC<{
    title: string;
    icon: string;
    data: { red: number; yellow: number; green: number };
  }> = ({ title, icon, data }) => (
    <Card className='p-4'>
      <div className='flex items-center justify-between mb-3'>
        <h3 className='font-medium text-foreground'>{title}</h3>
        <span className='text-2xl'>{icon}</span>
      </div>
      <div className='grid grid-cols-3 gap-2'>
        <div className='text-center'>
          <div className='w-8 h-8 bg-red-500 rounded-full mx-auto mb-1 flex items-center justify-center'>
            <span className='text-white text-sm font-bold'>{data.red}</span>
          </div>
          <p className='text-xs text-muted-foreground'>Vencidos</p>
        </div>
        <div className='text-center'>
          <div className='w-8 h-8 bg-yellow-500 rounded-full mx-auto mb-1 flex items-center justify-center'>
            <span className='text-white text-sm font-bold'>{data.yellow}</span>
          </div>
          <p className='text-xs text-muted-foreground'>Por vencer</p>
        </div>
        <div className='text-center'>
          <div className='w-8 h-8 bg-green-500 rounded-full mx-auto mb-1 flex items-center justify-center'>
            <span className='text-white text-sm font-bold'>{data.green}</span>
          </div>
          <p className='text-xs text-muted-foreground'>Vigentes</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
      <SemaforoCard title='Empresa transportista' icon='🏢' data={totales.empresa} />
      <SemaforoCard
        title='Choferes'
        icon='👨‍💼'
        data={totales.chofer}
      />
      <SemaforoCard
        title='Camiones'
        icon='🚛'
        data={totales.camion}
      />
      <SemaforoCard
        title='Acoplados'
        icon='🚚'
        data={totales.acoplado}
      />
    </div>
  );
};