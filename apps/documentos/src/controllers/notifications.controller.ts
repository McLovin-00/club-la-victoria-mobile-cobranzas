import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SystemConfigService } from '../services/system-config.service';
import { NotificationService } from '../services/notification.service';

export class NotificationsController {
  static async getConfig(req: AuthRequest, res: Response) {
    const tenantPrefix = `tenant:${req.tenantId}:notifications.`;
    const enabled = await (SystemConfigService.getConfig(`${tenantPrefix}enabled`) ?? SystemConfigService.getConfig('notifications.enabled'));
    const windows = await (SystemConfigService.getConfig(`${tenantPrefix}windows`) ?? SystemConfigService.getConfig('notifications.windows'));
    const templates = await (SystemConfigService.getConfig(`${tenantPrefix}templates`) ?? SystemConfigService.getConfig('notifications.templates'));
    res.json({ success: true, data: { enabled: (await enabled) === 'true', windows: (await windows) ? JSON.parse((await windows) as string) : null, templates: (await templates) ? JSON.parse((await templates) as string) : null } });
  }

  static async updateConfig(req: AuthRequest, res: Response) {
    const { enabled, windows, templates } = req.body || {};
    const tenantPrefix = `tenant:${req.tenantId}:notifications.`;
    if (enabled !== undefined) await SystemConfigService.setConfig(`${tenantPrefix}enabled`, String(Boolean(enabled)));
    if (windows !== undefined) await SystemConfigService.setConfig(`${tenantPrefix}windows`, JSON.stringify(windows));
    if (templates !== undefined) await SystemConfigService.setConfig(`${tenantPrefix}templates`, JSON.stringify(templates));
    res.json({ success: true });
  }

  static async test(req: AuthRequest, res: Response) {
    const { msisdn, text } = req.body || {};
    if (!msisdn) return res.status(400).json({ success: false, message: 'msisdn requerido' });
    const msg = text || 'Mensaje de prueba';
    await NotificationService.send(msisdn, msg, { tenantId: req.tenantId!, audience: 'CHOFER', type: 'aviso', templateKey: 'test' });
    res.json({ success: true });
  }

  static async runExpirations(req: AuthRequest, res: Response) {
    const count = await NotificationService.checkExpirations(req.tenantId!);
    res.json({ success: true, sent: count });
  }

  static async runMissing(req: AuthRequest, res: Response) {
    const count = await NotificationService.checkMissingDocs(req.tenantId!);
    res.json({ success: true, sent: count });
  }
}


