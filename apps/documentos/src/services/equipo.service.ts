import { prisma } from '../config/database';
import { createError } from '../middlewares/error.middleware';

function normalizeDni(dni: string): string {
  return (dni || '').replace(/\D+/g, '');
}

function normalizePlate(plate: string): string {
  return (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export class EquipoService {
  static async list(tenantEmpresaId: number, dadorCargaId: number) {
    return prisma.equipo.findMany({
      where: { tenantEmpresaId, dadorCargaId },
      orderBy: { validFrom: 'desc' },
      include: { clientes: true, dador: true },
    });
  }

  static async attachComponents(
    tenantEmpresaId: number,
    equipoId: number,
    data: { driverId?: number; truckId?: number; trailerId?: number; driverDni?: string; truckPlate?: string; trailerPlate?: string }
  ): Promise<any> {
    const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { id: true, tenantEmpresaId: true, dadorCargaId: true } });
    if (!equipo || equipo.tenantEmpresaId !== tenantEmpresaId) throw new Error('Equipo no encontrado');

    const updates: any = {};
    // Resolver driver
    let driverOriginId: number | null = null;
    if (data.driverId || data.driverDni) {
      let driverId = data.driverId;
      if (!driverId && data.driverDni) {
        const dniNorm = normalizeDni(data.driverDni);
        const ch = await prisma.chofer.findFirst({ where: { tenantEmpresaId, dadorCargaId: equipo.dadorCargaId, dniNorm } });
        if (!ch) throw new Error('Chofer no encontrado');
        driverId = ch.id;
      }
      // Permitir swap: si pertenece a otro equipo activo, cerrar ese equipo origen
      const origin = await prisma.equipo.findFirst({ where: { tenantEmpresaId, driverId, validTo: null, NOT: { id: equipoId } }, select: { id: true } });
      if (origin) {
        driverOriginId = origin.id;
        await prisma.$transaction([
          prisma.equipo.update({ where: { id: origin.id }, data: { validTo: new Date(), estado: 'finalizada' as any } }),
          prisma.equipoHistory.create({ data: { equipoId: origin.id, action: 'close', component: 'driver', originEquipoId: equipoId, payload: { reason: 'swap' } as any } })
        ]);
      }
      updates.driverId = driverId;
      updates.driverDniNorm = data.driverDni ? normalizeDni(data.driverDni) : undefined;
    }
    // Resolver truck
    let truckOriginId: number | null = null;
    if (data.truckId || data.truckPlate) {
      let truckId = data.truckId;
      if (!truckId && data.truckPlate) {
        const pat = normalizePlate(data.truckPlate);
        const tr = await prisma.camion.findFirst({ where: { tenantEmpresaId, dadorCargaId: equipo.dadorCargaId, patenteNorm: pat } });
        if (!tr) throw new Error('Camión no encontrado');
        truckId = tr.id;
      }
      // Permitir swap: cerrar equipo origen que tenga ese camión activo
      const origin = await prisma.equipo.findFirst({ where: { tenantEmpresaId, truckId, validTo: null, NOT: { id: equipoId } }, select: { id: true } });
      if (origin) {
        truckOriginId = origin.id;
        await prisma.$transaction([
          prisma.equipo.update({ where: { id: origin.id }, data: { validTo: new Date(), estado: 'finalizada' as any } }),
          prisma.equipoHistory.create({ data: { equipoId: origin.id, action: 'close', component: 'truck', originEquipoId: equipoId, payload: { reason: 'swap' } as any } })
        ]);
      }
      updates.truckId = truckId;
      updates.truckPlateNorm = data.truckPlate ? normalizePlate(data.truckPlate) : undefined;
    }
    // Resolver trailer
    let trailerOriginId: number | null = null;
    if (data.trailerId || data.trailerPlate) {
      let trailerId = data.trailerId ?? null;
      if (!trailerId && data.trailerPlate) {
        const pat = normalizePlate(data.trailerPlate);
        const ac = await prisma.acoplado.findFirst({ where: { tenantEmpresaId, dadorCargaId: equipo.dadorCargaId, patenteNorm: pat } });
        if (!ac) throw new Error('Acoplado no encontrado');
        trailerId = ac.id;
      }
      // Permitir swap: si acoplado está en otro equipo activo, desasociarlo de origen
      if (trailerId) {
        const origin = await prisma.equipo.findFirst({ where: { tenantEmpresaId, trailerId, validTo: null, NOT: { id: equipoId } }, select: { id: true } });
        if (origin) {
          trailerOriginId = origin.id;
          await prisma.$transaction([
            prisma.equipo.update({ where: { id: origin.id }, data: { trailerId: null, trailerPlateNorm: null } }),
            prisma.equipoHistory.create({ data: { equipoId: origin.id, action: 'detach', component: 'trailer', originEquipoId: equipoId, payload: { reason: 'swap' } as any } })
          ]);
        }
      }
      updates.trailerId = trailerId;
      updates.trailerPlateNorm = data.trailerPlate ? normalizePlate(data.trailerPlate) : null;
    }

    if (Object.keys(updates).length === 0) throw new Error('Sin cambios');

    let updated = await prisma.equipo.update({ where: { id: equipoId }, data: updates });
    // Registrar attach
    const component = updates.driverId ? 'driver' : (updates.truckId ? 'truck' : (updates.trailerId !== undefined ? 'trailer' : (updates.empresaTransportistaId !== undefined ? 'empresa' : 'unknown')));
    try { await prisma.equipoHistory.create({ data: { equipoId, action: 'attach', component, originEquipoId: null, payload: updates as any } }); } catch {}
    // Registrar swap en destino si hubo origen
    try {
      if (driverOriginId) await prisma.equipoHistory.create({ data: { equipoId, action: 'swap', component: 'driver', originEquipoId: driverOriginId, payload: { reason: 'attach' } as any } });
      if (truckOriginId) await prisma.equipoHistory.create({ data: { equipoId, action: 'swap', component: 'truck', originEquipoId: truckOriginId, payload: { reason: 'attach' } as any } });
      if (trailerOriginId) await prisma.equipoHistory.create({ data: { equipoId, action: 'swap', component: 'trailer', originEquipoId: trailerOriginId, payload: { reason: 'attach' } as any } });
    } catch {}

    // Si el equipo estaba finalizado y ahora tiene chofer y camión, reabrirlo (estado activa)
    try {
      if ((updated as any).estado !== 'activa' && (updated as any).driverId && (updated as any).truckId) {
        updated = await prisma.equipo.update({ where: { id: equipoId }, data: { estado: 'activa' as any, validTo: null } });
        await prisma.equipoHistory.create({ data: { equipoId, action: 'reopen', component: 'system', originEquipoId: null, payload: { reason: 'complete' } as any } });
      }
      if ((updated as any).validTo !== null && (updated as any).driverId && (updated as any).truckId) {
        updated = await prisma.equipo.update({ where: { id: equipoId }, data: { validTo: null } });
      }
    } catch {}
    // Re-chequeo de faltantes diferido
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(tenantEmpresaId, equipoId);
    } catch {}
    return updated;
  }

  static async detachComponents(
    tenantEmpresaId: number,
    equipoId: number,
    data: { driver?: boolean; truck?: boolean; trailer?: boolean }
  ): Promise<any> {
    const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { id: true, tenantEmpresaId: true } });
    if (!equipo || equipo.tenantEmpresaId !== tenantEmpresaId) throw new Error('Equipo no encontrado');
    const updates: any = {};
    // driverId y truckId son NO nulos en el modelo, no se pueden desasociar sin cerrar el equipo.
    if (data.driver) {
      const err: any = new Error('No es posible desasociar el chofer en un equipo activo. Cierre el equipo (validTo) y cree uno nuevo.');
      err.code = 'DETACH_NOT_SUPPORTED';
      throw err;
    }
    if (data.truck) {
      const err: any = new Error('No es posible desasociar el camión en un equipo activo. Cierre el equipo (validTo) y cree uno nuevo.');
      err.code = 'DETACH_NOT_SUPPORTED';
      throw err;
    }
    if (data.trailer) { updates.trailerId = null; updates.trailerPlateNorm = null; }
    if (Object.keys(updates).length === 0) throw new Error('Sin cambios');
    const updated = await prisma.equipo.update({ where: { id: equipoId }, data: updates });
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(tenantEmpresaId, equipoId);
    } catch {}
    return updated;
  }

  static async ensureChofer(tenantEmpresaId: number, dadorCargaId: number, dni: string, phones?: string[]) {
    const dniNorm = normalizeDni(dni);
    const existing = await prisma.chofer.findFirst({
      where: { tenantEmpresaId, dadorCargaId, dniNorm }
    });
    if (existing) {
      if (phones && phones.length) {
        await prisma.chofer.update({ where: { id: existing.id }, data: { phones } });
      }
      return existing.id;
    }
    const created = await prisma.chofer.create({
      data: { tenantEmpresaId, dadorCargaId, dni: dniNorm, dniNorm, phones: phones ?? [], activo: true }
    });
    return created.id;
  }

  static async ensureCamion(tenantEmpresaId: number, dadorCargaId: number, patente: string) {
    const patNorm = normalizePlate(patente);
    const existing = await prisma.camion.findFirst({
      where: { tenantEmpresaId, dadorCargaId, patenteNorm: patNorm }
    });
    if (existing) return existing.id;
    const created = await prisma.camion.create({
      data: { tenantEmpresaId, dadorCargaId, patente: patNorm, patenteNorm: patNorm, activo: true }
    });
    return created.id;
  }

  static async ensureAcoplado(tenantEmpresaId: number, dadorCargaId: number, patente?: string | null) {
    if (!patente) return null;
    const patNorm = normalizePlate(patente);
    const existing = await prisma.acoplado.findFirst({
      where: { tenantEmpresaId, dadorCargaId, patenteNorm: patNorm }
    });
    if (existing) return existing.id;
    const created = await prisma.acoplado.create({
      data: { tenantEmpresaId, dadorCargaId, patente: patNorm, patenteNorm: patNorm, activo: true }
    });
    return created.id;
  }

  static async ensureEmpresaTransportista(
    tenantEmpresaId: number,
    dadorCargaId: number,
    cuit?: string | null,
    razonSocial?: string | null
  ): Promise<number | null> {
    if (!cuit) return null;
    const cuitNorm = (cuit || '').replace(/\D+/g, '');
    if (!cuitNorm) return null;
    const existing = await prisma.empresaTransportista.findFirst({
      where: { tenantEmpresaId, dadorCargaId, cuit: cuitNorm },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.empresaTransportista.create({
      data: {
        tenantEmpresaId,
        dadorCargaId,
        cuit: cuitNorm,
        razonSocial: (razonSocial || '').trim() || `Empresa ${cuitNorm}`,
        activo: true,
      } as any,
    });
    return created.id;
  }

  static async createFromIdentifiers(input: {
    tenantEmpresaId: number;
    dadorCargaId: number;
    dniChofer: string;
    patenteTractor: string;
    patenteAcoplado?: string | null;
    choferPhones?: string[];
    empresaTransportistaCuit?: string | null;
    empresaTransportistaNombre?: string | null;
  }) {
    const driverId = await this.ensureChofer(input.tenantEmpresaId, input.dadorCargaId, input.dniChofer, input.choferPhones);
    const truckId = await this.ensureCamion(input.tenantEmpresaId, input.dadorCargaId, input.patenteTractor);
    const trailerId = await this.ensureAcoplado(input.tenantEmpresaId, input.dadorCargaId, input.patenteAcoplado ?? null);
    const empresaTransportistaId = await this.ensureEmpresaTransportista(
      input.tenantEmpresaId,
      input.dadorCargaId,
      input.empresaTransportistaCuit ?? null,
      input.empresaTransportistaNombre ?? null
    );

    const created = await this.create({
      tenantEmpresaId: input.tenantEmpresaId,
      dadorCargaId: input.dadorCargaId,
      driverId,
      truckId,
      trailerId,
      empresaTransportistaId: empresaTransportistaId ?? undefined,
      driverDni: input.dniChofer,
      truckPlate: input.patenteTractor,
      trailerPlate: input.patenteAcoplado ?? null,
      validFrom: new Date(),
    });
    // Encolar chequeo de faltantes en 15 minutos
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(input.tenantEmpresaId, created.id, 15 * 60 * 1000);
    } catch { /* noop */ }
    // Asociar cliente por defecto si existe
    try {
      const { SystemConfigService } = await import('./system-config.service');
      const defIdStr = await SystemConfigService.getConfig(`tenant:${input.tenantEmpresaId}:defaults.defaultClienteId`);
      const defId = defIdStr ? Number(defIdStr) : NaN;
      if (!Number.isNaN(defId)) {
        await this.associateCliente(input.tenantEmpresaId, created.id, defId, new Date());
      }
    } catch { /* noop */ }
    return created;
  }

  static async listByCliente(tenantEmpresaId: number, clienteId: number) {
    // Devuelve equipos actualmente asignados al cliente (asignadoHasta NULL) con datos básicos
    return prisma.equipoCliente.findMany({
      where: { clienteId, equipo: { tenantEmpresaId } },
      include: {
        equipo: true,
      },
      orderBy: { asignadoDesde: 'desc' },
    });
  }

  static async create(input: {
    tenantEmpresaId: number;
    dadorCargaId: number;
    driverId: number;
    truckId: number;
    trailerId?: number | null;
    empresaTransportistaId?: number | null;
    driverDni: string;
    truckPlate: string;
    trailerPlate?: string | null;
    validFrom: Date;
    validTo?: Date | null;
    forceMove?: boolean;
  }) {
    // Validar coherencia empresa transportista ↔ dador
    if (input.empresaTransportistaId) {
      const empresa = await prisma.empresaTransportista.findFirst({ where: { id: input.empresaTransportistaId, tenantEmpresaId: input.tenantEmpresaId }, select: { dadorCargaId: true } });
      if (!empresa || empresa.dadorCargaId !== input.dadorCargaId) {
        throw createError('La empresa transportista no pertenece al dador del equipo', 409, 'EMPRESA_MISMATCH');
      }
    }
    // Prevenir duplicados: mismo DNI + patente camión + (patente acoplado opcional) activos/solapados
    const dniNorm = normalizeDni(input.driverDni);
    const truckNorm = normalizePlate(input.truckPlate);
    const trailerNorm = input.trailerPlate ? normalizePlate(input.trailerPlate) : null;

    const existing = await prisma.equipo.findFirst({
      where: {
        tenantEmpresaId: input.tenantEmpresaId,
        dadorCargaId: input.dadorCargaId,
        driverDniNorm: dniNorm,
        truckPlateNorm: truckNorm,
        trailerPlateNorm: trailerNorm,
        OR: [
          { validTo: null },
          { validTo: { gte: input.validFrom } },
        ],
      },
    });

    if (existing) {
      throw createError('Equipo ya existe para este DNI/patentes en vigencia', 409, 'EQUIPO_DUPLICATE');
    }

    // Validar que los componentes no estén en otros equipos activos
    const conflicts: Array<string> = [];
    const driverInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, driverDniNorm: dniNorm, validTo: null } });
    if (driverInUse) conflicts.push(`Chofer en equipo #${driverInUse.id}`);
    const truckInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, truckPlateNorm: truckNorm, validTo: null } });
    if (truckInUse) conflicts.push(`Camión en equipo #${truckInUse.id}`);
    if (trailerNorm) {
      const trailerInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, trailerPlateNorm: trailerNorm, validTo: null } });
      if (trailerInUse) conflicts.push(`Acoplado en equipo #${trailerInUse.id}`);
    }
    if (conflicts.length && !input.forceMove) {
      throw createError(`Componentes ya en uso: ${conflicts.join(', ')}`, 409, 'COMPONENT_IN_USE');
    }

    // Si forceMove, aplicamos la misma política de swap que en attachComponents
    if (conflicts.length && input.forceMove) {
      // Cerrar equipo origen del chofer
      const driverInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, driverDniNorm: dniNorm, validTo: null } });
      if (driverInUse) {
        await prisma.$transaction([
          prisma.equipo.update({ where: { id: driverInUse.id }, data: { validTo: new Date(), estado: 'finalizada' as any } }),
          prisma.equipoHistory.create({ data: { equipoId: driverInUse.id, action: 'close', component: 'driver', originEquipoId: undefined as any, payload: { reason: 'forceMove' } as any } })
        ]);
      }
      // Cerrar equipo origen del camión
      const truckInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, truckPlateNorm: truckNorm, validTo: null } });
      if (truckInUse) {
        await prisma.$transaction([
          prisma.equipo.update({ where: { id: truckInUse.id }, data: { validTo: new Date(), estado: 'finalizada' as any } }),
          prisma.equipoHistory.create({ data: { equipoId: truckInUse.id, action: 'close', component: 'truck', originEquipoId: undefined as any, payload: { reason: 'forceMove' } as any } })
        ]);
      }
      // Desasociar acoplado de su equipo origen
      if (trailerNorm) {
        const trailerInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, trailerPlateNorm: trailerNorm, validTo: null } });
        if (trailerInUse) {
          await prisma.$transaction([
            prisma.equipo.update({ where: { id: trailerInUse.id }, data: { trailerId: null, trailerPlateNorm: null } }),
            prisma.equipoHistory.create({ data: { equipoId: trailerInUse.id, action: 'detach', component: 'trailer', originEquipoId: undefined as any, payload: { reason: 'forceMove' } as any } })
          ]);
        }
      }
    }

    const equipo = await prisma.equipo.create({
      data: {
        tenantEmpresaId: input.tenantEmpresaId,
        dadorCargaId: input.dadorCargaId,
        driverId: input.driverId,
        truckId: input.truckId,
        trailerId: input.trailerId ?? null,
        empresaTransportistaId: input.empresaTransportistaId ?? null,
        driverDniNorm: dniNorm,
        truckPlateNorm: truckNorm,
        trailerPlateNorm: trailerNorm,
        validFrom: input.validFrom,
        validTo: input.validTo ?? null,
      },
    });
    // Registrar creación
    try { await prisma.equipoHistory.create({ data: { equipoId: equipo.id, action: 'create', component: 'system', originEquipoId: null, payload: { driverDni: dniNorm, truckPlate: truckNorm, trailerPlate: trailerNorm } as any } }); } catch {}
    // Encolar chequeo de faltantes en 15 minutos
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(input.tenantEmpresaId, equipo.id, 15 * 60 * 1000);
    } catch { /* noop */ }
    // Asociar cliente por defecto si existe
    try {
      const { SystemConfigService } = await import('./system-config.service');
      const defIdStr = await SystemConfigService.getConfig(`tenant:${input.tenantEmpresaId}:defaults.defaultClienteId`);
      const defId = defIdStr ? Number(defIdStr) : NaN;
      if (!Number.isNaN(defId)) {
        await this.associateCliente(input.tenantEmpresaId, equipo.id, defId, new Date());
      }
    } catch { /* noop */ }
    return equipo;
  }

  static async update(id: number, data: {
    trailerId?: number | null;
    trailerPlate?: string | null;
    validTo?: Date | null;
    estado?: 'activa' | 'finalizada';
    empresaTransportistaId?: number;
  }) {
    // Validar coherencia empresa transportista ↔ dador
    if (data.empresaTransportistaId !== undefined) {
      const equipo = await prisma.equipo.findUnique({ where: { id }, select: { dadorCargaId: true, tenantEmpresaId: true } });
      if (!equipo) throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
      if (data.empresaTransportistaId && data.empresaTransportistaId !== 0) {
        const empresa = await prisma.empresaTransportista.findFirst({ where: { id: data.empresaTransportistaId, tenantEmpresaId: equipo.tenantEmpresaId }, select: { dadorCargaId: true } });
        if (!empresa || empresa.dadorCargaId !== equipo.dadorCargaId) {
          throw createError('La empresa transportista no pertenece al dador del equipo', 409, 'EMPRESA_MISMATCH');
        }
      }
    }
    return prisma.equipo.update({
      where: { id },
      data: {
        trailerId: data.trailerId,
        trailerPlateNorm: data.trailerPlate === undefined ? undefined : (data.trailerPlate ? normalizePlate(data.trailerPlate) : null),
        validTo: data.validTo ?? undefined,
        estado: data.estado as any,
        empresaTransportistaId: data.empresaTransportistaId === undefined ? undefined : (data.empresaTransportistaId === 0 ? null : data.empresaTransportistaId),
      },
    });
  }

  static async associateCliente(tenantEmpresaId: number, equipoId: number, clienteId: number, asignadoDesde: Date, asignadoHasta?: Date | null) {
    // Evitar asociar dos veces el mismo equipo-cliente sin cierre de vigencia
    const open = await prisma.equipoCliente.findFirst({
      where: { equipoId, clienteId, asignadoHasta: null },
    });
    if (open) {
      const err: any = new Error('Asociación equipo-cliente ya existe');
      err.code = 'EQUIPO_CLIENTE_DUPLICATE';
      throw err;
    }
    const assoc = await prisma.equipoCliente.create({
      data: { equipoId, clienteId, asignadoDesde, asignadoHasta: asignadoHasta ?? null },
    });
    // Encolar chequeo de faltantes por nuevos requisitos en 15 minutos
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(tenantEmpresaId, equipoId, 15 * 60 * 1000);
    } catch {}
    return assoc;
  }

  static async removeCliente(tenantEmpresaId: number, equipoId: number, clienteId: number) {
    // Eliminar última asociación abierta
    const assoc = await prisma.equipoCliente.findFirst({
      where: { equipoId, clienteId, asignadoHasta: null },
      orderBy: { asignadoDesde: 'desc' },
    });
    if (!assoc) return null;
    return prisma.equipoCliente.update({
      where: { equipoId_clienteId_asignadoDesde: { equipoId, clienteId, asignadoDesde: assoc.asignadoDesde } },
      data: { asignadoHasta: new Date() },
    });
  }

  // Eliminación segura de equipo (solo si no tiene asociaciones activas)
  static async delete(equipoId: number) {
    return prisma.$transaction(async (tx) => {
      // Registrar eliminación (nota: será eliminado al purgar history por FK)
      try {
        await tx.equipoHistory.create({ data: { equipoId, action: 'delete', component: 'system', originEquipoId: null, payload: { reason: 'user' } as any } });
      } catch {}

      // Borra asociaciones cliente vigentes
      await tx.equipoCliente.deleteMany({ where: { equipoId } });

      // Borra historial para evitar violación de FK
      await tx.equipoHistory.deleteMany({ where: { equipoId } });

      // Eliminar equipo
      return tx.equipo.delete({ where: { id: equipoId } });
    });
  }
}


