import { z } from 'zod';
// import type { EntityType, DocumentStatus } from '../../../node_modules/.prisma/documentos';

// =================================
// SCHEMAS DE VALIDACIÓN ESENCIALES
// =================================

// Entity Types válidos
const entityTypeSchema = z.enum(['DADOR', 'EMPRESA_TRANSPORTISTA', 'CHOFER', 'CAMION', 'ACOPLADO']);

// Document Status válidos  
const documentStatusSchema = z.enum(['PENDIENTE', 'VALIDANDO', 'CLASIFICANDO', 'PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO', 'VENCIDO', 'DEPRECADO']);

// =================================
// TEMPLATES - Configuración Global
// =================================

export const createTemplateSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Nombre es requerido')
      .max(100, 'Nombre muy largo')
      .trim(),
    entityType: entityTypeSchema,
  }),
});

export const updateTemplateSchema = z.object({
  params: z.object({
    id: z.string().transform(val => parseInt(val, 10)),
  }),
  body: z.object({
    name: z.string()
      .min(1, 'Nombre es requerido')
      .max(100, 'Nombre muy largo')
      .trim()
      .optional(),
    active: z.boolean().optional(),
  }),
});

export const getTemplatesSchema = z.object({
  query: z.object({
    entityType: entityTypeSchema.optional(),
    active: z.string().transform(val => val === 'true').optional(),
  }),
});

export const getTemplateByIdSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10)),
  }),
});

// =================================
// CONFIG - Configuración (legacy ruta con empresaId renombrada a dadorId en routes)
// =================================

export const updateEmpresaConfigSchema = z.object({
  params: z.object({
    empresaId: z.string().transform(val => parseInt(val, 10)),
  }),
  body: z.object({
    enabled: z.boolean(),
    templateIds: z.array(z.number()).default([]),
    alertEmail: z.string().email('Email inválido').optional(),
    alertPhone: z.string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Teléfono inválido')
      .optional(),
  }),
});

export const getEmpresaConfigSchema = z.object({
  params: z.object({
    empresaId: z.string().transform(val => parseInt(val, 10)),
  }),
});

// =================================
// DOCUMENTS - Gestión de Documentos
// =================================

export const uploadDocumentSchema = z.object({
  body: z.object({
    templateId: z
      .union([z.string(), z.number()])
      .transform((val) => Number(val))
      .refine((val) => val > 0, 'Template ID inválido'),
    entityType: entityTypeSchema,
    entityId: z
      .union([z.string(), z.number()])
      .transform((val) => Number(val))
      .refine((val) => val > 0, 'Entity ID inválido'),
    dadorCargaId: z
      .union([z.string(), z.number()])
      .transform((val) => Number(val))
      .refine((val) => val > 0, 'Dador ID inválido'),
    // Confirmación explícita para cargar una nueva versión cuando el documento previo no está vencido
    confirmNewVersion: z
      .union([z.string(), z.boolean()])
      .transform((v) => (typeof v === 'string' ? v === 'true' : Boolean(v)))
      .optional(),
    // Modo de carga:
    // - initial: alta inicial, requiere planilla completa y puede crear equipo si corresponde
    // - renewal: renovación de un documento vencido
    // mode eliminado (se infiere del backend). Permitimos que llegue pero lo ignoramos si existe.
    // mode: z.enum(['initial', 'renewal']).optional(),
    // Datos de planilla (se valida exhaustivamente en controller según 'mode')
    planilla: z
      .object({
        // Empresa transportista
        empresaTransportista: z.string().min(2).max(200).optional(),
        cuitTransportista: z.string().regex(/^\d{11}$/,'CUIT inválido').optional(),
        // Chofer
        choferNombre: z.string().min(1).max(120).optional(),
        choferApellido: z.string().min(1).max(120).optional(),
        choferDni: z.string().min(6).max(32).optional(),
        // Unidades
        tractorPatente: z.string().min(5).max(12).optional(),
        semiPatente: z.string().min(5).max(12).optional(),
        // Fechas de vencimiento (texto ISO)
        vencimientos: z
          .record(z.string(), z.string().optional())
          .optional(),
      })
      .optional(),
    // Optional camera/file source hint
    source: z.enum(['camera','file']).optional(),
    // Base64 inputs for camera capture support (front may send either files or base64)
    documentsBase64: z
      .array(z.string().min(20))
      .max(20)
      .optional(),
  }),
});

export const getDocumentStatusSchema = z.object({
  query: z.object({
    dadorCargaId: z.string().transform(val => parseInt(val, 10)).optional(),
    entityType: entityTypeSchema.optional(),
    entityId: z.string().transform(val => parseInt(val, 10)).optional(),
    status: documentStatusSchema.optional(),
    page: z.string().transform(val => parseInt(val, 10)).default('1'),
    limit: z.string().transform(val => Math.min(parseInt(val, 10), 100)).default('50'),
  }),
});

export const getDocumentsByDadorSchema = z.object({
  params: z.object({
    dadorId: z.string().transform(val => parseInt(val, 10)),
  }),
  query: z.object({
    status: documentStatusSchema.optional(),
    page: z.string().transform((v) => parseInt(v, 10)).default('1').optional(),
    limit: z.string().transform((v) => Math.min(parseInt(v, 10), 100)).default('50').optional(),
  }).optional(),
});

export const getDocumentSchema = z.object({
  params: z.object({
    id: z.string().transform(val => parseInt(val, 10)),
  }),
});

export const deleteDocumentSchema = z.object({
  params: z.object({
    id: z.string().transform(val => parseInt(val, 10)),
  }),
});

// =================================
// HEALTH CHECK - Sistema
// =================================

export const healthCheckSchema = z.object({
  query: z.object({
    detailed: z.string().transform(val => val === 'true').default('false'),
  }),
});

// =================================
// TIPOS DERIVADOS - TypeScript Magic
// =================================

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type GetTemplatesInput = z.infer<typeof getTemplatesSchema>;

export type UpdateEmpresaConfigInput = z.infer<typeof updateEmpresaConfigSchema>;
export type GetEmpresaConfigInput = z.infer<typeof getEmpresaConfigSchema>;

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type GetDocumentStatusInput = z.infer<typeof getDocumentStatusSchema>;
// Backward types removed
export type GetDocumentInput = z.infer<typeof getDocumentSchema>;
export type DeleteDocumentInput = z.infer<typeof deleteDocumentSchema>;

export type HealthCheckInput = z.infer<typeof healthCheckSchema>;

// =================================
// CLIENTES, REQUISITOS, EQUIPOS, BÚSQUEDA
// =================================

export const createClienteSchema = z.object({
  body: z.object({
    razonSocial: z.string().min(2).max(200),
    cuit: z.string().regex(/^\d{11}$/,'CUIT debe tener 11 dígitos'),
    activo: z.boolean().optional(),
    notas: z.string().max(2000).optional(),
  }),
});

export const updateClienteSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    razonSocial: z.string().min(2).max(200).optional(),
    cuit: z.string().regex(/^\d{11}$/,'CUIT debe tener 11 dígitos').optional(),
    activo: z.boolean().optional(),
    notas: z.string().max(2000).optional(),
  }),
});

export const clienteListQuerySchema = z.object({
  query: z.object({
    activo: z.string().optional(),
  }),
});

// =============================
// Dadores de carga (ABM)
// =============================

export const createDadorSchema = z.object({
  body: z.object({
    razonSocial: z.string().min(2).max(200),
    cuit: z.string().regex(/^\d{11}$/,'CUIT debe tener 11 dígitos'),
    activo: z.boolean().optional(),
    notas: z.string().max(2000).optional(),
    phones: z
      .array(z.string().regex(/^\+?[1-9]\d{7,14}$/,'Formato WhatsApp inválido'))
      .max(5, 'Máximo 5 teléfonos')
      .optional()
      .default([]),
  }),
});

export const updateDadorSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    razonSocial: z.string().min(2).max(200).optional(),
    cuit: z.string().regex(/^\d{11}$/,'CUIT debe tener 11 dígitos').optional(),
    activo: z.boolean().optional(),
    notas: z.string().max(2000).optional(),
    phones: z
      .array(z.string().regex(/^\+?[1-9]\d{7,14}$/,'Formato WhatsApp inválido'))
      .max(5, 'Máximo 5 teléfonos')
      .optional(),
  }),
});

export const updateDadorNotificationsSchema = z.object({
  params: z.object({ id: z.string().transform((v)=> Number(v)) }),
  body: z.object({
    notifyDriverEnabled: z.boolean().optional(),
    notifyDadorEnabled: z.boolean().optional(),
  }),
});

export const dadorListQuerySchema = z.object({
  query: z.object({
    activo: z.string().optional(),
  }),
});

// =============================
// MAESTROS: EMPRESA, CHOFER, CAMIÓN, ACOPLADO (ABM)
// =============================

export const createEmpresaDocSchema = z.object({
  body: z.object({
    razonSocial: z.string().min(2).max(200),
    cuit: z.string().regex(/^\d{11}$/,'CUIT debe tener 11 dígitos'),
    activo: z.boolean().optional(),
    notas: z.string().max(2000).optional(),
  }),
});

export const updateEmpresaDocSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    razonSocial: z.string().min(2).max(200).optional(),
    cuit: z.string().regex(/^\d{11}$/,'CUIT debe tener 11 dígitos').optional(),
    activo: z.boolean().optional(),
    notas: z.string().max(2000).optional(),
  }),
});

export const empresaDocListQuerySchema = z.object({
  query: z.object({
    activo: z.string().optional(),
    q: z.string().optional(),
    page: z.string().transform((v) => parseInt(v, 10)).default('1').optional(),
    limit: z
      .string()
      .transform((v) => Math.min(parseInt(v, 10), 100))
      .default('10')
      .optional(),
  }),
});

// Choferes
export const createChoferSchema = z.object({
  body: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0),
    dni: z.string().min(6),
    nombre: z.string().optional(),
    apellido: z.string().optional(),
    activo: z.boolean().optional(),
    phones: z
      .array(z.string().regex(/^\+?[1-9]\d{7,14}$/,'Formato WhatsApp inválido'))
      .max(3, 'Máximo 3 teléfonos')
      .optional()
      .default([]),
  }),
});

export const updateChoferSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    dni: z.string().min(6).optional(),
    nombre: z.string().optional(),
    apellido: z.string().optional(),
    activo: z.boolean().optional(),
    phones: z
      .array(z.string().regex(/^\+?[1-9]\d{7,14}$/,'Formato WhatsApp inválido'))
      .max(3, 'Máximo 3 teléfonos')
      .optional(),
  }),
});

export const choferListQuerySchema = z.object({
  query: z.object({
    dadorCargaId: z.string().transform((v) => Number(v)),
    q: z.string().optional(),
    activo: z.string().optional(),
    page: z.string().transform((v) => parseInt(v, 10)).default('1').optional(),
    limit: z
      .string()
      .transform((v) => Math.min(parseInt(v, 10), 100))
      .default('10')
      .optional(),
  }),
});

// Camiones
export const createCamionSchema = z.object({
  body: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0),
    patente: z.string().min(5),
    marca: z.string().max(100).optional(),
    modelo: z.string().max(100).optional(),
    activo: z.boolean().optional(),
  }),
});

export const updateCamionSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    patente: z.string().min(5).optional(),
    marca: z.string().max(100).optional(),
    modelo: z.string().max(100).optional(),
    activo: z.boolean().optional(),
  }),
});

export const camionListQuerySchema = z.object({
  query: z.object({
    dadorCargaId: z.string().transform((v) => Number(v)),
    q: z.string().optional(),
    activo: z.string().optional(),
    page: z.string().transform((v) => parseInt(v, 10)).default('1').optional(),
    limit: z
      .string()
      .transform((v) => Math.min(parseInt(v, 10), 100))
      .default('10')
      .optional(),
  }),
});

// Acoplados
export const createAcopladoSchema = z.object({
  body: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0),
    patente: z.string().min(5),
    tipo: z.string().max(120).optional(),
    activo: z.boolean().optional(),
  }),
});

export const updateAcopladoSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    patente: z.string().min(5).optional(),
    tipo: z.string().max(120).optional(),
    activo: z.boolean().optional(),
  }),
});

export const acopladoListQuerySchema = z.object({
  query: z.object({
    dadorCargaId: z.string().transform((v) => Number(v)),
    q: z.string().optional(),
    activo: z.string().optional(),
    page: z.string().transform((v) => parseInt(v, 10)).default('1').optional(),
    limit: z
      .string()
      .transform((v) => Math.min(parseInt(v, 10), 100))
      .default('10')
      .optional(),
  }),
});

export const addRequirementSchema = z.object({
  params: z.object({ clienteId: z.string().transform((v) => Number(v)) }),
  body: z.object({
    templateId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0),
    entityType: z.enum(['EMPRESA_TRANSPORTISTA','CHOFER', 'CAMION', 'ACOPLADO']),
    obligatorio: z.boolean().default(true),
    diasAnticipacion: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v >= 0).default(0),
    visibleChofer: z.boolean().default(true),
  }),
});

export const removeRequirementSchema = z.object({
  params: z.object({
    clienteId: z.string().transform((v) => Number(v)),
    requirementId: z.string().transform((v) => Number(v)),
  }),
});

export const createEquipoSchema = z.object({
  body: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0),
    driverId: z.preprocess((v) => (v === undefined || v === null || v === '' ? 0 : v), z.number().int().min(0)).optional(),
    truckId: z.preprocess((v) => (v === undefined || v === null || v === '' ? 0 : v), z.number().int().min(0)).optional(),
    trailerId: z.preprocess((v) => (v === undefined || v === null || v === '' ? null : Number(v)), z.number().int().min(0)).optional(),
    empresaTransportistaId: z.preprocess((v) => (v === undefined || v === null || v === '' ? null : Number(v)), z.number().int().min(0)).optional(),
    driverDni: z.string().min(6).max(32),
    truckPlate: z.string().min(5).max(12),
    trailerPlate: z.string().min(5).max(12).optional(),
    validFrom: z.string().datetime(),
    validTo: z.string().datetime().nullable().optional(),
    forceMove: z.boolean().optional(),
  }),
});

export const updateEquipoSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    trailerId: z.union([z.string(), z.number()]).transform((v) => Number(v)).optional(),
    trailerPlate: z.string().min(5).max(12).optional(),
    validTo: z.string().datetime().nullable().optional(),
    estado: z.enum(['activa', 'finalizada']).optional(),
    empresaTransportistaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).optional(),
  }),
});

export const equipoListQuerySchema = z.object({
  query: z.object({
    dadorCargaId: z.string().optional(),
    empresaId: z.string().optional(),
    page: z.string().transform((v) => parseInt(v, 10)).default('1').optional(),
    limit: z.string().transform((v) => Math.min(parseInt(v, 10), 100)).default('20').optional(),
  }).refine((q) => q.dadorCargaId || q.empresaId, {
    message: 'dadorCargaId requerido',
    path: ['dadorCargaId'],
  }).transform((q) => ({
    dadorCargaId: Number((q as any).dadorCargaId || (q as any).empresaId),
    page: (q as any).page ? parseInt((q as any).page, 10) : 1,
    limit: (q as any).limit ? Math.min(parseInt((q as any).limit, 10), 100) : 20,
  })),
});

export const equipoClienteAssocSchema = z.object({
  params: z.object({
    equipoId: z.string().transform((v) => Number(v)),
    clienteId: z.string().transform((v) => Number(v)),
  }),
  body: z.object({
    asignadoDesde: z.string().datetime(),
    asignadoHasta: z.string().datetime().nullable().optional(),
  }),
});

export const searchQuerySchema = z.object({
  query: z.object({
    dadorCargaId: z.string().transform((v) => Number(v)),
    dni: z.string().min(6).max(32).optional(),
    truckPlate: z.string().min(5).max(12).optional(),
    trailerPlate: z.string().min(5).max(12).optional(),
    limit: z
      .string()
      .transform((v) => Math.min(parseInt(v, 10), 100))
      .optional(),
  }).refine((q) => q.dni || q.truckPlate || q.trailerPlate, {
    message: 'Debe especificar al menos un parámetro de búsqueda',
    path: ['dni'],
  }),
});

// Equipo attach/detach
export const equipoAttachSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    driverId: z.number().int().positive().optional(),
    truckId: z.number().int().positive().optional(),
    trailerId: z.number().int().positive().optional(),
    driverDni: z.string().min(6).max(32).optional(),
    truckPlate: z.string().min(5).max(12).optional(),
    trailerPlate: z.string().min(5).max(12).optional(),
  }).refine((b) => b.driverId || b.truckId || b.trailerId || b.driverDni || b.truckPlate || b.trailerPlate, {
    message: 'Debe indicar al menos un componente a asociar',
    path: ['driverId'],
  }),
});

export const equipoDetachSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    driver: z.boolean().optional(),
    truck: z.boolean().optional(),
    trailer: z.boolean().optional(),
  }).refine((b) => b.driver || b.truck || b.trailer, {
    message: 'Debe indicar al menos un componente a desasociar',
    path: ['driver'],
  }),
});

// Historial de equipo
export const equipoHistoryQuerySchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  query: z.object({
    limit: z
      .string()
      .transform((v) => Math.min(parseInt(v, 10), 100))
      .optional(),
  }),
});

// =================================
// APROBACIÓN DE DOCUMENTOS
// =================================

export const approveDocumentSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    confirmedEntityType: entityTypeSchema,
    // Aceptar IDs en string (CUIT/DNI/patente) o número. La resolución a ID interno se hará en el servicio.
    confirmedEntityId: z.union([z.number().int().positive(), z.string().min(1)]),
    confirmedExpiration: z.string().datetime(),
    confirmedTemplateId: z.number().int().positive(),
    reviewNotes: z.string().max(1000).optional(),
  }),
});

export const rejectDocumentSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    reason: z.string().max(500).optional(),
    reviewNotes: z.string().max(1000).optional(),
  }),
});

export const pendingDocumentsQuerySchema = z.object({
  query: z.object({
    entityType: entityTypeSchema.optional(),
    minConfidence: z.string().transform((v) => parseFloat(v)).refine((v) => v >= 0 && v <= 1).optional(),
    maxConfidence: z.string().transform((v) => parseFloat(v)).refine((v) => v >= 0 && v <= 1).optional(),
    page: z.string().transform((v) => parseInt(v, 10)).default('1'),
    limit: z.string().transform((v) => Math.min(parseInt(v, 10), 100)).default('20'),
  }),
});

// =================================
// EMPRESA TRANSPORTISTA - Zod Schemas
// =================================

export const createEmpresaTransportistaSchema = z.object({
  body: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0),
    razonSocial: z.string().min(2).max(200),
    cuit: z.string().regex(/^\d{11}$/, 'CUIT debe tener 11 dígitos'),
    activo: z.boolean().optional(),
    notas: z.string().max(2000).optional(),
  }),
});

export const updateEmpresaTransportistaSchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
  body: z.object({
    razonSocial: z.string().min(2).max(200).optional(),
    cuit: z.string().regex(/^\d{11}$/, 'CUIT debe tener 11 dígitos').optional(),
    activo: z.boolean().optional(),
    notas: z.string().max(2000).optional(),
  }),
});

export const empresaTransportistaListQuerySchema = z.object({
  query: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0),
    activo: z.string().transform((v) => v === 'true').optional(),
    q: z.string().optional(),
    page: z.string().transform((v) => parseInt(v, 10)).default('1').optional(),
    limit: z.string().transform((v) => Math.min(parseInt(v, 10), 100)).default('10').optional(),
  }),
});
