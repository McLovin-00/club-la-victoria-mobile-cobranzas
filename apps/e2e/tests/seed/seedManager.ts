/**
 * Propósito: generar (o reutilizar) un dataset mínimo para E2E y exponerlo a los specs.
 * La idea es eliminar `test.skip` por falta de datos y mantener los tests concisos.
 */

import fs from 'fs';
import path from 'path';
import type { APIRequestContext } from '@playwright/test';
import { readStorageAuth } from './storageStateReader';
import type { SeedData } from './seed.types';
import { getServiceUrls } from '../../utils/env';

const seedFilePath = path.resolve(process.cwd(), '.auth/e2e-seed.json');

type SeedFile = { seed: SeedData; createdAt: string };

const tinyPngBase64 =
  // PNG 1x1 transparente
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9G7b0AAAAASUVORK5CYII=';

function isoInDays(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 864e5);
  return d.toISOString();
}

async function apiExpectOk(resp: any, what: string) {
  if (!resp.ok()) {
    const status = resp.status();
    const body = await resp.text().catch(() => '');
    throw new Error(`${what} failed: HTTP ${status}${body ? ` - ${body.slice(0, 300)}` : ''}`);
  }
}

async function getJson<T>(resp: any): Promise<T> {
  const json = await resp.json();
  return json as T;
}

async function detectDocumentosApi(request: APIRequestContext): Promise<void> {
  // Chequeo tolerante: distintos despliegues pueden exponer health de formas diferentes.
  const { documentosApiUrl } = getServiceUrls();
  const base = `${documentosApiUrl}/api/docs`;
  const candidates = [`${documentosApiUrl}/health`, `${base}/openapi.yaml`, `${base}/templates`];
  for (const url of candidates) {
    const resp = await request.get(url, { timeout: 8_000 }).catch(() => null);
    if (resp && resp.ok()) return;
  }
  throw new Error('No pude validar /api/docs (health/openapi/templates). ¿/api/docs está accesible en este entorno?');
}

async function detectPlatformApi(request: APIRequestContext): Promise<void> {
  const resp = await request.get('/api/health', { timeout: 8_000 }).catch(() => null);
  // En algunos despliegues puede no existir /api/health; no lo tratamos como hard-fail.
  if (resp && resp.status() >= 500) throw new Error('La API /api parece caída (5xx).');
}

function readSeedFromDisk(): SeedData | null {
  if (!fs.existsSync(seedFilePath)) return null;
  try {
    const raw = fs.readFileSync(seedFilePath, 'utf8');
    const parsed = JSON.parse(raw) as SeedFile;
    return parsed.seed;
  } catch {
    return null;
  }
}

function writeSeedToDisk(seed: SeedData) {
  const payload: SeedFile = { seed, createdAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(seedFilePath), { recursive: true });
  fs.writeFileSync(seedFilePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function getPendingFromSystem(request: APIRequestContext, headers: Record<string, string>, documentosBase: string): Promise<number | null> {
  const resp = await request.get(`${documentosBase}/approval/pending?page=1&limit=1`, { headers, timeout: 20_000 }).catch(() => null);
  if (!resp || !resp.ok()) return null;
  const json = (await resp.json()) as any;
  const arr = Array.isArray(json?.data) ? json.data : (Array.isArray(json?.data?.data) ? json.data.data : []);
  const first = arr?.[0];
  const id = Number(first?.id);
  return Number.isFinite(id) ? id : null;
}

async function getExistingEquipo(request: APIRequestContext, headers: Record<string, string>, documentosBase: string, dadorCargaId: number): Promise<any | null> {
  // 1) Intentar listar equipos del dador (rápido)
  const list = await request.get(`${documentosBase}/equipos?dadorCargaId=${dadorCargaId}`, { headers, timeout: 20_000 }).catch(() => null);
  if (!list || !list.ok()) return null;
  const listJson = (await list.json()) as any;
  const arr = Array.isArray(listJson?.data) ? listJson.data : (Array.isArray(listJson) ? listJson : []);
  const first = arr?.[0];
  const id = Number(first?.id);
  if (!Number.isFinite(id)) return null;

  // 2) Traer detalle para obtener IDs de entidades
  const detalle = await request.get(`${documentosBase}/equipos/${id}`, { headers, timeout: 20_000 }).catch(() => null);
  if (!detalle || !detalle.ok()) return null;
  const detalleJson = (await detalle.json()) as any;
  return detalleJson?.data ?? detalleJson;
}

export async function ensureSeedData(request: APIRequestContext): Promise<SeedData> {
  const cached = readSeedFromDisk();
  if (cached) return cached;

  await detectPlatformApi(request);
  await detectDocumentosApi(request);

  const admin = readStorageAuth('.auth/adminInterno.json');
  const transportista = readStorageAuth('.auth/transportista.json');
  const cliente = readStorageAuth('.auth/cliente.json');

  const tenantEmpresaId = admin.user.empresaId;
  const dadorCargaId = cliente.user.dadorCargaId ?? admin.user.dadorCargaId ?? 1;
  const clienteId = cliente.user.clienteId ?? null;
  if (!clienteId) throw new Error('No se pudo determinar clienteId desde .auth/cliente.json.');

  const commonHeadersAdmin = {
    authorization: `Bearer ${admin.token}`,
    'x-tenant-id': String(tenantEmpresaId),
  };
  const commonHeadersTransportista = {
    authorization: `Bearer ${transportista.token}`,
    'x-tenant-id': String(transportista.user.empresaId),
  };
  const { documentosApiUrl } = getServiceUrls();
  const documentosBase = `${documentosApiUrl}/api/docs`;

  // 0) Reusar cosas ya existentes si están disponibles (evita cargar todo):
  const existingEquipo = await getExistingEquipo(request, commonHeadersAdmin, documentosBase, dadorCargaId);
  const existingPendingId = await getPendingFromSystem(request, commonHeadersAdmin, documentosBase);

  // 1) Crear equipo completo (idempotencia simple: reintento con DNI/Patente distintos si hay duplicado)
  let equipoResp: any = null;
  let choferDni = '';
  let camionPatente = '';
  const baseDni = String(Math.floor(10_000_000 + Math.random() * 80_000_000));
  const basePlate = `E2E${Math.floor(100 + Math.random() * 900)}`;

  let equipoId: number;
  let empresaTransportistaId: number;
  let choferId: number;
  let camionId: number;
  let acopladoId: number | null;

  if (existingEquipo?.id && existingEquipo?.driverId && existingEquipo?.truckId && existingEquipo?.empresaTransportistaId) {
    // Reusar equipo existente
    equipoId = Number(existingEquipo.id);
    empresaTransportistaId = Number(existingEquipo.empresaTransportistaId);
    choferId = Number(existingEquipo.driverId);
    camionId = Number(existingEquipo.truckId);
    acopladoId = existingEquipo.trailerId ? Number(existingEquipo.trailerId) : null;
    choferDni = String(existingEquipo.driverDniNorm || '').trim();
    camionPatente = String(existingEquipo.truckPlateNorm || '').trim();
  } else {
    for (let i = 0; i < 3; i++) {
      choferDni = `${baseDni}${i}`.slice(0, 8);
      camionPatente = `${basePlate}${i}`.slice(0, 7);
      const body = {
        dadorCargaId,
        clienteIds: [clienteId],
        empresaTransportistaCuit: `30${Math.floor(100000000 + Math.random() * 899999999)}`.slice(0, 11),
        empresaTransportistaNombre: `E2E Transportista ${Date.now()}`,
        choferDni,
        choferNombre: 'E2E',
        choferApellido: 'Chofer',
        camionPatente,
        camionMarca: 'E2E',
        camionModelo: 'E2E',
        acopladoPatente: null,
      };
      const resp = await request.post(`${documentosBase}/equipos/alta-completa`, { data: body, headers: commonHeadersAdmin, timeout: 20_000 });
      if (resp.ok()) {
        equipoResp = await resp.json();
        break;
      }
      const txt = await resp.text().catch(() => '');
      if (resp.status() === 409) continue;
      throw new Error(`No se pudo crear equipo (alta-completa). HTTP ${resp.status()} - ${txt.slice(0, 300)}`);
    }
    if (!equipoResp?.data) throw new Error('Respuesta inesperada creando equipo (sin data).');
    equipoId = Number(equipoResp.data.id);
    empresaTransportistaId = Number(equipoResp.data.empresaTransportistaId);
    choferId = Number(equipoResp.data.driverId);
    camionId = Number(equipoResp.data.truckId);
    acopladoId = equipoResp.data.trailerId ? Number(equipoResp.data.trailerId) : null;
  }

  // 2) Obtener templates (best-effort). Solo se usan si necesitamos hacer uploads.
  let templateIds: SeedData['templateIds'] = {};
  try {
    const tplResp = await request.get(`${documentosBase}/templates`, { headers: commonHeadersAdmin, timeout: 20_000 });
    await apiExpectOk(tplResp, 'GET /api/docs/templates');
    const templates = (await tplResp.json()) as any;
    const list: Array<{ id: number; entityType: string }> = Array.isArray(templates) ? templates : (templates?.data ?? []);
    const pick = (entityType: string) => list.find((t) => String(t.entityType).toUpperCase() === entityType)?.id;
    templateIds = {
      EMPRESA_TRANSPORTISTA: pick('EMPRESA_TRANSPORTISTA'),
      CHOFER: pick('CHOFER'),
      CAMION: pick('CAMION'),
      ACOPLADO: pick('ACOPLADO'),
    };
  } catch {
    templateIds = {};
  }

  // 3) Pending: si ya hay pendientes en el sistema, reusamos uno.
  // Si NO hay pendientes, intentamos crear uno por upload (best-effort). Si MinIO falla, seguimos sin pending.
  const initialDocumentIds: number[] = [];
  let pendingRenewalDocumentId: number | undefined = undefined;
  if (existingPendingId) {
    pendingRenewalDocumentId = existingPendingId;
  } else if (templateIds.CAMION) {
    try {
      // Inicial (ADMIN_INTERNO puede hacer initial upload)
      const init = await request.post(`${documentosBase}/documents/upload`, {
        headers: commonHeadersAdmin,
        multipart: {
          templateId: String(templateIds.CAMION),
          dadorCargaId: String(dadorCargaId),
          entityType: 'CAMION',
          entityId: String(camionId),
          expiresAt: isoInDays(365),
          source: 'file',
          document: {
            name: 'e2e.png',
            mimeType: 'image/png',
            buffer: Buffer.from(tinyPngBase64, 'base64'),
          },
        },
        timeout: 60_000,
      });
      await apiExpectOk(init, 'POST /api/docs/documents/upload (initial camion)');
      const initJson = await getJson<any>(init);
      const initId = Number(initJson?.data?.id ?? initJson?.id);
      if (Number.isFinite(initId)) initialDocumentIds.push(initId);

      // Renovación (TRANSPORTISTA) → debería quedar pendiente
      const renewal = await request.post(`${documentosBase}/documents/upload`, {
        headers: commonHeadersTransportista,
        multipart: {
          templateId: String(templateIds.CAMION),
          dadorCargaId: String(dadorCargaId),
          entityType: 'CAMION',
          entityId: String(camionId),
          confirmNewVersion: 'true',
          expiresAt: isoInDays(200),
          source: 'file',
          document: {
            name: 'e2e-renovacion.png',
            mimeType: 'image/png',
            buffer: Buffer.from(tinyPngBase64, 'base64'),
          },
        },
        timeout: 60_000,
      });
      await apiExpectOk(renewal, 'POST /api/docs/documents/upload (renewal camion)');
      const renewalJson = await getJson<any>(renewal);
      pendingRenewalDocumentId = Number(renewalJson?.data?.id ?? renewalJson?.id);
    } catch {
      // MinIO u otro problema → no forzamos pending.
      pendingRenewalDocumentId = undefined;
    }
  }

  const seed: SeedData = {
    tenantEmpresaId,
    dadorCargaId,
    clienteId,
    equipoId,
    empresaTransportistaId,
    choferId,
    camionId,
    acopladoId,
    choferDni,
    camionPatente,
    templateIds,
    initialDocumentIds,
    pendingRenewalDocumentId,
  };

  writeSeedToDisk(seed);
  return seed;
}


