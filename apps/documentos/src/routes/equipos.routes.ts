import { Router } from 'express';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { ownsEquipo, canModifyEquipo, canTransferEquipo } from '../middlewares/ownership.middleware';
import { equipoHistoryQuerySchema } from '../schemas/validation.schemas';
// Usamos literales para roles para evitar dependencia directa en enum como valor
import { EquiposController } from '../controllers/equipos.controller';
import { createEquipoSchema, equipoClienteAssocSchema, equipoListQuerySchema, updateEquipoSchema, equipoAttachSchema, equipoDetachSchema } from '../schemas/validation.schemas';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import { AuditService } from '../services/audit.service';

const router = Router();

router.use(authenticate);
router.get('/', validate(equipoListQuerySchema), EquiposController.list);
// Búsqueda paginada con filtros avanzados (para página de consulta admin)
router.get('/search-paged', EquiposController.searchPaged);
router.get('/:id', ownsEquipo(), EquiposController.getById);
router.post('/', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(createEquipoSchema), EquiposController.create);

// Alta mínima desde identificadores para Dadores/Transportistas
const phoneRegex = /^\+?[1-9]\d{7,14}$/;
const createMinimalSchema = z.object({
  body: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0),
    dniChofer: z.string().min(7),
    patenteTractor: z.string().min(5),
    patenteAcoplado: z.string().min(5).optional().nullable(),
    choferPhones: z.array(z.string().regex(phoneRegex, 'Formato WhatsApp inválido')).max(3).optional(),
  }),
});
router.post('/minimal', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(createMinimalSchema), EquiposController.createMinimal);

// Alta Completa de Equipo - TRANSACCIONAL
const createCompletoSchema = z.object({
  body: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0).optional(),
    // Empresa Transportista
    empresaTransportistaCuit: z.string().regex(/^\d{11}$/, 'CUIT debe tener 11 dígitos'),
    empresaTransportistaNombre: z.string().min(2).max(200),
    // Chofer
    choferDni: z.string().min(6).max(32),
    choferNombre: z.string().min(1).max(120).optional(),
    choferApellido: z.string().min(1).max(120).optional(),
    choferPhones: z.array(z.string().regex(phoneRegex, 'Formato WhatsApp inválido')).max(3).optional(),
    // Camión
    camionPatente: z.string().min(5).max(12),
    camionMarca: z.string().min(1).max(100).optional(),
    camionModelo: z.string().min(1).max(100).optional(),
    // Acoplado (opcional)
    acopladoPatente: z.string().min(5).max(12).optional().nullable(),
    acopladoTipo: z.string().min(1).max(100).optional(),
    // Clientes a asociar
    clienteIds: z.array(z.number().int().positive()).optional(),
  }),
});
router.post('/alta-completa', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(createCompletoSchema), EquiposController.createCompleto);

// Rollback de Alta Completa
const rollbackCompletoSchema = z.object({
  body: z.object({
    deleteChofer: z.boolean().optional(),
    deleteCamion: z.boolean().optional(),
    deleteAcoplado: z.boolean().optional(),
    deleteEmpresa: z.boolean().optional(),
  }),
});
router.post('/:id/rollback', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(rollbackCompletoSchema), EquiposController.rollbackCompleto);

router.put('/:id', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(updateEquipoSchema), EquiposController.update);
router.delete('/:id', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), EquiposController.delete);
router.get('/:id/history', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(equipoHistoryQuerySchema), EquiposController.history);
router.get('/:id/audit', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), EquiposController.getAuditHistory);
router.get('/:id/requisitos', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any, 'TRANSPORTISTA' as any, 'CHOFER' as any]), EquiposController.getRequisitos);

// Actualizar entidades del equipo (chofer, camión, acoplado, empresa)
const updateEntidadesSchema = z.object({
  body: z.object({
    choferId: z.number().int().positive().optional(),
    camionId: z.number().int().positive().optional(),
    acopladoId: z.number().int().positive().nullable().optional(),
    empresaTransportistaId: z.number().int().positive().optional(),
  }),
});
router.put('/:id/entidades', canModifyEquipo(), validate(updateEntidadesSchema), EquiposController.updateEntidades);

// Gestión de clientes del equipo
const addClienteSchema = z.object({
  body: z.object({
    clienteId: z.number().int().positive(),
  }),
});
router.post('/:id/clientes', canModifyEquipo(), validate(addClienteSchema), EquiposController.addCliente);
router.delete('/:id/clientes/:clienteId', canModifyEquipo(), EquiposController.removeClienteWithArchive);

// Transferir equipo a otro dador de carga (solo admin interno)
const transferirSchema = z.object({
  body: z.object({
    nuevoDadorCargaId: z.number().int().positive(),
    motivo: z.string().max(500).optional(),
  }),
});
router.post('/:id/transferir', canTransferEquipo(), validate(transferirSchema), EquiposController.transferir);

// Rutas legacy para compatibilidad
router.post('/:equipoId/clientes/:clienteId', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(equipoClienteAssocSchema), EquiposController.associateCliente);
router.delete('/:equipoId/clientes/:clienteId', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), EquiposController.removeCliente);

// Acciones de soporte para dadores/admin: revisar faltantes ahora y solicitar documentos (chofer)
router.post('/:equipoId/check-missing-now', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const { NotificationService } = await import('../services/notification.service');
  // resolver tenant actual del equipo para cumplir firma (tenantId, equipoId)
  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { tenantEmpresaId: true } });
  const count = await NotificationService.checkMissingForEquipo(equipo?.tenantEmpresaId || 1, equipoId);
  res.json({ success: true, data: { sent: count } });
});

router.post('/:equipoId/request-missing', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const { prisma } = await import('../config/database');
  const { ComplianceService } = await import('../services/compliance.service');
  const { NotificationService } = await import('../services/notification.service');
  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { id: true, tenantEmpresaId: true, dadorCargaId: true, driverId: true } });
  if (!equipo) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
  // Clientes vigentes
  const clientes = await prisma.equipoCliente.findMany({ where: { equipoId, asignadoHasta: null }, select: { clienteId: true } });
  const faltantes: Array<{ clienteId: number; items: any[] }> = [];
  for (const c of clientes) {
    const results = await ComplianceService.evaluateEquipoCliente(equipoId, c.clienteId);
    const miss = results.filter(r => r.state === 'FALTANTE');
    if (miss.length) faltantes.push({ clienteId: c.clienteId, items: miss });
  }
  // Enviar mensaje al chofer si hay faltantes y si el dador lo permite
  let sent = 0;
  if (faltantes.length > 0) {
    const dador = await prisma.dadorCarga.findUnique({ where: { id: equipo.dadorCargaId }, select: { notifyDriverEnabled: true } });
    if (dador?.notifyDriverEnabled) {
      const ch = await prisma.chofer.findUnique({ where: { id: equipo.driverId! }, select: { phones: true, dni: true } });
      const text = `Faltan documentos requeridos para tu equipo #${equipo.id}. Por favor, sube la documentación pendiente.`;
      for (const ms of (ch?.phones || []).slice(0,3)) {
        await NotificationService.send(ms, text, { tenantId: equipo.tenantEmpresaId, dadorId: equipo.dadorCargaId, equipoId: equipo.id, audience: 'CHOFER', type: 'faltante', templateKey: 'faltante.chofer' });
        sent++;
      }
    }
  }
  res.json({ success: true, data: { faltantes, sent } });
});

// Estado de equipo (semaforo y breakdown)
router.get('/:id/estado', async (req, res) => {
  const equipoId = Number(req.params.id);
  const clienteId = req.query.clienteId ? Number(req.query.clienteId) : undefined;
  const { EquipoEstadoService } = await import('../services/equipo-estado.service');
  const data = await EquipoEstadoService.calculateEquipoEstado(equipoId, clienteId);
  return res.json({ success: true, data });
});

// Asociar / Desasociar componentes del equipo
router.post('/:id/attach', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(equipoAttachSchema), async (req: any, res) => {
  const { EquipoService } = await import('../services/equipo.service');
  const result = await EquipoService.attachComponents(req.tenantId!, Number(req.params.id), req.body);
  const response = { success: true, data: result };
  // Audit best-effort
  void AuditService.log({
    tenantEmpresaId: req.tenantId,
    userId: req.user?.userId ?? req.user?.id,
    userRole: req.user?.role,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: 200,
    action: 'EQUIPO_ATTACH',
    entityType: 'EQUIPO',
    entityId: Number(req.params.id),
    details: req.body,
  });
  return res.json(response);
});

router.post('/:id/detach', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(equipoDetachSchema), async (req: any, res) => {
  const { EquipoService } = await import('../services/equipo.service');
  const result = await EquipoService.detachComponents(req.tenantId!, Number(req.params.id), req.body);
  const response = { success: true, data: result };
  // Audit best-effort
  void AuditService.log({
    tenantEmpresaId: req.tenantId,
    userId: req.user?.userId ?? req.user?.id,
    userRole: req.user?.role,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: 200,
    action: 'EQUIPO_DETACH',
    entityType: 'EQUIPO',
    entityId: Number(req.params.id),
    details: req.body,
  });
  return res.json(response);
});

// ==============================
// Búsqueda por DNIs (JSON) → lista de equipos
// ==============================
const searchByDnisSchema = z.object({
  body: z.object({ dnis: z.array(z.string().min(7)).min(1).max(5000) }),
});
router.post('/search/dnis', validate(searchByDnisSchema), async (req: any, res) => {
  const tenantEmpresaId: number = req.tenantId!;
  const dnis: string[] = (req.body?.dnis || []).map((v: string) => (v || '').replace(/\D+/g, ''));
  const unique = Array.from(new Set(dnis.filter(Boolean)));
  if (unique.length === 0) return res.json({ success: true, data: [] });
  try {
    const equipos = await prisma.equipo.findMany({
      where: { tenantEmpresaId, driverDniNorm: { in: unique } },
      orderBy: { validFrom: 'desc' },
      select: { id: true, dadorCargaId: true, tenantEmpresaId: true, driverDniNorm: true, truckPlateNorm: true, trailerPlateNorm: true, estado: true },
    });
    return res.json({ success: true, data: equipos });
  } catch (e: any) {
    AppLogger.error('💥 Error en búsqueda por DNIs', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// ==============================
// Descarga masiva de documentación vigente por lista de equipos
// ==============================
let _archiver: any;
async function getArchiver() {
  if (!_archiver) {
    const mod = await import('archiver');
    _archiver = (mod as any).default || (mod as any);
  }
  return _archiver;
}

const bulkZipSchema = z.object({ body: z.object({ equipoIds: z.array(z.number().int().positive()).min(1).max(500) }) });
router.post('/download/vigentes', authorize(['ADMIN' as any, 'SUPERADMIN' as any, 'ADMIN_INTERNO' as any, 'DADOR_DE_CARGA' as any]), validate(bulkZipSchema), async (req: any, res) => {
  // Ordenar equipos por ID ascendente
  const equipoIds: number[] = [...(req.body.equipoIds || [])].sort((a, b) => a - b);
  const now = new Date();
  res.setHeader('Content-Type', 'application/zip');
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  res.setHeader('Content-Disposition', `attachment; filename=documentacion_equipos_vigentes_${stamp}_${equipoIds.length}equipos.zip`);
  const archiver = await getArchiver();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: any) => res.status(500).end(String(err)));
  archive.pipe(res);

  try {
    const { minioService } = await import('../services/minio.service');
    for (const equipoId of equipoIds) {
      // Cargar equipo con relaciones para obtener CUIT y patentes
      const equipo = await prisma.equipo.findUnique({
        where: { id: equipoId },
        include: {
          empresaTransportista: { select: { id: true, cuit: true } },
        },
      });
      if (!equipo) continue;

      // Obtener datos adicionales de las entidades
      const transportistaCuit = equipo.empresaTransportista?.cuit || 'SIN_CUIT';
      const choferDni = equipo.driverDniNorm || 'SIN_DNI';
      const tractorPatente = equipo.truckPlateNorm || 'SIN_PATENTE';
      const acopladoPatente = equipo.trailerPlateNorm || 'SIN_PATENTE';

      // Carpeta principal: equipo_{id}_DNI_{dni}_{patente_tractor}
      const mainFolder = `equipo_${equipo.id}_DNI_${choferDni}_${tractorPatente}`;

      // Subcarpetas por tipo de entidad (ordenadas numéricamente)
      const subfolders: Record<string, string> = {
        'EMPRESA_TRANSPORTISTA': `1_Empresa_Transportista_${transportistaCuit}`,
        'CHOFER': `2_Chofer_${choferDni}`,
        'CAMION': `3_Tractor_${tractorPatente}`,
        'ACOPLADO': `4_Semi_Acoplado_${acopladoPatente}`,
      };

      const clauses: any[] = [];
      if (equipo.empresaTransportistaId) clauses.push({ entityType: 'EMPRESA_TRANSPORTISTA' as any, entityId: equipo.empresaTransportistaId });
      if (equipo.driverId) clauses.push({ entityType: 'CHOFER' as any, entityId: equipo.driverId });
      if (equipo.truckId) clauses.push({ entityType: 'CAMION' as any, entityId: equipo.truckId });
      if (equipo.trailerId) clauses.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });
      const docs = await prisma.document.findMany({
        where: {
          tenantEmpresaId: equipo.tenantEmpresaId,
          dadorCargaId: equipo.dadorCargaId,
          status: 'APROBADO' as any,
          AND: [
            clauses.length ? { OR: clauses } : {},
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
        } as any,
        select: { id: true, filePath: true, entityType: true, entityId: true, fileName: true, template: { select: { name: true } } },
        orderBy: { uploadedAt: 'desc' },
      });

      // Ordenar documentos por tipo de entidad (1:EMPRESA, 2:CHOFER, 3:CAMION, 4:ACOPLADO)
      const entityOrder: Record<string, number> = { 'EMPRESA_TRANSPORTISTA': 1, 'CHOFER': 2, 'CAMION': 3, 'ACOPLADO': 4 };
      const sortedDocs = [...docs].sort((a, b) => (entityOrder[a.entityType] || 99) - (entityOrder[b.entityType] || 99));

      for (const d of sortedDocs) {
        let bucketName: string;
        let objectPath: string;
        if (typeof d.filePath === 'string' && d.filePath.includes('/')) {
          const idx = d.filePath.indexOf('/');
          bucketName = d.filePath.slice(0, idx);
          objectPath = d.filePath.slice(idx + 1);
        } else {
          bucketName = `docs-t${equipo.tenantEmpresaId}`;
          objectPath = d.filePath as any;
        }
        const stream = await minioService.getObject(bucketName, objectPath);
        
        // Determinar subcarpeta según entityType
        const subfolder = subfolders[d.entityType] || 'otros';
        const safeTpl = String(d.template?.name || 'documento').replace(/[^a-z0-9_-]/gi,'_');
        const ext = (d.fileName || '').split('.').pop() || 'pdf';
        const name = `${mainFolder}/${subfolder}/${safeTpl}.${ext}`;
        archive.append(stream as any, { name });
      }
    }
  } catch (err) {
    AppLogger.error('💥 Error generando ZIP masivo', err);
    if (!res.headersSent) res.status(500).end('Error generando ZIP');
    try { archive.abort(); } catch {}
    return;
  }
  archive.finalize();
  // Audit (best-effort)
  void AuditService.log({
    tenantEmpresaId: req.tenantId,
    userId: req.user?.userId ?? req.user?.id,
    userRole: req.user?.role,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: 200,
    action: 'ZIP_VIGENTES_DOWNLOAD',
    entityType: 'ZIP_STREAM',
    details: { equipos: equipoIds.length, generatedAt: now.toISOString() },
  });
});

// Excel resumen de documentos por equipo
const equipoSummarySchema = z.object({
  params: z.object({ id: z.string().transform((v) => Number(v)) }),
});
router.get('/:id/summary.xlsx', validate(equipoSummarySchema), async (req: any, res) => {
  try {
    const equipoId = Number(req.params.id);
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: { id: true, tenantEmpresaId: true, dadorCargaId: true, driverId: true, truckId: true, trailerId: true, empresaTransportistaId: true },
    });
    if (!equipo) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    
    const clauses: any[] = [];
    if (equipo.empresaTransportistaId) clauses.push({ entityType: 'EMPRESA_TRANSPORTISTA' as any, entityId: equipo.empresaTransportistaId });
    if (equipo.driverId) clauses.push({ entityType: 'CHOFER' as any, entityId: equipo.driverId });
    if (equipo.truckId) clauses.push({ entityType: 'CAMION' as any, entityId: equipo.truckId });
    if (equipo.trailerId) clauses.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });
    
    const docs = await prisma.document.findMany({
      where: {
        tenantEmpresaId: equipo.tenantEmpresaId,
        dadorCargaId: equipo.dadorCargaId,
        ...(clauses.length ? { OR: clauses } : {}),
      } as any,
      include: { template: { select: { name: true, entityType: true } } },
      orderBy: [{ uploadedAt: 'desc' }],
    });
    
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Documentos');
    ws.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Entidad', key: 'entityType', width: 18 },
      { header: 'Entidad ID', key: 'entityId', width: 12 },
      { header: 'Plantilla', key: 'templateName', width: 28 },
      { header: 'Estado', key: 'status', width: 16 },
      { header: 'Subido', key: 'uploadedAt', width: 20 },
      { header: 'Vence', key: 'expiresAt', width: 20 },
    ];
    for (const d of docs) {
      ws.addRow({
        id: d.id,
        entityType: d.entityType,
        entityId: d.entityId,
        templateName: d.template?.name || '',
        status: d.status,
        uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString() : '',
        expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : '',
      });
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=equipo_${equipo.id}_documentos.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    AppLogger.error('Error generando Excel de equipo', err);
    res.status(500).json({ success: false, message: 'Error generando Excel' });
  }
});

export default router;


