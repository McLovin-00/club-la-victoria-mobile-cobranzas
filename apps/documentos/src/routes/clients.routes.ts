import { Router } from 'express';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { ClientsController } from '../controllers/clients.controller';
import { addRequirementSchema, clienteListQuerySchema, createClienteSchema, removeRequirementSchema, updateClienteSchema } from '../schemas/validation.schemas';
// import { EquiposController } from '../controllers/equipos.controller';
import { z } from 'zod';
import { prisma } from '../config/database';
// Cargar archiver perezosamente para no requerir instalación inmediata en entornos sin build
let _archiver: any;
async function getArchiver() {
  if (!_archiver) {
    const mod = await import('archiver');
    _archiver = mod.default || mod as any;
  }
  return _archiver;
}

const router = Router();

router.use(authenticate);
router.get('/', validate(clienteListQuerySchema), ClientsController.list);
router.post('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(createClienteSchema), ClientsController.create);
router.put('/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(updateClienteSchema), ClientsController.update);
router.delete('/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), ClientsController.remove);

router.get('/:clienteId/requirements', ClientsController.listRequirements);
router.post('/:clienteId/requirements', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(addRequirementSchema), ClientsController.addRequirement);
router.delete('/:clienteId/requirements/:requirementId', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(removeRequirementSchema), ClientsController.removeRequirement);

// Listado de equipos habilitados para un cliente (portales de cliente)
const listEquiposClienteSchema = z.object({
  params: z.object({ clienteId: z.string().transform((v) => Number(v)) }),
});
router.get('/:clienteId/equipos', validate(listEquiposClienteSchema), async (req, res) => {
  const { clienteId } = req.params as any;
  const data = await (await import('../services/equipo.service')).EquipoService.listByCliente((req as any).tenantId!, Number(clienteId));
  res.json({ success: true, data });
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

export default router;


