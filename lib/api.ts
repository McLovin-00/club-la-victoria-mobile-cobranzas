import Constants from "expo-constants";
import type { GrupoFamiliar, GrupoFamiliarDetalle, SocioConGrupo, CobroGrupalPayload, PaginatedResponse } from "./types";

export interface CobradorActivo {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface BindingData {
  installationId: string;
  cobradorId: number;
  cobradorNombre?: string;
}

function normalizeApiBaseUrl(baseUrl: string): string {
  const sanitized = baseUrl.replace(/\/+$/, "");

  if (/\/api\/v\d+$/i.test(sanitized)) {
    return sanitized;
  }

  if (/\/api$/i.test(sanitized)) {
    return `${sanitized}/v1`;
  }

  return `${sanitized}/api/v1`;
}

// URL de la API hardcodeada (no usar .env)
const API_BASE_URL = normalizeApiBaseUrl("https://www.api.clublavictoria.com.ar/api/v1");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      ...options,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(
      `Network request failed (${API_BASE_URL}${path}). Verifica EXPO_PUBLIC_API_URL y que el backend escuche en 0.0.0.0 (no solo localhost). Detalle: ${detail}`
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export const mobileApi = {
  getCobradoresActivos: () => request<CobradorActivo[]>("/cobradores/activos"),
  vincularDispositivo: (payload: { installationId: string; cobradorId: number }) =>
    request("/cobradores/vinculacion-inicial", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  buscarSocios: (query: string, offset: number = 0, limit: number = 50) =>
    request<PaginatedResponse<SocioConGrupo>>(
      `/cobradores/mobile/socios?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`,
    ),
  cuotasPendientes: (socioId: number) =>
    request<Array<{ id: number; periodo: string; monto: number }>>(
      `/cobradores/mobile/socios/${socioId}/cuotas-pendientes`,
    ),
  registrarOperacionCobro: (payload: unknown) =>
    request("/cobros/pagos/operacion", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  registrarCobroGrupal: (payload: CobroGrupalPayload) =>
    request("/cobros/pagos/operacion-grupal", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  misCobranzas: (cobradorId: number, desdeIso: string, hastaIso: string) =>
    request<{
      totalCobrado: number;
      operaciones: Array<{
        id: number;
        total: number;
        fechaHoraServidor: string;
        socio?: {
          id: number;
          nombre: string;
          apellido: string;
        };
        metodoPago?: {
          id: number;
          nombre: string;
        };
        lineas: Array<{
          id: number;
          tipoLinea: 'CUOTA' | 'CONCEPTO';
          cuotaId?: number;
          cuota?: {
            id: number;
            periodo: string;
          };
          concepto?: string;
          descripcion?: string;
          monto: number;
        }>;
      }>;
    }>(
      `/cobradores/${cobradorId}/mis-cobranzas?desde=${encodeURIComponent(desdeIso)}&hasta=${encodeURIComponent(hastaIso)}`,
    ),
  // Grupos Familiares
  getGruposFamiliares: () =>
    request<GrupoFamiliar[]>("/cobradores/mobile/grupos-familiares"),
  getGrupoFamiliar: (grupoId: number) =>
    request<GrupoFamiliarDetalle>(`/cobradores/mobile/grupos-familiares/${grupoId}`),
};
