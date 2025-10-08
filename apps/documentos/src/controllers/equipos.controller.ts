import { Response } from 'express';
import { EquipoService } from '../services/equipo.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class EquiposController {
  static async list(req: AuthRequest, res: Response) {
    const dadorCargaId = Number(req.query.dadorCargaId);
    const data = await EquipoService.list(req.tenantId!, dadorCargaId);
    res.json({ success: true, data });
  }

  // Alta mínima desde identificadores (dni + patentes)
  static async createMinimal(req: AuthRequest, res: Response) {
    // Permitir usar dador por defecto si no viene
    const tenantId = req.tenantId!;
    let dadorId = Number(req.body.dadorCargaId);
    if (!dadorId || Number.isNaN(dadorId)) {
      const { SystemConfigService } = await import('../services/system-config.service');
      const def = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.defaultDadorId`);
      if (def) dadorId = Number(def);
    }
    const input = {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId,
      dniChofer: String(req.body.dniChofer),
      patenteTractor: String(req.body.patenteTractor),
      patenteAcoplado: req.body.patenteAcoplado ? String(req.body.patenteAcoplado) : null,
      choferPhones: Array.isArray(req.body.choferPhones) ? (req.body.choferPhones as string[]) : undefined,
    };
    const data = await EquipoService.createFromIdentifiers(input);
    res.status(201).json({ success: true, data });
  }

  static async create(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    let dadorId = Number(req.body.dadorCargaId);
    if (!dadorId || Number.isNaN(dadorId)) {
      const { SystemConfigService } = await import('../services/system-config.service');
      const def = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.defaultDadorId`);
      if (def) dadorId = Number(def);
    }
    const input = {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId,
      driverId: Number(req.body.driverId),
      truckId: Number(req.body.truckId),
      trailerId: req.body.trailerId ? Number(req.body.trailerId) : null,
      empresaTransportistaId: req.body.empresaTransportistaId ? Number(req.body.empresaTransportistaId) : null,
      driverDni: String(req.body.driverDni),
      truckPlate: String(req.body.truckPlate),
      trailerPlate: req.body.trailerPlate ? String(req.body.trailerPlate) : null,
      validFrom: new Date(req.body.validFrom),
      validTo: req.body.validTo ? new Date(req.body.validTo) : null,
      forceMove: req.body.forceMove === true,
    };
    const data = await EquipoService.create(input);
    res.status(201).json({ success: true, data });
  }

  static async update(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await EquipoService.update(id, {
      trailerId: req.body.trailerId ? Number(req.body.trailerId) : undefined,
      trailerPlate: req.body.trailerPlate,
      validTo: req.body.validTo ? new Date(req.body.validTo) : undefined,
      estado: req.body.estado,
      empresaTransportistaId: typeof req.body.empresaTransportistaId === 'number' ? req.body.empresaTransportistaId : (
        req.body.empresaTransportistaId ? Number(req.body.empresaTransportistaId) : undefined
      ),
    });
    res.json({ success: true, data });
  }

  static async associateCliente(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const clienteId = Number(req.params.clienteId);
    const asignadoDesde = new Date(req.body.asignadoDesde);
    const asignadoHasta = req.body.asignadoHasta ? new Date(req.body.asignadoHasta) : undefined;
    const data = await EquipoService.associateCliente(req.tenantId!, equipoId, clienteId, asignadoDesde, asignadoHasta);
    res.status(201).json({ success: true, data });
  }

  static async removeCliente(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const clienteId = Number(req.params.clienteId);
    const data = await EquipoService.removeCliente(req.tenantId!, equipoId, clienteId);
    res.json({ success: true, data });
  }

  static async delete(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const data = await EquipoService.delete(equipoId);
    res.json({ success: true, data });
  }

  static async history(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const { prisma } = await import('../config/database');
    const rows = await prisma.equipoHistory.findMany({ where: { equipoId }, orderBy: { createdAt: 'desc' }, take: limit });
    res.json({ success: true, data: rows });
  }
}


