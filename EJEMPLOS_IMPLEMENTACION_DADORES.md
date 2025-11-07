# Ejemplos de Implementación: Portal de Dadores - Gestión Autónoma

## 📄 1. Backend - Rol y Autorización

### Actualizar Enum de Roles

**Archivo**: `apps/documentos/src/types/roles.ts`

```typescript
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  DADOR_CARGA = 'DADOR_CARGA', // NUEVO ROL
}
```

---

### Middleware de Autorización para Dadores

**Archivo**: `apps/documentos/src/middlewares/auth.middleware.ts`

```typescript
// Agregar al final del archivo, antes de export

/**
 * Middleware de autorización para Dadores de Carga
 * Valida que:
 * 1. Usuario con rol DADOR_CARGA solo acceda a su propio dadorCargaId
 * 2. Usuarios con rol ADMIN/SUPERADMIN puedan acceder a cualquier dador
 */
export const authorizeDador = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    // Extraer dadorCargaId del request (params, body o query)
    const targetDadorIdRaw = 
      (req.params as any).dadorId ?? 
      (req.params as any).dadorCargaId ?? 
      (req.body as any).dadorCargaId ?? 
      (req.query as any).dadorCargaId;
    
    const targetDadorId = targetDadorIdRaw ? Number(targetDadorIdRaw) : undefined;

    // SUPERADMIN y ADMIN pueden acceder a cualquier dador
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      next();
      return;
    }

    // Usuario con rol DADOR_CARGA solo puede acceder a su propio dador
    if (user.role === 'DADOR_CARGA') {
      // Extraer dadorCargaId del usuario (de metadata JSON)
      const userDadorId = user.metadata?.dadorCargaId;

      if (!userDadorId) {
        AppLogger.warn('🚫 Usuario DADOR_CARGA sin dadorCargaId asociado', {
          userId: user.userId,
          email: user.email,
        });
        res.status(403).json({
          success: false,
          message: 'Usuario no tiene dador de carga asociado',
          code: 'NO_DADOR_ASSOCIATED',
        });
        return;
      }

      if (!targetDadorId) {
        // Si no se especificó dadorId en el request, inyectar el del usuario
        req.body = req.body || {};
        req.body.dadorCargaId = userDadorId;
        req.query = req.query || {};
        (req.query as any).dadorCargaId = String(userDadorId);
        next();
        return;
      }

      if (userDadorId !== targetDadorId) {
        AppLogger.warn('🚫 Usuario DADOR_CARGA intentando acceder a otro dador', {
          userId: user.userId,
          userDadorId,
          targetDadorId,
        });
        res.status(403).json({
          success: false,
          message: 'Acceso denegado al dador solicitado',
          code: 'DADOR_ACCESS_DENIED',
        });
        return;
      }

      next();
      return;
    }

    // Otros roles no tienen acceso
    res.status(403).json({
      success: false,
      message: 'Permisos insuficientes',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  } catch (error) {
    AppLogger.error('💥 Error en autorización de dador:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    });
  }
};
```

---

### Actualizar Schema de Validación

**Archivo**: `apps/documentos/src/schemas/validation.schemas.ts`

```typescript
// Agregar al final del archivo

/**
 * Schema para búsqueda masiva por patentes (dadores)
 */
export const dadorBulkSearchSchema = z.object({
  params: z.object({
    dadorId: z.string().transform((v) => Number(v)).refine((v) => v > 0, 'dadorId inválido'),
  }),
  body: z.object({
    patentes: z.array(z.string().min(1)).min(1).max(100), // máximo 100 patentes
  }),
});

/**
 * Schema para generación de ZIP masivo (dadores)
 */
export const dadorBulkZipSchema = z.object({
  params: z.object({
    dadorId: z.string().transform((v) => Number(v)).refine((v) => v > 0, 'dadorId inválido'),
  }),
  body: z.object({
    equipoIds: z.array(z.number().int().positive()).optional(),
    patentes: z.array(z.string().min(1)).optional(),
    includeExpired: z.boolean().default(false),
  }).refine(data => data.equipoIds || data.patentes, {
    message: 'Se debe proporcionar equipoIds o patentes'
  }),
});
```

---

## 📄 2. Backend - Búsqueda Masiva por Patentes

### Servicio de Búsqueda

**Archivo**: `apps/documentos/src/services/dador.service.ts`

```typescript
// Agregar método al DadorService existente

import { prisma } from '../config/database';

function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Búsqueda masiva de equipos por patentes (filtrado por dador)
 */
static async bulkSearchByPatentes(
  tenantId: number,
  dadorCargaId: number,
  patentes: string[]
): Promise<{
  equipos: Array<any>;
  notFound: string[];
}> {
  const normalizedPatentes = patentes.map(p => normalizePlate(p));
  const uniquePatentes = [...new Set(normalizedPatentes)];

  // Buscar camiones por patentes (solo del dador)
  const camiones = await prisma.camion.findMany({
    where: {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorCargaId, // FILTRO POR DADOR
      patenteNorm: { in: uniquePatentes },
      activo: true,
    },
    select: {
      id: true,
      patenteNorm: true,
      patente: true,
      marca: true,
      modelo: true,
      empresaTransportistaId: true,
    },
  });

  const foundPatentes = new Set(camiones.map(c => c.patenteNorm));
  const notFound = uniquePatentes.filter(p => !foundPatentes.has(p));

  // Buscar equipos asociados a esos camiones (solo del dador)
  const camionIds = camiones.map(c => c.id);
  
  const equipos = await prisma.equipo.findMany({
    where: {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorCargaId, // FILTRO POR DADOR
      truckId: { in: camionIds },
      OR: [
        { validTo: null },
        { validTo: { gte: new Date() } },
      ],
    },
    include: {
      empresaTransportista: {
        select: {
          id: true,
          cuit: true,
          razonSocial: true,
        },
      },
      clientes: {
        select: {
          clienteId: true,
          asignadoDesde: true,
          asignadoHasta: true,
        },
      },
    },
    orderBy: { validFrom: 'desc' },
  });

  // Enriquecer con información de documentos
  const result = await Promise.all(
    equipos.map(async (equipo) => {
      const [empresaDocs, choferDocs, camionDocs, acopladoDocs] = await Promise.all([
        equipo.empresaTransportistaId
          ? prisma.document.findMany({
              where: {
                tenantEmpresaId: tenantId,
                dadorCargaId: dadorCargaId, // FILTRO POR DADOR
                entityType: 'EMPRESA_TRANSPORTISTA',
                entityId: equipo.empresaTransportistaId,
                status: 'APROBADO',
              },
              include: { template: true },
              orderBy: { uploadedAt: 'desc' },
            })
          : [],
        prisma.document.findMany({
          where: {
            tenantEmpresaId: tenantId,
            dadorCargaId: dadorCargaId, // FILTRO POR DADOR
            entityType: 'CHOFER',
            entityId: equipo.driverId,
            status: 'APROBADO',
          },
          include: { template: true },
          orderBy: { uploadedAt: 'desc' },
        }),
        prisma.document.findMany({
          where: {
            tenantEmpresaId: tenantId,
            dadorCargaId: dadorCargaId, // FILTRO POR DADOR
            entityType: 'CAMION',
            entityId: equipo.truckId,
            status: 'APROBADO',
          },
          include: { template: true },
          orderBy: { uploadedAt: 'desc' },
        }),
        equipo.trailerId
          ? prisma.document.findMany({
              where: {
                tenantEmpresaId: tenantId,
                dadorCargaId: dadorCargaId, // FILTRO POR DADOR
                entityType: 'ACOPLADO',
                entityId: equipo.trailerId,
                status: 'APROBADO',
              },
              include: { template: true },
              orderBy: { uploadedAt: 'desc' },
            })
          : [],
      ]);

      return {
        ...equipo,
        documentacion: {
          empresa: empresaDocs,
          chofer: choferDocs,
          camion: camionDocs,
          acoplado: acopladoDocs,
        },
      };
    })
  );

  return {
    equipos: result,
    notFound,
  };
}
```

---

### Controlador

**Archivo**: `apps/documentos/src/controllers/dadores.controller.ts`

```typescript
// Agregar métodos al DadoresController existente

import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';
import { DadorService } from '../services/dador.service';

/**
 * POST /api/docs/dadores/:dadorId/bulk-search
 * Búsqueda masiva de equipos por patentes
 */
static async bulkSearch(req: AuthRequest, res: Response): Promise<void> {
  const dadorId = Number(req.params.dadorId);
  const { patentes } = req.body;
  const tenantId = req.tenantId!;

  if (!dadorId) {
    throw createError('dadorId inválido', 400, 'BAD_REQUEST');
  }

  const result = await DadorService.bulkSearchByPatentes(
    tenantId,
    dadorId,
    patentes
  );

  AppLogger.info('🔍 Búsqueda masiva realizada (dador)', {
    tenantId,
    dadorId,
    patentesTotal: patentes.length,
    equiposEncontrados: result.equipos.length,
    noEncontradas: result.notFound.length,
    userId: req.user?.userId,
  });

  res.json({
    success: true,
    data: result,
    summary: {
      patentesConsultadas: patentes.length,
      equiposEncontrados: result.equipos.length,
      patentesNoEncontradas: result.notFound.length,
    },
  });
}

/**
 * POST /api/docs/dadores/:dadorId/bulk-zip
 * Generar ZIP con estructura específica para múltiples equipos
 */
static async generateBulkZip(req: AuthRequest, res: Response): Promise<void> {
  const dadorId = Number(req.params.dadorId);
  const { equipoIds, patentes, includeExpired } = req.body;
  const tenantId = req.tenantId!;

  if (!dadorId) {
    throw createError('dadorId inválido', 400, 'BAD_REQUEST');
  }

  let equiposToProcess: number[] = equipoIds || [];

  // Si se reciben patentes, buscar equipos
  if (patentes && patentes.length > 0) {
    const searchResult = await DadorService.bulkSearchByPatentes(
      tenantId,
      dadorId,
      patentes
    );
    equiposToProcess = searchResult.equipos.map((eq: any) => eq.id);
  }

  if (equiposToProcess.length === 0) {
    throw createError('No se encontraron equipos', 404, 'NOT_FOUND');
  }

  // Limitar cantidad de equipos
  if (equiposToProcess.length > 100) {
    throw createError(
      'Máximo 100 equipos por descarga',
      400,
      'TOO_MANY_EQUIPOS'
    );
  }

  // Obtener datos completos de equipos (VALIDAR QUE PERTENEZCAN AL DADOR)
  const equipos = await prisma.equipo.findMany({
    where: {
      id: { in: equiposToProcess },
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId, // IMPORTANTE: FILTRO POR DADOR
    },
    include: {
      empresaTransportista: true,
    },
  });

  if (equipos.length === 0) {
    throw createError('No se encontraron equipos del dador', 404, 'NOT_FOUND');
  }

  // Obtener camiones, choferes y acoplados
  const truckIds = equipos.map(eq => eq.truckId);
  const driverIds = equipos.map(eq => eq.driverId);
  const trailerIds = equipos.filter(eq => eq.trailerId).map(eq => eq.trailerId!);

  const [camiones, choferes, acoplados] = await Promise.all([
    prisma.camion.findMany({ 
      where: { 
        id: { in: truckIds },
        dadorCargaId: dadorId // FILTRO POR DADOR
      } 
    }),
    prisma.chofer.findMany({ 
      where: { 
        id: { in: driverIds },
        dadorCargaId: dadorId // FILTRO POR DADOR
      } 
    }),
    prisma.acoplado.findMany({ 
      where: { 
        id: { in: trailerIds },
        dadorCargaId: dadorId // FILTRO POR DADOR
      } 
    }),
  ]);

  const camionesMap = new Map(camiones.map(c => [c.id, c]));
  const choferesMap = new Map(choferes.map(c => [c.id, c]));
  const acopladosMap = new Map(acoplados.map(a => [a.id, a]));

  // Configurar respuesta ZIP
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=documentos_dador_${dadorId}_${Date.now()}.zip`
  );

  const archiver = await getArchiver();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: any) => {
    AppLogger.error('💥 Error generando ZIP:', err);
    res.status(500).end(String(err));
  });
  archive.pipe(res);

  const { minioService } = await import('../services/minio.service');

  // Procesar cada equipo
  for (const equipo of equipos) {
    const camion = camionesMap.get(equipo.truckId);
    if (!camion) continue;

    const camionPatente = camion.patenteNorm;
    const basePath = `${camionPatente}/`;

    // 1. Documentos de Empresa Transportista
    if (equipo.empresaTransportistaId && equipo.empresaTransportista) {
      const empresaDocs = await prisma.document.findMany({
        where: {
          tenantEmpresaId: tenantId,
          dadorCargaId: dadorId, // FILTRO POR DADOR
          entityType: 'EMPRESA_TRANSPORTISTA',
          entityId: equipo.empresaTransportistaId,
          status: includeExpired ? undefined : 'APROBADO',
          ...(includeExpired ? {} : {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          }),
        },
        include: { template: true },
      });

      const empresaPath = `${basePath}EMPRESA_${equipo.empresaTransportista.cuit}/`;
      await addDocumentsToArchive(
        archive,
        empresaDocs,
        empresaPath,
        minioService,
        tenantId
      );
    }

    // 2. Documentos de Chofer
    const chofer = choferesMap.get(equipo.driverId);
    if (chofer) {
      const choferDocs = await prisma.document.findMany({
        where: {
          tenantEmpresaId: tenantId,
          dadorCargaId: dadorId, // FILTRO POR DADOR
          entityType: 'CHOFER',
          entityId: equipo.driverId,
          status: includeExpired ? undefined : 'APROBADO',
          ...(includeExpired ? {} : {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          }),
        },
        include: { template: true },
      });

      const choferPath = `${basePath}CHOFER_${chofer.dniNorm}/`;
      await addDocumentsToArchive(
        archive,
        choferDocs,
        choferPath,
        minioService,
        tenantId
      );
    }

    // 3. Documentos de Camión
    const camionDocs = await prisma.document.findMany({
      where: {
        tenantEmpresaId: tenantId,
        dadorCargaId: dadorId, // FILTRO POR DADOR
        entityType: 'CAMION',
        entityId: equipo.truckId,
        status: includeExpired ? undefined : 'APROBADO',
        ...(includeExpired ? {} : {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        }),
      },
      include: { template: true },
    });

    const camionPath = `${basePath}CAMION_${camion.patenteNorm}/`;
    await addDocumentsToArchive(
      archive,
      camionDocs,
      camionPath,
      minioService,
      tenantId
    );

    // 4. Documentos de Acoplado (si existe)
    if (equipo.trailerId) {
      const acoplado = acopladosMap.get(equipo.trailerId);
      if (acoplado) {
        const acopladoDocs = await prisma.document.findMany({
          where: {
            tenantEmpresaId: tenantId,
            dadorCargaId: dadorId, // FILTRO POR DADOR
            entityType: 'ACOPLADO',
            entityId: equipo.trailerId,
            status: includeExpired ? undefined : 'APROBADO',
            ...(includeExpired ? {} : {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            }),
          },
          include: { template: true },
        });

        const acopladoPath = `${basePath}ACOPLADO_${acoplado.patenteNorm}/`;
        await addDocumentsToArchive(
          archive,
          acopladoDocs,
          acopladoPath,
          minioService,
          tenantId
        );
      }
    }
  }

  AppLogger.info('📦 ZIP masivo generado (dador)', {
    tenantId,
    dadorId,
    equipos: equipos.length,
    userId: req.user?.userId,
  });

  archive.finalize();
}

// Función auxiliar (reutilizar la del archivo de clientes o copiar aquí)
async function addDocumentsToArchive(...) { ... }
```

---

### Rutas

**Archivo**: `apps/documentos/src/routes/dadores.routes.ts`

```typescript
// Agregar al final del archivo, antes de export default router

import { z } from 'zod';

// Cargar archiver perezosamente
let _archiver: any;
async function getArchiver() {
  if (!_archiver) {
    const mod = await import('archiver');
    _archiver = (mod as any).default || (mod as any);
  }
  return _archiver;
}

/**
 * POST /api/docs/dadores/:dadorId/bulk-search
 * Búsqueda masiva de equipos por patentes
 */
router.post(
  '/:dadorId/bulk-search',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]),
  authorizeDador,
  validate(dadorBulkSearchSchema),
  DadoresController.bulkSearch
);

/**
 * POST /api/docs/dadores/:dadorId/bulk-zip
 * Generar ZIP con estructura específica para múltiples equipos
 */
router.post(
  '/:dadorId/bulk-zip',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]),
  authorizeDador,
  validate(dadorBulkZipSchema),
  DadoresController.generateBulkZip
);
```

---

## 📄 3. Backend - Aprobación de Documentos por Dador

### Modificar Servicio de Aprobación

**Archivo**: `apps/documentos/src/services/approval.service.ts`

```typescript
// Modificar el método getPendingDocuments para aceptar dadorCargaId

static async getPendingDocuments(
  tenantEmpresaId: number,
  options?: {
    dadorCargaId?: number; // NUEVO PARÁMETRO
    entityType?: string;
    minConfidence?: number;
    maxConfidence?: number;
    page?: number;
    limit?: number;
  }
): Promise<{
  data: any[];
  pagination: { page: number; limit: number; total: number };
}> {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = {
    tenantEmpresaId,
    status: { in: ['CLASIFICANDO', 'PENDIENTE_APROBACION'] },
  };

  // FILTRAR POR DADOR SI SE ESPECIFICA
  if (options?.dadorCargaId) {
    where.dadorCargaId = options.dadorCargaId;
  }

  if (options?.entityType) {
    where.entityType = options.entityType;
  }

  const documents = await prisma.document.findMany({
    where,
    include: {
      template: { select: { name: true, entityType: true } },
      classification: true,
    },
    orderBy: { uploadedAt: 'desc' },
    skip,
    take: limit,
  });

  const total = await prisma.document.count({ where });

  return {
    data: documents,
    pagination: { page, limit, total },
  };
}

// Agregar método para validar acceso a documento por dador

static async validateDadorAccess(
  documentId: number,
  dadorCargaId: number
): Promise<boolean> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { dadorCargaId: true },
  });

  return document?.dadorCargaId === dadorCargaId;
}
```

---

### Modificar Controlador de Aprobación

**Archivo**: `apps/documentos/src/controllers/approval.controller.ts`

```typescript
// Modificar método getPendingDocuments

static async getPendingDocuments(req: Request, res: Response): Promise<void> {
  try {
    const tenantEmpresaId = (req as any).tenantId as number;
    const user = (req as any).user;
    
    // Extraer dadorCargaId si el usuario es DADOR_CARGA
    const dadorCargaId = user.role === 'DADOR_CARGA' 
      ? user.metadata?.dadorCargaId 
      : undefined;
    
    const { entityType, minConfidence, maxConfidence, page, limit } = (req.query || {}) as any;
    
    const result = await ApprovalService.getPendingDocuments(tenantEmpresaId, {
      dadorCargaId, // NUEVO: FILTRO POR DADOR
      entityType,
      minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
      maxConfidence: maxConfidence ? parseFloat(maxConfidence) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    
    res.json({ success: true, ...result });
  } catch (error) {
    AppLogger.error('ApprovalController.getPendingDocuments error:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  }
}

// Modificar método approveDocument

static async approveDocument(req: Request, res: Response): Promise<void> {
  try {
    const tenantEmpresaId = (req as any).tenantId as number;
    const user = (req as any).user;
    const userId = user?.id ?? user?.userId;
    const id = Number((req.params as any).id);
    const { confirmedEntityType, confirmedEntityId, confirmedExpiration, confirmedTemplateId, reviewNotes } = (req.body || {}) as any;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Usuario no identificado', code: 'USER_NOT_IDENTIFIED' });
      return;
    }

    // VALIDAR ACCESO SI ES DADOR_CARGA
    if (user.role === 'DADOR_CARGA') {
      const dadorCargaId = user.metadata?.dadorCargaId;
      if (!dadorCargaId) {
        res.status(403).json({ success: false, message: 'Usuario sin dador asociado', code: 'NO_DADOR_ASSOCIATED' });
        return;
      }
      
      const hasAccess = await ApprovalService.validateDadorAccess(id, dadorCargaId);
      if (!hasAccess) {
        AppLogger.warn('🚫 Usuario DADOR_CARGA intentando aprobar documento de otro dador', {
          userId,
          documentId: id,
          userDadorId: dadorCargaId,
        });
        res.status(403).json({ success: false, message: 'Acceso denegado al documento', code: 'DOCUMENT_ACCESS_DENIED' });
        return;
      }
    }
    
    const doc = await ApprovalService.approveDocument(id, tenantEmpresaId, {
      reviewedBy: userId,
      confirmedEntityType,
      confirmedEntityId,
      confirmedExpiration: confirmedExpiration ? new Date(confirmedExpiration) : undefined,
      confirmedTemplateId,
      reviewNotes,
    });
    
    try {
      webSocketService.notifyDocumentApproved({ documentId: doc.id, empresaId: doc.dadorCargaId, expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null });
    } catch {}
    
    res.json({ success: true, data: doc, message: 'Documento aprobado' });
  } catch (error) {
    AppLogger.error('ApprovalController.approveDocument error:', error);
    const msg = (error as any)?.message || '';
    if (msg.includes('no encontrado')) {
      res.status(404).json({ success: false, message: msg, code: 'NOT_FOUND' });
      return;
    }
    res.status(500).json({ success: false, message: msg || 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  }
}

// Modificar método rejectDocument (similar a approveDocument)
// ... agregar validación de acceso por dador
```

---

### Modificar Rutas de Aprobación

**Archivo**: `apps/documentos/src/routes/approval.routes.ts`

```typescript
// Modificar rutas existentes para agregar rol DADOR_CARGA

router.get('/pending', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]), // AGREGADO DADOR_CARGA
  validate(pendingDocumentsQuerySchema), 
  ApprovalController.getPendingDocuments
);

router.get('/pending/:id', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]), // AGREGADO DADOR_CARGA
  ApprovalController.getPendingDocument
);

router.post('/pending/:id/approve', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]), // AGREGADO DADOR_CARGA
  approvalRateLimit, 
  validate(approveDocumentSchema), 
  ApprovalController.approveDocument
);

router.post('/pending/:id/reject', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]), // AGREGADO DADOR_CARGA
  approvalRateLimit, 
  validate(rejectDocumentSchema), 
  ApprovalController.rejectDocument
);

router.post('/pending/batch-approve', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]), // AGREGADO DADOR_CARGA
  approvalRateLimit, 
  ApprovalController.batchApprove
);
```

---

## 📄 4. Frontend - Componente de Aprobación para Dador

**Archivo nuevo**: `apps/frontend/src/features/documentos/components/DadorApprovalQueue.tsx`

```typescript
import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
  useGetPendingDocumentsQuery, 
  useApproveDocumentMutation, 
  useRejectDocumentMutation 
} from '../api/documentosApiSlice';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  EyeIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { useToast } from '../../../components/ui/toast';

interface DadorApprovalQueueProps {
  dadorId: number;
}

export const DadorApprovalQueue: React.FC<DadorApprovalQueueProps> = ({ dadorId }) => {
  const { data: pendingResp, refetch } = useGetPendingDocumentsQuery({});
  const pending = pendingResp?.data || [];
  const [approveDoc] = useApproveDocumentMutation();
  const [rejectDoc] = useRejectDocumentMutation();
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const { addToast } = useToast();

  const handleApprove = async (docId: number) => {
    try {
      await approveDoc({ id: docId }).unwrap();
      addToast({
        title: 'Documento aprobado',
        description: 'El documento ha sido aprobado exitosamente',
        variant: 'success',
      });
      refetch();
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo aprobar el documento',
        variant: 'error',
      });
    }
  };

  const handleReject = async (docId: number, reason: string) => {
    try {
      await rejectDoc({ id: docId, reason }).unwrap();
      addToast({
        title: 'Documento rechazado',
        description: 'El documento ha sido rechazado',
        variant: 'default',
      });
      refetch();
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo rechazar el documento',
        variant: 'error',
      });
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-xl">
            <ClockIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Documentos Pendientes de Aprobación</h2>
            <p className="text-yellow-100 text-sm">
              {pending.length} documento(s) esperando revisión
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {pending.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              ¡Todo al día!
            </h3>
            <p className="text-gray-600">
              No hay documentos pendientes de aprobación
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((doc: any) => (
              <div 
                key={doc.id}
                className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-800">
                        Documento #{doc.id}
                      </span>
                      <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 border-2 border-yellow-200 font-semibold">
                        {doc.status}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>📄 Template: <strong>{doc.template?.name || `ID ${doc.templateId}`}</strong></div>
                      <div>📌 Tipo: <strong>{doc.entityType}</strong></div>
                      <div>🆔 Entidad ID: <strong>{doc.entityId}</strong></div>
                      {doc.classification?.detectedExpiration && (
                        <div>📅 Vencimiento detectado: <strong>{new Date(doc.classification.detectedExpiration).toLocaleDateString('es-AR')}</strong></div>
                      )}
                      {doc.classification?.confidence !== undefined && (
                        <div>🎯 Confianza: <strong>{(doc.classification.confidence * 100).toFixed(1)}%</strong></div>
                      )}
                      {doc.fileName && (
                        <div className="text-gray-500">📎 <strong>{doc.fileName}</strong></div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewDocId(doc.id)}
                      className="border-2 border-purple-300 text-purple-600 hover:bg-purple-100 rounded-xl font-semibold"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => handleApprove(doc.id)}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Aprobar
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const reason = prompt('Motivo del rechazo:');
                        if (reason) handleReject(doc.id, reason);
                      }}
                      className="border-2 border-red-300 text-red-600 hover:bg-red-100 rounded-xl font-semibold"
                    >
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewDocId && (
        <DocumentPreviewModal
          documentId={previewDocId}
          onClose={() => setPreviewDocId(null)}
        />
      )}
    </Card>
  );
};
```

---

## 📄 5. Frontend - Integración en DadoresPortalPage

**Archivo**: `apps/frontend/src/pages/DadoresPortalPage.tsx`

```typescript
// Agregar imports
import { BulkPatentesSearch } from '../features/documentos/components/BulkPatentesSearch';
import { DadorApprovalQueue } from '../features/documentos/components/DadorApprovalQueue';
import { DocumentPreviewModal } from '../features/documentos/components/DocumentPreviewModal';

// Agregar después de las cards existentes, antes del cierre del contenedor principal:

{/* Búsqueda Masiva por Patentes */}
<BulkPatentesSearch
  dadorId={resolvedDadorId}
  onResultsFound={(equipos) => {
    console.log('Equipos encontrados:', equipos);
  }}
/>

{/* Cola de Aprobación de Documentos */}
{resolvedDadorId && (
  <DadorApprovalQueue dadorId={resolvedDadorId} />
)}
```

---

## 📄 6. Frontend - API Slice (RTK Query)

**Archivo**: `apps/frontend/src/features/documentos/api/documentosApiSlice.ts`

```typescript
// Agregar endpoints al slice existente

  // Búsqueda masiva por patentes (dadores)
  bulkSearchDador: builder.mutation<any, { dadorId: number; patentes: string[] }>({
    query: ({ dadorId, patentes }) => ({
      url: `/dadores/${dadorId}/bulk-search`,
      method: 'POST',
      body: { patentes },
    }),
  }),

  // ZIP masivo (dadores)
  bulkZipDador: builder.mutation<Blob, { dadorId: number; equipoIds?: number[]; patentes?: string[] }>({
    query: ({ dadorId, equipoIds, patentes }) => ({
      url: `/dadores/${dadorId}/bulk-zip`,
      method: 'POST',
      body: { equipoIds, patentes },
      responseHandler: (response) => response.blob(),
    }),
  }),

  // Documentos pendientes de aprobación
  getPendingDocuments: builder.query<any, {}>({
    query: () => '/approval/pending',
    providesTags: ['Documents'],
  }),

  // Aprobar documento
  approveDocument: builder.mutation<any, { id: number; confirmedEntityType?: string; confirmedEntityId?: number; confirmedExpiration?: string }>({
    query: ({ id, ...body }) => ({
      url: `/approval/pending/${id}/approve`,
      method: 'POST',
      body,
    }),
    invalidatesTags: ['Documents'],
  }),

  // Rechazar documento
  rejectDocument: builder.mutation<any, { id: number; reason: string }>({
    query: ({ id, reason }) => ({
      url: `/approval/pending/${id}/reject`,
      method: 'POST',
      body: { reason },
    }),
    invalidatesTags: ['Documents'],
  }),
```

---

## 🧪 Tests

### Test del Middleware authorizeDador

**Archivo**: `apps/documentos/src/middlewares/__tests__/auth.middleware.test.ts`

```typescript
import { authorizeDador } from '../auth.middleware';

describe('authorizeDador middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      user: null,
      params: {},
      body: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('debe permitir acceso a SUPERADMIN sin validaciones', () => {
    req.user = { role: 'SUPERADMIN', userId: 1 };
    req.params.dadorId = '5';

    authorizeDador(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe permitir acceso a DADOR_CARGA a su propio dador', () => {
    req.user = { 
      role: 'DADOR_CARGA', 
      userId: 1,
      metadata: { dadorCargaId: 5 }
    };
    req.params.dadorId = '5';

    authorizeDador(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe denegar acceso a DADOR_CARGA a otro dador', () => {
    req.user = { 
      role: 'DADOR_CARGA', 
      userId: 1,
      metadata: { dadorCargaId: 5 }
    };
    req.params.dadorId = '10';

    authorizeDador(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'DADOR_ACCESS_DENIED',
      })
    );
  });

  it('debe inyectar dadorCargaId si no se especifica', () => {
    req.user = { 
      role: 'DADOR_CARGA', 
      userId: 1,
      metadata: { dadorCargaId: 5 }
    };

    authorizeDador(req, res, next);

    expect(req.body.dadorCargaId).toBe(5);
    expect(req.query.dadorCargaId).toBe('5');
    expect(next).toHaveBeenCalled();
  });
});
```

---

## 📝 Checklist de Implementación

### Backend
- [ ] Agregar rol `DADOR_CARGA` al enum
- [ ] Implementar middleware `authorizeDador`
- [ ] Agregar schemas de validación (bulkSearch, bulkZip)
- [ ] Implementar `DadorService.bulkSearchByPatentes`
- [ ] Implementar `DadoresController.bulkSearch`
- [ ] Implementar `DadoresController.generateBulkZip`
- [ ] Agregar rutas en `dadores.routes.ts`
- [ ] Modificar `ApprovalService` para filtrar por dadorId
- [ ] Modificar `ApprovalController` para validar acceso por dador
- [ ] Modificar rutas de aprobación para agregar rol DADOR_CARGA
- [ ] Agregar tests unitarios
- [ ] Probar con Postman/curl

### Frontend
- [ ] Crear componente `DadorApprovalQueue.tsx`
- [ ] Integrar componente en `DadoresPortalPage.tsx`
- [ ] Agregar endpoints en `documentosApiSlice.ts`
- [ ] Reutilizar `BulkPatentesSearch` para dadores
- [ ] Reutilizar `DocumentPreviewModal`
- [ ] Probar flujo completo en navegador

### Testing
- [ ] Probar acceso con rol DADOR_CARGA
- [ ] Probar aislamiento entre dadores
- [ ] Probar búsqueda masiva
- [ ] Probar generación de ZIP
- [ ] Probar aprobación de documentos
- [ ] Probar validación de acceso

---

Este documento contiene todos los ejemplos de código necesarios para implementar la funcionalidad de dadores. Todos los ejemplos siguen las convenciones del proyecto y están listos para ser copiados y adaptados.

