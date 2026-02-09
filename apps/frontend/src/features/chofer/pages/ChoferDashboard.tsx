import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import bcaLogo from '../../../assets/logo-bca.jpg';

/**
 * Dashboard del Portal Chofer
 * Mismo look & feel que Transportista / Dador de Carga
 * SIN: Crear equipos, Auditoría, Aprobaciones, crear usuarios
 * CON: Consultar y editar documentación de equipos existentes
 */
const ChoferDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4'>
      <div className='w-full max-w-6xl'>
        {/* Header con Logo Grupo BCA */}
        <div className='flex flex-col md:flex-row items-center justify-center gap-6 mb-12'>
          <img 
            src={bcaLogo} 
            alt='Grupo BCA' 
            className='h-32 md:h-40 w-auto object-contain'
          />
          <div className='text-center md:text-left'>
            <h1 className='text-4xl font-bold text-foreground mb-3'>
              Portal Chofer
            </h1>
            <p className='text-lg text-muted-foreground'>
              Gestión de equipos y documentación
            </p>
          </div>
        </div>

        {/* Acción Principal - Consulta de Equipos */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-8'>
          
          {/* CONSULTA Y ACTUALIZACIÓN DE EQUIPOS */}
          <Card 
            className='group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-2 hover:border-green-500 md:col-span-2 md:max-w-2xl md:mx-auto'
            onClick={() => navigate('/documentos/consulta')}
          >
            <CardHeader className='space-y-4 pb-4'>
              <div className='flex justify-center'>
                <div className='p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl group-hover:scale-110 transition-transform duration-300'>
                  <MagnifyingGlassIcon className='h-16 w-16 text-white' />
                </div>
              </div>
              <CardTitle className='text-center text-2xl font-bold'>
                Consulta de Equipos
              </CardTitle>
            </CardHeader>
            <CardContent className='text-center space-y-4'>
              <p className='text-muted-foreground text-lg'>
                Buscar equipos existentes y actualizar su documentación
              </p>
              <ul className='text-sm text-muted-foreground space-y-2 text-left'>
                <li className='flex items-start gap-2'>
                  <MagnifyingGlassIcon className='h-5 w-5 text-green-500 mt-0.5 flex-shrink-0' />
                  <span>Buscar por DNI chofer, patente camión o acoplado</span>
                </li>
                <li className='flex items-start gap-2'>
                  <DocumentTextIcon className='h-5 w-5 text-green-500 mt-0.5 flex-shrink-0' />
                  <span>Ver estado completo de documentación</span>
                </li>
                <li className='flex items-start gap-2'>
                  <DocumentTextIcon className='h-5 w-5 text-green-500 mt-0.5 flex-shrink-0' />
                  <span>Actualizar documentos vencidos o faltantes</span>
                </li>
              </ul>
              <Button 
                size='lg' 
                className='w-full mt-4 bg-green-600 hover:bg-green-700 text-lg h-12'
              >
                Ir a Consulta
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Nota informativa */}
        <Card className='bg-slate-800 dark:bg-slate-900 border-slate-700'>
          <CardContent className='p-6'>
            <div className='text-center text-slate-300'>
              <p>
                Los documentos que subas quedan pendientes de aprobación por el Dador de Carga.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChoferDashboard;
