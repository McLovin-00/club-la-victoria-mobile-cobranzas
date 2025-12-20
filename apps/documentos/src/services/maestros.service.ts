import { prisma } from '../config/database';

// ============================================================================
// HELPERS
// ============================================================================
const normalizeDni = (dni: string): string => (dni || '').replace(/\D+/g, '');
const normalizePlate = (plate: string): string => (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

async function enqueueMissingCheck(tenantEmpresaId: number, entityId: number, field: 'driverId' | 'truckId' | 'trailerId'): Promise<void> {
  try {
    const equipos = await prisma.equipo.findMany({ where: { [field]: entityId, tenantEmpresaId }, select: { id: true } });
    if (equipos.length > 0) {
      const { queueService } = await import('./queue.service');
      for (const e of equipos) await queueService.addMissingCheckForEquipo(tenantEmpresaId, e.id, 15 * 60 * 1000);
    }
  } catch { /* noop */ }
}

async function detachFromEquipos(
  tx: any,
  tenantEmpresaId: number,
  entityId: number,
  field: 'driverId' | 'truckId' | 'trailerId',
  component: string,
  clearData: any
): Promise<void> {
  const equipos = await tx.equipo.findMany({ where: { [field]: entityId, tenantEmpresaId }, select: { id: true } });
  for (const e of equipos) {
    await tx.equipo.update({ where: { id: e.id }, data: clearData });
    try {
      await tx.equipoHistory.create({ data: { equipoId: e.id, action: 'detach', component, originEquipoId: null, payload: { reason: `delete-${component}` } as any } });
    } catch { /* noop */ }
  }
}

// ============================================================================
// EMPRESAS
// ============================================================================
async function listEmpresas(activo?: boolean, q?: string, page = 1, limit = 10): Promise<PaginatedResult<any>> {
  const where: any = {};
  if (activo !== undefined) where.activo = activo;
  if (q) where.OR = [{ razonSocial: { contains: q, mode: 'insensitive' } }, { cuit: { contains: q } }];
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.dadorCarga.findMany({ where, orderBy: { razonSocial: 'asc' }, skip, take: limit } as any),
    prisma.dadorCarga.count({ where } as any),
  ]);
  return { data, total, page, limit };
}

async function createEmpresa(data: { razonSocial: string; cuit: string; activo?: boolean; notas?: string }) {
  return prisma.dadorCarga.create({ data } as any);
}

async function updateEmpresa(id: number, data: { razonSocial?: string; cuit?: string; activo?: boolean; notas?: string }) {
  return prisma.dadorCarga.update({ where: { id }, data } as any);
}

async function deleteEmpresa(id: number) {
  return prisma.dadorCarga.delete({ where: { id } } as any);
}

// ============================================================================
// CHOFERES
// ============================================================================
async function getChoferById(tenantEmpresaId: number, id: number) {
  return prisma.chofer.findFirst({
    where: { tenantEmpresaId, id },
    include: { empresaTransportista: { select: { id: true, razonSocial: true, dadorCargaId: true } } },
  });
}

async function listChoferes(tenantEmpresaId: number, dadorCargaId: number | undefined, q?: string, activo?: boolean, page = 1, limit = 10): Promise<PaginatedResult<any>> {
  const where: any = {
    tenantEmpresaId,
    ...(dadorCargaId !== undefined && { dadorCargaId }),
    activo: activo === undefined ? undefined : activo,
    OR: q ? [{ dni: { contains: q } }, { nombre: { contains: q, mode: 'insensitive' } }, { apellido: { contains: q, mode: 'insensitive' } }] : undefined,
  };
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.chofer.findMany({ where, orderBy: { id: 'desc' }, skip, take: limit }),
    prisma.chofer.count({ where }),
  ]);
  return { data, total, page, limit };
}

async function createChofer(data: { tenantEmpresaId: number; dadorCargaId: number; dni: string; nombre?: string; apellido?: string; activo?: boolean; phones?: string[] }) {
  const dniNorm = normalizeDni(data.dni);
  const existing = await prisma.chofer.findFirst({ where: { tenantEmpresaId: data.tenantEmpresaId, dniNorm } });

  if (existing) {
    if (existing.dadorCargaId === data.dadorCargaId) {
      throw new Error('Unique constraint failed: chofer ya existe para este dador');
    }
    return prisma.chofer.update({
      where: { id: existing.id },
      data: { dadorCargaId: data.dadorCargaId, nombre: data.nombre ?? existing.nombre, apellido: data.apellido ?? existing.apellido, phones: data.phones ?? existing.phones, activo: data.activo ?? existing.activo },
    });
  }

  const chofer = await prisma.chofer.create({
    data: { tenantEmpresaId: data.tenantEmpresaId, dadorCargaId: data.dadorCargaId, dni: data.dni, dniNorm, nombre: data.nombre, apellido: data.apellido, phones: data.phones ?? [], activo: data.activo ?? true },
  });

  await enqueueMissingCheck(data.tenantEmpresaId, chofer.id, 'driverId');
  return chofer;
}

async function updateChofer(tenantEmpresaId: number, id: number, data: { dni?: string; nombre?: string; apellido?: string; activo?: boolean; phones?: string[] }) {
  return prisma.chofer.update({
    where: { id },
    data: { tenantEmpresaId, dni: data.dni, dniNorm: data.dni ? normalizeDni(data.dni) : undefined, nombre: data.nombre, apellido: data.apellido, phones: data.phones, activo: data.activo },
  });
}

async function deleteChofer(tenantEmpresaId: number, id: number) {
  return prisma.$transaction(async (tx) => {
    await detachFromEquipos(tx, tenantEmpresaId, id, 'driverId', 'driver', { driverId: 0, driverDniNorm: '' });
    return tx.chofer.delete({ where: { id } });
  });
}

// ============================================================================
// CAMIONES
// ============================================================================
async function listCamiones(tenantEmpresaId: number, dadorCargaId: number | undefined, q?: string, activo?: boolean, page = 1, limit = 10): Promise<PaginatedResult<any>> {
  const where: any = {
    tenantEmpresaId,
    ...(dadorCargaId !== undefined && { dadorCargaId }),
    activo: activo === undefined ? undefined : activo,
    OR: q ? [{ patente: { contains: q } }, { marca: { contains: q, mode: 'insensitive' } }] : undefined,
  };
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.camion.findMany({ where, orderBy: { id: 'desc' }, skip, take: limit }),
    prisma.camion.count({ where }),
  ]);
  return { data, total, page, limit };
}

async function createCamion(data: { tenantEmpresaId: number; dadorCargaId: number; patente: string; marca?: string; modelo?: string; activo?: boolean }) {
  const patenteNorm = normalizePlate(data.patente);
  const existing = await prisma.camion.findFirst({ where: { tenantEmpresaId: data.tenantEmpresaId, patenteNorm } });

  if (existing) {
    if (existing.dadorCargaId === data.dadorCargaId) {
      throw new Error('Unique constraint failed: camión ya existe para este dador');
    }
    return prisma.camion.update({
      where: { id: existing.id },
      data: { dadorCargaId: data.dadorCargaId, marca: data.marca ?? existing.marca, modelo: data.modelo ?? existing.modelo, activo: data.activo ?? existing.activo },
    });
  }

  const camion = await prisma.camion.create({
    data: { tenantEmpresaId: data.tenantEmpresaId, dadorCargaId: data.dadorCargaId, patente: data.patente, patenteNorm, marca: data.marca, modelo: data.modelo, activo: data.activo ?? true },
  });

  await enqueueMissingCheck(data.tenantEmpresaId, camion.id, 'truckId');
  return camion;
}

async function updateCamion(tenantEmpresaId: number, id: number, data: { patente?: string; marca?: string; modelo?: string; activo?: boolean }) {
  return prisma.camion.update({
    where: { id },
    data: { tenantEmpresaId, patente: data.patente, patenteNorm: data.patente ? normalizePlate(data.patente) : undefined, marca: data.marca, modelo: data.modelo, activo: data.activo },
  });
}

async function deleteCamion(tenantEmpresaId: number, id: number) {
  return prisma.$transaction(async (tx) => {
    await detachFromEquipos(tx, tenantEmpresaId, id, 'truckId', 'truck', { truckId: 0, truckPlateNorm: '' });
    return tx.camion.delete({ where: { id } });
  });
}

// ============================================================================
// ACOPLADOS
// ============================================================================
async function listAcoplados(tenantEmpresaId: number, dadorCargaId: number | undefined, q?: string, activo?: boolean, page = 1, limit = 10): Promise<PaginatedResult<any>> {
  const where: any = {
    tenantEmpresaId,
    ...(dadorCargaId !== undefined && { dadorCargaId }),
    activo: activo === undefined ? undefined : activo,
    OR: q ? [{ patente: { contains: q } }, { tipo: { contains: q, mode: 'insensitive' } }] : undefined,
  };
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.acoplado.findMany({ where, orderBy: { id: 'desc' }, skip, take: limit }),
    prisma.acoplado.count({ where }),
  ]);
  return { data, total, page, limit };
}

async function createAcoplado(data: { tenantEmpresaId: number; dadorCargaId: number; patente: string; tipo?: string; activo?: boolean }) {
  const patenteNorm = normalizePlate(data.patente);
  const existing = await prisma.acoplado.findFirst({ where: { tenantEmpresaId: data.tenantEmpresaId, patenteNorm } });

  if (existing) {
    if (existing.dadorCargaId === data.dadorCargaId) {
      throw new Error('Unique constraint failed: acoplado ya existe para este dador');
    }
    return prisma.acoplado.update({
      where: { id: existing.id },
      data: { dadorCargaId: data.dadorCargaId, tipo: data.tipo ?? existing.tipo, activo: data.activo ?? existing.activo },
    });
  }

  const acoplado = await prisma.acoplado.create({
    data: { tenantEmpresaId: data.tenantEmpresaId, dadorCargaId: data.dadorCargaId, patente: data.patente, patenteNorm, tipo: data.tipo, activo: data.activo ?? true },
  });

  await enqueueMissingCheck(data.tenantEmpresaId, acoplado.id, 'trailerId');
  return acoplado;
}

async function updateAcoplado(tenantEmpresaId: number, id: number, data: { patente?: string; tipo?: string; activo?: boolean }) {
  return prisma.acoplado.update({
    where: { id },
    data: { tenantEmpresaId, patente: data.patente, patenteNorm: data.patente ? normalizePlate(data.patente) : undefined, tipo: data.tipo, activo: data.activo },
  });
}

async function deleteAcoplado(tenantEmpresaId: number, id: number) {
  return prisma.$transaction(async (tx) => {
    await detachFromEquipos(tx, tenantEmpresaId, id, 'trailerId', 'trailer', { trailerId: null, trailerPlateNorm: null });
    return tx.acoplado.delete({ where: { id } });
  });
}

// ============================================================================
// EXPORTAR SERVICIO
// ============================================================================
export const MaestrosService = {
  // Empresas
  listEmpresas,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  // Choferes
  getChoferById,
  listChoferes,
  createChofer,
  updateChofer,
  deleteChofer,
  // Camiones
  listCamiones,
  createCamion,
  updateCamion,
  deleteCamion,
  // Acoplados
  listAcoplados,
  createAcoplado,
  updateAcoplado,
  deleteAcoplado,
};
