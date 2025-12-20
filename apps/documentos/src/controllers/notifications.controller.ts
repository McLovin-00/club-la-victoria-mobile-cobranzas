import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SystemConfigService } from '../services/system-config.service';
import { NotificationService } from '../services/notification.service';

export class NotificationsController {
  static async getConfig(req: AuthRequest, res: Response) {
    const tenantPrefix = `tenant:${req.tenantId}:notifications.`;

    // Obtener configuraciones con fallback a globales
    const enabledVal = await SystemConfigService.getConfig(`${tenantPrefix}enabled`) ?? await SystemConfigService.getConfig('notifications.enabled');
    const windowsVal = await SystemConfigService.getConfig(`${tenantPrefix}windows`) ?? await SystemConfigService.getConfig('notifications.windows');
    const templatesVal = await SystemConfigService.getConfig(`${tenantPrefix}templates`) ?? await SystemConfigService.getConfig('notifications.templates');

    // Parsear valores
    const enabled = enabledVal === 'true';
    const windows = windowsVal ? JSON.parse(windowsVal as string) : null;
    const templates = templatesVal ? JSON.parse(templatesVal as string) : null;

    res.json({ success: true, data: { enabled, windows, templates } });
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


