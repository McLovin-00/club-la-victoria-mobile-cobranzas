/**
 * Gap Coverage Tests para documentosApiSlice
 *
 * Propósito: Cubrir endpoints, branches y transformResponses que no están siendo probados
 * en los tests existentes. Enfocado en llegar a >93% de cobertura.
 *
 * Cobertura actual: 31.92% statements, 18.68% branches
 * Objetivo: >93% statements, >93% branches
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

// =================================
// HELPERS
// =================================

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
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  const body = init?.body ?? (typeof input === 'object' && input !== null && 'body' in input ? input.body : undefined);
  return { url, body, init: { ...init, method } };
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
// TESTS DE GAP COVERAGE
// =================================

describe('documentosApiSlice - Gap Coverage Tests', () => {
  describe('Endpoints de Documentos - Casos no cubiertos', () => {
    it('uploadDocument con un solo archivo (no array)', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 100, status: 'PENDIENTE', uploadedAt: '2025-01-20T00:00:00Z' },
      }));
      const store = createStore();
      const file = createTestFile('single.pdf');

      await store.dispatch(
        documentosApiSlice.endpoints.uploadDocument.initiate({
          templateId: 1,
          empresaId: 3,
          entityType: 'CHOFER',
          entityId: '12345678',
          files: [file],
        })
      );

      expect(fetchSpy).toHaveBeenCalled();
      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { body } = getRequestDetails(call);
      expect(body).toBeInstanceOf(FormData);

      const formData = body as FormData;
      const documentEntries = getFormDataValues(formData, 'document');
      expect(documentEntries).toHaveLength(1);

      fetchSpy.mockRestore();
    });

    it('uploadDocument sin archivos (array vacío)', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 101, status: 'PENDIENTE' },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.uploadDocument.initiate({
          templateId: 2,
          empresaId: 4,
          entityType: 'CAMION',
          entityId: 'ABC123',
          files: [],
        })
      );

      expect(fetchSpy).toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('uploadDocument con planilla como objeto', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 102, status: 'PENDIENTE' },
      }));
      const store = createStore();

      const planillaObj = { numero: 'PLAN-123', fecha: '2025-01-20' };

      await store.dispatch(
        documentosApiSlice.endpoints.uploadDocument.initiate({
          templateId: 3,
          empresaId: 5,
          entityType: 'ACOPLADO',
          entityId: 'DEF456',
          files: [],
          planilla: planillaObj,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { body } = getRequestDetails(call);
      const formData = body as FormData;
      const planillaEntry = getFormDataValues(formData, 'planilla')[0];

      expect(typeof planillaEntry).toBe('string');
      expect(JSON.parse(planillaEntry as string)).toEqual(planillaObj);

      fetchSpy.mockRestore();
    });

    it('deleteDocument hace DELETE request correcto', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteDocument.initiate(42));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);

      expect(url).toContain('/documents/42');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });

    it('downloadDocumento usa responseHandler blob', async () => {
      const blobData = new Blob(['pdf content'], { type: 'application/pdf' });
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(blobData, { status: 200, headers: { 'Content-Type': 'application/pdf' } })
      );
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.downloadDocumento.initiate({ documentId: 15 }));

      expect(fetchSpy).toHaveBeenCalled();
      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/documents/15/download');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Templates - Actualización y eliminación', () => {
    it('updateTemplate solo con isActive (sin nombre)', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 5, isActive: false },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateTemplate.initiate({
          id: 5,
          isActive: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { body } = getRequestDetails(call);
      const parsed = parseJsonBody(body);

      expect(parsed.active).toBe(false);
      expect(parsed.name).toBeUndefined();

      fetchSpy.mockRestore();
    });

    it('deleteTemplate hace DELETE request', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteTemplate.initiate(7));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);

      expect(url).toContain('/templates/7');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Approval - Aprobación y rechazo', () => {
    it('approvePendingDocument sin expiresAt ni templateId', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 200, status: 'APROBADO' },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.approvePendingDocument.initiate({
          id: 200,
          confirmedEntityType: 'CHOFER',
          confirmedEntityId: 99,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { body } = getRequestDetails(call);
      const parsed = parseJsonBody(body);

      expect(parsed.confirmedExpiration).toBeUndefined();
      expect(parsed.confirmedTemplateId).toBeUndefined();

      fetchSpy.mockRestore();
    });

    it('rejectPendingDocument con reviewNotes', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 201, status: 'RECHAZADO' },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.rejectPendingDocument.initiate({
          id: 201,
          reason: 'Documento ilegible',
          reviewNotes: 'Nota adicional del revisor',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, body } = getRequestDetails(call);

      expect(url).toContain('/approval/pending/201/reject');

      const parsed = parseJsonBody(body);
      expect(parsed.reason).toBe('Documento ilegible');
      expect(parsed.reviewNotes).toBe('Nota adicional del revisor');

      fetchSpy.mockRestore();
    });

    it('rejectPendingDocument sin reviewNotes', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 202, status: 'RECHAZADO' },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.rejectPendingDocument.initiate({
          id: 202,
          reason: 'Calidad insuficiente',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { body } = getRequestDetails(call);
      const parsed = parseJsonBody(body);

      expect(parsed.reason).toBe('Calidad insuficiente');
      expect(parsed.reviewNotes).toBeUndefined();

      fetchSpy.mockRestore();
    });

    it('batchApproveDocuments con múltiples items', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { approved: 3, rejected: 0 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.batchApproveDocuments.initiate({
          items: [
            { id: 1, confirmedEntityType: 'CHOFER', confirmedEntityId: 101 },
            { id: 2, confirmedEntityType: 'CAMION', confirmedEntityId: 102 },
            { id: 3, confirmedEntityType: 'ACOPLADO', confirmedEntityId: 103 },
          ],
          reviewNotes: 'Aprobación por lote',
        })
      );

      expect(fetchSpy).toHaveBeenCalled();
      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/approval/pending/batch-approve');

      fetchSpy.mockRestore();
    });

    it('recheckDocumentWithAI dispara re-check de IA', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { documentId: 5, jobId: 'job-ai-123' },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.recheckDocumentWithAI.initiate({ id: 5 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);

      expect(url).toContain('/approval/pending/5/recheck');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('getApprovalStats retorna estadísticas de aprobación', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          total: 100,
          pending: 15,
          approved: 75,
          rejected: 10,
        },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getApprovalStats.initiate());

      expect(fetchSpy).toHaveBeenCalled();
      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/approval/stats');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Batch Jobs', () => {
    it('getJobStatus con jobId específico', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          job: {
            id: 'job-456',
            status: 'completed',
            progress: 100,
            message: 'Procesamiento completado',
          },
        },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getJobStatus.initiate({ jobId: 'job-456' }));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/jobs/job-456/status');

      fetchSpy.mockRestore();
    });

    it('importCsvEquipos con dryRun=true', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          success: true,
          dryRun: true,
          total: 50,
          created: 0,
          errors: [],
        },
      }));
      const store = createStore();
      const file = createTestFile('equipos.csv');

      await store.dispatch(
        documentosApiSlice.endpoints.importCsvEquipos.initiate({
          dadorId: 10,
          file,
          dryRun: true,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dadores/10/equipos/import-csv?dryRun=true');

      fetchSpy.mockRestore();
    });

    it('importCsvEquipos sin dryRun (producción)', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          success: true,
          dryRun: false,
          total: 50,
          created: 45,
          errors: [],
        },
      }));
      const store = createStore();
      const file = createTestFile('equipos-prod.csv');

      await store.dispatch(
        documentosApiSlice.endpoints.importCsvEquipos.initiate({
          dadorId: 10,
          file,
          dryRun: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dadores/10/equipos/import-csv');
      expect(url).not.toContain('dryRun');

      fetchSpy.mockRestore();
    });

    it('uploadBatchDocsDador con skipDedupe=true', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { success: true, jobId: 'batch-dador-789' },
      }));
      const store = createStore();
      const files = [createTestFile('doc1.pdf'), createTestFile('doc2.pdf')] as unknown as FileList;

      await store.dispatch(
        documentosApiSlice.endpoints.uploadBatchDocsDador.initiate({
          dadorId: 15,
          files,
          skipDedupe: true,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dadores/15/documentos/batch?skipDedupe=true');

      fetchSpy.mockRestore();
    });

    it('uploadBatchDocsDador sin skipDedupe', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { success: true, jobId: 'batch-dador-999' },
      }));
      const store = createStore();
      const files = [createTestFile('doc3.pdf')] as unknown as FileList;

      await store.dispatch(
        documentosApiSlice.endpoints.uploadBatchDocsDador.initiate({
          dadorId: 20,
          files,
          skipDedupe: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dadores/20/documentos/batch');
      expect(url).not.toContain('skipDedupe');

      fetchSpy.mockRestore();
    });

    it('uploadBatchDocsTransportistas con skipDedupe', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { success: true, jobId: 'batch-trans-456' },
      }));
      const store = createStore();
      const files = [createTestFile('trans-doc1.pdf')] as unknown as FileList;

      await store.dispatch(
        documentosApiSlice.endpoints.uploadBatchDocsTransportistas.initiate({
          files,
          skipDedupe: true,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/transportistas/documentos/batch?skipDedupe=true');

      fetchSpy.mockRestore();
    });

    it('uploadBatchDocsTransportistas sin skipDedupe', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { success: true, jobId: 'batch-trans-789' },
      }));
      const store = createStore();
      const files = [createTestFile('trans-doc2.pdf')] as unknown as FileList;

      await store.dispatch(
        documentosApiSlice.endpoints.uploadBatchDocsTransportistas.initiate({
          files,
          skipDedupe: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/transportistas/documentos/batch');
      expect(url).not.toContain('skipDedupe');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Dadores - CRUD completo', () => {
    it('getDadores sin filtro activo', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          { id: 1, razonSocial: 'Dador 1', cuit: '20111111111', activo: true },
          { id: 2, razonSocial: 'Dador 2', cuit: '20222222222', activo: false },
        ],
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getDadores.initiate({}));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dadores');
      expect(url).not.toContain('activo');

      fetchSpy.mockRestore();
    });

    it('getDadores con activo=true', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [{ id: 1, razonSocial: 'Dador Activo', cuit: '20111111111', activo: true }],
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getDadores.initiate({ activo: true }));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dadores?activo=true');

      fetchSpy.mockRestore();
    });

    it('createDador', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          id: 100,
          razonSocial: 'Nuevo Dador',
          cuit: '20333333333',
          activo: true,
          notas: 'Dador de prueba',
          phones: ['+5491112345678'],
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.createDador.initiate({
          razonSocial: 'Nuevo Dador',
          cuit: '20333333333',
          activo: true,
          notas: 'Dador de prueba',
          phones: ['+5491112345678'],
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/dadores');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('updateDador actualización parcial', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 100, razonSocial: 'Dador Actualizado', cuit: '20333333333', activo: true },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateDador.initiate({
          id: 100,
          razonSocial: 'Dador Actualizado',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/dadores/100');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });

    it('deleteDador', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteDador.initiate(100));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/dadores/100');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Clients - CRUD y requisitos', () => {
    it('createClient', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 50, razonSocial: 'Nuevo Cliente', cuit: '20444444444', activo: true },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.createClient.initiate({
          razonSocial: 'Nuevo Cliente',
          cuit: '20444444444',
          activo: true,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/clients');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('updateClient', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 50, razonSocial: 'Cliente Actualizado', cuit: '20444444444', activo: false },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateClient.initiate({
          id: 50,
          activo: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/clients/50');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });

    it('deleteClient', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteClient.initiate(50));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/clients/50');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });

    it('getClientRequirements', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          {
            id: 1,
            templateId: 5,
            entityType: 'CHOFER',
            obligatorio: true,
            diasAnticipacion: 30,
            visibleChofer: true,
            template: { id: 5, name: 'DNI', entityType: 'CHOFER' },
          },
        ],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getClientRequirements.initiate({ clienteId: 10 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/clients/10/requirements');

      fetchSpy.mockRestore();
    });

    it('addClientRequirement', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 100, templateId: 3, entityType: 'CHOFER', obligatorio: true },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.addClientRequirement.initiate({
          clienteId: 10,
          templateId: 3,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 15,
          visibleChofer: true,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/clients/10/requirements');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('removeClientRequirement', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.removeClientRequirement.initiate({
          clienteId: 10,
          requirementId: 100,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/clients/10/requirements/100');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });

    it('getConsolidatedTemplates con múltiples clientes', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          templates: [],
          byEntityType: {},
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getConsolidatedTemplates.initiate({
          clienteIds: [1, 2, 3],
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/clients/templates/consolidated?clienteIds=1,2,3');

      fetchSpy.mockRestore();
    });

    it('checkMissingDocsForClient', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          missingTemplates: [
            {
              templateId: 1,
              templateName: 'Licencia de Conducir',
              entityType: 'CHOFER',
              obligatorio: true,
              isNewRequirement: true,
            },
          ],
          newClientName: 'Cliente Nuevo',
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.checkMissingDocsForClient.initiate({
          equipoId: 50,
          clienteId: 10,
          existingClienteIds: [1, 2],
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/clients/equipos/50/check-client/10');
      expect(url).toContain('existingClienteIds=1,2');

      fetchSpy.mockRestore();
    });

    it('getDefaults retorna configuración por defecto', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          defaultClienteId: 5,
          defaultDadorId: 10,
          missingCheckDelayMinutes: 60,
        },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getDefaults.initiate());

      expect(fetchSpy).toHaveBeenCalled();
      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/defaults');

      fetchSpy.mockRestore();
    });

    it('updateDefaults actualiza configuraciones', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateDefaults.initiate({
          defaultClienteId: 7,
          defaultDadorId: 12,
          missingCheckDelayMinutes: 30,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/defaults');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Maestros - Choferes', () => {
    it('getChoferes con todos los filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [{ id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez', activo: true }],
        pagination: { page: 2, limit: 25, total: 100 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getChoferes.initiate({
          empresaId: 10,
          q: 'Juan',
          activo: true,
          page: 2,
          limit: 25,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/maestros/choferes?dadorCargaId=10');
      expect(url).toContain('q=Juan');
      expect(url).toContain('activo=true');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=25');

      fetchSpy.mockRestore();
    });

    it('getChoferById', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          id: 50,
          dni: '12345678',
          nombre: 'Carlos',
          apellido: 'López',
          empresaTransportistaId: 5,
          empresaTransportista: {
            id: 5,
            razonSocial: 'Transportes S.A.',
            dadorCargaId: 10,
          },
        },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getChoferById.initiate({ id: 50 }));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/maestros/choferes/50');

      fetchSpy.mockRestore();
    });

    it('createChofer', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 100, dni: '87654321', nombre: 'Nuevo', apellido: 'Chofer', activo: true },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.createChofer.initiate({
          dadorCargaId: 10,
          dni: '87654321',
          nombre: 'Nuevo',
          apellido: 'Chofer',
          activo: true,
          phones: ['+5491199999999'],
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/maestros/choferes');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('updateChofer', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 100, dni: '87654321', nombre: 'Carlos Actualizado', activo: false },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateChofer.initiate({
          id: 100,
          nombre: 'Carlos Actualizado',
          activo: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/maestros/choferes/100');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });

    it('deleteChofer', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteChofer.initiate(100));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/maestros/choferes/100');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Maestros - Camiones', () => {
    it('getCamiones con filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [{ id: 1, patente: 'ABC123', marca: 'Volvo', modelo: 'FH', activo: true }],
        pagination: { page: 1, limit: 10, total: 50 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getCamiones.initiate({
          empresaId: 10,
          q: 'Volvo',
          activo: true,
          page: 1,
          limit: 10,
        })
      );

      expect(fetchSpy).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('createCamion', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 200, patente: 'XYZ789', marca: 'Scania', modelo: 'R450', activo: true },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.createCamion.initiate({
          dadorCargaId: 10,
          patente: 'XYZ789',
          marca: 'Scania',
          modelo: 'R450',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/maestros/camiones');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('updateCamion', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 200, patente: 'PAT999', activo: false },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateCamion.initiate({
          id: 200,
          patente: 'PAT999',
          activo: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/maestros/camiones/200');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });

    it('deleteCamion', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteCamion.initiate(200));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/maestros/camiones/200');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Maestros - Acoplados', () => {
    it('getAcoplados con filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [{ id: 1, patente: 'TRL123', tipo: 'Caja', activo: true }],
        pagination: { page: 1, limit: 10, total: 30 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getAcoplados.initiate({
          empresaId: 10,
          q: 'Caja',
          activo: true,
        })
      );

      expect(fetchSpy).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('createAcoplado', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 300, patente: 'TRL456', tipo: 'Caja', activo: true },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.createAcoplado.initiate({
          dadorCargaId: 10,
          patente: 'TRL456',
          tipo: 'Caja',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/maestros/acoplados');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('updateAcoplado', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 300, patente: 'TRL789', tipo: 'Caja Grande', activo: true },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateAcoplado.initiate({
          id: 300,
          patente: 'TRL789',
          tipo: 'Caja Grande',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/maestros/acoplados/300');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });

    it('deleteAcoplado', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteAcoplado.initiate(300));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/maestros/acoplados/300');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Equipos - CRUD y operaciones', () => {
    it('getEquipoHistory', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          {
            id: 1,
            equipoId: 50,
            action: 'CREATE',
            component: 'chofer',
            payload: { choferId: 10 },
            createdAt: '2025-01-20T00:00:00Z',
          },
        ],
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getEquipoHistory.initiate({ id: 50 }));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/history');

      fetchSpy.mockRestore();
    });

    it('getEquipoById', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          id: 50,
          driverDniNorm: '12345678',
          truckPlateNorm: 'ABC123',
          trailerPlateNorm: 'TRL456',
          estado: 'activa',
        },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getEquipoById.initiate({ id: 50 }));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/equipos/50');

      fetchSpy.mockRestore();
    });

    it('createEquipoCompleto', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 500, estado: 'activa' },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.createEquipoCompleto.initiate({
          dadorCargaId: 10,
          empresaTransportistaCuit: '30123456789',
          empresaTransportistaNombre: 'Transportes S.A.',
          choferDni: '12345678',
          choferNombre: 'Juan',
          choferApellido: 'Pérez',
          choferPhones: ['+5491112345678'],
          camionPatente: 'ABC123',
          camionMarca: 'Volvo',
          camionModelo: 'FH',
          acopladoPatente: 'TRL456',
          acopladoTipo: 'Caja',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/alta-completa');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('rollbackEquipoCompleto', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { success: true, deleted: { chofer: true, camion: true } },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.rollbackEquipoCompleto.initiate({
          equipoId: 500,
          deleteChofer: true,
          deleteCamion: true,
          deleteAcoplado: false,
          deleteEmpresa: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/500/rollback');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('updateEquipo con validTo null', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 50, estado: 'activa' },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateEquipo.initiate({
          id: 50,
          validTo: null,
          estado: 'activa',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });

    it('deleteEquipo', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteEquipo.initiate({ id: 50 }));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });

    it('associateEquipoCliente', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 600, clienteId: 5, equipoId: 50 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.associateEquipoCliente.initiate({
          equipoId: 50,
          clienteId: 5,
          asignadoDesde: '2025-01-20',
          asignadoHasta: '2025-12-31',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/clientes/5');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('removeEquipoCliente', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.removeEquipoCliente.initiate({
          equipoId: 50,
          clienteId: 5,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/clientes/5');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });

    it('toggleEquipoActivo a false', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { success: true, data: { id: 50, activo: false } },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.toggleEquipoActivo.initiate({
          equipoId: 50,
          activo: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/toggle-activo');
      expect(init?.method).toBe('PATCH');

      fetchSpy.mockRestore();
    });

    it('getEquipoRequisitos', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          {
            templateId: 1,
            templateName: 'DNI',
            entityType: 'CHOFER',
            entityId: 10,
            obligatorio: true,
            requeridoPor: [{ clienteId: 1, clienteName: 'Cliente A' }],
            estado: 'VIGENTE',
          },
        ],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEquipoRequisitos.initiate({ equipoId: 50 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/requisitos');

      fetchSpy.mockRestore();
    });

    it('getEquipoAuditHistory', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          {
            id: 1,
            equipoId: 50,
            action: 'UPDATE',
            userId: 1,
            changes: "estado: 'activa' -> 'finalizada'",
            createdAt: '2025-01-20T10:00:00Z',
          },
        ],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEquipoAuditHistory.initiate({ equipoId: 50 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/audit');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Equipos - Operaciones avanzadas', () => {
    it('updateEquipoEntidades', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 50, choferId: 20, camionId: 30, acopladoId: null },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateEquipoEntidades.initiate({
          equipoId: 50,
          choferId: 20,
          camionId: 30,
          acopladoId: null,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/entidades');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });

    it('addEquipoCliente', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 700, equipoId: 50, clienteId: 8 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.addEquipoCliente.initiate({
          equipoId: 50,
          clienteId: 8,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/clientes');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('removeEquipoClienteWithArchive', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { removed: true, archivedDocuments: 5 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.removeEquipoClienteWithArchive.initiate({
          equipoId: 50,
          clienteId: 8,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/clientes/8');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });

    it('transferirEquipo', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 50, dadorCargaId: 20 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.transferirEquipo.initiate({
          equipoId: 50,
          nuevoDadorCargaId: 20,
          motivo: 'Reasignación por cambio de contrato',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/transferir');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('attachEquipoComponents', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 50, attached: true },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.attachEquipoComponents.initiate({
          id: 50,
          driverId: 15,
          truckId: 25,
          trailerId: 35,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/attach');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('detachEquipoComponents', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 50, detached: true },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.detachEquipoComponents.initiate({
          id: 50,
          driver: true,
          truck: true,
          trailer: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/50/detach');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('createEquipoMinimal', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 800, estado: 'activa' },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.createEquipoMinimal.initiate({
          dadorCargaId: 10,
          dniChofer: '12345678',
          patenteTractor: 'ABC123',
          patenteAcoplado: 'TRL456',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/minimal');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Búsqueda', () => {
    it('searchEquipos sin filtros opcionales', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [{ id: 1, equipo: { id: 1 } }],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.searchEquipos.initiate({
          empresaId: 10,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/search?');
      expect(url).toContain('dadorCargaId=10');

      fetchSpy.mockRestore();
    });

    it('searchEquiposPaged sin filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.searchEquiposPaged.initiate({
          page: 1,
          limit: 10,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/equipos/search-paged?');

      fetchSpy.mockRestore();
    });

    it('searchEquiposByDnis', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          { id: 1, driverDniNorm: '12345678', truckPlateNorm: 'ABC123' },
          { id: 2, driverDniNorm: '87654321', truckPlateNorm: 'XYZ789' },
        ],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.searchEquiposByDnis.initiate({
          dnis: ['12345678', '87654321'],
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/search/dnis');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('downloadVigentesBulk', async () => {
      const blobData = new Blob(['zip content'], { type: 'application/zip' });
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(blobData, { status: 200, headers: { 'Content-Type': 'application/zip' } })
      );
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.downloadVigentesBulk.initiate({
          equipoIds: [1, 2, 3],
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/equipos/download/vigentes');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Dashboard', () => {
    it('getDashboardData retorna semáforos', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          empresas: [
            {
              id: 1,
              nombre: 'Empresa 1',
              totalDocuments: 100,
              pendingDocuments: 10,
              expiredDocuments: 5,
              approvedDocuments: 85,
            },
          ],
          semaforos: [
            {
              empresaId: 1,
              entityType: 'CHOFER',
              entityId: '1',
              red: 1,
              yellow: 2,
              green: 5,
              lastUpdated: '2025-01-20',
            },
          ],
        },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getDashboardData.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dashboard/semaforos');

      fetchSpy.mockRestore();
    });

    it('getDashboardStats', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        totalDocuments: 500,
        pendingDocuments: 50,
        expiredDocuments: 30,
        approvedDocuments: 420,
        recentActivity: [],
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getDashboardStats.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dashboard/stats');

      fetchSpy.mockRestore();
    });

    it('getEquipoKpis con parámetro since', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { since: '2025-01-01', created: 10, swaps: 5, deleted: 2 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEquipoKpis.initiate({ since: '2025-01-01' })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dashboard/equipo-kpis?since=');

      fetchSpy.mockRestore();
    });

    it('getEquipoKpis sin parámetro', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { since: '', created: 0, swaps: 0, deleted: 0 },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getEquipoKpis.initiate());

      expect(fetchSpy).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Empresas Transportistas', () => {
    it('getEmpresasTransportistas con todos los filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        list: [
          { id: 1, razonSocial: 'Transportes A', cuit: '30111111111', activo: true },
        ],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEmpresasTransportistas.initiate({
          dadorCargaId: 10,
          q: 'Transportes',
          page: 1,
          limit: 20,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/empresas-transportistas');
      expect(url).toContain('dadorCargaId=10');
      expect(url).toContain('q=Transportes');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=20');

      fetchSpy.mockRestore();
    });

    it('getEmpresaTransportistaById', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          id: 5,
          razonSocial: 'Transportes S.A.',
          cuit: '30123456789',
          activo: true,
          dadorCargaId: 10,
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEmpresaTransportistaById.initiate({ id: 5 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/empresas-transportistas/5');

      fetchSpy.mockRestore();
    });

    it('createEmpresaTransportista', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          id: 100,
          razonSocial: 'Nueva Transportadora',
          cuit: '30999999999',
          activo: true,
          notas: 'Empresa nueva',
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.createEmpresaTransportista.initiate({
          dadorCargaId: 10,
          razonSocial: 'Nueva Transportadora',
          cuit: '30999999999',
          activo: true,
          notas: 'Empresa nueva',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/empresas-transportistas');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('updateEmpresaTransportista', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { id: 100, razonSocial: 'Transportadora Actualizada', cuit: '30999999999', activo: false },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateEmpresaTransportista.initiate({
          id: 100,
          razonSocial: 'Transportadora Actualizada',
          activo: false,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/empresas-transportistas/100');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });

    it('deleteEmpresaTransportista', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({ success: true }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteEmpresaTransportista.initiate(100));

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/empresas-transportistas/100');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });

    it('getEmpresaTransportistaChoferes', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          { id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez', activo: true },
        ],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEmpresaTransportistaChoferes.initiate({ id: 5 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/empresas-transportistas/5/choferes');

      fetchSpy.mockRestore();
    });

    it('getEmpresaTransportistaEquipos', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          { id: 1, driverDniNorm: '12345678', truckPlateNorm: 'ABC123', estado: 'activa' },
        ],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEmpresaTransportistaEquipos.initiate({ id: 5 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/empresas-transportistas/5/equipos');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Portal Cliente', () => {
    it('getPortalClienteEquipos con filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          equipos: [],
          resumen: { total: 0, vigentes: 0, proximosVencer: 0, vencidos: 0, incompletos: 0 },
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getPortalClienteEquipos.initiate({
          page: 2,
          limit: 25,
          search: 'ABC',
          estado: 'VIGENTE',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/portal-cliente/equipos?');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=25');
      expect(url).toContain('search=ABC');
      expect(url).toContain('estado=VIGENTE');

      fetchSpy.mockRestore();
    });

    it('getPortalClienteEquipoDetalle', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          equipo: {
            id: 100,
            camion: { patente: 'ABC123', marca: 'Volvo', modelo: 'FH' },
            acoplado: { patente: 'TRL456', tipo: 'Caja' },
            chofer: { nombre: 'Juan', apellido: 'Pérez', dni: '12345678' },
            empresaTransportista: { razonSocial: 'Transportes S.A.', cuit: '30123456789' },
            asignadoDesde: '2025-01-01',
          },
          documentos: [],
          resumenDocs: { total: 0, vigentes: 0, proximosVencer: 0, vencidos: 0 },
          hayDocumentosDescargables: false,
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getPortalClienteEquipoDetalle.initiate({ id: 100 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/portal-cliente/equipos/100');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Portal Transportista', () => {
    it('getPortalTransportistaMisEntidades', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          empresas: [],
          choferes: [],
          camiones: [],
          acoplados: [],
          contadores: { pendientes: 0, rechazados: 0, porVencer: 0 },
        },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getPortalTransportistaMisEntidades.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/portal-transportista/mis-entidades');

      fetchSpy.mockRestore();
    });

    it('getPortalTransportistaEquipos', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          { id: 1, driverDniNorm: '12345678', truckPlateNorm: 'ABC123', estado: 'activa' },
        ],
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getPortalTransportistaEquipos.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/portal-transportista/equipos');

      fetchSpy.mockRestore();
    });

    it('getPortalTransportistaDocumentosRechazados', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          { id: 1, fileName: 'rechazado.pdf', reason: 'Calidad insuficiente' },
        ],
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getPortalTransportistaDocumentosRechazados.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/portal-transportista/documentos/rechazados');

      fetchSpy.mockRestore();
    });

    it('getPortalTransportistaDocumentosPendientes', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          { id: 2, fileName: 'pendiente.pdf', status: 'PENDIENTE' },
        ],
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getPortalTransportistaDocumentosPendientes.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/portal-transportista/documentos/pendientes');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Datos Extraídos por IA', () => {
    it('getEntityExtractedData', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          dni: '12345678',
          nombre: 'JUAN',
          apellido: 'PEREZ',
          fechaVencimiento: '2025-12-31',
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEntityExtractedData.initiate({
          entityType: 'CHOFER',
          entityId: 10,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/entities/CHOFER/10/extracted-data');

      fetchSpy.mockRestore();
    });

    it('updateEntityExtractedData', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        success: true,
        message: 'Datos actualizados correctamente',
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.updateEntityExtractedData.initiate({
          entityType: 'CHOFER',
          entityId: 10,
          data: { dni: '87654321', nombre: 'CARLOS' },
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/entities/CHOFER/10/extracted-data');
      expect(init?.method).toBe('PUT');

      fetchSpy.mockRestore();
    });

    it('deleteEntityExtractedData', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        success: true,
        message: 'Datos eliminados',
        documentsAffected: 3,
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.deleteEntityExtractedData.initiate({
          entityType: 'CHOFER',
          entityId: 10,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/entities/CHOFER/10/extracted-data');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });

    it('getEntityExtractionHistory', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          {
            id: 1,
            entityType: 'CHOFER',
            entityId: 10,
            extractedData: { dni: '12345678' },
            createdAt: '2025-01-20T10:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEntityExtractionHistory.initiate({
          entityType: 'CHOFER',
          entityId: 10,
          page: 1,
          limit: 10,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/entities/CHOFER/10/extraction-history');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Notificaciones', () => {
    it('getUserNotifications con filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        unreadCount: 0,
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getUserNotifications.initiate({
          page: 2,
          limit: 30,
          unreadOnly: true,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/notifications');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=30');
      expect(url).toContain('unreadOnly=true');

      fetchSpy.mockRestore();
    });

    it('getUnreadNotificationsCount', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: { count: 5 },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getUnreadNotificationsCount.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/notifications/unread-count');

      fetchSpy.mockRestore();
    });

    it('markNotificationAsRead', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        success: true,
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.markNotificationAsRead.initiate(100)
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/notifications/100/read');
      expect(init?.method).toBe('PATCH');

      fetchSpy.mockRestore();
    });

    it('markAllNotificationsAsRead', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        success: true,
        marked: 10,
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.markAllNotificationsAsRead.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/notifications/mark-all-read');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('deleteNotification', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        success: true,
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.deleteNotification.initiate(100)
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/notifications/100');
      expect(init?.method).toBe('DELETE');

      fetchSpy.mockRestore();
    });

    it('deleteAllReadNotifications', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        success: true,
        deleted: 15,
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.deleteAllReadNotifications.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/notifications/delete-all-read');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Documentos Rechazados', () => {
    it('getRejectedDocuments con filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getRejectedDocuments.initiate({
          page: 1,
          limit: 20,
          entityType: 'CHOFER',
          dadorId: 10,
        })
      );

      expect(fetchSpy).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('getRejectedStats', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          total: 50,
          byReason: { 'Calidad': 30, 'Vencido': 15, 'Incorrecto': 5 },
          byEntityType: { 'CHOFER': 25, 'CAMION': 15, 'ACOPLADO': 10 },
        },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getRejectedStats.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dashboard/rejected/stats');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Auditoría', () => {
    it('getAuditLogs con todos los filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getAuditLogs.initiate({
          page: 1,
          limit: 20,
          from: '2025-01-01',
          to: '2025-01-31',
          userEmail: 'user@example.com',
          userRole: 'ADMIN',
          method: 'POST',
          statusCode: 200,
          action: 'CREATE',
          entityType: 'CHOFER',
          entityId: 10,
          pathContains: '/choferes',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/audit/logs?');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=20');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints de Compliance', () => {
    it('getEquipoCompliance', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          equipoId: 10,
          semaforo: 'VIGENTE',
          documentos: [],
          resumen: { total: 5, vigentes: 4, porVencer: 1, vencidos: 0 },
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getEquipoCompliance.initiate({ id: 10 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/compliance/equipos/10');

      fetchSpy.mockRestore();
    });

    it('bulkSearchPlates con type truck', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          { id: 1, truckPlateNorm: 'ABC123' },
          { id: 2, truckPlateNorm: 'XYZ789' },
        ],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.bulkSearchPlates.initiate({
          plates: ['ABC123', 'XYZ789'],
          type: 'truck',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/clients/bulk-search');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('bulkSearchPlates con type trailer', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [{ id: 1, trailerPlateNorm: 'TRL123' }],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.bulkSearchPlates.initiate({
          plates: ['TRL123', 'TRL456'],
          type: 'trailer',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/clients/bulk-search');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('bulkSearchPlates sin type', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.bulkSearchPlates.initiate({
          plates: ['ABC123', 'TRL456'],
        })
      );

      expect(fetchSpy).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('requestClientsBulkZip', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        success: true,
        jobId: 'zip-job-123',
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.requestClientsBulkZip.initiate({
          equipoIds: [1, 2, 3, 4, 5],
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/clients/bulk-zip');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('getClientsZipJob', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        success: true,
        job: {
          id: 'zip-job-123',
          status: 'completed',
          progress: 100,
          signedUrl: 'https://storage.example.com/bulk.zip',
        },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getClientsZipJob.initiate({ jobId: 'zip-job-123' })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/clients/jobs/zip-job-123');

      fetchSpy.mockRestore();
    });

    it('getMisEquipos', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          { id: 1, driverDniNorm: '12345678', truckPlateNorm: 'ABC123', trailerPlateNorm: 'TRL456' },
        ],
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getMisEquipos.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/transportistas/mis-equipos');

      fetchSpy.mockRestore();
    });

    it('transportistasSearch con dni', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [{ id: 1, driverDniNorm: '12345678' }],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.transportistasSearch.initiate({
          dni: '12345678',
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url, init } = getRequestDetails(call);
      expect(url).toContain('/transportistas/search');
      expect(init?.method).toBe('POST');

      fetchSpy.mockRestore();
    });

    it('transportistasSearch con plate', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [{ id: 1, truckPlateNorm: 'ABC123' }],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.transportistasSearch.initiate({
          plate: 'ABC123',
        })
      );

      expect(fetchSpy).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('getDocumentosPorEquipo', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [
          {
            id: 1,
            templateName: 'DNI',
            entityType: 'CHOFER',
            status: 'VIGENTE',
            expiresAt: '2025-12-31',
            uploadedAt: '2025-01-20',
          },
        ],
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getDocumentosPorEquipo.initiate({ equipoId: 50 })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/clients/equipos/50/documentos');

      fetchSpy.mockRestore();
    });
  });

  describe('Endpoints Misc', () => {
    it('getStatsPorRol', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: {
          choferes: { total: 100, activos: 85 },
          camiones: { total: 80, activos: 70 },
          acoplados: { total: 60, activos: 50 },
        },
      }));
      const store = createStore();

      await store.dispatch(documentosApiSlice.endpoints.getStatsPorRol.initiate());

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/dashboard/stats-por-rol');

      fetchSpy.mockRestore();
    });

    it('getExtractedDataList con filtros', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createJsonResponse({
        data: [],
        pagination: { page: 2, limit: 25, total: 0, pages: 0 },
      }));
      const store = createStore();

      await store.dispatch(
        documentosApiSlice.endpoints.getExtractedDataList.initiate({
          entityType: 'CHOFER',
          page: 2,
          limit: 25,
        })
      );

      const call = fetchSpy.mock.calls[0] as FetchCall;
      const { url } = getRequestDetails(call);
      expect(url).toContain('/entities/extracted-data');

      fetchSpy.mockRestore();
    });
  });
});
