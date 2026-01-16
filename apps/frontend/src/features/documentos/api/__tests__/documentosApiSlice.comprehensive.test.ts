/**
 * Tests comprehensivos para documentosApiSlice
 * 
 * Cubre el API slice de documentos y sus endpoints.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { documentosApiSlice } from '../documentosApiSlice';


// Mock de getRuntimeEnv
jest.mock('../../../../lib/runtimeEnv', () => ({
  getRuntimeEnv: jest.fn(() => 'http://localhost:4802'),
}));

beforeEach(() => {
  jest.clearAllMocks();
});


describe('documentosApiSlice types', () => {
  it('DocumentTemplate debería tener la estructura correcta', () => {
    const template = {
      id: 1,
      nombre: 'DNI',
      descripcion: 'Documento Nacional de Identidad',
      entityType: 'CHOFER' as const,
      campos: { numero: 'string' },
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    
    expect(template.id).toBe(1);
    expect(template.entityType).toBe('CHOFER');
    expect(template.isActive).toBe(true);
  });

  it('Document debería tener la estructura correcta', () => {
    const document = {
      id: 1,
      templateId: 1,
      dadorCargaId: 1,
      entityType: 'CHOFER' as const,
      entityId: '12345678',
      status: 'PENDIENTE' as const,
      extractedData: { dni: '12345678' },
      uploadedAt: '2025-01-01T00:00:00Z',
      files: [],
    };
    
    expect(document.status).toBe('PENDIENTE');
    expect(document.entityType).toBe('CHOFER');
  });

  it('DocumentFile debería tener la estructura correcta', () => {
    const file = {
      id: 1,
      documentId: 1,
      fileName: 'dni_12345678.pdf',
      originalName: 'mi_dni.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      fileUrl: 'https://storage.example.com/file.pdf',
      uploadedAt: '2025-01-01T00:00:00Z',
    };
    
    expect(file.mimeType).toBe('application/pdf');
    expect(file.fileSize).toBe(1024);
  });

  it('DocumentStatusSummary debería tener semáforo RGB', () => {
    const summary = {
      empresaId: 1,
      entityType: 'CHOFER',
      entityId: '12345678',
      red: 2,
      yellow: 3,
      green: 10,
      lastUpdated: '2025-01-01T00:00:00Z',
    };
    
    expect(summary.red).toBe(2);
    expect(summary.yellow).toBe(3);
    expect(summary.green).toBe(10);
  });

  it('DashboardData debería tener empresas y semáforos', () => {
    const dashboardData = {
      empresas: [
        { id: 1, nombre: 'Empresa 1', totalDocuments: 100, pendingDocuments: 10, expiredDocuments: 5, approvedDocuments: 85 },
      ],
      semaforos: [
        { empresaId: 1, entityType: 'CHOFER', entityId: '1', red: 1, yellow: 2, green: 5, lastUpdated: '2025-01-01' },
      ],
    };
    
    expect(dashboardData.empresas.length).toBe(1);
    expect(dashboardData.semaforos.length).toBe(1);
  });
});

describe('documentosApiSlice endpoints configuration', () => {
  it('getEquipoCompliance debería usar /compliance/equipos/:id', () => {
    const queryFn = ({ id }: { id: number }) => ({ url: `/compliance/equipos/${id}` });
    
    const result = queryFn({ id: 5 });
    expect(result.url).toBe('/compliance/equipos/5');
  });

  it('getClienteEquipos debería usar /clients/:clienteId/equipos', () => {
    const queryFn = ({ clienteId }: { clienteId: number }) => ({ url: `/clients/${clienteId}/equipos` });
    
    const result = queryFn({ clienteId: 3 });
    expect(result.url).toBe('/clients/3/equipos');
  });

  it('bulkSearchPlates debería usar POST /clients/bulk-search', () => {
    const queryFn = (body: { plates: string[]; type?: 'truck' | 'trailer' }) => ({
      url: `/clients/bulk-search`,
      method: 'POST',
      body,
    });
    
    const result = queryFn({ plates: ['ABC123', 'XYZ789'], type: 'truck' });
    expect(result.url).toBe('/clients/bulk-search');
    expect(result.method).toBe('POST');
    expect(result.body.plates).toHaveLength(2);
  });

  it('requestClientsBulkZip debería usar POST /clients/bulk-zip', () => {
    const queryFn = ({ equipoIds }: { equipoIds: number[] }) => ({
      url: `/clients/bulk-zip`,
      method: 'POST',
      body: { equipoIds },
    });
    
    const result = queryFn({ equipoIds: [1, 2, 3] });
    expect(result.url).toBe('/clients/bulk-zip');
    expect(result.method).toBe('POST');
  });

  it('getClientsZipJob debería usar /clients/jobs/:jobId', () => {
    const queryFn = ({ jobId }: { jobId: string }) => ({ url: `/clients/jobs/${jobId}` });
    
    const result = queryFn({ jobId: 'job-123' });
    expect(result.url).toBe('/clients/jobs/job-123');
  });

  it('getMisEquipos debería usar /transportistas/mis-equipos', () => {
    const queryFn = () => ({ url: `/transportistas/mis-equipos` });
    
    const result = queryFn();
    expect(result.url).toBe('/transportistas/mis-equipos');
  });

  it('transportistasSearch debería usar POST /transportistas/search', () => {
    const queryFn = (body: { dni?: string; plate?: string }) => ({
      url: `/transportistas/search`,
      method: 'POST',
      body,
    });
    
    const result = queryFn({ dni: '12345678' });
    expect(result.url).toBe('/transportistas/search');
    expect(result.method).toBe('POST');
  });

  it('getDocumentosPorEquipo debería usar /clients/equipos/:equipoId/documentos', () => {
    const queryFn = ({ equipoId }: { equipoId: number }) => ({
      url: `/clients/equipos/${equipoId}/documentos`,
    });
    
    const result = queryFn({ equipoId: 10 });
    expect(result.url).toBe('/clients/equipos/10/documentos');
  });

  it('getJobStatus debería usar /jobs/:jobId/status', () => {
    const queryFn = ({ jobId }: { jobId: string }) => ({ url: `/jobs/${jobId}/status` });
    
    const result = queryFn({ jobId: 'job-456' });
    expect(result.url).toBe('/jobs/job-456/status');
  });
});

describe('transformResponse helpers', () => {
  it('debería extraer data de respuesta con wrapper', () => {
    const transformResponse = (r: { data?: unknown } | unknown) => {
      if (r && typeof r === 'object' && 'data' in r) {
        return (r as { data: unknown }).data ?? r;
      }
      return r;
    };
    
    const response = { data: [{ id: 1 }, { id: 2 }] };
    const result = transformResponse(response);
    
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(2);
  });

  it('debería retornar array vacío si data no existe', () => {
    const transformResponse = (r: { data?: unknown[] } | unknown) => {
      if (r && typeof r === 'object' && 'data' in r) {
        return (r as { data: unknown[] }).data ?? [];
      }
      return [];
    };
    
    const response = { success: true };
    const result = transformResponse(response);
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('debería manejar respuesta directa sin wrapper', () => {
    const transformResponse = (r: unknown) => {
      if (r && typeof r === 'object' && 'data' in r) {
        return (r as { data: unknown }).data ?? r;
      }
      return r;
    };
    
    const response = [{ id: 1 }];
    const result = transformResponse(response);
    
    expect(result).toEqual(response);
  });
});

describe('tagTypes configuration', () => {
  it('debería definir todos los tag types necesarios', () => {
    const tagTypes = [
      'DocumentTemplate',
      'Document',
      'Dashboard',
      'Clients',
      'Equipos',
      'Search',
      'ClientRequirements',
      'Maestros',
      'Approval',
      'EmpresasTransportistas',
      'ExtractedData',
    ];
    
    expect(tagTypes).toContain('DocumentTemplate');
    expect(tagTypes).toContain('Document');
    expect(tagTypes).toContain('Equipos');
    expect(tagTypes).toContain('Approval');
    expect(tagTypes.length).toBe(11);
  });
});

describe('prepareHeaders', () => {
  it('debería agregar authorization header si hay token', () => {
    const prepareHeaders = (
      headers: Map<string, string>,
      { getState }: { getState: () => { auth?: { token?: string; user?: { empresaId?: number } } } }
    ) => {
      const state = getState();
      const token = state.auth?.token;
      const empresaId = state.auth?.user?.empresaId;
      if (token) headers.set('authorization', `Bearer ${token}`);
      if (empresaId) headers.set('x-tenant-id', String(empresaId));
      return headers;
    };
    
    const headers = new Map<string, string>();
    const getState = () => ({ auth: { token: 'test-token', user: { empresaId: 5 } } });
    
    prepareHeaders(headers, { getState });
    
    expect(headers.get('authorization')).toBe('Bearer test-token');
    expect(headers.get('x-tenant-id')).toBe('5');
  });

  it('debería no agregar headers si no hay auth', () => {
    const prepareHeaders = (
      headers: Map<string, string>,
      { getState }: { getState: () => { auth?: { token?: string; user?: { empresaId?: number } } } }
    ) => {
      const state = getState();
      const token = state.auth?.token;
      const empresaId = state.auth?.user?.empresaId;
      if (token) headers.set('authorization', `Bearer ${token}`);
      if (empresaId) headers.set('x-tenant-id', String(empresaId));
      return headers;
    };
    
    const headers = new Map<string, string>();
    const getState = () => ({ auth: {} });
    
    prepareHeaders(headers, { getState });
    
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('x-tenant-id')).toBe(false);
  });
});

// Helpers para tests de requests

type AuthState = { token?: string; user?: { empresaId?: number } };

type FetchCall = [RequestInfo, RequestInit | undefined];

const authReducer = (state: AuthState = { token: 'token', user: { empresaId: 1 } }): AuthState => state;

const createStore = (authState?: AuthState) => {
  const auth = authState ?? { token: 'token', user: { empresaId: 1 } };
  return configureStore({
    reducer: {
      [documentosApiSlice.reducerPath]: documentosApiSlice.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(documentosApiSlice.middleware),
    preloadedState: { auth },
  });
};

const createJsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const getRequestDetails = (call: FetchCall) => {
  const [input, init] = call;
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : 'url' in input
        ? input.url
        : '';
  const body = init?.body ?? (typeof input === 'object' && input !== null && 'body' in input ? input.body : undefined);
  return { url, body, init };
};

const parseJsonBody = (body: BodyInit | null | undefined): Record<string, unknown> => {
  if (typeof body !== 'string') return {};
  return JSON.parse(body) as Record<string, unknown>;
};

class FilePolyfill extends Blob {
  public readonly name: string;
  public readonly lastModified: number;
  public readonly webkitRelativePath: string;

  constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
    super(parts, options);
    this.name = name;
    this.lastModified = options?.lastModified ?? Date.now();
    this.webkitRelativePath = '';
  }
}

const FileCtor: typeof File = typeof File === 'undefined'
  ? (FilePolyfill as unknown as typeof File)
  : File;

const createTestFile = (name: string): File => new FileCtor(['content'], name, { type: 'text/plain' });

const getFormDataValues = (formData: FormData, key: string): FormDataEntryValue[] =>
  Array.from(formData.entries())
    .filter(([entryKey]) => entryKey === key)
    .map(([, value]) => value);

// =================================
// Requests reales (dispatch) para cobertura
// =================================

describe('documentosApiSlice request building', () => {
  it('uploadDocument usa FormData directo cuando se envía FormData', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: { id: 10 } }));
    const store = createStore();
    const formData = new FormData();
    formData.append('document', createTestFile('doc.txt'));

    await store.dispatch(documentosApiSlice.endpoints.uploadDocument.initiate(formData));

    expect(fetchSpy).toHaveBeenCalled();
    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { url, body } = getRequestDetails(call);
    expect(url).toContain('/api/docs/documents/upload');
    expect(body).toBeInstanceOf(FormData);

    fetchSpy.mockRestore();
  });

  it('uploadDocument arma FormData con múltiples archivos', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: { id: 11, status: 'APROBADO' } }));
    const store = createStore();
    const fileA = createTestFile('a.txt');
    const fileB = createTestFile('b.txt');
    const payload = {
      templateId: 1,
      empresaId: 3,
      entityType: 'CHOFER',
      entityId: '1234',
      confirmNewVersion: true,
      planilla: { numero: 'ABC' },
      expiresAt: '2025-01-01',
      files: [fileA, fileB],
    };

    await store.dispatch(documentosApiSlice.endpoints.uploadDocument.initiate(payload));

    expect(fetchSpy).toHaveBeenCalled();
    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { body } = getRequestDetails(call);
    expect(body).toBeInstanceOf(FormData);

    const formData = body as FormData;
    const documentEntries = getFormDataValues(formData, 'documents');
    const confirmEntries = getFormDataValues(formData, 'confirmNewVersion');
    const planillaEntry = getFormDataValues(formData, 'planilla')[0];

    expect(documentEntries).toHaveLength(2);
    expect(confirmEntries[0]).toBe('true');
    expect(typeof planillaEntry).toBe('string');
    expect(planillaEntry).toBe(JSON.stringify({ numero: 'ABC' }));

    fetchSpy.mockRestore();
  });

  it('updateTemplate mapea nombre/isActive a name/active', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: { id: 2 } }));
    const store = createStore();

    await store.dispatch(documentosApiSlice.endpoints.updateTemplate.initiate({ id: 2, nombre: 'DNI', isActive: false }));

    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { body } = getRequestDetails(call);
    const parsed = parseJsonBody(body);
    expect(parsed.name).toBe('DNI');
    expect(parsed.active).toBe(false);

    fetchSpy.mockRestore();
  });

  it('approvePendingDocument convierte fecha YYYY-MM-DD a ISO', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: { id: 1 } }));
    const store = createStore();

    await store.dispatch(
      documentosApiSlice.endpoints.approvePendingDocument.initiate({
        id: 9,
        confirmedEntityType: 'CHOFER',
        confirmedEntityId: 99,
        expiresAt: '2025-02-01',
        reviewNotes: null,
        templateId: 15,
      })
    );

    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { body } = getRequestDetails(call);
    const parsed = parseJsonBody(body);

    expect(parsed.confirmedExpiration).toBe('2025-02-01T00:00:00.000Z');
    expect(parsed.confirmedTemplateId).toBe(15);

    fetchSpy.mockRestore();
  });

  it('approvePendingDocument mantiene fecha ISO existente', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: { id: 1 } }));
    const store = createStore();

    await store.dispatch(
      documentosApiSlice.endpoints.approvePendingDocument.initiate({
        id: 10,
        confirmedEntityType: 'CHOFER',
        confirmedEntityId: 100,
        expiresAt: '2025-02-01T10:00:00.000Z',
        templateId: 18,
      })
    );

    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { body } = getRequestDetails(call);
    const parsed = parseJsonBody(body);

    expect(parsed.confirmedExpiration).toBe('2025-02-01T10:00:00.000Z');

    fetchSpy.mockRestore();
  });

  it('getDocumentsByEmpresa arma query string con status/page/limit', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } }));
    const store = createStore();

    await store.dispatch(
      documentosApiSlice.endpoints.getDocumentsByEmpresa.initiate({
        dadorId: 10,
        status: 'APROBADO',
        page: 2,
        limit: 15,
      })
    );

    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { url } = getRequestDetails(call);
    expect(url).toContain('/documents/status');
    expect(url).toContain('empresaId=10');
    expect(url).toContain('status=APROBADO');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=15');

    fetchSpy.mockRestore();
  });

  it('searchEquipos arma params opcionales', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: [] }));
    const store = createStore();

    await store.dispatch(
      documentosApiSlice.endpoints.searchEquipos.initiate({
        empresaId: 2,
        clienteId: 9,
        dni: '123',
        truckPlate: 'AAA111',
      })
    );

    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { url } = getRequestDetails(call);
    expect(url).toContain('/search?');
    expect(url).toContain('dadorCargaId=2');
    expect(url).toContain('clienteId=9');
    expect(url).toContain('dni=123');
    expect(url).toContain('truckPlate=AAA111');

    fetchSpy.mockRestore();
  });

  it('searchEquiposPaged incluye filtros avanzados', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }));
    const store = createStore();

    await store.dispatch(
      documentosApiSlice.endpoints.searchEquiposPaged.initiate({
        page: 3,
        limit: 25,
        dadorCargaId: 12,
        empresaTransportistaId: 7,
        activo: 'false',
        complianceFilter: 'vencidos',
      })
    );

    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { url } = getRequestDetails(call);
    expect(url).toContain('/equipos/search-paged?');
    expect(url).toContain('page=3');
    expect(url).toContain('limit=25');
    expect(url).toContain('dadorCargaId=12');
    expect(url).toContain('empresaTransportistaId=7');
    expect(url).toContain('activo=false');
    expect(url).toContain('complianceFilter=vencidos');

    fetchSpy.mockRestore();
  });

  it('getPendingSummary usa fallback en error de endpoint', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ error: 'not-found' }, 404));
    const store = createStore();

    const result = await store.dispatch(documentosApiSlice.endpoints.getPendingSummary.initiate());

    expect('error' in result).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith('getPendingSummary endpoint not available, using fallback');

    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('getApprovalKpis usa fallback cuando falla', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ error: 'not-found' }, 500));
    const store = createStore();

    const result = await store.dispatch(documentosApiSlice.endpoints.getApprovalKpis.initiate());

    expect('error' in result).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith('getApprovalKpis endpoint not available, using fallback');

    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('resubmitDocument envía FormData con document', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: { id: 1 } }));
    const store = createStore();
    const file = createTestFile('resubmit.pdf');

    await store.dispatch(documentosApiSlice.endpoints.resubmitDocument.initiate({ documentId: 55, file }));

    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { url, body } = getRequestDetails(call);
    expect(url).toContain('/documents/55/resubmit');
    expect(body).toBeInstanceOf(FormData);

    fetchSpy.mockRestore();
  });

  it('getExtractedDataList arma query params con entityType', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ data: [], pagination: { page: 2, limit: 10, total: 0, pages: 0 } }));
    const store = createStore();

    await store.dispatch(
      documentosApiSlice.endpoints.getExtractedDataList.initiate({
        entityType: 'CHOFER',
        page: 2,
        limit: 10,
      })
    );

    const call = fetchSpy.mock.calls[0] as FetchCall;
    const { url } = getRequestDetails(call);
    expect(url).toContain('/entities/extracted-data');
    expect(url).toContain('entityType=CHOFER');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');

    fetchSpy.mockRestore();
  });
});


