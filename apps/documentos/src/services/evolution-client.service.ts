import { SystemConfigService } from './system-config.service';
import { AppLogger } from '../config/logger';

export class EvolutionClient {
  private static normalizeServerUrl(raw: string): string {
    let server = String(raw || '').trim();
    server = server.replace(/^https?:\/\/https?:\/\//, 'http://');
    server = server.replace('http//', '');
    if (!/^https?:\/\//i.test(server)) server = `http://${server}`;
    return server.replace(/\/$/, '');
  }

  static async sendText(msisdn: string, text: string): Promise<{ ok: boolean; status?: number; message?: string }> {
    const [serverRaw, token, instance] = await Promise.all([
      SystemConfigService.getConfig('evolution.server'),
      SystemConfigService.getConfig('evolution.token'),
      SystemConfigService.getConfig('evolution.instance'),
    ]);
    const server = EvolutionClient.normalizeServerUrl(serverRaw || '');
    if (!server || !token || !instance) {
      AppLogger.warn('⚠️ EvolutionClient sin configuración completa');
      return { ok: false, message: 'Configuración incompleta' };
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      apikey: token,
      'Content-Type': 'application/json',
    };
    const body = { number: msisdn, text } as any;
    const candidates = [
      `/message/sendText/${instance}`,
      `/messages/sendText/${instance}`,
      `/send-text/${instance}`,
    ];
    let lastStatus: number | undefined;
    for (const path of candidates) {
      try {
        const resp = await fetch(`${server}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
        lastStatus = resp.status;
        if (resp.ok) return { ok: true, status: resp.status };
      } catch (e: any) {
        lastStatus = undefined;
        AppLogger.warn('⚠️ EvolutionClient intento fallido', { path, error: e?.message });
      }
    }
    return { ok: false, status: lastStatus, message: 'No se pudo enviar mensaje' };
  }
}


