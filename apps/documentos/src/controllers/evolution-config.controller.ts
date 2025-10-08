import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SystemConfigService } from '../services/system-config.service';

const KEY_SERVER = 'evolution.server';
const KEY_TOKEN = 'evolution.token';
const KEY_INSTANCE = 'evolution.instance';

export class EvolutionConfigController {
  static async getConfig(req: AuthRequest, res: Response) {
    const [server, token, instance] = await Promise.all([
      SystemConfigService.getConfig(KEY_SERVER),
      SystemConfigService.getConfig(KEY_TOKEN),
      SystemConfigService.getConfig(KEY_INSTANCE),
    ]);
    res.json({ success: true, data: { server: server || '', token: token || '', instance: instance || '' } });
  }

  static async updateConfig(req: AuthRequest, res: Response) {
    const { server, token, instance } = (req.body || {}) as { server?: string|null; token?: string|null; instance?: string|null };
    if (!server || !token || !instance) {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }
    await Promise.all([
      SystemConfigService.setConfig(KEY_SERVER, server),
      SystemConfigService.setConfig(KEY_TOKEN, token),
      SystemConfigService.setConfig(KEY_INSTANCE, instance),
    ]);
    res.json({ success: true });
  }

  static async testConnection(req: AuthRequest, res: Response) {
    // Intentar una verificación real contra el servidor Evolution
    const [serverRaw, token, instance] = await Promise.all([
      SystemConfigService.getConfig(KEY_SERVER),
      SystemConfigService.getConfig(KEY_TOKEN),
      SystemConfigService.getConfig(KEY_INSTANCE),
    ]);
    const okParams = Boolean(serverRaw && token && instance);
    if (!okParams) {
      return res.json({ success: false, message: 'Faltan parámetros' });
    }

    // Normalizar URL del servidor
    let server = String(serverRaw ?? '').trim();
    server = server.replace(/^https?:\/\/https?:\/\//, 'http://');
    server = server.replace('http//', '');
    if (!/^https?:\/\//i.test(server)) server = `http://${server}`;
    server = server.replace(/\/$/, '');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${String(token)}`,
      // Algunas instalaciones usan 'apikey'
      apikey: String(token),
      'Content-Type': 'application/json',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    let lastError: any = null;
    try {
      // 1) Intento principal: raíz debería devolver el JSON de bienvenida
      try {
        const url = `${server}/`;
        const resp = await fetch(url, { method: 'GET', headers, signal: controller.signal });
        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          if (data && typeof data === 'object' && 'message' in data) {
            clearTimeout(timeout);
            const v = (data as any).version ? ` v${(data as any).version}` : '';
            return res.json({ success: true, message: `Conexión OK${v}: ${(data as any).message}` });
          }
          clearTimeout(timeout);
          return res.json({ success: true, message: `Conexión OK (${resp.status})` });
        }
        lastError = `HTTP ${resp.status}`;
      } catch (e: any) {
        lastError = e?.message || e;
      }

      // 2) Fallback: probar otros endpoints comunes
      const candidates = [
        '/health',
        '/status',
        `/instances/${instance}`,
        `/instances/${instance}/status`,
        `/evolution/${instance}/status`,
        '/api/status',
      ];
      for (const path of candidates) {
        try {
          const url = `${server}${path}`;
          const resp = await fetch(url, { method: 'GET', headers, signal: controller.signal });
          if (resp.ok) {
            clearTimeout(timeout);
            return res.json({ success: true, message: `Conexión OK (${resp.status}) en ${path}` });
          }
          lastError = `HTTP ${resp.status}`;
        } catch (e: any) {
          lastError = e?.message || e;
        }
      }
      clearTimeout(timeout);
      return res.status(502).json({ success: false, message: `No se pudo contactar Evolution API (${String(lastError)})` });
    } catch (e: any) {
      clearTimeout(timeout);
      return res.status(500).json({ success: false, message: e?.message || 'Error desconocido' });
    }
  }
}


