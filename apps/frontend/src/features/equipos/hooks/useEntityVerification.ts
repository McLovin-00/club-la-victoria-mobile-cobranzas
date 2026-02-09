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

/** Estado de un documento existente */
export type DocumentoEstado = 
  | 'VIGENTE'
  | 'POR_VENCER'
  | 'VENCIDO'
  | 'PENDIENTE'
  | 'RECHAZADO'
  | 'FALTANTE';

/** Información de un documento existente para la entidad */
export interface DocumentoExistente {
  id: number;
  templateId: number;
  templateName: string;
  estado: DocumentoEstado;
  expiresAt: string | null;
  diasParaVencer: number | null;
  reutilizable: boolean;
}

export interface EntityVerificationResult {
  status: VerificationStatus;
  entityId: number | null;
  nombre?: string;
  dadorActualId: number | null;
  dadorActualNombre?: string;
  equipoActual?: EquipoAsignado;
  asignadaAOtroEquipo: boolean;
  /** Resumen numérico de documentos */
  documentos: {
    vigentes: number;
    porVencer: number;
    vencidos: number;
    total: number;
  };
  /** Lista detallada de documentos existentes para esta entidad */
  documentosDetalle: DocumentoExistente[];
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
    const _cacheKey = `${entityType}:${normalizedId}`;
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
      documentosDetalle: [],
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
          documentosDetalle: [],
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

      // Mapear documentos existentes del backend
      const documentosDetalle: DocumentoExistente[] = (entidad.documentos || []).map((doc: any) => ({
        id: doc.id,
        templateId: doc.templateId,
        templateName: doc.templateName,
        estado: doc.estado as DocumentoEstado,
        expiresAt: doc.expiresAt,
        diasParaVencer: doc.diasParaVencer,
        reutilizable: doc.reutilizable || false,
      }));

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
        documentosDetalle,
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
        documentosDetalle: [],
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
