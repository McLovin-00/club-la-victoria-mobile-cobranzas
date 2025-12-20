import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SystemConfigService } from '../services/system-config.service';

export class DefaultsController {
  static async get(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const prefix = `tenant:${tenantId}:defaults.`;

    const [defaultClienteId, defaultDadorId, delay, noExpiryYears] = await Promise.all([
      SystemConfigService.getConfig(`${prefix}defaultClienteId`),
      SystemConfigService.getConfig(`${prefix}defaultDadorId`),
      SystemConfigService.getConfig(`${prefix}missingCheckDelayMinutes`),
      SystemConfigService.getConfig(`${prefix}noExpiryHorizonYears`),
    ]);

    // Helper para parsear número o null
    const parseNumOrNull = (val: string | null): number | null => (val !== null ? Number(val) : null);

    res.json({
      success: true,
      data: {
        defaultClienteId: parseNumOrNull(defaultClienteId),
        defaultDadorId: parseNumOrNull(defaultDadorId),
        missingCheckDelayMinutes: parseNumOrNull(delay),
        noExpiryHorizonYears: parseNumOrNull(noExpiryYears),
      },
    });
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


