import { Response } from 'express';
import { ClientsService } from '../services/clients.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ClientsController {
  static async list(req: AuthRequest, res: Response) {
    const activo = typeof req.query.activo !== 'undefined' ? req.query.activo === 'true' : undefined;
    const data = await ClientsService.list(req.tenantId!, activo);
    const { SystemConfigService } = await import('../services/system-config.service');
    const def = await SystemConfigService.getConfig(`tenant:${req.tenantId!}:defaults.defaultClienteId`);
    res.json({ success: true, data, defaults: { defaultClienteId: def ? Number(def) : null } });
  }

  static async create(req: AuthRequest, res: Response) {
    const data = await ClientsService.create({ ...req.body, tenantEmpresaId: req.tenantId! });
    res.status(201).json({ success: true, data });
  }

  static async update(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await ClientsService.update(req.tenantId!, id, req.body);
    res.json({ success: true, data });
  }

  static async remove(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await ClientsService.remove(req.tenantId!, id);
    res.json({ success: true, data });
  }

  static async listRequirements(req: AuthRequest, res: Response) {
    const clienteId = Number(req.params.clienteId);
    const data = await ClientsService.listRequirements(req.tenantId!, clienteId);
    res.json({ success: true, data });
  }

  static async addRequirement(req: AuthRequest, res: Response) {
    const clienteId = Number(req.params.clienteId);
    const data = await ClientsService.addRequirement(req.tenantId!, clienteId, req.body);
    res.status(201).json({ success: true, data });
  }

  static async removeRequirement(req: AuthRequest, res: Response) {
    const clienteId = Number(req.params.clienteId);
    const requirementId = Number(req.params.requirementId);
    await ClientsService.removeRequirement(req.tenantId!, clienteId, requirementId);
    res.json({ success: true });
  }
}


