import React from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useServiceFlags } from '../../../hooks/useServiceConfig';
import { ArrowTopRightOnSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

/**
 * Widget para Gateway Service
 */
// Eliminado: GatewayWidget

/**
 * Widget para Chat Processor Service
 */
// Eliminado: ChatProcessorWidget



/**
 * Contenedor de widgets de servicios con renderizado condicional
 */
export const ServiceWidgetsContainer: React.FC = () => {
  const serviceFlags = useServiceFlags();

  // Si no hay servicios habilitados, no mostrar nada
  if (true === false) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Servicios Especializados
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Eliminados widgets de servicios no core */}
      </div>
    </div>
  );
};

export default ServiceWidgetsContainer; 