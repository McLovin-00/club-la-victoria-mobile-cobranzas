import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  TruckIcon, 
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

/**
 * Dashboard del Portal Dador de Carga
 * Interfaz similar al Admin Interno pero sin auditoría
 * Datos filtrados por dadorCargaId del usuario
 */
const DadorDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4'>
      <div className='w-full max-w-6xl'>
        {/* Header */}
        <div className='text-center mb-12'>
          <div className='inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-2xl mb-6'>
            <BuildingOfficeIcon className='h-12 w-12 text-white' />
          </div>
          <h1 className='text-4xl font-bold text-foreground mb-3'>
            Portal Dador de Carga
          </h1>
          <p className='text-lg text-muted-foreground'>
            Gestión de equipos, documentación y aprobaciones
          </p>
        </div>

        {/* Dos Acciones Principales */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-8'>
          
          {/* 1. ALTA COMPLETA DE EQUIPO */}
          <Card 
            className='group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-2 hover:border-indigo-500'
            onClick={() => navigate('/documentos/equipos/alta-completa')}
          >
            <CardHeader className='space-y-4 pb-4'>
              <div className='flex justify-center'>
                <div className='p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300'>
                  <TruckIcon className='h-16 w-16 text-white' />
                </div>
              </div>
              <CardTitle className='text-center text-2xl font-bold'>
                Alta Completa de Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className='text-center space-y-4'>
              <p className='text-muted-foreground text-lg'>
                Registrar nuevo equipo con toda su documentación
              </p>
              <ul className='text-sm text-muted-foreground space-y-2 text-left'>
                <li className='flex items-start gap-2'>
                  <DocumentTextIcon className='h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0' />
                  <span>Carga de empresa transportista y chofer</span>
                </li>
                <li className='flex items-start gap-2'>
                  <DocumentTextIcon className='h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0' />
                  <span>Registro de camión y acoplado</span>
                </li>
                <li className='flex items-start gap-2'>
                  <DocumentTextIcon className='h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0' />
                  <span>Subida de todos los documentos requeridos</span>
                </li>
              </ul>
              <Button 
                size='lg' 
                className='w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-lg h-12'
              >
                Iniciar Alta Completa
              </Button>
            </CardContent>
          </Card>

          {/* 2. CONSULTA Y ACTUALIZACIÓN */}
          <Card 
            className='group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-2 hover:border-green-500'
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
                  <MagnifyingGlassIcon className='h-5 w-5 text-green-500 mt-0.5 flex-shrink-0' />
                  <span>Ver estado completo de documentación</span>
                </li>
                <li className='flex items-start gap-2'>
                  <MagnifyingGlassIcon className='h-5 w-5 text-green-500 mt-0.5 flex-shrink-0' />
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

        {/* Acceso Rápido Adicional - Sin Auditoría */}
        <Card className='bg-slate-800 dark:bg-slate-900 border-slate-700'>
          <CardContent className='p-6'>
            <div className='flex flex-wrap items-center justify-center gap-4'>
              <span className='text-slate-300 font-medium'>Acceso rápido:</span>
              <Button 
                variant='outline' 
                size='sm'
                className='border-slate-600 hover:bg-slate-700 text-slate-200'
                onClick={() => navigate('/documentos/aprobacion')}
              >
                <ClipboardDocumentCheckIcon className='h-4 w-4 mr-2' />
                Aprobaciones Pendientes
              </Button>
              <Button 
                variant='outline' 
                size='sm'
                className='border-slate-600 hover:bg-slate-700 text-slate-200'
                onClick={() => navigate('/documentos/equipos')}
              >
                <TruckIcon className='h-4 w-4 mr-2' />
                Lista de Equipos
              </Button>
              <Button 
                variant='outline' 
                size='sm'
                className='border-slate-600 hover:bg-slate-700 text-slate-200'
                onClick={() => navigate('/documentos/empresas-transportistas')}
              >
                <BuildingOfficeIcon className='h-4 w-4 mr-2' />
                Empresas Transportistas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info del rol */}
        <div className='mt-8 text-center'>
          <p className='text-sm text-muted-foreground'>
            💡 Como Dador de Carga, puedes gestionar equipos, aprobar documentos y asignar equipos a clientes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DadorDashboard;
