import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SystemConfigService } from '../services/system-config.service';

const KEY_SERVER = 'evolution.server';
const KEY_TOKEN = 'evolution.token';
const KEY_INSTANCE = 'evolution.instance';

// Helper: normalizar URL del servidor
function normalizeServerUrl(raw: string): string {
  let server = raw.trim();
  server = server.replace(/^https?:\/\/https?:\/\//, 'http://');
  server = server.replace('http//', '');
  if (!/^https?:\/\//i.test(server)) server = `http://${server}`;
  return server.replace(/\/$/, '');
}

// Helper: probar un endpoint específico
async function tryEndpoint(url: string, headers: Record<string, string>, signal: AbortSignal): Promise<{ ok: boolean; status?: number; message?: string; version?: string }> {
  try {
    const resp = await fetch(url, { method: 'GET', headers, signal });
    if (!resp.ok) return { ok: false, status: resp.status };
    
    const data = await resp.json().catch(() => ({})) as Record<string, unknown>;
    if (data && typeof data === 'object' && 'message' in data) {
      return { ok: true, message: data.message as string, version: data.version as string | undefined };
    }
    return { ok: true, status: resp.status };
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}

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
    const [serverRaw, token, instance] = await Promise.all([
      SystemConfigService.getConfig(KEY_SERVER),
      SystemConfigService.getConfig(KEY_TOKEN),
      SystemConfigService.getConfig(KEY_INSTANCE),
    ]);
    
    if (!serverRaw || !token || !instance) {
      return res.json({ success: false, message: 'Faltan parámetros' });
    }

    const server = normalizeServerUrl(String(serverRaw));
    const headers: Record<string, string> = {
      Authorization: `Bearer ${String(token)}`,
      apikey: String(token),
      'Content-Type': 'application/json',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    try {
      // 1) Intento principal: raíz
      const mainResult = await tryEndpoint(`${server}/`, headers, controller.signal);
      if (mainResult.ok) {
        clearTimeout(timeout);
        const v = mainResult.version ? ` v${mainResult.version}` : '';
        const msg = mainResult.message ? `Conexión OK${v}: ${mainResult.message}` : `Conexión OK (${mainResult.status})`;
        return res.json({ success: true, message: msg });
      }

      // 2) Fallback: endpoints comunes
      const candidates = ['/health', '/status', `/instances/${instance}`, `/instances/${instance}/status`, `/evolution/${instance}/status`, '/api/status'];
      
      for (const path of candidates) {
        const result = await tryEndpoint(`${server}${path}`, headers, controller.signal);
        if (result.ok) {
          clearTimeout(timeout);
          return res.json({ success: true, message: `Conexión OK (${result.status}) en ${path}` });
        }
      }
      
      clearTimeout(timeout);
      return res.status(502).json({ success: false, message: `No se pudo contactar Evolution API` });
    } catch (e: any) {
      clearTimeout(timeout);
      return res.status(500).json({ success: false, message: e?.message || 'Error desconocido' });
    }
  }
}


