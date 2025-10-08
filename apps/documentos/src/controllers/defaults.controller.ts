import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SystemConfigService } from '../services/system-config.service';

export class DefaultsController {
  static async get(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const defaultClienteId = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.defaultClienteId`);
    const defaultDadorId = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.defaultDadorId`);
    const delay = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.missingCheckDelayMinutes`);
    const noExpiryYears = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.noExpiryHorizonYears`);
    res.json({ success: true, data: { defaultClienteId: defaultClienteId ? Number(defaultClienteId) : null, defaultDadorId: defaultDadorId ? Number(defaultDadorId) : null, missingCheckDelayMinutes: delay !== null ? Number(delay) : null, noExpiryHorizonYears: noExpiryYears !== null ? Number(noExpiryYears) : null } });
  }

  static async update(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    if (req.body.defaultClienteId !== undefined) {
      await SystemConfigService.setConfig(`tenant:${tenantId}:defaults.defaultClienteId`, String(req.body.defaultClienteId || ''));
    }
    if (req.body.defaultDadorId !== undefined) {
      await SystemConfigService.setConfig(`tenant:${tenantId}:defaults.defaultDadorId`, String(req.body.defaultDadorId || ''));
    }
    if (req.body.missingCheckDelayMinutes !== undefined) {
      await SystemConfigService.setConfig(`tenant:${tenantId}:defaults.missingCheckDelayMinutes`, String(req.body.missingCheckDelayMinutes ?? ''));
    }
    if (req.body.noExpiryHorizonYears !== undefined) {
      await SystemConfigService.setConfig(`tenant:${tenantId}:defaults.noExpiryHorizonYears`, String(req.body.noExpiryHorizonYears ?? ''));
    }
    res.json({ success: true });
  }
}


