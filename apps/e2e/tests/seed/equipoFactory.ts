/**
 * Propósito: crear equipos “descartables” para tests destructivos (toggle, delete, etc.).
 * Evita que un test rompa el dataset compartido.
 */

import type { APIRequestContext } from '@playwright/test';
import { readStorageAuth } from './storageStateReader';
import { getServiceUrls } from '../../utils/env';

const tinyPngBase64 =
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

export type DisposableEquipo = {
  equipoId: number;
  choferDni: string;
  camionPatente: string;
  cleanup: () => Promise<void>;
};

/**
 * Crea un equipo completo + lo asocia al cliente del usuario CLIENTE del entorno.
 * Nota: usa ADMIN_INTERNO para la creación (máximos permisos).
 */
export async function createDisposableEquipo(request: APIRequestContext): Promise<DisposableEquipo> {
  const admin = readStorageAuth('.auth/adminInterno.json');
  const cliente = readStorageAuth('.auth/cliente.json');

  const tenantEmpresaId = admin.user.empresaId;
  const dadorCargaId = cliente.user.dadorCargaId ?? admin.user.dadorCargaId ?? 1;
  const clienteId = cliente.user.clienteId ?? null;
  if (!clienteId) throw new Error('No se pudo determinar clienteId desde .auth/cliente.json.');

  const headersAdmin = {
    authorization: `Bearer ${admin.token}`,
    'x-tenant-id': String(tenantEmpresaId),
  };
  const { documentosApiUrl } = getServiceUrls();
  const documentosBase = `${documentosApiUrl}/api/docs`;

  const baseDni = String(Math.floor(10_000_000 + Math.random() * 80_000_000));
  const basePlate = `E2E${Math.floor(100 + Math.random() * 900)}`;
  const choferDni = baseDni.slice(0, 8);
  const camionPatente = `${basePlate}${Math.floor(Math.random() * 9)}`.slice(0, 7);

  const resp = await request.post(`${documentosBase}/equipos/alta-completa`, {
    data: {
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
    },
    headers: headersAdmin,
    timeout: 20_000,
  });
  await apiExpectOk(resp, 'POST /api/docs/equipos/alta-completa');
  const json = (await resp.json()) as any;
  const equipoId = Number(json?.data?.id);
  if (!equipoId) throw new Error('Respuesta inesperada al crear equipo (sin id).');

  const cleanup = async () => {
    // Preferimos rollback: limpia equipo y entidades creadas en la operación.
    const rb = await request.post(`${documentosBase}/equipos/${equipoId}/rollback`, {
      data: { deleteChofer: true, deleteCamion: true, deleteAcoplado: true, deleteEmpresa: true },
      headers: headersAdmin,
      timeout: 20_000,
    });
    // Si rollback falla, intentamos delete simple.
    if (!rb.ok()) {
      await request.delete(`${documentosBase}/equipos/${equipoId}`, { headers: headersAdmin, timeout: 20_000 }).catch(() => {});
    }
  };

  return { equipoId, choferDni, camionPatente, cleanup };
}

/**
 * Sube un documento inicial (ADMIN_INTERNO) y luego una renovación (TRANSPORTISTA) para generar un pendiente.
 * Útil para pruebas de cola de aprobación.
 */
export async function createPendingApprovalDoc(request: APIRequestContext, params: { templateId: number; entityType: string; entityId: number; dadorCargaId?: number }) {
  const admin = readStorageAuth('.auth/adminInterno.json');
  const transportista = readStorageAuth('.auth/transportista.json');

  const cliente = readStorageAuth('.auth/cliente.json');
  const dadorCargaId = params.dadorCargaId ?? (cliente.user.dadorCargaId ?? admin.user.dadorCargaId ?? 1);
  const { documentosApiUrl } = getServiceUrls();
  const documentosBase = `${documentosApiUrl}/api/docs`;

  const headersAdmin = {
    authorization: `Bearer ${admin.token}`,
    'x-tenant-id': String(admin.user.empresaId),
  };
  const headersTransportista = {
    authorization: `Bearer ${transportista.token}`,
    'x-tenant-id': String(transportista.user.empresaId),
  };

  // Inicial
  const init = await request.post(`${documentosBase}/documents/upload`, {
    headers: headersAdmin,
    multipart: {
      templateId: String(params.templateId),
      dadorCargaId: String(dadorCargaId),
      entityType: params.entityType,
      entityId: String(params.entityId),
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
  await apiExpectOk(init, 'POST /api/docs/documents/upload (initial)');

  // Renovación (pendiente)
  const renewal = await request.post(`${documentosBase}/documents/upload`, {
    headers: headersTransportista,
    multipart: {
      templateId: String(params.templateId),
      dadorCargaId: String(dadorCargaId),
      entityType: params.entityType,
      entityId: String(params.entityId),
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
  await apiExpectOk(renewal, 'POST /api/docs/documents/upload (renewal)');

  const renewalJson = (await renewal.json()) as any;
  return Number(renewalJson?.data?.id ?? renewalJson?.id);
}


