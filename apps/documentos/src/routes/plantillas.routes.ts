import { Router } from 'express';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { PlantillasController } from '../controllers/plantillas.controller';
import { z } from 'zod';

const router: ReturnType<typeof Router> = Router();

router.use(authenticate);

// =============================================
// Schemas de validación
// =============================================

const listByClienteSchema = z.object({
  params: z.object({
    clienteId: z.string().transform((v) => Number(v)),
  }),
  query: z.object({
    activo: z.enum(['true', 'false']).optional(),
  }).optional(),
});

const getByIdSchema = z.object({
  params: z.object({
    id: z.string().transform((v) => Number(v)),
  }),
});

const createPlantillaSchema = z.object({
  params: z.object({
    clienteId: z.string().transform((v) => Number(v)),
  }),
  body: z.object({
    nombre: z.string().min(1).max(100),
    descripcion: z.string().max(1000).optional(),
    activo: z.boolean().optional(),
  }),
});

const updatePlantillaSchema = z.object({
  params: z.object({
    id: z.string().transform((v) => Number(v)),
  }),
  body: z.object({
    nombre: z.string().min(1).max(100).optional(),
    descripcion: z.string().max(1000).optional().nullable(),
    activo: z.boolean().optional(),
  }),
});

const duplicatePlantillaSchema = z.object({
  params: z.object({
    id: z.string().transform((v) => Number(v)),
  }),
  body: z.object({
    nuevoNombre: z.string().min(1).max(100),
  }),
});

const addTemplateSchema = z.object({
  params: z.object({
    id: z.string().transform((v) => Number(v)),
  }),
  body: z.object({
    templateId: z.number().int().positive(),
    entityType: z.enum(['DADOR', 'EMPRESA_TRANSPORTISTA', 'CHOFER', 'CAMION', 'ACOPLADO']),
    obligatorio: z.boolean().optional(),
    diasAnticipacion: z.number().int().min(0).max(365).optional(),
    visibleChofer: z.boolean().optional(),
  }),
});

const updateTemplateSchema = z.object({
  params: z.object({
    id: z.string().transform((v) => Number(v)),
    templateConfigId: z.string().transform((v) => Number(v)),
  }),
  body: z.object({
    obligatorio: z.boolean().optional(),
    diasAnticipacion: z.number().int().min(0).max(365).optional(),
    visibleChofer: z.boolean().optional(),
  }),
});

const removeTemplateSchema = z.object({
  params: z.object({
    id: z.string().transform((v) => Number(v)),
    templateConfigId: z.string().transform((v) => Number(v)),
  }),
});

const consolidatedTemplatesSchema = z.object({
  query: z.object({
    plantillaIds: z.string().transform((v) => v.split(',').map(Number).filter((n) => !isNaN(n) && n > 0)),
  }),
});

const equipoPlantillasSchema = z.object({
  params: z.object({
    equipoId: z.string().transform((v) => Number(v)),
  }),
  query: z.object({
    soloActivas: z.enum(['true', 'false']).optional(),
  }).optional(),
});

const assignPlantillaSchema = z.object({
  params: z.object({
    equipoId: z.string().transform((v) => Number(v)),
  }),
  body: z.object({
    plantillaRequisitoId: z.number().int().positive(),
  }),
});

const unassignPlantillaSchema = z.object({
  params: z.object({
    equipoId: z.string().transform((v) => Number(v)),
    plantillaId: z.string().transform((v) => Number(v)),
  }),
});

const checkMissingDocsSchema = z.object({
  params: z.object({
    equipoId: z.string().transform((v) => Number(v)),
    plantillaId: z.string().transform((v) => Number(v)),
  }),
});

// =============================================
// Rutas de Plantillas
// =============================================

// Lista todas las plantillas del tenant (para selector en equipos)
router.get(
  '/',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]),
  PlantillasController.listAll
);

// Obtiene templates consolidados de múltiples plantillas
router.get(
  '/templates/consolidated',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]),
  validate(consolidatedTemplatesSchema),
  PlantillasController.getConsolidatedTemplates
);

// Obtiene una plantilla por ID con sus templates y equipos
router.get(
  '/:id',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(getByIdSchema),
  PlantillasController.getById
);

// Actualiza una plantilla
router.put(
  '/:id',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(updatePlantillaSchema),
  PlantillasController.update
);

// Elimina una plantilla
router.delete(
  '/:id',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO]),
  validate(getByIdSchema),
  PlantillasController.remove
);

// Duplica una plantilla
router.post(
  '/:id/duplicate',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(duplicatePlantillaSchema),
  PlantillasController.duplicate
);

// Lista los templates de una plantilla
router.get(
  '/:id/templates',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]),
  validate(getByIdSchema),
  PlantillasController.listTemplates
);

// Agrega un template a una plantilla
router.post(
  '/:id/templates',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(addTemplateSchema),
  PlantillasController.addTemplate
);

// Actualiza la configuración de un template en una plantilla
router.put(
  '/:id/templates/:templateConfigId',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(updateTemplateSchema),
  PlantillasController.updateTemplate
);

// Elimina un template de una plantilla
router.delete(
  '/:id/templates/:templateConfigId',
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(removeTemplateSchema),
  PlantillasController.removeTemplate
);

export default router;

// =============================================
// Rutas adicionales para clientes (se montan en clients.routes.ts)
// =============================================
export const clientPlantillasRoutes = Router();

// Lista las plantillas de un cliente
clientPlantillasRoutes.get(
  '/:clienteId/plantillas',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(listByClienteSchema),
  PlantillasController.listByCliente
);

// Crea una nueva plantilla para un cliente
clientPlantillasRoutes.post(
  '/:clienteId/plantillas',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(createPlantillaSchema),
  PlantillasController.create
);

// =============================================
// Rutas adicionales para equipos (se montan en equipos.routes.ts)
// =============================================
export const equipoPlantillasRoutes = Router();

// Lista las plantillas asociadas a un equipo
equipoPlantillasRoutes.get(
  '/:equipoId/plantillas',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]),
  validate(equipoPlantillasSchema),
  PlantillasController.listByEquipo
);

// Asocia una plantilla a un equipo
equipoPlantillasRoutes.post(
  '/:equipoId/plantillas',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(assignPlantillaSchema),
  PlantillasController.assignToEquipo
);

// Desasocia una plantilla de un equipo
equipoPlantillasRoutes.delete(
  '/:equipoId/plantillas/:plantillaId',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(unassignPlantillaSchema),
  PlantillasController.unassignFromEquipo
);

// Obtiene los templates consolidados de un equipo basándose en sus plantillas
equipoPlantillasRoutes.get(
  '/:equipoId/plantillas/consolidated',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]),
  validate(equipoPlantillasSchema),
  PlantillasController.getEquipoConsolidatedTemplates
);

// Calcula documentos faltantes si se agrega esta plantilla al equipo
equipoPlantillasRoutes.get(
  '/:equipoId/plantillas/:plantillaId/check',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  validate(checkMissingDocsSchema),
  PlantillasController.checkMissingDocuments
);
