import { Response } from 'express';
import { DadorService } from '../services/dador.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';

export class DadoresController {
  static async list(req: AuthRequest, res: Response) {
    const activo = typeof req.query.activo !== 'undefined' ? req.query.activo === 'true' : undefined;
    const data = await DadorService.list(activo, req.tenantId);
    const { SystemConfigService } = await import('../services/system-config.service');
    const def = await SystemConfigService.getConfig(`tenant:${req.tenantId!}:defaults.defaultDadorId`);
    res.json({ success: true, data, defaults: { defaultDadorId: def ? Number(def) : null } });
  }

  static async create(req: AuthRequest, res: Response) {
    const result = await DadorService.create({ ...req.body, tenantEmpresaId: req.tenantId! });
    
    if (!result.success) {
      res.status(409).json({
        success: false,
        code: result.error.code,
        message: result.error.message,
        existingDador: result.error.existingDador,
      });
      return;
    }
    
    res.status(201).json({ success: true, data: result.data });
  }

  static async update(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const dador = await prisma.dadorCarga.findUnique({ where: { id }, select: { tenantEmpresaId: true } });
    if (!dador || dador.tenantEmpresaId !== req.tenantId) {
      res.status(404).json({ success: false, message: 'Dador no encontrado' });
      return;
    }
    const { razonSocial, cuit, activo, notas, phones } = req.body;
    const data = await DadorService.update(id, { razonSocial, cuit, activo, notas, phones });
    res.json({ success: true, data });
  }

  static async remove(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const dador = await prisma.dadorCarga.findUnique({ where: { id }, select: { tenantEmpresaId: true } });
    if (!dador || dador.tenantEmpresaId !== req.tenantId) {
      res.status(404).json({ success: false, message: 'Dador no encontrado' });
      return;
    }
    const data = await DadorService.remove(id);
    res.json({ success: true, data });
  }

  static async updateNotifications(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const dador = await prisma.dadorCarga.findUnique({ where: { id }, select: { tenantEmpresaId: true } });
    if (!dador || dador.tenantEmpresaId !== req.tenantId) {
      res.status(404).json({ success: false, message: 'Dador no encontrado' });
      return;
    }
    const { notifyDriverEnabled, notifyDadorEnabled } = req.body || {};
    const data = await prisma.dadorCarga.update({ where: { id }, data: { notifyDriverEnabled, notifyDadorEnabled } });
    res.json({ success: true, data: { id: data.id, notifyDriverEnabled: data.notifyDriverEnabled, notifyDadorEnabled: data.notifyDadorEnabled } });
  }
}


