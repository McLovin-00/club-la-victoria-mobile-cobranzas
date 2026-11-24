import Constants from "expo-constants";
import type { GrupoFamiliar, GrupoFamiliarDetalle, SocioConGrupo, CobroGrupalPayload, PaginatedResponse } from "./types";
import type { Rendicion } from "./rendicion-pdf";

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

export interface GenerarCuotaMobileResult {
  creadas: number;
  omitidas: number;
  advertenciasMorosidad: number;
  inhabilitados: number;
  desactivados: number;
  advertencias: string[];
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

const PRODUCTION_API_URL = "https://www.api.clublavictoria.com.ar/api/v1";

function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return normalizeApiBaseUrl(configured);
  }

  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    const isLocalHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^192\.168\.\d+\.\d+$/.test(host) ||
      /^10\.\d+\.\d+\.\d+$/.test(host);
    if (isLocalHost) {
      return normalizeApiBaseUrl(`http://${host}:3001/api/v1`);
    }
  }

  return normalizeApiBaseUrl(PRODUCTION_API_URL);
}

const API_BASE_URL = resolveApiBaseUrl();

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
  buscarSocios: (query: string, offset?: number, limit?: number) => {
    const pagination =
      offset !== undefined && limit !== undefined ? `&offset=${offset}&limit=${limit}` : "";
    return request<PaginatedResponse<SocioConGrupo>>(
      `/cobradores/mobile/socios?q=${encodeURIComponent(query)}${pagination}`,
    );
  },
  obtenerSocioMobile: (socioId: number) =>
    request<SocioConGrupo>(`/cobradores/mobile/socios/${socioId}`),
  cuotasPendientes: (socioId: number) =>
    request<Array<{ id: number; periodo: string; monto: number }>>(
      `/cobradores/mobile/socios/${socioId}/cuotas-pendientes`,
    ),
  obtenerPeriodosCobroMobile: (socioId: number) =>
    request<{ montoMensual: number | null; periodosPagados: string[] }>(
      `/cobros/mobile/socios/${socioId}/periodos`,
    ),
  registrarCobroPeriodosMobile: (socioId: number, payload: unknown) =>
    request(`/cobros/mobile/socios/${socioId}/cobro-periodos`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).catch((error: unknown) => {
      if (error instanceof Error) {
        let body: unknown;
        try {
          body = JSON.parse(error.message);
        } catch {
          throw error;
        }
        if (typeof body === "object" && body !== null && "message" in body &&
            typeof body.message === "string") {
          throw new Error(body.message);
        }
      }
      throw error;
    }),
  generarCuotaMobile: (socioId: number, periodo: string) =>
    request<GenerarCuotaMobileResult>(
      `/cobros/mobile/socios/${socioId}/cuotas`,
      {
        method: "POST",
        body: JSON.stringify({ periodo }),
      },
    ),
  registrarOperacionCobro: (payload: unknown) =>
    request("/cobros/pagos/operacion", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  actualizarOperacionCobro: (operacionId: number, payload: unknown) =>
    request(`/cobros/pagos/operacion/${operacionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  registrarCobroGrupal: (payload: CobroGrupalPayload) =>
    request("/cobros/pagos/operacion-grupal", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  misCobranzas: async (
    cobradorId: number,
    desdeIso: string,
    hastaIso: string,
    opciones?: { q?: string; offset?: number; limit?: number },
  ) => {
    type MisCobranzasOperacion = {
      id: number;
      total: number;
      fechaHoraServidor: string;
      socio?: {
        id: number;
        nombre: string;
        apellido: string;
        dni?: string;
      };
      metodoPago?: {
        id: number;
        nombre: string;
      };
      lineas: Array<{
        id: number;
        tipoLinea: "CUOTA" | "CONCEPTO";
        cuotaId?: number;
        cuota?: {
          id: number;
          periodo: string;
        };
        concepto?: string;
        descripcion?: string;
        monto: number;
      }>;
    };

    type MisCobranzasResponse = {
      totalCobrado: number;
      total?: number;
      totalPeriodo?: number;
      offset?: number;
      limit?: number;
      hasMore?: boolean;
      operaciones: MisCobranzasOperacion[];
    };

    const params = new URLSearchParams({
      desde: desdeIso,
      hasta: hastaIso,
    });
    const queryText = opciones?.q?.trim();
    if (queryText) {
      params.set("q", queryText);
    }
    if (opciones?.offset !== undefined) {
      params.set("offset", String(opciones.offset));
    }
    if (opciones?.limit !== undefined) {
      params.set("limit", String(opciones.limit));
    }

    const tieneExtras =
      Boolean(queryText) || opciones?.offset !== undefined || opciones?.limit !== undefined;

    try {
      return await request<MisCobranzasResponse>(
        `/cobradores/${cobradorId}/mis-cobranzas?${params.toString()}`,
      );
    } catch (error) {
      // Compatibilidad retroactiva si el backend aún no fue actualizado con q/offset/limit
      if (
        tieneExtras &&
        error instanceof Error &&
        /should not exist/i.test(error.message)
      ) {
        const legacy = await request<MisCobranzasResponse>(
          `/cobradores/${cobradorId}/mis-cobranzas?desde=${encodeURIComponent(desdeIso)}&hasta=${encodeURIComponent(hastaIso)}`,
        );
        const normalizar = (s: string) =>
          s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const palabras = queryText ? normalizar(queryText).split(/\s+/).filter(Boolean) : [];
        const filtradas =
          palabras.length === 0
            ? legacy.operaciones
            : legacy.operaciones.filter((op) => {
                const textoOp = normalizar(
                  [
                    op.socio?.nombre,
                    op.socio?.apellido,
                    op.socio?.dni,
                    op.metodoPago?.nombre,
                    String(op.id),
                    `#${op.id}`,
                  ]
                    .filter(Boolean)
                    .join(" "),
                );
                return palabras.every((p) => textoOp.includes(p));
              });
        const offset = Math.max(0, opciones?.offset ?? 0);
        const limit = opciones?.limit ?? filtradas.length;
        const pagina =
          opciones?.limit !== undefined ? filtradas.slice(offset, offset + limit) : filtradas;
        const totalCobrado = Math.round(
          filtradas.reduce((acc, op) => acc + Number(op.total || 0), 0),
        );
        return {
          totalCobrado,
          total: filtradas.length,
          totalPeriodo: legacy.operaciones.length,
          offset,
          limit,
          hasMore: offset + pagina.length < filtradas.length,
          operaciones: pagina,
        };
      }
      throw error;
    }
  },
  rendicion: (installationId: string, consulta: { periodo?: string; desde?: string; hasta?: string }) => {
    const params = new URLSearchParams({ installationId });
    for (const [clave, valor] of Object.entries(consulta)) {
      if (valor) params.set(clave, valor);
    }
    return request<Rendicion>(`/cobradores/mobile/rendicion?${params}`).catch((error: unknown) => {
      if (!(error instanceof Error)) throw error;
      try {
        const detalle = JSON.parse(error.message) as { message?: unknown };
        if (typeof detalle.message === "string") throw new Error(detalle.message);
      } catch (parseError) {
        if (!(parseError instanceof SyntaxError)) throw parseError;
      }
      throw error;
    });
  },
  // Grupos Familiares
  getGruposFamiliares: () =>
    request<GrupoFamiliar[]>("/cobradores/mobile/grupos-familiares"),
  getGrupoFamiliar: (grupoId: number) =>
    request<GrupoFamiliarDetalle>(`/cobradores/mobile/grupos-familiares/${grupoId}`),
};
