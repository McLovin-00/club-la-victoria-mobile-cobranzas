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
    const data = await DadorService.create({ ...req.body, tenantEmpresaId: req.tenantId! });
    res.status(201).json({ success: true, data });
  }

  static async update(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await DadorService.update(id, req.body);
    res.json({ success: true, data });
  }

  static async remove(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await DadorService.remove(id);
    res.json({ success: true, data });
  }

  static async updateNotifications(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const { notifyDriverEnabled, notifyDadorEnabled } = req.body || {};
    const data = await prisma.dadorCarga.update({ where: { id }, data: { notifyDriverEnabled, notifyDadorEnabled } });
    res.json({ success: true, data: { id: data.id, notifyDriverEnabled: data.notifyDriverEnabled, notifyDadorEnabled: data.notifyDadorEnabled } });
  }
}


