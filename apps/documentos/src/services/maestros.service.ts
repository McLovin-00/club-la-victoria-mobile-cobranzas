import { prisma } from '../config/database';

function normalizeDni(dni: string): string {
  return (dni || '').replace(/\D+/g, '');
}

function normalizePlate(plate: string): string {
  return (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const MaestrosService = {
  // EMPRESAS
  async listEmpresas(activo?: boolean, q?: string, page = 1, limit = 10) {
    const where: any = {};
    if (activo !== undefined) where.activo = activo;
    if (q) where.OR = [
      { razonSocial: { contains: q, mode: 'insensitive' } },
      { cuit: { contains: q } },
    ];
    const skip = (page - 1) * limit;
    // Cambiado a dadorCarga como entidad de empresa/dador
    const [data, total] = await Promise.all([
      prisma.dadorCarga.findMany({ where, orderBy: { razonSocial: 'asc' }, skip, take: limit } as any),
      prisma.dadorCarga.count({ where } as any),
    ]);
    return { data, total, page, limit };
  },
  async createEmpresa(data: { razonSocial: string; cuit: string; activo?: boolean; notas?: string }) {
    return prisma.dadorCarga.create({ data } as any);
  },
  async updateEmpresa(id: number, data: { razonSocial?: string; cuit?: string; activo?: boolean; notas?: string }) {
    return prisma.dadorCarga.update({ where: { id }, data } as any);
  },
  async deleteEmpresa(id: number) {
    return prisma.dadorCarga.delete({ where: { id } } as any);
  },

  // CHOFERES
  async getChoferById(tenantEmpresaId: number, id: number) {
    const chofer = await prisma.chofer.findFirst({
      where: { tenantEmpresaId, id },
      include: {
        empresaTransportista: {
          select: { id: true, razonSocial: true, dadorCargaId: true },
        },
      },
    });
    return chofer;
  },

  async listChoferes(tenantEmpresaId: number, dadorCargaId: number, q?: string, activo?: boolean, page = 1, limit = 10) {
    const where: any = {
      tenantEmpresaId,
      dadorCargaId,
      activo: activo === undefined ? undefined : activo,
      OR: q
        ? [
            { dni: { contains: q } },
            { nombre: { contains: q, mode: 'insensitive' } },
            { apellido: { contains: q, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.chofer.findMany({ where, orderBy: { id: 'desc' }, skip, take: limit }),
      prisma.chofer.count({ where }),
    ]);
    return { data, total, page, limit };
  },
  async createChofer(data: { tenantEmpresaId: number; dadorCargaId: number; dni: string; nombre?: string; apellido?: string; activo?: boolean; phones?: string[] }) {
    const dniNorm = normalizeDni(data.dni);
    // Buscar existente por tenant + DNI
    const existing = await prisma.chofer.findFirst({ where: { tenantEmpresaId: data.tenantEmpresaId, dniNorm } });
    if (existing) {
      if (existing.dadorCargaId === data.dadorCargaId) {
        // Misma asociación: duplicado
        throw new Error('Unique constraint failed: chofer ya existe para este dador');
      }
      // Reasignar al nuevo dador
      const reassigned = await prisma.chofer.update({
        where: { id: existing.id },
        data: {
          dadorCargaId: data.dadorCargaId,
          nombre: data.nombre ?? existing.nombre,
          apellido: data.apellido ?? existing.apellido,
          phones: data.phones ?? existing.phones,
          activo: data.activo ?? existing.activo,
        },
      });
      return reassigned;
    }
    const chofer = await prisma.chofer.create({
      data: {
        tenantEmpresaId: data.tenantEmpresaId,
        dadorCargaId: data.dadorCargaId,
        dni: data.dni,
        dniNorm,
        nombre: data.nombre,
        apellido: data.apellido,
        phones: data.phones ?? [],
        activo: data.activo ?? true,
      },
    });
    // Encolar chequeo de faltantes para equipos con este chofer
    try {
      const equipos = await prisma.equipo.findMany({ where: { driverId: chofer.id, tenantEmpresaId: data.tenantEmpresaId }, select: { id: true } });
      if (equipos.length > 0) {
        const { queueService } = await import('./queue.service');
        for (const e of equipos) await queueService.addMissingCheckForEquipo(data.tenantEmpresaId, e.id, 15 * 60 * 1000);
      }
    } catch { /* noop */ }
    return chofer;
  },
  async updateChofer(tenantEmpresaId: number, id: number, data: { dni?: string; nombre?: string; apellido?: string; activo?: boolean; phones?: string[] }) {
    return prisma.chofer.update({
      where: { id },
      data: {
        tenantEmpresaId,
        dni: data.dni,
        dniNorm: data.dni === undefined ? undefined : normalizeDni(data.dni),
        nombre: data.nombre,
        apellido: data.apellido,
        phones: data.phones,
        activo: data.activo,
      },
    });
  },
  async deleteChofer(tenantEmpresaId: number, id: number) {
    return prisma.$transaction(async (tx) => {
      // Detachar de equipos donde esté como driver
      const equipos = await tx.equipo.findMany({ where: { driverId: id, tenantEmpresaId }, select: { id: true } });
      if (equipos.length > 0) {
        // Si hay equipos, cerrar/reabrir sin chofer (dejar trailer/camión intactos)
        for (const e of equipos) {
          await tx.equipo.update({ where: { id: e.id }, data: { driverId: 0, driverDniNorm: '' } as any });
          try { await tx.equipoHistory.create({ data: { equipoId: e.id, action: 'detach', component: 'driver', originEquipoId: null, payload: { reason: 'delete-driver' } as any } }); } catch {}
        }
      }
      // Borrar chofer
      return tx.chofer.delete({ where: { id } });
    });
  },

  // CAMIONES
  async listCamiones(tenantEmpresaId: number, dadorCargaId: number, q?: string, activo?: boolean, page = 1, limit = 10) {
    const where: any = {
      tenantEmpresaId,
      dadorCargaId,
      activo: activo === undefined ? undefined : activo,
      OR: q ? [{ patente: { contains: q } }, { marca: { contains: q, mode: 'insensitive' } }] : undefined,
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.camion.findMany({ where, orderBy: { id: 'desc' }, skip, take: limit }),
      prisma.camion.count({ where }),
    ]);
    return { data, total, page, limit };
  },
  async createCamion(data: { tenantEmpresaId: number; dadorCargaId: number; patente: string; marca?: string; modelo?: string; activo?: boolean }) {
    const patenteNorm = normalizePlate(data.patente);
    const existing = await prisma.camion.findFirst({ where: { tenantEmpresaId: data.tenantEmpresaId, patenteNorm } });
    if (existing) {
      if (existing.dadorCargaId === data.dadorCargaId) {
        throw new Error('Unique constraint failed: camión ya existe para este dador');
      }
      const reassigned = await prisma.camion.update({
        where: { id: existing.id },
        data: {
          dadorCargaId: data.dadorCargaId,
          // Si se envían marca/modelo en la creación, priorizarlos; caso contrario conservar existentes
          marca: data.marca ?? existing.marca,
          modelo: data.modelo ?? existing.modelo,
          activo: data.activo ?? existing.activo,
        },
      });
      return reassigned;
    }
    const camion = await prisma.camion.create({
      data: {
        tenantEmpresaId: data.tenantEmpresaId,
        dadorCargaId: data.dadorCargaId,
        patente: data.patente,
        patenteNorm,
        marca: data.marca,
        modelo: data.modelo,
        activo: data.activo ?? true,
      },
    });
    try {
      const equipos = await prisma.equipo.findMany({ where: { truckId: camion.id, tenantEmpresaId: data.tenantEmpresaId }, select: { id: true } });
      if (equipos.length > 0) {
        const { queueService } = await import('./queue.service');
        for (const e of equipos) await queueService.addMissingCheckForEquipo(data.tenantEmpresaId, e.id, 15 * 60 * 1000);
      }
    } catch { /* noop */ }
    return camion;
  },
  async updateCamion(tenantEmpresaId: number, id: number, data: { patente?: string; marca?: string; modelo?: string; activo?: boolean }) {
    return prisma.camion.update({
      where: { id },
      data: {
        tenantEmpresaId,
        patente: data.patente,
        patenteNorm: data.patente === undefined ? undefined : normalizePlate(data.patente),
        marca: data.marca,
        modelo: data.modelo,
        activo: data.activo,
      },
    });
  },
  async deleteCamion(tenantEmpresaId: number, id: number) {
    return prisma.$transaction(async (tx) => {
      const equipos = await tx.equipo.findMany({ where: { truckId: id, tenantEmpresaId }, select: { id: true } });
      if (equipos.length > 0) {
        for (const e of equipos) {
          await tx.equipo.update({ where: { id: e.id }, data: { truckId: 0, truckPlateNorm: '' } as any });
          try { await tx.equipoHistory.create({ data: { equipoId: e.id, action: 'detach', component: 'truck', originEquipoId: null, payload: { reason: 'delete-truck' } as any } }); } catch {}
        }
      }
      return tx.camion.delete({ where: { id } });
    });
  },

  // ACOPLADOS
  async listAcoplados(tenantEmpresaId: number, dadorCargaId: number, q?: string, activo?: boolean, page = 1, limit = 10) {
    const where: any = {
      tenantEmpresaId,
      dadorCargaId,
      activo: activo === undefined ? undefined : activo,
      OR: q ? [{ patente: { contains: q } }, { tipo: { contains: q, mode: 'insensitive' } }] : undefined,
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.acoplado.findMany({ where, orderBy: { id: 'desc' }, skip, take: limit }),
      prisma.acoplado.count({ where }),
    ]);
    return { data, total, page, limit };
  },
  async createAcoplado(data: { tenantEmpresaId: number; dadorCargaId: number; patente: string; tipo?: string; activo?: boolean }) {
    const patenteNorm = normalizePlate(data.patente);
    const existing = await prisma.acoplado.findFirst({ where: { tenantEmpresaId: data.tenantEmpresaId, patenteNorm } });
    if (existing) {
      if (existing.dadorCargaId === data.dadorCargaId) {
        throw new Error('Unique constraint failed: acoplado ya existe para este dador');
      }
      const reassigned = await prisma.acoplado.update({
        where: { id: existing.id },
        data: {
          dadorCargaId: data.dadorCargaId,
          tipo: data.tipo ?? existing.tipo,
          activo: data.activo ?? existing.activo,
        },
      });
      return reassigned;
    }
    const acoplado = await prisma.acoplado.create({
      data: {
        tenantEmpresaId: data.tenantEmpresaId,
        dadorCargaId: data.dadorCargaId,
        patente: data.patente,
        patenteNorm,
        tipo: data.tipo,
        activo: data.activo ?? true,
      },
    });
    try {
      const equipos = await prisma.equipo.findMany({ where: { trailerId: acoplado.id, tenantEmpresaId: data.tenantEmpresaId }, select: { id: true } });
      if (equipos.length > 0) {
        const { queueService } = await import('./queue.service');
        for (const e of equipos) await queueService.addMissingCheckForEquipo(data.tenantEmpresaId, e.id, 15 * 60 * 1000);
      }
    } catch { /* noop */ }
    return acoplado;
  },
  async updateAcoplado(tenantEmpresaId: number, id: number, data: { patente?: string; tipo?: string; activo?: boolean }) {
    return prisma.acoplado.update({
      where: { id },
      data: {
        tenantEmpresaId,
        patente: data.patente,
        patenteNorm: data.patente === undefined ? undefined : normalizePlate(data.patente),
        tipo: data.tipo,
        activo: data.activo,
      },
    });
  },
  async deleteAcoplado(tenantEmpresaId: number, id: number) {
    return prisma.$transaction(async (tx) => {
      const equipos = await tx.equipo.findMany({ where: { trailerId: id, tenantEmpresaId }, select: { id: true } });
      if (equipos.length > 0) {
        for (const e of equipos) {
          await tx.equipo.update({ where: { id: e.id }, data: { trailerId: null, trailerPlateNorm: null } });
          try { await tx.equipoHistory.create({ data: { equipoId: e.id, action: 'detach', component: 'trailer', originEquipoId: null, payload: { reason: 'delete-trailer' } as any } }); } catch {}
        }
      }
      return tx.acoplado.delete({ where: { id } });
    });
  },
};


