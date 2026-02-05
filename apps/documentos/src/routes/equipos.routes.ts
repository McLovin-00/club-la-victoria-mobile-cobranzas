import { Router } from 'express';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { ownsEquipo, canModifyEquipo, canTransferEquipo } from '../middlewares/ownership.middleware';
import { equipoHistoryQuerySchema, createEquipoSchema, equipoClienteAssocSchema, equipoListQuerySchema, updateEquipoSchema, equipoAttachSchema, equipoDetachSchema } from '../schemas/validation.schemas';
import { EquiposController } from '../controllers/equipos.controller';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import { AuditService } from '../services/audit.service';

const router: ReturnType<typeof Router> = Router();

// ============================================================================
// HELPERS JWT Y ARCHIVER
// ============================================================================
let _jwtPublicKey: string | null = null;

function getJwtPublicKey(): string {
  if (_jwtPublicKey) return _jwtPublicKey;
  const fs = require('fs');
  _jwtPublicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH || '/keys/jwt_public.pem', 'utf8');
  return _jwtPublicKey as string;
}

function verifyJwtFromForm(token: string): any | null {
  const jwt = require('jsonwebtoken');
  try {
    return jwt.verify(token, getJwtPublicKey(), { algorithms: ['RS256'] });
  } catch {
    return null;
  }
}

let _archiver: any;
async function getArchiver() {
  if (!_archiver) {
    const mod = await import('archiver');
    _archiver = (mod as any).default || mod;
  }
  return _archiver;
}

// ============================================================================
// HELPERS DE ZIP
// ============================================================================
function parseFilePath(filePath: string, tenantEmpresaId: number): { bucketName: string; objectPath: string } {
  if (typeof filePath === 'string' && filePath.includes('/')) {
    const idx = filePath.indexOf('/');
    return { bucketName: filePath.slice(0, idx), objectPath: filePath.slice(idx + 1) };
  }
  return { bucketName: `docs-t${tenantEmpresaId}`, objectPath: filePath };
}

function buildSubfolders(equipo: any): Record<string, string> {
  const cuit = equipo.empresaTransportista?.cuit ?? 'SIN_CUIT';
  const dni = equipo.driverDniNorm ?? 'SIN_DNI';
  const tractor = equipo.truckPlateNorm ?? 'SIN_PATENTE';
  const acoplado = equipo.trailerPlateNorm ?? 'SIN_PATENTE';
  return {
    EMPRESA_TRANSPORTISTA: `1_Empresa_Transportista_${cuit}`,
    CHOFER: `2_Chofer_${dni}`,
    CAMION: `3_Tractor_${tractor}`,
    ACOPLADO: `4_Semi_Acoplado_${acoplado}`,
  };
}

async function loadEquipoDocuments(equipo: any, now: Date): Promise<any[]> {
  const clauses: any[] = [];
  if (equipo.empresaTransportistaId) clauses.push({ entityType: 'EMPRESA_TRANSPORTISTA', entityId: equipo.empresaTransportistaId });
  if (equipo.driverId) clauses.push({ entityType: 'CHOFER', entityId: equipo.driverId });
  if (equipo.truckId) clauses.push({ entityType: 'CAMION', entityId: equipo.truckId });
  if (equipo.trailerId) clauses.push({ entityType: 'ACOPLADO', entityId: equipo.trailerId });

  return prisma.document.findMany({
    where: {
      tenantEmpresaId: equipo.tenantEmpresaId,
      dadorCargaId: equipo.dadorCargaId,
      status: 'APROBADO' as any,
      AND: [clauses.length ? { OR: clauses } : {}, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
    } as any,
    select: { id: true, filePath: true, entityType: true, entityId: true, fileName: true, template: { select: { name: true } } },
    orderBy: { uploadedAt: 'desc' },
  });
}

async function appendDocsToArchive(equipo: any, docs: any[], archive: any, mainFolder: string, subfolders: Record<string, string>) {
  const { minioService } = await import('../services/minio.service');
  const entityOrder: Record<string, number> = { EMPRESA_TRANSPORTISTA: 1, CHOFER: 2, CAMION: 3, ACOPLADO: 4 };
  const sorted = [...docs].sort((a, b) => (entityOrder[a.entityType] || 99) - (entityOrder[b.entityType] || 99));

  for (const d of sorted) {
    const { bucketName, objectPath } = parseFilePath(d.filePath, equipo.tenantEmpresaId);
    try {
      const stream = await minioService.getObject(bucketName, objectPath);
      const subfolder = subfolders[d.entityType] ?? 'otros';
      const safeTpl = String(d.template?.name ?? 'documento').replace(/[^a-z0-9_-]/gi, '_');
      const ext = (d.fileName ?? '').split('.').pop() ?? 'pdf';
      archive.append(stream as any, { name: `${mainFolder}/${subfolder}/${safeTpl}.${ext}` });
    } catch (err: any) {
      // Si el archivo no existe en MinIO, lo omitimos y continuamos
      AppLogger.warn('⚠️ Archivo no encontrado en MinIO, omitiendo', {
        docId: d.id,
        bucketName,
        objectPath,
        error: err?.code || err?.message,
      });
    }
  }
}

async function generateExcelBuffer(rows: any[]): Promise<Buffer> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BCA Documentos';

  const sheet = workbook.addWorksheet('Equipos', { properties: { tabColor: { argb: '2563eb' } } });
  sheet.columns = [
    { header: 'ID Equipo', key: 'equipoId', width: 12 },
    { header: 'Empresa CUIT', key: 'empresaCuit', width: 18 },
    { header: 'Empresa Razón Social', key: 'empresaRazonSocial', width: 35 },
    { header: 'Chofer DNI', key: 'choferDni', width: 15 },
    { header: 'Chofer Nombre', key: 'choferNombre', width: 20 },
    { header: 'Chofer Apellido', key: 'choferApellido', width: 20 },
    { header: 'Camión Patente', key: 'camionPatente', width: 15 },
    { header: 'Acoplado Patente', key: 'acopladoPatente', width: 15 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563eb' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;

  for (const row of rows) sheet.addRow(row);

  sheet.eachRow((row, num) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'D1D5DB' } },
        left: { style: 'thin', color: { argb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
        right: { style: 'thin', color: { argb: 'D1D5DB' } },
      };
      if (num > 1) cell.alignment = { vertical: 'middle' };
    });
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Helper: procesar un equipo para el ZIP
async function processEquipoForZip(equipoId: number, archive: any, now: Date): Promise<any | null> {
  const equipo = await prisma.equipo.findUnique({
    where: { id: equipoId },
    include: { empresaTransportista: { select: { cuit: true, razonSocial: true } } },
  });
  if (!equipo) return null;

  const [chofer, camion, acoplado] = await Promise.all([
    prisma.chofer.findUnique({ where: { id: equipo.driverId }, select: { dni: true, nombre: true, apellido: true } }),
    prisma.camion.findUnique({ where: { id: equipo.truckId }, select: { patente: true } }),
    equipo.trailerId ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId }, select: { patente: true } }) : null,
  ]);

  const mainFolder = `equipo_${equipo.id}_DNI_${equipo.driverDniNorm || 'SIN_DNI'}_${equipo.truckPlateNorm || 'SIN_PATENTE'}`;
  const subfolders = buildSubfolders(equipo);
  const docs = await loadEquipoDocuments(equipo, now);
  await appendDocsToArchive(equipo, docs, archive, mainFolder, subfolders);

  return {
    equipoId: equipo.id,
    empresaCuit: equipo.empresaTransportista?.cuit || '',
    empresaRazonSocial: equipo.empresaTransportista?.razonSocial || '',
    choferDni: chofer?.dni || equipo.driverDniNorm || '',
    choferNombre: chofer?.nombre || '',
    choferApellido: chofer?.apellido || '',
    camionPatente: camion?.patente || equipo.truckPlateNorm || '',
    acopladoPatente: acoplado?.patente || equipo.trailerPlateNorm || '',
  };
}

async function streamVigentesZip(equipoIdsInput: number[], res: any) {
  const equipoIds = [...equipoIdsInput].sort((a, b) => a - b);
  const now = new Date();
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=documentacion_equipos_vigentes_${stamp}_${equipoIds.length}equipos.zip`);

  const archiver = await getArchiver();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: any) => {
    AppLogger.error('💥 Error en archiver:', err);
    res.status(500).end(String(err));
  });
  archive.pipe(res);

  AppLogger.info('📦 Iniciando ZIP masivo', { totalEquipos: equipoIds.length });

  try {
    const excelRows: any[] = [];
    for (const equipoId of equipoIds) {
      const row = await processEquipoForZip(equipoId, archive, now);
      if (row) excelRows.push(row);
    }

    AppLogger.info('📦 Equipos procesados, generando Excel', { excelRowsCount: excelRows.length });

    if (excelRows.length > 0) {
      const excelBuffer = await generateExcelBuffer(excelRows);
      AppLogger.info('📦 Excel generado, agregando al ZIP', { bufferSize: excelBuffer.length });
      archive.append(excelBuffer, { name: 'resumen_equipos.xlsx' });
      AppLogger.info('📦 Excel agregado al ZIP');
    } else {
      AppLogger.warn('📦 No hay filas para el Excel - no se generará resumen');
    }
  } catch (err) {
    AppLogger.error('💥 Error generando ZIP masivo', err);
    if (!res.headersSent) res.status(500).end('Error generando ZIP');
    try { archive.abort(); } catch { /* Abortar stream es best-effort */ }
    return;
  }

  AppLogger.info('📦 Finalizando ZIP');
  await archive.finalize();
  AppLogger.info('📦 ZIP finalizado correctamente');
}

// ============================================================================
// CONSTANTES DE ROLES
// ============================================================================
const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'] as any[];
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

// ============================================================================
// SCHEMAS
// ============================================================================
const createMinimalSchema = z.object({
  body: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0),
    dniChofer: z.string().min(7),
    patenteTractor: z.string().min(5),
    patenteAcoplado: z.string().min(5).optional().nullable(),
    choferPhones: z.array(z.string().regex(PHONE_REGEX)).max(3).optional(),
  }),
});

const createCompletoSchema = z.object({
  body: z.object({
    dadorCargaId: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => v > 0).optional(),
    empresaTransportistaCuit: z.string().regex(/^\d{11}$/),
    empresaTransportistaNombre: z.string().min(2).max(200),
    choferDni: z.string().min(6).max(32),
    choferNombre: z.string().min(1).max(120).optional(),
    choferApellido: z.string().min(1).max(120).optional(),
    choferPhones: z.array(z.string().regex(PHONE_REGEX)).max(3).optional(),
    camionPatente: z.string().min(5).max(12),
    camionMarca: z.string().min(1).max(100).optional(),
    camionModelo: z.string().min(1).max(100).optional(),
    acopladoPatente: z.string().min(5).max(12).optional().nullable(),
    acopladoTipo: z.string().min(1).max(100).optional(),
    clienteIds: z.array(z.number().int().positive()).optional(),
  }),
});

const rollbackCompletoSchema = z.object({
  body: z.object({
    deleteChofer: z.boolean().optional(),
    deleteCamion: z.boolean().optional(),
    deleteAcoplado: z.boolean().optional(),
    deleteEmpresa: z.boolean().optional(),
  }),
});

const updateEntidadesSchema = z.object({
  body: z.object({
    choferId: z.number().int().positive().optional(),
    camionId: z.number().int().positive().optional(),
    acopladoId: z.number().int().positive().nullable().optional(),
    empresaTransportistaId: z.number().int().positive().optional(),
  }),
});

const addClienteSchema = z.object({ body: z.object({ clienteId: z.number().int().positive() }) });
const transferirSchema = z.object({ body: z.object({ nuevoDadorCargaId: z.number().int().positive(), motivo: z.string().max(500).optional() }) });
const searchByDnisSchema = z.object({ body: z.object({ dnis: z.array(z.string().min(7)).min(1).max(5000) }) });
const bulkZipSchema = z.object({ body: z.object({ equipoIds: z.array(z.number().int().positive()).min(1).max(500) }) });
const equipoSummarySchema = z.object({ params: z.object({ id: z.string().transform((v) => Number(v)) }) });

// Helper: generar solo datos para Excel (sin descargar documentos)
async function buildExcelRowsOnly(equipoIds: number[]): Promise<any[]> {
  const rows: any[] = [];
  for (const equipoId of equipoIds) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      include: { empresaTransportista: { select: { cuit: true, razonSocial: true } } },
    });
    if (!equipo) continue;

    const [chofer, camion, acoplado] = await Promise.all([
      prisma.chofer.findUnique({ where: { id: equipo.driverId }, select: { dni: true, nombre: true, apellido: true } }),
      prisma.camion.findUnique({ where: { id: equipo.truckId }, select: { patente: true } }),
      equipo.trailerId ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId }, select: { patente: true } }) : null,
    ]);

    rows.push({
      equipoId: equipo.id,
      empresaCuit: equipo.empresaTransportista?.cuit || '',
      empresaRazonSocial: equipo.empresaTransportista?.razonSocial || '',
      choferDni: chofer?.dni || equipo.driverDniNorm || '',
      choferNombre: chofer?.nombre || '',
      choferApellido: chofer?.apellido || '',
      camionPatente: camion?.patente || equipo.truckPlateNorm || '',
      acopladoPatente: acoplado?.patente || equipo.trailerPlateNorm || '',
    });
  }
  return rows;
}

async function streamExcelOnly(equipoIds: number[], res: any) {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=resumen_equipos_${stamp}.xlsx`);

  try {
    AppLogger.info('📊 Generando Excel de equipos', { totalEquipos: equipoIds.length });
    const excelRows = await buildExcelRowsOnly(equipoIds);
    
    if (excelRows.length === 0) {
      AppLogger.warn('📊 No hay equipos para generar Excel');
      return res.status(404).send('No se encontraron equipos');
    }

    const excelBuffer = await generateExcelBuffer(excelRows);
    AppLogger.info('📊 Excel generado correctamente', { rows: excelRows.length, size: excelBuffer.length });
    res.send(excelBuffer);
  } catch (err) {
    AppLogger.error('💥 Error generando Excel', err);
    if (!res.headersSent) res.status(500).send('Error generando Excel');
  }
}

// ============================================================================
// RUTAS SIN AUTENTICACIÓN (FORM POST)
// ============================================================================

// Endpoint para descargar solo el Excel (sin documentos)
router.post('/download/excel-form', async (req: any, res) => {
  AppLogger.info('📊 Excel form request', { 
    bodyKeys: Object.keys(req.body || {}),
    hasToken: !!req.body?.token,
    contentType: req.headers['content-type'],
  });
  
  const token = String(req.body?.token || '');
  if (!token) return res.status(401).json({ success: false, message: 'Token de autenticación requerido', code: 'MISSING_TOKEN' });

  const decoded = verifyJwtFromForm(token);
  if (!decoded) return res.status(401).send('Token inválido');

  const allowed = new Set(['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA']);
  if (!allowed.has(String(decoded.role || decoded.userRole || ''))) return res.status(403).send('No autorizado');

  const equipoIds = String(req.body?.equipoIds || '').split(',').map((s: string) => Number(s.trim())).filter((n: number) => Number.isInteger(n) && n > 0);
  if (!equipoIds.length) return res.status(400).send('equipoIds requerido');
  if (equipoIds.length > 5000) return res.status(400).send('Máximo 5000 equipos');

  return streamExcelOnly(equipoIds, res);
});

router.post('/download/vigentes-form', async (req: any, res) => {
  const token = String(req.body?.token || '');
  if (!token) return res.status(401).send('Token requerido');

  const decoded = verifyJwtFromForm(token);
  if (!decoded) return res.status(401).send('Token inválido');

  const allowed = new Set(['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA']);
  if (!allowed.has(String(decoded.role || decoded.userRole || ''))) return res.status(403).send('No autorizado');

  const equipoIds = String(req.body?.equipoIds || '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
  if (!equipoIds.length) return res.status(400).send('equipoIds requerido');
  if (equipoIds.length > 500) return res.status(400).send('Máximo 500 equipos');

  return streamVigentesZip(equipoIds, res);
});

// ============================================================================
// RUTAS AUTENTICADAS
// ============================================================================
router.use(authenticate);

router.get('/', validate(equipoListQuerySchema), EquiposController.list);
router.get('/search-paged', EquiposController.searchPaged);
router.get('/:id', ownsEquipo(), EquiposController.getById);

router.post('/', authorize(ADMIN_ROLES), validate(createEquipoSchema), EquiposController.create);
router.post('/minimal', authorize(ADMIN_ROLES), validate(createMinimalSchema), EquiposController.createMinimal);
router.post('/alta-completa', authorize(ADMIN_ROLES), validate(createCompletoSchema), EquiposController.createCompleto);
router.post('/:id/rollback', authorize(ADMIN_ROLES), validate(rollbackCompletoSchema), EquiposController.rollbackCompleto);

router.put('/:id', authorize(ADMIN_ROLES), validate(updateEquipoSchema), EquiposController.update);
router.delete('/:id', authorize(ADMIN_ROLES), EquiposController.delete);

router.patch('/:id/toggle-activo', authorize([...ADMIN_ROLES, 'TRANSPORTISTA' as any]), async (req: any, res) => {
  const equipoId = Number(req.params.id);
  const { activo } = req.body;

  if (typeof activo !== 'boolean') return res.status(400).json({ success: false, message: 'El campo activo debe ser booleano' });

  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  if (!equipo) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });

  const user = req.user;
  const canModify = ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'].includes(user.role)
    || (user.role === 'DADOR_DE_CARGA' && equipo.dadorCargaId === user.dadorCargaId)
    || (user.role === 'TRANSPORTISTA' && equipo.empresaTransportistaId === user.empresaTransportistaId);

  if (!canModify) return res.status(403).json({ success: false, message: 'No tiene permisos' });

  const updated = await prisma.equipo.update({ where: { id: equipoId }, data: { activo }, select: { id: true, activo: true } });
  AppLogger.info(`Equipo ${activo ? 'activado' : 'desactivado'}`, { equipoId, by: user.userId || user.id });
  return res.json({ success: true, data: updated });
});

router.get('/:id/history', authorize(ADMIN_ROLES), validate(equipoHistoryQuerySchema), EquiposController.history);
router.get('/:id/audit', authorize(ADMIN_ROLES), EquiposController.getAuditHistory);
router.get('/:id/requisitos', authorize([...ADMIN_ROLES, 'TRANSPORTISTA' as any, 'CHOFER' as any]), EquiposController.getRequisitos);

router.put('/:id/entidades', canModifyEquipo(), validate(updateEntidadesSchema), EquiposController.updateEntidades);
router.post('/:id/clientes', canModifyEquipo(), validate(addClienteSchema), EquiposController.addCliente);
router.delete('/:id/clientes/:clienteId', canModifyEquipo(), EquiposController.removeClienteWithArchive);
router.post('/:id/transferir', canTransferEquipo(), validate(transferirSchema), EquiposController.transferir);

// Legacy
router.post('/:equipoId/clientes/:clienteId', authorize(ADMIN_ROLES), validate(equipoClienteAssocSchema), EquiposController.associateCliente);
router.delete('/:equipoId/clientes/:clienteId', authorize(ADMIN_ROLES), EquiposController.removeCliente);

router.post('/:equipoId/check-missing-now', authorize(ADMIN_ROLES), async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const { NotificationService } = await import('../services/notification.service');
  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { tenantEmpresaId: true } });
  const count = await NotificationService.checkMissingForEquipo(equipo?.tenantEmpresaId || 1, equipoId);
  res.json({ success: true, data: { sent: count } });
});

router.post('/:equipoId/request-missing', authorize(ADMIN_ROLES), async (req, res) => {
  const equipoId = Number(req.params.equipoId);
  const { ComplianceService } = await import('../services/compliance.service');
  const { NotificationService } = await import('../services/notification.service');

  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { id: true, tenantEmpresaId: true, dadorCargaId: true, driverId: true } });
  if (!equipo) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });

  const clientes = await prisma.equipoCliente.findMany({ where: { equipoId, asignadoHasta: null }, select: { clienteId: true } });
  const faltantes: any[] = [];
  for (const c of clientes) {
    const results = await ComplianceService.evaluateEquipoCliente(equipoId, c.clienteId);
    const miss = results.filter(r => r.state === 'FALTANTE');
    if (miss.length) faltantes.push({ clienteId: c.clienteId, items: miss });
  }

  let sent = 0;
  if (faltantes.length > 0 && equipo.driverId) {
    const dador = await prisma.dadorCarga.findUnique({ where: { id: equipo.dadorCargaId }, select: { notifyDriverEnabled: true } });
    if (dador?.notifyDriverEnabled) {
      const ch = await prisma.chofer.findUnique({ where: { id: equipo.driverId }, select: { phones: true } });
      for (const ms of (ch?.phones || []).slice(0, 3)) {
        await NotificationService.send(ms, `Faltan documentos requeridos para tu equipo #${equipo.id}.`, {
          tenantId: equipo.tenantEmpresaId, dadorId: equipo.dadorCargaId, equipoId: equipo.id, audience: 'CHOFER', type: 'faltante', templateKey: 'faltante.chofer'
        });
        sent++;
      }
    }
  }
  res.json({ success: true, data: { faltantes, sent } });
});

router.get('/:id/estado', async (req, res) => {
  const { EquipoEstadoService } = await import('../services/equipo-estado.service');
  const data = await EquipoEstadoService.calculateEquipoEstado(Number(req.params.id), req.query.clienteId ? Number(req.query.clienteId) : undefined);
  return res.json({ success: true, data });
});

router.post('/:id/attach', authorize(ADMIN_ROLES), validate(equipoAttachSchema), async (req: any, res) => {
  const { EquipoService } = await import('../services/equipo.service');
  const result = await EquipoService.attachComponents(req.tenantId!, Number(req.params.id), req.body);
  void AuditService.log({ tenantEmpresaId: req.tenantId, userId: req.user?.userId, userRole: req.user?.role, method: req.method, path: req.originalUrl, statusCode: 200, action: 'EQUIPO_ATTACH', entityType: 'EQUIPO', entityId: Number(req.params.id), details: req.body });
  return res.json({ success: true, data: result });
});

router.post('/:id/detach', authorize(ADMIN_ROLES), validate(equipoDetachSchema), async (req: any, res) => {
  const { EquipoService } = await import('../services/equipo.service');
  const result = await EquipoService.detachComponents(req.tenantId!, Number(req.params.id), req.body);
  void AuditService.log({ tenantEmpresaId: req.tenantId, userId: req.user?.userId, userRole: req.user?.role, method: req.method, path: req.originalUrl, statusCode: 200, action: 'EQUIPO_DETACH', entityType: 'EQUIPO', entityId: Number(req.params.id), details: req.body });
  return res.json({ success: true, data: result });
});

router.post('/search/dnis', validate(searchByDnisSchema), async (req: any, res) => {
  const dnis = (req.body?.dnis || []).map((v: string) => (v || '').replace(/\D+/g, ''));
  const unique = [...new Set(dnis.filter(Boolean))] as string[];
  if (!unique.length) return res.json({ success: true, data: [] });

  try {
    const equipos = await prisma.equipo.findMany({
      where: { tenantEmpresaId: req.tenantId!, driverDniNorm: { in: unique } },
      orderBy: { validFrom: 'desc' },
      select: { id: true, dadorCargaId: true, tenantEmpresaId: true, driverDniNorm: true, truckPlateNorm: true, trailerPlateNorm: true, estado: true },
    });
    return res.json({ success: true, data: equipos });
  } catch (e) {
    AppLogger.error('💥 Error en búsqueda por DNIs', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
});

router.post('/download/vigentes', authorize(ADMIN_ROLES), validate(bulkZipSchema), async (req: any, res) => {
  const now = new Date();
  void AuditService.log({ tenantEmpresaId: req.tenantId, userId: req.user?.userId, userRole: req.user?.role, method: req.method, path: req.originalUrl, statusCode: 200, action: 'ZIP_VIGENTES_DOWNLOAD', entityType: 'ZIP_STREAM', details: { equipos: req.body.equipoIds.length, generatedAt: now.toISOString() } });
  return streamVigentesZip(req.body.equipoIds, res);
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
    if (equipo.empresaTransportistaId) clauses.push({ entityType: 'EMPRESA_TRANSPORTISTA', entityId: equipo.empresaTransportistaId });
    if (equipo.driverId) clauses.push({ entityType: 'CHOFER', entityId: equipo.driverId });
    if (equipo.truckId) clauses.push({ entityType: 'CAMION', entityId: equipo.truckId });
    if (equipo.trailerId) clauses.push({ entityType: 'ACOPLADO', entityId: equipo.trailerId });

    const docs = await prisma.document.findMany({
      where: { tenantEmpresaId: equipo.tenantEmpresaId, dadorCargaId: equipo.dadorCargaId, ...(clauses.length ? { OR: clauses } : {}) } as any,
      include: { template: { select: { name: true, entityType: true } } },
      orderBy: { uploadedAt: 'desc' },
    });

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Documentos');
    ws.columns = [
      { header: 'ID', key: 'id', width: 8 }, { header: 'Entidad', key: 'entityType', width: 18 },
      { header: 'Entidad ID', key: 'entityId', width: 12 }, { header: 'Plantilla', key: 'templateName', width: 28 },
      { header: 'Estado', key: 'status', width: 16 }, { header: 'Subido', key: 'uploadedAt', width: 20 }, { header: 'Vence', key: 'expiresAt', width: 20 },
    ];
    for (const d of docs) {
      ws.addRow({ id: d.id, entityType: d.entityType, entityId: d.entityId, templateName: d.template?.name || '', status: d.status, uploadedAt: d.uploadedAt?.toISOString() || '', expiresAt: d.expiresAt?.toISOString() || '' });
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

// ============================================================================
// PRE-CHECK: Verificación de documentos existentes para reutilización
// ============================================================================
import { DocumentPreCheckService } from '../services/document-precheck.service';
import { EquipoEvaluationService } from '../services/equipo-evaluation.service';

const preCheckSchema = z.object({
  body: z.object({
    entidades: z.array(z.object({
      entityType: z.enum(['CHOFER', 'CAMION', 'ACOPLADO', 'EMPRESA_TRANSPORTISTA']),
      identificador: z.string().min(1).max(32),
    })).min(1).max(20),
    clienteId: z.number().int().positive().optional(),
    dadorCargaId: z.number().int().positive().optional(), // Para ADMIN_INTERNO que selecciona dador
  }),
});

router.post('/pre-check', validate(preCheckSchema), async (req: any, res) => {
  try {
    const { entidades, clienteId, dadorCargaId: bodyDadorCargaId } = req.body;
    const tenantEmpresaId = req.tenantId!;
    // Usar dadorCargaId del body si existe (ADMIN_INTERNO), sino del token
    const dadorCargaId = bodyDadorCargaId || req.dadorCargaId;

    const result = await DocumentPreCheckService.preCheck({
      tenantEmpresaId,
      dadorCargaIdSolicitante: dadorCargaId,
      entidades,
      clienteId,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    AppLogger.error('💥 Error en pre-check', error);
    return res.status(500).json({ success: false, message: 'Error verificando documentos' });
  }
});

// Evaluar estado documental de un equipo
router.post('/:id/evaluar', authorize(ADMIN_ROLES), async (req: any, res) => {
  try {
    const equipoId = Number(req.params.id);
    if (!Number.isInteger(equipoId) || equipoId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de equipo inválido' });
    }

    const resultado = await EquipoEvaluationService.evaluarEquipo(equipoId);
    if (!resultado) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }

    return res.json({ success: true, data: resultado });
  } catch (error) {
    AppLogger.error('💥 Error evaluando equipo', error);
    return res.status(500).json({ success: false, message: 'Error evaluando equipo' });
  }
});

// Evaluar múltiples equipos (batch)
router.post('/evaluar-batch', authorize(ADMIN_ROLES), async (req: any, res) => {
  try {
    const equipoIds = (req.body?.equipoIds || [])
      .map((id: unknown) => Number(id))
      .filter((id: number) => Number.isInteger(id) && id > 0)
      .slice(0, 100); // Límite de 100 equipos por batch

    if (equipoIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requieren IDs de equipos' });
    }

    const resultados = await EquipoEvaluationService.evaluarEquipos(equipoIds);
    return res.json({ 
      success: true, 
      data: {
        evaluados: resultados.length,
        actualizados: resultados.filter(r => r.cambio).length,
        resultados,
      },
    });
  } catch (error) {
    AppLogger.error('💥 Error en evaluación batch', error);
    return res.status(500).json({ success: false, message: 'Error en evaluación batch' });
  }
});

export default router;
