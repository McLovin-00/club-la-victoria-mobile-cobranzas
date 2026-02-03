import React from 'react';
import { EntityVerificationResult, VerificationStatus, EntityType } from '../hooks/useEntityVerification';

// Helper para obtener nombre legible del tipo de entidad
function getEntityTypeName(entityType?: EntityType): string {
  const names: Record<EntityType, string> = {
    CHOFER: 'chofer',
    CAMION: 'camión',
    ACOPLADO: 'acoplado',
    EMPRESA_TRANSPORTISTA: 'empresa transportista',
  };
  return entityType ? names[entityType] ?? 'esta entidad' : 'esta entidad';
}

interface EntityStatusBadgeProps {
  result?: EntityVerificationResult;
  entityType?: EntityType;
  onRequestTransfer?: () => void;
  onAcceptReassignment?: () => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<VerificationStatus | 'en_otro_equipo', {
  icon: string;
  label: string;
  bgColor: string;
  textColor: string;
}> = {
  idle: {
    icon: '',
    label: '',
    bgColor: '',
    textColor: '',
  },
  checking: {
    icon: '🔄',
    label: 'Verificando...',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
  nueva: {
    icon: '🆕',
    label: 'Nueva',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  disponible: {
    icon: '✓',
    label: 'Disponible',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
  otro_dador: {
    icon: '⚠️',
    label: 'De otro dador',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
  },
  en_otro_equipo: {
    icon: '🔄',
    label: 'En otro equipo',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
  },
  error: {
    icon: '❌',
    label: 'Error',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },
};

/**
 * Badge que muestra el estado de verificación de una entidad.
 * Se usa inline junto a los campos de CUIT, DNI y patentes.
 */
export const EntityStatusBadge: React.FC<EntityStatusBadgeProps> = ({
  result,
  entityType,
  onRequestTransfer,
  onAcceptReassignment,
  compact = false,
}) => {
  if (!result || result.status === 'idle') {
    return null;
  }

  // Determinar el estado visual a mostrar
  // Si está asignada a otro equipo (mismo dador), mostrar advertencia de reasignación
  const showReassignmentWarning = result.asignadaAOtroEquipo && 
    result.status === 'disponible' && 
    entityType !== 'EMPRESA_TRANSPORTISTA'; // Empresa puede tener múltiples equipos

  const displayStatus = showReassignmentWarning ? 'en_otro_equipo' : result.status;
  const config = STATUS_CONFIG[displayStatus];

  // Verificando - mostrar spinner
  if (result.status === 'checking') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bgColor} ${config.textColor}`}>
        <span className="animate-spin">🔄</span>
        <span>{config.label}</span>
      </span>
    );
  }

  // Modo compacto - solo icono y texto breve
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bgColor} ${config.textColor}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  }

  // Modo expandido con información de documentos
  return (
    <div className={`mt-1 p-2 rounded ${config.bgColor} ${config.textColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{config.icon}</span>
          <span className="text-sm font-medium">{config.label}</span>
          
          {/* Mostrar nombre si existe */}
          {result.nombre && result.status === 'disponible' && (
            <span className="text-xs opacity-75">({result.nombre})</span>
          )}
        </div>

        {/* Botón de solicitar transferencia */}
        {result.status === 'otro_dador' && onRequestTransfer && (
          <button
            type="button"
            onClick={onRequestTransfer}
            className="text-xs px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded transition-colors"
          >
            Solicitar
          </button>
        )}
      </div>

      {/* Info adicional para entidades existentes */}
      {result.status === 'disponible' && result.documentos.total > 0 && (
        <div className="mt-1 text-xs opacity-75 flex gap-2">
          {result.documentos.vigentes > 0 && (
            <span>✓ {result.documentos.vigentes} vigentes</span>
          )}
          {result.documentos.porVencer > 0 && (
            <span className="text-yellow-600">⏰ {result.documentos.porVencer} por vencer</span>
          )}
          {result.documentos.vencidos > 0 && (
            <span className="text-red-600">⛔ {result.documentos.vencidos} vencidos</span>
          )}
        </div>
      )}

      {/* Mensaje para entidades de otro dador */}
      {result.status === 'otro_dador' && (
        <p className="mt-1 text-xs opacity-75">
          Pertenece a: {result.dadorActualNombre || 'Otro dador de carga'}
        </p>
      )}

      {/* Advertencia de reasignación - entidad en otro equipo */}
      {showReassignmentWarning && result.equipoActual && (
        <div className="mt-2 p-2 bg-orange-100 rounded border border-orange-200">
          <p className="text-xs font-medium text-orange-800">
            ⚠️ Esta entidad será REASIGNADA
          </p>
          <p className="text-xs text-orange-700 mt-1">
            Actualmente en Equipo #{result.equipoActual.id}
            {result.equipoActual.choferNombre && ` - ${result.equipoActual.choferNombre}`}
            {result.equipoActual.camionPatente && ` - ${result.equipoActual.camionPatente}`}
          </p>
          <p className="text-xs text-orange-600 mt-1 italic">
            El equipo anterior quedará sin {getEntityTypeName(entityType)}
          </p>
          {onAcceptReassignment && (
            <button
              type="button"
              onClick={onAcceptReassignment}
              className="mt-2 text-xs px-2 py-1 bg-orange-200 hover:bg-orange-300 rounded transition-colors"
            >
              Entendido, continuar
            </button>
          )}
        </div>
      )}

      {/* Mensaje para nuevas */}
      {result.status === 'nueva' && (
        <p className="mt-1 text-xs opacity-75">
          Se creará al confirmar el alta
        </p>
      )}

      {/* Error */}
      {result.status === 'error' && result.error && (
        <p className="mt-1 text-xs">{result.error}</p>
      )}
    </div>
  );
};

export default EntityStatusBadge;
