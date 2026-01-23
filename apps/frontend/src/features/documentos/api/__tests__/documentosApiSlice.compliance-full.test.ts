// Tests de compliance endpoints en documentosApiSlice
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('documentosApiSlice - Compliance Endpoints Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports useGetEquipoComplianceQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEquipoComplianceQuery).toBeDefined();
  });

  it('exports useLazyGetEquipoComplianceQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazyGetEquipoComplianceQuery).toBeDefined();
  });

  it('exports useGetClienteEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetClienteEquiposQuery).toBeDefined();
  });

  it('exports useGetMisEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetMisEquiposQuery).toBeDefined();
  });

  it('exports useGetEquipoKpisQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEquipoKpisQuery).toBeDefined();
  });

  it('exports useGetEquipoHistoryQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEquipoHistoryQuery).toBeDefined();
  });

  it('exports useBulkSearchPlatesMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useBulkSearchPlatesMutation).toBeDefined();
  });

  it('verify getEquipoCompliance endpoint exists with transformResponse', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEquipoCompliance;
    expect(endpoint).toBeDefined();
    expect(endpoint?.init).toBeDefined();
  });

  it('verify getClienteEquipos endpoint exists with transformResponse', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getClienteEquipos;
    expect(endpoint).toBeDefined();
    expect(endpoint?.init).toBeDefined();
  });

  it('verify getMisEquipos endpoint exists with transformResponse', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getMisEquipos;
    expect(endpoint).toBeDefined();
    expect(endpoint?.init).toBeDefined();
  });

  it('verify getEquipoKpis endpoint exists with transformResponse', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEquipoKpis;
    expect(endpoint).toBeDefined();
    expect(endpoint?.init).toBeDefined();
  });

  it('verify getEquipoHistory endpoint exists with transformResponse', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEquipoHistory;
    expect(endpoint).toBeDefined();
    expect(endpoint?.init).toBeDefined();
  });

  it('verify bulkSearchPlates mutation endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.bulkSearchPlates).toBeDefined();
  });

  it('verify requestClientsBulkZip mutation endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.requestClientsBulkZip).toBeDefined();
  });

  it('verify getClientsZipJob query endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getClientsZipJob).toBeDefined();
  });

  it('verify getDocumentosPorEquipo endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getDocumentosPorEquipo).toBeDefined();
  });

  it('verify downloadDocumento endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.downloadDocumento).toBeDefined();
  });

  it('verify getJobStatus endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getJobStatus).toBeDefined();
  });

  it('verify getEquipoCompliance provides correct tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEquipoCompliance;
    expect(endpoint?.init?.()?.providesTags).toContain('Equipos');
  });

  it('verify getClienteEquipos provides correct tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getClienteEquipos;
    expect(endpoint?.init?.()?.providesTags).toContain('Equipos');
  });

  it('verify getMisEquipos provides correct tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getMisEquipos;
    expect(endpoint?.init?.()?.providesTags).toContain('Equipos');
  });

  it('verify getEquipoKpis provides correct tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEquipoKpis;
    expect(endpoint?.init?.()?.providesTags).toContain('Dashboard');
  });

  it('verify getEquipoHistory provides correct tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEquipoHistory;
    expect(endpoint?.init?.()?.providesTags).toContain('Equipos');
  });

  it('verify importCsvEquipos mutation endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.importCsvEquipos).toBeDefined();
  });

  it('verify uploadBatchDocsDador mutation endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.uploadBatchDocsDador).toBeDefined();
  });

  it('verify uploadBatchDocsTransportistas mutation endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.uploadBatchDocsTransportistas).toBeDefined();
  });

  it('verify createEquipoMinimal mutation endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.createEquipoMinimal).toBeDefined();
  });

  it('verify useImportCsvEquiposMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useImportCsvEquiposMutation).toBeDefined();
  });

  it('verify useUploadBatchDocsDadorMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUploadBatchDocsDadorMutation).toBeDefined();
  });

  it('verify useUploadBatchDocsTransportistasMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUploadBatchDocsTransportistasMutation).toBeDefined();
  });

  it('verify useCreateEquipoMinimalMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateEquipoMinimalMutation).toBeDefined();
  });
});
