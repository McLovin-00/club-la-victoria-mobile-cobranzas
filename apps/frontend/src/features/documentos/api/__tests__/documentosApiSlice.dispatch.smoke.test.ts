/**
 * Propósito: Smoke test que DISPARA endpoints de RTK Query para ejecutar más líneas del módulo `documentosApiSlice`.
 * Esto ayuda a subir coverage real del archivo (no solo importarlo).
 */

import { configureStore } from '@reduxjs/toolkit';
import { documentosApiSlice } from '../documentosApiSlice';

type AuthState = { token?: string; user?: { empresaId?: number } };

// Polyfill mínimo para RTK Query (fetchBaseQuery) en JSDOM cuando Request no está disponible.
if (typeof (globalThis as any).Request === 'undefined') {
  (globalThis as any).Request = class RequestPolyfill {
    public input: any;
    public init: any;
    constructor(input: any, init?: any) {
      this.input = input;
      this.init = init;
    }
  };
}

function authReducer(state: AuthState = { token: 't', user: { empresaId: 1 } }) {
  return state;
}

function mockOkJson(payload: unknown) {
  const body = JSON.stringify(payload);
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    clone() {
      return this;
    },
    async json() {
      return payload;
    },
    async text() {
      return body;
    },
  } as unknown as Response;
}

describe('documentosApiSlice (dispatch smoke)', () => {
  it('ejecuta prepareHeaders + transformResponse al iniciar queries', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch' as unknown as 'fetch')
      .mockResolvedValue(mockOkJson({ data: [] }));

    const store = configureStore({
      reducer: {
        [documentosApiSlice.reducerPath]: documentosApiSlice.reducer,
        auth: authReducer as any,
      },
      middleware: (gDM) => gDM().concat(documentosApiSlice.middleware),
      preloadedState: { auth: { token: 'mock-token-123', user: { empresaId: 1 } } } as any,
    });

    const r1 = await store.dispatch(documentosApiSlice.endpoints.getEquipoCompliance.initiate({ id: 1 }));
    const r2 = await store.dispatch(documentosApiSlice.endpoints.getClientsZipJob.initiate({ jobId: 'abc' }));

    expect(fetchSpy).toHaveBeenCalled();
    
    // Verificamos que se aplicaron headers desde prepareHeaders
    // RTK Query puede pasar headers como segundo argumento (init) o dentro de un Request object
    const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
    const firstArg = lastCall?.[0];
    const secondArg = lastCall?.[1] as RequestInit | undefined;
    
    // Extraer headers: pueden estar en secondArg.headers o en firstArg.headers (si es Request)
    let headers: Headers | Record<string, string> | undefined;
    if (secondArg?.headers) {
      headers = secondArg.headers as Headers | Record<string, string>;
    } else if (firstArg && typeof firstArg === 'object' && 'headers' in firstArg) {
      headers = (firstArg as any).headers;
    }
    
    // Helper para obtener header de forma segura
    const getHeader = (h: Headers | Record<string, string> | undefined, key: string): string | undefined => {
      if (!h) return undefined;
      if (h instanceof Headers) return h.get(key) ?? undefined;
      // Buscar case-insensitive en objeto
      const lowerKey = key.toLowerCase();
      for (const [k, v] of Object.entries(h)) {
        if (k.toLowerCase() === lowerKey) return v;
      }
      return undefined;
    };
    
    const authHeader = getHeader(headers, 'authorization');
    const tenantHeader = getHeader(headers, 'x-tenant-id');

    // Verificar que prepareHeaders se ejecutó (headers de auth están presentes)
    expect(authHeader).toBeDefined();
    expect(authHeader).toContain('Bearer');
    expect(tenantHeader).toBe('1');
    
    // Verificar que las queries devuelven resultado (data o error)
    expect('data' in (r1 as any) || 'error' in (r1 as any)).toBe(true);
    expect('data' in (r2 as any) || 'error' in (r2 as any)).toBe(true);

    fetchSpy.mockRestore();
  });
});


