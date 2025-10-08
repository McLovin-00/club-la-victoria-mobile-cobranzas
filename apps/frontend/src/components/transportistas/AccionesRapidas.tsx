import React from 'react';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { FloatingActionButton } from '../mobile/FloatingActionButton';
import { logger } from '../../utils/logger';
import { 
  CameraIcon,
  DocumentArrowUpIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

export const AccionesRapidas: React.FC = () => {
  const quickActions = [
    {
      id: 'register-equipo',
      icon: TruckIcon,
      label: 'Registrar Equipo',
      color: 'bg-green-500',
      onPress: () => logger.debug('Register equipo')
    },
    {
      id: 'calendar',
      icon: CalendarDaysIcon,
      label: 'Calendario',
      color: 'bg-purple-500',
      onPress: () => logger.debug('Open calendar')
    },
    {
      id: 'settings',
      icon: Cog6ToothIcon,
      label: 'Configuración',
      color: 'bg-gray-500',
      onPress: () => logger.debug('Open settings')
    }
  ];

  const fabActions = [
    {
      id: 'camera',
      icon: CameraIcon,
      label: 'Tomar Foto',
      color: 'bg-green-500',
      onClick: () => logger.debug('Opening camera')
    },
    {
      id: 'upload',
      icon: DocumentArrowUpIcon,
      label: 'Subir Archivo',
      color: 'bg-blue-500',
      onClick: () => logger.debug('Opening file picker')
    }
  ];

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 px-1">
          Acciones Rápidas
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <TouchFeedback
              key={action.id}
              onPress={action.onPress}
              hapticFeedback="light"
              scaleOnPress
            >
              <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex flex-col items-center space-y-3">
                  <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-sm font-medium text-gray-900 text-center">
                    {action.label}
                  </div>
                </div>
              </div>
            </TouchFeedback>
          ))}
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mt-6">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-lg">💡</span>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">
                Tip del día
              </h4>
              <p className="text-sm text-blue-700">
                Usa el botón flotante para subir documentos rápidamente. 
                La cámara automáticamente mejora la calidad de las fotos.
              </p>
            </div>
          </div>
        </div>
      </div>

      <FloatingActionButton
        actions={fabActions}
        position="bottom-right"
        size="normal"
      />
    </>
  );
};

export default AccionesRapidas;
