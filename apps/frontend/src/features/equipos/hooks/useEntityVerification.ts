import { useState, useCallback, useRef } from 'react';
import { usePreCheckDocumentosMutation } from '../../documentos/api/documentosApiSlice';

export type EntityType = 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';

export type VerificationStatus = 
  | 'idle'        // No verificado aún
  | 'checking'    // Verificando...
  | 'nueva'       // No existe, se creará
  | 'disponible'  // Existe y es del mismo dador
  | 'otro_dador'  // Existe pero de otro dador
  | 'error';      // Error al verificar

export interface EquipoAsignado {
  id: number;
  choferNombre?: string;
  camionPatente?: string;
  acopladoPatente?: string;
}

export interface EntityVerificationResult {
  status: VerificationStatus;
  entityId: number | null;
  nombre?: string;
  dadorActualId: number | null;
  dadorActualNombre?: string;
  equipoActual?: EquipoAsignado;
  asignadaAOtroEquipo: boolean;
  documentos: {
    vigentes: number;
    porVencer: number;
    vencidos: number;
    total: number;
  };
  error?: string;
}

export interface UseEntityVerificationOptions {
  dadorCargaId?: number | null;
}

export interface UseEntityVerificationReturn {
  verify: (entityType: EntityType, identificador: string) => Promise<EntityVerificationResult | null>;
  results: Map<string, EntityVerificationResult>;
  getResult: (entityType: EntityType) => EntityVerificationResult | undefined;
  clearResult: (entityType: EntityType) => void;
  clearAll: () => void;
}

/**
 * Hook para verificar entidades individualmente antes de crear un equipo.
 * Permite saber si una entidad (empresa, chofer, camión, acoplado) ya existe
 * y si pertenece al mismo dador de carga.
 * 
 * @param options.dadorCargaId - ID del dador de carga seleccionado (requerido para ADMIN_INTERNO)
 */
export function useEntityVerification(options: UseEntityVerificationOptions = {}): UseEntityVerificationReturn {
  const { dadorCargaId } = options;
  const [preCheck] = usePreCheckDocumentosMutation();
  const [results, setResults] = useState<Map<string, EntityVerificationResult>>(new Map());
  
  // Cache para evitar verificaciones duplicadas
  const lastChecked = useRef<Map<string, string>>(new Map());

  const verify = useCallback(async (
    entityType: EntityType, 
    identificador: string
  ): Promise<EntityVerificationResult | null> => {
    // Validar que el identificador tenga formato mínimo
    const minLengths: Record<EntityType, number> = {
      EMPRESA_TRANSPORTISTA: 11, // CUIT
      CHOFER: 6,                 // DNI
      CAMION: 5,                 // Patente
      ACOPLADO: 5,               // Patente
    };

    const normalizedId = identificador.trim().toUpperCase();
    
    if (normalizedId.length < minLengths[entityType]) {
      return null; // No verificar si no tiene longitud mínima
    }

    // Evitar verificaciones duplicadas
    const cacheKey = `${entityType}:${normalizedId}`;
    if (lastChecked.current.get(entityType) === normalizedId) {
      return results.get(entityType) || null;
    }

    // Marcar como verificando
    const checkingResult: EntityVerificationResult = {
      status: 'checking',
      entityId: null,
      dadorActualId: null,
      asignadaAOtroEquipo: false,
      documentos: { vigentes: 0, porVencer: 0, vencidos: 0, total: 0 },
    };
    
    setResults(prev => new Map(prev).set(entityType, checkingResult));
    lastChecked.current.set(entityType, normalizedId);

    try {
      const response = await preCheck({
        entidades: [{ entityType, identificador: normalizedId }],
        ...(dadorCargaId && { dadorCargaId }),
      }).unwrap();

      const entidad = response.entidades[0];
      
      if (!entidad) {
        const errorResult: EntityVerificationResult = {
          status: 'error',
          entityId: null,
          dadorActualId: null,
          asignadaAOtroEquipo: false,
          documentos: { vigentes: 0, porVencer: 0, vencidos: 0, total: 0 },
          error: 'No se recibió respuesta del servidor',
        };
        setResults(prev => new Map(prev).set(entityType, errorResult));
        return errorResult;
      }

      let status: VerificationStatus;
      if (!entidad.existe) {
        status = 'nueva';
      } else if (entidad.perteneceSolicitante) {
        status = 'disponible';
      } else {
        status = 'otro_dador';
      }

      const result: EntityVerificationResult = {
        status,
        entityId: entidad.entityId,
        nombre: entidad.nombre,
        dadorActualId: entidad.dadorCargaActualId,
        dadorActualNombre: entidad.dadorCargaActualNombre,
        equipoActual: entidad.equipoActual,
        asignadaAOtroEquipo: entidad.asignadaAOtroEquipo || false,
        documentos: {
          vigentes: entidad.resumen?.vigentes || 0,
          porVencer: entidad.resumen?.porVencer || 0,
          vencidos: entidad.resumen?.vencidos || 0,
          total: entidad.resumen?.total || 0,
        },
      };

      setResults(prev => new Map(prev).set(entityType, result));
      return result;

    } catch (err: any) {
      const errorResult: EntityVerificationResult = {
        status: 'error',
        entityId: null,
        dadorActualId: null,
        asignadaAOtroEquipo: false,
        documentos: { vigentes: 0, porVencer: 0, vencidos: 0, total: 0 },
        error: err?.data?.message || 'Error al verificar',
      };
      setResults(prev => new Map(prev).set(entityType, errorResult));
      return errorResult;
    }
  }, [preCheck, results, dadorCargaId]);

  const getResult = useCallback((entityType: EntityType) => {
    return results.get(entityType);
  }, [results]);

  const clearResult = useCallback((entityType: EntityType) => {
    setResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(entityType);
      return newMap;
    });
    lastChecked.current.delete(entityType);
  }, []);

  const clearAll = useCallback(() => {
    setResults(new Map());
    lastChecked.current.clear();
  }, []);

  return {
    verify,
    results,
    getResult,
    clearResult,
    clearAll,
  };
}
