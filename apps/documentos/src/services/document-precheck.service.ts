import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import type { EntityType, DocumentStatus } from '.prisma/documentos';

// ============================================================================
// DocumentPreCheckService - Verificación de documentos existentes para entidades
// Permite reutilización de documentación ya cargada y aprobada
// ============================================================================

/** Estado de un documento individual en el pre-check */
export type DocumentoEstado = 
  | 'VIGENTE'           // Aprobado y no vencido
  | 'POR_VENCER'        // Aprobado pero vence en los próximos N días
  | 'VENCIDO'           // Expiró
  | 'PENDIENTE'         // En proceso de aprobación
  | 'RECHAZADO'         // Fue rechazado
  | 'FALTANTE';         // No existe

/** Información de un documento existente */
export interface DocumentoExistente {
  id: number;
  templateId: number;
  templateName: string;
  estado: DocumentoEstado;
  expiresAt: Date | null;
  diasParaVencer: number | null;
  uploadedAt: Date;
  dadorCargaId: number;
  dadorCargaNombre?: string;
  reutilizable: boolean;          // Si puede ser reutilizado por otro dador
  requiereTransferencia: boolean; // Si es de otro dador y requiere solicitud
}

/** Información del equipo al que está asignada la entidad */
export interface EquipoAsignado {
  id: number;
  choferNombre?: string;
  camionPatente?: string;
  acopladoPatente?: string;
}

/** Resultado del pre-check para una entidad */
export interface PreCheckEntidadResult {
  entityType: EntityType;
  entityId: number | null;
  identificador: string;          // DNI, CUIT o Patente normalizado
  nombre?: string;                // Nombre de la entidad (si existe)
  existe: boolean;                // Si la entidad ya existe en la DB
  dadorCargaActualId: number | null;
  dadorCargaActualNombre?: string;
  perteneceSolicitante: boolean;  // Si pertenece al dador que consulta
  requiereTransferencia: boolean; // Si es de otro dador
  equipoActual?: EquipoAsignado;  // Equipo al que está asignada actualmente
  asignadaAOtroEquipo: boolean;   // Si está en otro equipo (para entidades exclusivas)
  documentos: DocumentoExistente[];
  resumen: PreCheckResumen;
}

/** Resumen estadístico del estado documental */
export interface PreCheckResumen {
  total: number;
  vigentes: number;
  porVencer: number;
  vencidos: number;
  pendientes: number;
  rechazados: number;
  faltantes: number;
  completo: boolean;              // Todos los requeridos están vigentes
}

/** Input para consulta de pre-check */
export interface PreCheckInput {
  tenantEmpresaId: number;
  dadorCargaIdSolicitante: number;
  entidades: PreCheckEntidadInput[];
  clienteId?: number;             // Para evaluar requisitos específicos
}

export interface PreCheckEntidadInput {
  entityType: EntityType;
  identificador: string;          // DNI, CUIT o Patente
}

/** Resultado completo del pre-check */
export interface PreCheckResult {
  entidades: PreCheckEntidadResult[];
  hayEntidadesDeOtroDador: boolean;
  requiereTransferencia: boolean;
  dadorActualIds: number[];       // IDs de dadores que tienen las entidades
}

// Días para considerar "por vencer"
const DIAS_POR_VENCER = 30;

// Estados que se consideran "pendientes de aprobación"
const ESTADOS_PENDIENTES: DocumentStatus[] = [
  'PENDIENTE',
  'PENDIENTE_APROBACION',
  'VALIDANDO',
  'CLASIFICANDO',
];

/**
 * Normaliza identificadores (DNI, CUIT, Patente)
 */
function normalizeIdentificador(valor: string): string {
  return valor
    .slice(0, 32)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Calcula el estado de un documento
 */
function calcularEstadoDocumento(
  doc: { status: DocumentStatus; expiresAt: Date | null }
): { estado: DocumentoEstado; diasParaVencer: number | null } {
  const now = new Date();
  
  // Rechazado
  if (doc.status === 'RECHAZADO') {
    return { estado: 'RECHAZADO', diasParaVencer: null };
  }
  
  // Vencido (por status o por fecha)
  if (doc.status === 'VENCIDO') {
    return { estado: 'VENCIDO', diasParaVencer: null };
  }
  if (doc.expiresAt && doc.expiresAt < now) {
    return { estado: 'VENCIDO', diasParaVencer: null };
  }
  
  // Pendiente
  if (ESTADOS_PENDIENTES.includes(doc.status)) {
    return { estado: 'PENDIENTE', diasParaVencer: null };
  }
  
  // Aprobado - verificar si está por vencer
  if (doc.status === 'APROBADO') {
    if (doc.expiresAt) {
      const diasRestantes = Math.ceil(
        (doc.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diasRestantes <= DIAS_POR_VENCER) {
        return { estado: 'POR_VENCER', diasParaVencer: diasRestantes };
      }
      return { estado: 'VIGENTE', diasParaVencer: diasRestantes };
    }
    // Sin fecha de vencimiento = vigente indefinidamente
    return { estado: 'VIGENTE', diasParaVencer: null };
  }
  
  // Otros estados (DEPRECADO, etc.) se consideran faltantes
  return { estado: 'FALTANTE', diasParaVencer: null };
}

/**
 * Busca entidad por tipo e identificador
 */
async function buscarEntidad(
  tenantEmpresaId: number,
  entityType: EntityType,
  identificadorNorm: string
): Promise<{ id: number; dadorCargaId: number; nombre?: string } | null> {
  switch (entityType) {
    case 'CHOFER': {
      const chofer = await prisma.chofer.findFirst({
        where: { tenantEmpresaId, dniNorm: identificadorNorm },
        select: { id: true, dadorCargaId: true, nombre: true, apellido: true },
      });
      if (chofer) {
        const nombre = [chofer.nombre, chofer.apellido].filter(Boolean).join(' ');
        return { id: chofer.id, dadorCargaId: chofer.dadorCargaId, nombre };
      }
      return null;
    }
    case 'CAMION': {
      const camion = await prisma.camion.findFirst({
        where: { tenantEmpresaId, patenteNorm: identificadorNorm },
        select: { id: true, dadorCargaId: true, marca: true, modelo: true },
      });
      if (camion) {
        const nombre = [camion.marca, camion.modelo].filter(Boolean).join(' ');
        return { id: camion.id, dadorCargaId: camion.dadorCargaId, nombre };
      }
      return null;
    }
    case 'ACOPLADO': {
      const acoplado = await prisma.acoplado.findFirst({
        where: { tenantEmpresaId, patenteNorm: identificadorNorm },
        select: { id: true, dadorCargaId: true, tipo: true },
      });
      if (acoplado) {
        return { id: acoplado.id, dadorCargaId: acoplado.dadorCargaId, nombre: acoplado.tipo || undefined };
      }
      return null;
    }
    case 'EMPRESA_TRANSPORTISTA': {
      // Para empresa transportista, el identificador es el CUIT
      const empresa = await prisma.empresaTransportista.findFirst({
        where: { tenantEmpresaId, cuit: identificadorNorm },
        select: { id: true, dadorCargaId: true, razonSocial: true },
      });
      if (empresa) {
        return { id: empresa.id, dadorCargaId: empresa.dadorCargaId, nombre: empresa.razonSocial };
      }
      return null;
    }
    case 'DADOR':
      // Los dadores no se transfieren
      return null;
    default:
      return null;
  }
}

/**
 * Obtiene nombre del dador de carga
 */
async function obtenerNombreDador(dadorCargaId: number): Promise<string | undefined> {
  const dador = await prisma.dadorCarga.findUnique({
    where: { id: dadorCargaId },
    select: { razonSocial: true },
  });
  return dador?.razonSocial;
}

/**
 * Busca si la entidad está asignada a algún equipo activo
 * Solo aplica para CHOFER, CAMION y ACOPLADO (entidades exclusivas)
 * EMPRESA_TRANSPORTISTA puede tener múltiples equipos
 */
async function buscarEquipoAsignado(
  entityType: EntityType,
  entityId: number
): Promise<EquipoAsignado | null> {
  // Empresa transportista puede tener múltiples equipos, no aplica restricción
  if (entityType === 'EMPRESA_TRANSPORTISTA' || entityType === 'DADOR') {
    return null;
  }

  let equipo: { id: number; driverId: number; truckId: number; trailerId: number | null } | null = null;

  switch (entityType) {
    case 'CHOFER':
      equipo = await prisma.equipo.findFirst({
        where: { driverId: entityId, activo: true },
        select: { id: true, driverId: true, truckId: true, trailerId: true },
      });
      break;

    case 'CAMION':
      equipo = await prisma.equipo.findFirst({
        where: { truckId: entityId, activo: true },
        select: { id: true, driverId: true, truckId: true, trailerId: true },
      });
      break;

    case 'ACOPLADO':
      equipo = await prisma.equipo.findFirst({
        where: { trailerId: entityId, activo: true },
        select: { id: true, driverId: true, truckId: true, trailerId: true },
      });
      break;
  }

  if (!equipo) {
    return null;
  }

  // Buscar información adicional de las entidades relacionadas
  const [chofer, camion] = await Promise.all([
    prisma.chofer.findUnique({
      where: { id: equipo.driverId },
      select: { nombre: true, apellido: true },
    }),
    prisma.camion.findUnique({
      where: { id: equipo.truckId },
      select: { patente: true },
    }),
  ]);

  return {
    id: equipo.id,
    choferNombre: chofer 
      ? [chofer.nombre, chofer.apellido].filter(Boolean).join(' ')
      : undefined,
    camionPatente: camion?.patente,
  };
}

/**
 * Obtiene los templates requeridos para una entidad (opcional: por cliente)
 */
async function obtenerTemplatesRequeridos(
  _tenantEmpresaId: number,
  entityType: EntityType,
  clienteId?: number
): Promise<{ templateId: number; templateName: string; obligatorio: boolean }[]> {
  if (clienteId) {
    // Requisitos desde PlantillaRequisitoTemplate (fuente de verdad actual)
    const templates = await prisma.plantillaRequisitoTemplate.findMany({
      where: {
        entityType,
        plantillaRequisito: { clienteId, activo: true },
      },
      select: {
        templateId: true,
        obligatorio: true,
        template: { select: { name: true } },
      },
    });

    // Deduplicar por templateId (un cliente puede tener múltiples plantillas)
    const dedup = new Map<number, { templateId: number; templateName: string; obligatorio: boolean }>();
    for (const t of templates) {
      const existing = dedup.get(t.templateId);
      if (!existing) {
        dedup.set(t.templateId, {
          templateId: t.templateId,
          templateName: t.template.name,
          obligatorio: t.obligatorio,
        });
      } else if (t.obligatorio && !existing.obligatorio) {
        // Obligatorio gana
        existing.obligatorio = true;
      }
    }
    return [...dedup.values()];
  }
  
  // Todos los templates activos para el tipo de entidad
  const allTemplates = await prisma.documentTemplate.findMany({
    where: { entityType, active: true },
    select: { id: true, name: true },
  });
  return allTemplates.map(t => ({
    templateId: t.id,
    templateName: t.name,
    obligatorio: true, // Sin cliente específico, todos son obligatorios
  }));
}

/**
 * Obtiene documentos existentes para una entidad
 */
async function obtenerDocumentosEntidad(
  tenantEmpresaId: number,
  entityType: EntityType,
  entityId: number,
  dadorCargaIdSolicitante: number
): Promise<DocumentoExistente[]> {
  const docs = await prisma.document.findMany({
    where: {
      tenantEmpresaId,
      entityType,
      entityId,
      archived: false,
    },
    select: {
      id: true,
      templateId: true,
      status: true,
      expiresAt: true,
      uploadedAt: true,
      dadorCargaId: true,
      template: { select: { name: true } },
    },
    orderBy: { uploadedAt: 'desc' },
  });

  // Agrupar por templateId, tomar el más reciente
  const docsPorTemplate = new Map<number, typeof docs[0]>();
  for (const doc of docs) {
    if (!docsPorTemplate.has(doc.templateId)) {
      docsPorTemplate.set(doc.templateId, doc);
    }
  }

  const resultado: DocumentoExistente[] = [];
  for (const doc of docsPorTemplate.values()) {
    const { estado, diasParaVencer } = calcularEstadoDocumento(doc);
    const dadorNombre = await obtenerNombreDador(doc.dadorCargaId);
    const esDelSolicitante = doc.dadorCargaId === dadorCargaIdSolicitante;
    
    resultado.push({
      id: doc.id,
      templateId: doc.templateId,
      templateName: doc.template.name,
      estado,
      expiresAt: doc.expiresAt,
      diasParaVencer,
      uploadedAt: doc.uploadedAt,
      dadorCargaId: doc.dadorCargaId,
      dadorCargaNombre: dadorNombre,
      reutilizable: estado === 'VIGENTE' || estado === 'POR_VENCER',
      requiereTransferencia: !esDelSolicitante,
    });
  }

  return resultado;
}

/**
 * Calcula el resumen del estado documental
 */
function calcularResumen(
  documentosExistentes: DocumentoExistente[],
  templatesRequeridos: { templateId: number; obligatorio: boolean }[]
): PreCheckResumen {
  const docsPorTemplate = new Map(
    documentosExistentes.map(d => [d.templateId, d])
  );
  
  let vigentes = 0, porVencer = 0, vencidos = 0, pendientes = 0, rechazados = 0, faltantes = 0;
  
  for (const req of templatesRequeridos) {
    const doc = docsPorTemplate.get(req.templateId);
    if (!doc) {
      if (req.obligatorio) faltantes++;
      continue;
    }
    
    switch (doc.estado) {
      case 'VIGENTE': vigentes++; break;
      case 'POR_VENCER': porVencer++; break;
      case 'VENCIDO': vencidos++; break;
      case 'PENDIENTE': pendientes++; break;
      case 'RECHAZADO': rechazados++; break;
      case 'FALTANTE': if (req.obligatorio) faltantes++; break;
    }
  }
  
  const total = templatesRequeridos.length;
  const completo = faltantes === 0 && vencidos === 0 && rechazados === 0;
  
  return { total, vigentes, porVencer, vencidos, pendientes, rechazados, faltantes, completo };
}

export class DocumentPreCheckService {
  /**
   * Ejecuta pre-check para múltiples entidades
   * Verifica si ya existen y el estado de su documentación
   */
  static async preCheck(input: PreCheckInput): Promise<PreCheckResult> {
    const { tenantEmpresaId, dadorCargaIdSolicitante, entidades, clienteId } = input;
    
    AppLogger.info('🔍 Pre-check de documentos iniciado', {
      tenantEmpresaId,
      dadorCargaIdSolicitante,
      cantidadEntidades: entidades.length,
      clienteId,
    });

    const resultados: PreCheckEntidadResult[] = [];
    const dadorActualIdsSet = new Set<number>();
    let hayEntidadesDeOtroDador = false;
    const dadorNombreCache = new Map<number, string | undefined>();

    for (const entidadInput of entidades) {
      const identificadorNorm = normalizeIdentificador(entidadInput.identificador);
      
      // Buscar si la entidad ya existe
      const entidadExistente = await buscarEntidad(
        tenantEmpresaId,
        entidadInput.entityType,
        identificadorNorm
      );
      
      if (!entidadExistente) {
        // Entidad no existe - documentación nueva
        const templatesReq = await obtenerTemplatesRequeridos(
          tenantEmpresaId,
          entidadInput.entityType,
          clienteId
        );
        
        resultados.push({
          entityType: entidadInput.entityType,
          entityId: null,
          identificador: identificadorNorm,
          existe: false,
          dadorCargaActualId: null,
          perteneceSolicitante: true,  // Nueva, será del solicitante
          requiereTransferencia: false,
          asignadaAOtroEquipo: false,
          documentos: [],
          resumen: {
            total: templatesReq.length,
            vigentes: 0,
            porVencer: 0,
            vencidos: 0,
            pendientes: 0,
            rechazados: 0,
            faltantes: templatesReq.filter(t => t.obligatorio).length,
            completo: false,
          },
        });
        continue;
      }
      
      // Entidad existe
      const esDelSolicitante = entidadExistente.dadorCargaId === dadorCargaIdSolicitante;
      if (!esDelSolicitante) {
        hayEntidadesDeOtroDador = true;
        dadorActualIdsSet.add(entidadExistente.dadorCargaId);
      }
      
      let dadorNombre = dadorNombreCache.get(entidadExistente.dadorCargaId);
      if (dadorNombre === undefined && !dadorNombreCache.has(entidadExistente.dadorCargaId)) {
        dadorNombre = await obtenerNombreDador(entidadExistente.dadorCargaId);
        dadorNombreCache.set(entidadExistente.dadorCargaId, dadorNombre);
      }
      
      // Buscar si está asignada a algún equipo activo
      // Solo para CHOFER, CAMION, ACOPLADO (entidades exclusivas)
      const equipoActual = await buscarEquipoAsignado(
        entidadInput.entityType,
        entidadExistente.id
      );
      const asignadaAOtroEquipo = equipoActual !== null;
      
      // Obtener documentos existentes
      const documentos = await obtenerDocumentosEntidad(
        tenantEmpresaId,
        entidadInput.entityType,
        entidadExistente.id,
        dadorCargaIdSolicitante
      );
      
      // Obtener templates requeridos
      const templatesReq = await obtenerTemplatesRequeridos(
        tenantEmpresaId,
        entidadInput.entityType,
        clienteId
      );
      
      // Calcular resumen
      const resumen = calcularResumen(documentos, templatesReq);
      
      resultados.push({
        entityType: entidadInput.entityType,
        entityId: entidadExistente.id,
        identificador: identificadorNorm,
        nombre: entidadExistente.nombre,
        existe: true,
        dadorCargaActualId: entidadExistente.dadorCargaId,
        dadorCargaActualNombre: dadorNombre,
        perteneceSolicitante: esDelSolicitante,
        requiereTransferencia: !esDelSolicitante,
        equipoActual: equipoActual || undefined,
        asignadaAOtroEquipo,
        documentos,
        resumen,
      });
    }

    const result: PreCheckResult = {
      entidades: resultados,
      hayEntidadesDeOtroDador,
      requiereTransferencia: hayEntidadesDeOtroDador,
      dadorActualIds: Array.from(dadorActualIdsSet),
    };

    AppLogger.info('🔍 Pre-check completado', {
      entidadesEvaluadas: resultados.length,
      hayEntidadesDeOtroDador,
      dadorActualIds: result.dadorActualIds,
    });

    return result;
  }

  /**
   * Verifica una sola entidad (versión simplificada)
   */
  static async preCheckEntidad(
    tenantEmpresaId: number,
    dadorCargaIdSolicitante: number,
    entityType: EntityType,
    identificador: string,
    clienteId?: number
  ): Promise<PreCheckEntidadResult> {
    const result = await this.preCheck({
      tenantEmpresaId,
      dadorCargaIdSolicitante,
      entidades: [{ entityType, identificador }],
      clienteId,
    });
    return result.entidades[0];
  }
}
