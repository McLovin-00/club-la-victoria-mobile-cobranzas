import { Router } from 'express';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { ClientsController } from '../controllers/clients.controller';
import { addRequirementSchema, clienteListQuerySchema, createClienteSchema, removeRequirementSchema, updateClienteSchema } from '../schemas/validation.schemas';
// import { EquiposController } from '../controllers/equipos.controller';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuditService } from '../services/audit.service';
// Cargar archiver perezosamente para no requerir instalación inmediata en entornos sin build
let _archiver: any;
async function getArchiver() {
  if (!_archiver) {
    const mod = await import('archiver');
    _archiver = mod.default || mod as any;
  }
  return _archiver;
}
// ExcelJS lazy
let _exceljs: any;
async function getExcelJS() {
  if (!_exceljs) {
    const mod = await import('exceljs');
    _exceljs = mod as any;
  }
  return _exceljs;
}

const router = Router();

router.use(authenticate);
router.get('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]), validate(clienteListQuerySchema), ClientsController.list);
router.post('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]), validate(createClienteSchema), ClientsController.create);
router.put('/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]), validate(updateClienteSchema), ClientsController.update);
router.delete('/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO]), ClientsController.remove);

router.get('/:clienteId/requirements', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]), ClientsController.listRequirements);
router.post('/:clienteId/requirements', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]), validate(addRequirementSchema), ClientsController.addRequirement);
router.delete('/:clienteId/requirements/:requirementId', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]), validate(removeRequirementSchema), ClientsController.removeRequirement);

// Listado de equipos habilitados para un cliente (portales de cliente)
const listEquiposClienteSchema = z.object({
  params: z.object({ clienteId: z.string().transform((v) => Number(v)) }),
});
router.get('/:clienteId/equipos', validate(listEquiposClienteSchema), async (req, res) => {
  const { clienteId } = req.params as any;
  const data = await (await import('../services/equipo.service')).EquipoService.listByCliente((req as any).tenantId!, Number(clienteId));
  res.json({ success: true, data });
});

// Estado de equipos por cliente (agregación con paginación simple)
const clienteEquiposEstadoSchema = z.object({
  params: z.object({ clienteId: z.string().transform((v) => Number(v)) }),
  query: z.object({
    page: z.string().transform((v) => Math.max(1, parseInt(v, 10))).optional(),
    limit: z.string().transform((v) => Math.min(100, Math.max(1, parseInt(v, 10)))).optional(),
  }).optional(),
});
router.get('/:clienteId/equipos/estado', validate(clienteEquiposEstadoSchema), async (req: any, res) => {
  const clienteId = Number(req.params.clienteId);
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const offset = (page - 1) * limit;
  const rows = await prisma.equipoCliente.findMany({
    where: { clienteId, equipo: { tenantEmpresaId: req.tenantId! } },
    select: { equipoId: true },
    orderBy: { asignadoDesde: 'desc' },
    skip: offset,
    take: limit,
  });
  const { EquipoEstadoService } = await import('../services/equipo-estado.service');
  const estados = await Promise.all(rows.map(r => EquipoEstadoService.calculateEquipoEstado(r.equipoId, clienteId)));
  res.json({ success: true, data: estados, pagination: { page, limit, count: estados.length } });
});

// Búsqueda masiva por patentes (cliente)
const bulkSearchSchema = z.object({
  body: z.object({
    plates: z.array(z.string().min(5)).min(1).max(500),
    type: z.enum(['truck','trailer']).optional(), // por defecto busca en ambas
  }),
});
router.post('/bulk-search', validate(bulkSearchSchema), async (req: any, res) => {
  const normalizePlate = (s: string) => (String(s || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const raw: string[] = req.body?.plates || [];
  const type: 'truck'|'trailer'|undefined = req.body?.type;
  const unique = Array.from(new Set(raw.map(normalizePlate).filter(Boolean)));
  if (unique.length === 0) return res.json({ success: true, data: [] });
  const clauses: any[] = [];
  if (!type || type === 'truck') clauses.push({ truckPlateNorm: { in: unique } });
  if (!type || type === 'trailer') clauses.push({ trailerPlateNorm: { in: unique } });
  const equipos = await prisma.equipo.findMany({
    where: { tenantEmpresaId: req.tenantId!, OR: clauses.length ? clauses : undefined },
    select: { id: true, dadorCargaId: true, truckPlateNorm: true, trailerPlateNorm: true, driverDniNorm: true, estado: true },
    orderBy: { validFrom: 'desc' },
    take: 1000,
  });
  res.json({ success: true, data: equipos });
});

// Bulk ZIP por cliente (202 + polling simple vía /health para demo)
const bulkZipSchema = z.object({
  body: z.object({
    equipoIds: z.array(z.number().int().positive()).min(1).max(200),
  }),
});
router.post('/bulk-zip', validate(bulkZipSchema), async (req: any, res) => {
  const { DocumentZipService } = await import('../services/document-zip.service');
  const jobId = DocumentZipService.enqueueZipJob(req.tenantId!, req.body.equipoIds);
  res.status(202).json({ success: true, jobId });
  // Audit
  void AuditService.log({
    tenantEmpresaId: req.tenantId,
    userId: req.user?.userId,
    userRole: req.user?.role,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: 202,
    action: 'ZIP_BULK_REQUEST',
    entityType: 'ZIP_JOB',
    entityId: jobId,
    details: { equipos: Array.isArray(req.body?.equipoIds) ? req.body.equipoIds.length : 0 },
  });
});

// Polling de estado de jobs de ZIP
router.get('/jobs/:jobId', async (req, res) => {
  const { DocumentZipService } = await import('../services/document-zip.service');
  const job = DocumentZipService.getJob(String((req.params as any).jobId));
  if (!job) return res.status(404).json({ success: false, message: 'Job no encontrado' });
  let signedUrl: string | undefined;
  if (job.status === 'completed' && job.artifact) {
    try {
      const url = await (await import('../services/minio.service')).minioService.getSignedUrlInternal(job.artifact.bucketName, job.artifact.objectPath, 60 * 30);
      signedUrl = url;
    } catch {}
  }
  res.json({ success: true, job: { ...job, signedUrl } });
});

// Documentos por equipo para portal cliente (descarga/listado)
const listDocsEquipoSchema = z.object({
  params: z.object({ equipoId: z.string().transform((v)=>Number(v)) }),
});
router.get('/equipos/:equipoId/documentos', validate(listDocsEquipoSchema), async (req, res) => {
  const equipoId = Number((req.params as any).equipoId);
  // Buscar equipo para obtener sus entidades (chofer/camión/acoplado)
  const equipo = await prisma.equipo.findUnique({
    where: { id: equipoId },
    select: { id: true, tenantEmpresaId: true, dadorCargaId: true, driverId: true, truckId: true, trailerId: true },
  });
  if (!equipo) {
    return res.json({ success: true, data: [] });
  }
  const orClauses: any[] = [];
  if (equipo.driverId) orClauses.push({ entityType: 'CHOFER' as any, entityId: equipo.driverId });
  if (equipo.truckId) orClauses.push({ entityType: 'CAMION' as any, entityId: equipo.truckId });
  if (equipo.trailerId) orClauses.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });

  const docs = await prisma.document.findMany({
    where: {
      tenantEmpresaId: equipo.tenantEmpresaId,
      dadorCargaId: equipo.dadorCargaId,
      OR: orClauses.length ? orClauses : undefined,
    },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, templateId: true, status: true, expiresAt: true, filePath: true, fileName: true },
  });
  res.json({ success: true, data: docs });
});

// ZIP de documentos vigentes por equipo (portal cliente/dador)
router.get('/equipos/:equipoId/zip', validate(listDocsEquipoSchema), async (req, res) => {
  const equipoId = Number((req.params as any).equipoId);
  const equipo = await prisma.equipo.findUnique({
    where: { id: equipoId },
    select: { id: true, tenantEmpresaId: true, dadorCargaId: true, driverId: true, truckId: true, trailerId: true, truckPlateNorm: true, trailerPlateNorm: true, driverDniNorm: true },
  });
  if (!equipo) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });

  const now = new Date();
  const clauses: any[] = [];
  if (equipo.driverId) clauses.push({ entityType: 'CHOFER' as any, entityId: equipo.driverId });
  if (equipo.truckId) clauses.push({ entityType: 'CAMION' as any, entityId: equipo.truckId });
  if (equipo.trailerId) clauses.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });
  const docs = await prisma.document.findMany({
    where: {
      tenantEmpresaId: equipo.tenantEmpresaId,
      dadorCargaId: equipo.dadorCargaId,
      status: 'APROBADO' as any,
      OR: clauses.length ? clauses : undefined,
      OR2: [{ expiresAt: null }, { expiresAt: { gt: now } }] as any,
    } as any,
    include: { template: { select: { name: true } } },
    orderBy: { uploadedAt: 'desc' },
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=equipo_${equipo.id}_vigentes.zip`);
  const archiver = await getArchiver();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: any) => res.status(500).end(String(err)));
  archive.pipe(res);

  // eliminar bloque inválido que referenciaba minioService antes de import

  // Stream desde MinIO
  const { minioService } = await import('../services/minio.service');
  for (const d of docs) {
    let bucketName: string;
    let objectPath: string;
    if (typeof d.filePath === 'string' && d.filePath.includes('/')) {
      const idx = d.filePath.indexOf('/');
      bucketName = d.filePath.slice(0, idx);
      objectPath = d.filePath.slice(idx + 1);
    } else {
      // Fallback: usar bucket del tenant y el filePath tal cual
      bucketName = `docs-t${equipo.tenantEmpresaId}`;
      objectPath = d.filePath as any;
    }
    const stream = await minioService.getObject(bucketName, objectPath);
    const folder = d.entityType === 'CHOFER' ? 'chofer' : d.entityType === 'CAMION' ? 'camion' : 'acoplado';
    const idLabel = d.entityType === 'CHOFER' ? (equipo.driverDniNorm || d.entityId) : (d.entityType === 'CAMION' ? (equipo.truckPlateNorm || d.entityId) : (equipo.trailerPlateNorm || d.entityId));
    const name = `${folder}/${idLabel}_${(d.template?.name || 'documento').replace(/[^a-z0-9_-]/gi,'_')}_${d.id}`;
    archive.append(stream as any, { name });
  }
  archive.finalize();
});

// Excel resumen de documentos por equipo (portal)
router.get('/equipos/:equipoId/summary.xlsx', validate(listDocsEquipoSchema), async (req, res) => {
  const equipoId = Number((req.params as any).equipoId);
  const equipo = await prisma.equipo.findUnique({
    where: { id: equipoId },
    select: { id: true, tenantEmpresaId: true, dadorCargaId: true, driverId: true, truckId: true, trailerId: true },
  });
  if (!equipo) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
  const clauses: any[] = [];
  if (equipo.driverId) clauses.push({ entityType: 'CHOFER' as any, entityId: equipo.driverId });
  if (equipo.truckId) clauses.push({ entityType: 'CAMION' as any, entityId: equipo.truckId });
  if (equipo.trailerId) clauses.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });
  const docs = await prisma.document.findMany({
    where: {
      tenantEmpresaId: equipo.tenantEmpresaId,
      dadorCargaId: equipo.dadorCargaId,
      OR: clauses.length ? clauses : undefined,
    } as any,
    include: { template: { select: { name: true, entityType: true } } },
    orderBy: [{ uploadedAt: 'desc' }],
  });
  const ExcelJS = await getExcelJS();
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
});

// Excel resumen por cliente (estado por equipo asignado)
const clientSummarySchema = z.object({
  params: z.object({ clienteId: z.string().transform((v) => Number(v)) }),
});
router.get('/:clienteId/summary.xlsx', validate(clientSummarySchema), async (req: any, res) => {
  const clienteId = Number(req.params.clienteId);
  const tenantEmpresaId = req.tenantId!;
  const rels = await prisma.equipoCliente.findMany({
    where: { clienteId, equipo: { tenantEmpresaId } },
    select: { equipoId: true },
    orderBy: { asignadoDesde: 'desc' },
  });
  const { EquipoEstadoService } = await import('../services/equipo-estado.service');
  const estados = await Promise.all(rels.map(r => EquipoEstadoService.calculateEquipoEstado(r.equipoId, clienteId)));
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Estado por equipo');
  ws.columns = [
    { header: 'EquipoID', key: 'equipoId', width: 10 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Faltantes', key: 'faltantes', width: 12 },
    { header: 'Vencidos', key: 'vencidos', width: 12 },
    { header: 'Por vencer', key: 'proximos', width: 12 },
    { header: 'Vigentes', key: 'vigentes', width: 12 },
    { header: 'Pendientes', key: 'pendientes', width: 12 },
    { header: 'Rechazados', key: 'rechazados', width: 12 },
  ];
  for (const e of estados) {
    ws.addRow({
      equipoId: e.equipoId,
      estado: e.estado,
      faltantes: e.breakdown.faltantes,
      vencidos: e.breakdown.vencidos,
      proximos: e.breakdown.proximos,
      vigentes: e.breakdown.vigentes,
      pendientes: e.breakdown.pendientes,
      rechazados: e.breakdown.rechazados,
    });
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=cliente_${clienteId}_equipos_estado.xlsx`);
  await wb.xlsx.write(res);
  res.end();
});

export default router;


