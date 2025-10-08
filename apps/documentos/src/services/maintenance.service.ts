import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { SystemConfigService } from './system-config.service';

export class MaintenanceService {
  static async normalizeDocumentExpires(): Promise<void> {
    try {
      // Obtener tenants con documentos sin fecha
      const tenants = await db.getClient().document.findMany({
        where: { expiresAt: null },
        distinct: ['tenantEmpresaId'],
        select: { tenantEmpresaId: true },
      });
      let total = 0;
      for (const t of tenants) {
        // Leer configuración: por tenant o global. Fallback 100 años
        const tenantKey = `tenant:${t.tenantEmpresaId}:defaults.noExpiryHorizonYears`;
        const raw = (await SystemConfigService.getConfig(tenantKey)) ?? (await SystemConfigService.getConfig('defaults.noExpiryHorizonYears'));
        const years = Math.max(1, Math.min(500, Number(raw ?? 100))); // clamp 1..500
        const farFuture = new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000);
        const r = await db.getClient().document.updateMany({ where: { tenantEmpresaId: t.tenantEmpresaId, expiresAt: null }, data: { expiresAt: farFuture } });
        total += (r as any)?.count || 0;
      }
      if (total) AppLogger.info(`🗓️ Normalizadas fechas de vencimiento en ${ total } documentos (sin fecha)`);
    } catch (e) {
      AppLogger.error('💥 Error normalizando vencimientos:', e);
    }
  }
}


