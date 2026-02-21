import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import type { EstadoDocumental, EntityType, DocumentStatus } from '.prisma/documentos';

// ============================================================================
// EquipoEvaluationService - Evaluación del estado documental de equipos
// Actualiza automáticamente el campo estadoDocumental basado en documentos
// ============================================================================

/** Resultado de evaluación de un equipo */
export interface EquipoEvaluationResult {
  equipoId: number;
  estadoAnterior: EstadoDocumental;
  estadoNuevo: EstadoDocumental;
  cambio: boolean;
  detalles: EvaluationDetalles;
}

interface EvaluationDetalles {
  totalDocumentos: number;
  vigentes: number;
  porVencer: number;
  vencidos: number;
  pendientes: number;
  rechazados: number;
  faltantes: number;
  entidadesEvaluadas: {
    entityType: EntityType;
    entityId: number;
    identificador: string;
  }[];
}

// Estados que se consideran "pendientes de aprobación"
const ESTADOS_PENDIENTES: DocumentStatus[] = [
  'PENDIENTE',
  'PENDIENTE_APROBACION',
  'VALIDANDO',
  'CLASIFICANDO',
];

// Días de anticipación por defecto cuando no hay requisitos de plantilla asignados
const DIAS_POR_VENCER_DEFAULT = 30;

/**
 * Obtiene los IDs de entidades de un equipo
 */
async function obtenerEntidadesEquipo(equipoId: number): Promise<{
  dadorCargaId: number;
  tenantEmpresaId: number;
  entidades: { entityType: EntityType; entityId: number; identificador: string }[];
} | null> {
  const equipo = await prisma.equipo.findUnique({
    where: { id: equipoId },
    select: {
      dadorCargaId: true,
      tenantEmpresaId: true,
      driverId: true,
      truckId: true,
      trailerId: true,
      empresaTransportistaId: true,
      driverDniNorm: true,
      truckPlateNorm: true,
      trailerPlateNorm: true,
    },
  });

  if (!equipo) return null;

  const entidades: { entityType: EntityType; entityId: number; identificador: string }[] = [];

  // Chofer
  if (equipo.driverId) {
    entidades.push({
      entityType: 'CHOFER',
      entityId: equipo.driverId,
      identificador: equipo.driverDniNorm,
    });
  }

  // Camión
  if (equipo.truckId) {
    entidades.push({
      entityType: 'CAMION',
      entityId: equipo.truckId,
      identificador: equipo.truckPlateNorm,
    });
  }

  // Acoplado
  if (equipo.trailerId) {
    entidades.push({
      entityType: 'ACOPLADO',
      entityId: equipo.trailerId,
      identificador: equipo.trailerPlateNorm || '',
    });
  }

  // Empresa transportista
  if (equipo.empresaTransportistaId) {
    const empresa = await prisma.empresaTransportista.findUnique({
      where: { id: equipo.empresaTransportistaId },
      select: { cuit: true },
    });
    if (empresa) {
      entidades.push({
        entityType: 'EMPRESA_TRANSPORTISTA',
        entityId: equipo.empresaTransportistaId,
        identificador: empresa.cuit,
      });
    }
  }

  return {
    dadorCargaId: equipo.dadorCargaId,
    tenantEmpresaId: equipo.tenantEmpresaId,
    entidades,
  };
}

/**
 * Obtiene templates requeridos para todas las entidades del equipo.
 * Consulta plantillas asignadas al equipo para obtener diasAnticipacion real.
 * Si no hay plantillas asignadas, usa templates globales con el default.
 */
async function obtenerTemplatesRequeridos(
  equipoId: number,
  entidades: { entityType: EntityType; entityId: number }[]
): Promise<{ requeridos: Map<string, number>; maxDiasAnticipacion: number }> {
  const requeridos = new Map<string, number>();
  let maxDiasAnticipacion = DIAS_POR_VENCER_DEFAULT;

  const plantillasAsignadas = await prisma.equipoPlantillaRequisito.findMany({
    where: { equipoId, asignadoHasta: null },
    select: { plantillaRequisitoId: true },
  });

  if (plantillasAsignadas.length > 0) {
    const plantillaIds = plantillasAsignadas.map(p => p.plantillaRequisitoId);
    const configs = await prisma.plantillaRequisitoTemplate.findMany({
      where: {
        plantillaRequisitoId: { in: plantillaIds },
        plantillaRequisito: { activo: true },
      },
      select: { templateId: true, entityType: true, diasAnticipacion: true },
    });

    for (const c of configs) {
      const key = `${c.entityType}:${c.templateId}`;
      requeridos.set(key, (requeridos.get(key) || 0) + 1);
      if (c.diasAnticipacion > maxDiasAnticipacion) {
        maxDiasAnticipacion = c.diasAnticipacion;
      }
    }
  } else {
    for (const { entityType } of entidades) {
      const templates = await prisma.documentTemplate.findMany({
        where: { entityType, active: true },
        select: { id: true },
      });
      for (const t of templates) {
        const key = `${entityType}:${t.id}`;
        requeridos.set(key, (requeridos.get(key) || 0) + 1);
      }
    }
  }

  return { requeridos, maxDiasAnticipacion };
}

/**
 * Cuenta documentos por estado para las entidades del equipo
 */
async function contarDocumentos(
  tenantEmpresaId: number,
  dadorCargaId: number,
  entidades: { entityType: EntityType; entityId: number }[],
  diasPorVencer: number = DIAS_POR_VENCER_DEFAULT
): Promise<{
  vigentes: number;
  porVencer: number;
  vencidos: number;
  pendientes: number;
  rechazados: number;
  documentosPorEntidad: Map<string, number[]>;
}> {
  const orClauses = entidades.map(e => ({
    entityType: e.entityType,
    entityId: e.entityId,
  }));

  if (orClauses.length === 0) {
    return {
      vigentes: 0,
      porVencer: 0,
      vencidos: 0,
      pendientes: 0,
      rechazados: 0,
      documentosPorEntidad: new Map(),
    };
  }

  const docs = await prisma.document.findMany({
    where: {
      tenantEmpresaId,
      dadorCargaId,
      archived: false,
      OR: orClauses,
    },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      templateId: true,
      status: true,
      expiresAt: true,
      uploadedAt: true,
    },
    orderBy: { uploadedAt: 'desc' },
  });

  // Agrupar por entidad+template, tomar el más reciente
  const docsPorKey = new Map<string, typeof docs[0]>();
  const documentosPorEntidad = new Map<string, number[]>();

  for (const doc of docs) {
    const key = `${doc.entityType}:${doc.entityId}:${doc.templateId}`;
    if (!docsPorKey.has(key)) {
      docsPorKey.set(key, doc);
    }
    
    const entidadKey = `${doc.entityType}:${doc.entityId}`;
    const existing = documentosPorEntidad.get(entidadKey) || [];
    if (!existing.includes(doc.templateId)) {
      existing.push(doc.templateId);
      documentosPorEntidad.set(entidadKey, existing);
    }
  }

  const now = new Date();
  const limitePorVencer = new Date(now.getTime() + diasPorVencer * 24 * 60 * 60 * 1000);

  const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };

  for (const doc of docsPorKey.values()) {
    clasificarDocumento(doc, now, limitePorVencer, stats);
  }

  return { ...stats, documentosPorEntidad };
}

/**
 * Clasifica un documento y actualiza los contadores
 */
function clasificarDocumento(
  doc: { status: string; expiresAt: Date | null },
  now: Date,
  limitePorVencer: Date,
  stats: { vigentes: number; porVencer: number; vencidos: number; pendientes: number; rechazados: number }
): void {
  if (doc.status === 'RECHAZADO') {
    stats.rechazados++;
    return;
  }

  if (doc.status === 'VENCIDO' || (doc.expiresAt && doc.expiresAt < now)) {
    stats.vencidos++;
    return;
  }

  if (ESTADOS_PENDIENTES.includes(doc.status as DocumentStatus)) {
    stats.pendientes++;
    return;
  }

  if (doc.status === 'APROBADO') {
    if (doc.expiresAt && doc.expiresAt <= limitePorVencer) {
      stats.porVencer++;
    } else {
      stats.vigentes++;
    }
  }
}

/**
 * Determina el estado documental basado en conteos
 */
function determinarEstadoDocumental(
  stats: {
    vigentes: number;
    porVencer: number;
    vencidos: number;
    pendientes: number;
    rechazados: number;
    faltantes: number;
  }
): EstadoDocumental {
  // Prioridad: Vencidos > Incompleto > Pendiente > Por vencer > Completo
  
  if (stats.vencidos > 0) {
    return 'DOCUMENTACION_VENCIDA';
  }
  
  if (stats.faltantes > 0 || stats.rechazados > 0) {
    return 'DOCUMENTACION_INCOMPLETA';
  }
  
  if (stats.pendientes > 0) {
    return 'PENDIENTE_VALIDACION';
  }
  
  if (stats.porVencer > 0) {
    return 'DOCUMENTACION_POR_VENCER';
  }
  
  if (stats.vigentes > 0) {
    return 'COMPLETO';
  }
  
  // Sin documentos = incompleto
  return 'DOCUMENTACION_INCOMPLETA';
}

export class EquipoEvaluationService {
  /**
   * Evalúa y actualiza el estado documental de un equipo
   */
  static async evaluarEquipo(equipoId: number): Promise<EquipoEvaluationResult | null> {
    AppLogger.info('📊 Evaluando estado documental de equipo', { equipoId });

    // Obtener estado actual
    const equipoActual = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: { estadoDocumental: true },
    });

    if (!equipoActual) {
      AppLogger.warn('⚠️ Equipo no encontrado para evaluación', { equipoId });
      return null;
    }

    const estadoAnterior = equipoActual.estadoDocumental;

    // Obtener entidades del equipo
    const datosEquipo = await obtenerEntidadesEquipo(equipoId);
    if (!datosEquipo) {
      return null;
    }

    const { dadorCargaId, tenantEmpresaId, entidades } = datosEquipo;

    // Obtener templates requeridos con diasAnticipacion real
    const { requeridos: templatesRequeridos, maxDiasAnticipacion } =
      await obtenerTemplatesRequeridos(equipoId, entidades);

    // Contar documentos usando diasAnticipacion real
    const conteos = await contarDocumentos(tenantEmpresaId, dadorCargaId, entidades, maxDiasAnticipacion);

    // Calcular faltantes
    let faltantes = 0;
    for (const [key] of templatesRequeridos) {
      const [entityType, templateIdStr] = key.split(':');
      const templateId = parseInt(templateIdStr, 10);
      
      // Buscar si hay documento para esta entidad+template
      const entidad = entidades.find(e => e.entityType === entityType);
      if (entidad) {
        const entidadKey = `${entityType}:${entidad.entityId}`;
        const docsEntidad = conteos.documentosPorEntidad.get(entidadKey) || [];
        if (!docsEntidad.includes(templateId)) {
          faltantes++;
        }
      }
    }

    // Determinar nuevo estado
    const estadoNuevo = determinarEstadoDocumental({
      vigentes: conteos.vigentes,
      porVencer: conteos.porVencer,
      vencidos: conteos.vencidos,
      pendientes: conteos.pendientes,
      rechazados: conteos.rechazados,
      faltantes,
    });

    const cambio = estadoAnterior !== estadoNuevo;

    // Actualizar si hay cambio
    if (cambio) {
      await prisma.equipo.update({
        where: { id: equipoId },
        data: {
          estadoDocumental: estadoNuevo,
          documentosEvaluadosAt: new Date(),
        },
      });

      AppLogger.info('✅ Estado documental actualizado', {
        equipoId,
        estadoAnterior,
        estadoNuevo,
      });
    } else {
      // Solo actualizar timestamp
      await prisma.equipo.update({
        where: { id: equipoId },
        data: { documentosEvaluadosAt: new Date() },
      });
    }

    return {
      equipoId,
      estadoAnterior,
      estadoNuevo,
      cambio,
      detalles: {
        totalDocumentos: conteos.vigentes + conteos.porVencer + conteos.vencidos + conteos.pendientes + conteos.rechazados,
        vigentes: conteos.vigentes,
        porVencer: conteos.porVencer,
        vencidos: conteos.vencidos,
        pendientes: conteos.pendientes,
        rechazados: conteos.rechazados,
        faltantes,
        entidadesEvaluadas: entidades,
      },
    };
  }

  /**
   * Evalúa múltiples equipos (batch)
   */
  static async evaluarEquipos(equipoIds: number[]): Promise<EquipoEvaluationResult[]> {
    const CONCURRENCY = 5;
    const resultados: EquipoEvaluationResult[] = [];

    for (let i = 0; i < equipoIds.length; i += CONCURRENCY) {
      const batch = equipoIds.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(id => this.evaluarEquipo(id))
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          resultados.push(r.value);
        }
      }
    }

    return resultados;
  }

  /**
   * Re-evalúa equipos afectados por un documento
   */
  static async reevaluarPorDocumento(documentId: number): Promise<EquipoEvaluationResult[]> {
    // Obtener el documento
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        entityType: true,
        entityId: true,
        tenantEmpresaId: true,
        dadorCargaId: true,
      },
    });

    if (!doc) return [];

    // Buscar equipos que usen esta entidad
    const equipos = await this.buscarEquiposPorEntidad(
      doc.tenantEmpresaId,
      doc.dadorCargaId,
      doc.entityType,
      doc.entityId
    );

    AppLogger.info('🔄 Re-evaluando equipos por cambio en documento', {
      documentId,
      entityType: doc.entityType,
      entityId: doc.entityId,
      equiposAfectados: equipos.length,
    });

    return this.evaluarEquipos(equipos.map(e => e.id));
  }

  /**
   * Busca equipos que contengan una entidad específica
   */
  static async buscarEquiposPorEntidad(
    tenantEmpresaId: number,
    dadorCargaId: number,
    entityType: EntityType,
    entityId: number
  ): Promise<{ id: number }[]> {
    const whereClause: Record<string, unknown> = {
      tenantEmpresaId,
      dadorCargaId,
      activo: true,
    };

    switch (entityType) {
      case 'CHOFER':
        whereClause.driverId = entityId;
        break;
      case 'CAMION':
        whereClause.truckId = entityId;
        break;
      case 'ACOPLADO':
        whereClause.trailerId = entityId;
        break;
      case 'EMPRESA_TRANSPORTISTA':
        whereClause.empresaTransportistaId = entityId;
        break;
      default:
        return [];
    }

    return prisma.equipo.findMany({
      where: whereClause,
      select: { id: true },
    });
  }

  /**
   * Evalúa todos los equipos de un tenant (para cron job)
   */
  static async evaluarTodosEquipos(tenantEmpresaId: number): Promise<{
    evaluados: number;
    actualizados: number;
  }> {
    const equipos = await prisma.equipo.findMany({
      where: { tenantEmpresaId, activo: true },
      select: { id: true },
    });

    let actualizados = 0;
    for (const equipo of equipos) {
      const resultado = await this.evaluarEquipo(equipo.id);
      if (resultado?.cambio) {
        actualizados++;
      }
    }

    AppLogger.info('📊 Evaluación masiva completada', {
      tenantEmpresaId,
      evaluados: equipos.length,
      actualizados,
    });

    return { evaluados: equipos.length, actualizados };
  }
}
