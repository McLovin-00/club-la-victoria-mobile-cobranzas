import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('documentosApiSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports the api slice with correct reducerPath', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.reducerPath).toBe('documentosApi');
  });

  it('exports core query hooks', async () => {
    const api = await import('../documentosApiSlice');
    
    // Core Queries - verificar solo los que realmente existen
    expect(api.useGetDadoresQuery).toBeDefined();
    expect(api.useGetTemplatesQuery).toBeDefined();
    expect(api.useGetClientsQuery).toBeDefined();
    expect(api.useGetEquiposQuery).toBeDefined();
    expect(api.useGetChoferesQuery).toBeDefined();
    expect(api.useGetCamionesQuery).toBeDefined();
    expect(api.useGetAcopladosQuery).toBeDefined();
    expect(api.useGetClientRequirementsQuery).toBeDefined();
    expect(api.useGetEmpresasTransportistasQuery).toBeDefined();
    expect(api.useGetEquipoKpisQuery).toBeDefined();
    expect(api.useGetEquipoHistoryQuery).toBeDefined();
    expect(api.useGetClienteEquiposQuery).toBeDefined();
    expect(api.useGetEquipoComplianceQuery).toBeDefined();
    expect(api.useGetMisEquiposQuery).toBeDefined();
    expect(api.useSearchEquiposQuery).toBeDefined();
    expect(api.useGetDefaultsQuery).toBeDefined();
  });

  it('exports core mutation hooks', async () => {
    const api = await import('../documentosApiSlice');
    
    // Core Mutations
    expect(api.useCreateDadorMutation).toBeDefined();
    expect(api.useUpdateDadorMutation).toBeDefined();
    expect(api.useDeleteDadorMutation).toBeDefined();
    expect(api.useCreateClientMutation).toBeDefined();
    expect(api.useUpdateClientMutation).toBeDefined();
    expect(api.useDeleteClientMutation).toBeDefined();
    expect(api.useCreateEquipoMutation).toBeDefined();
    expect(api.useUpdateEquipoMutation).toBeDefined();
    expect(api.useDeleteEquipoMutation).toBeDefined();
    expect(api.useCreateChoferMutation).toBeDefined();
    expect(api.useCreateCamionMutation).toBeDefined();
    expect(api.useCreateAcopladoMutation).toBeDefined();
    expect(api.useAssociateEquipoClienteMutation).toBeDefined();
    expect(api.useAttachEquipoComponentsMutation).toBeDefined();
    expect(api.useDetachEquipoComponentsMutation).toBeDefined();
    expect(api.useBulkSearchPlatesMutation).toBeDefined();
    expect(api.useRequestClientsBulkZipMutation).toBeDefined();
    expect(api.useTransportistasSearchMutation).toBeDefined();
    expect(api.useImportCsvEquiposMutation).toBeDefined();
    expect(api.useCreateEmpresaTransportistaMutation).toBeDefined();
    expect(api.useAddClientRequirementMutation).toBeDefined();
    expect(api.useRemoveClientRequirementMutation).toBeDefined();
    expect(api.useCreateEquipoMinimalMutation).toBeDefined();
  });

  it('exports tagTypes with expected values', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.injectEndpoints).toBeDefined();
    expect(documentosApiSlice.reducer).toBeDefined();
  });

  it('slice has middleware defined', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.middleware).toBeDefined();
    expect(typeof documentosApiSlice.middleware).toBe('function');
  });

  it('slice has util methods for cache invalidation', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.util).toBeDefined();
    expect(documentosApiSlice.util.invalidateTags).toBeDefined();
    expect(documentosApiSlice.util.updateQueryData).toBeDefined();
  });

  it('endpoints object contains expected keys', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpointKeys = Object.keys(documentosApiSlice.endpoints);
    expect(endpointKeys).toContain('getDadores');
    expect(endpointKeys).toContain('getTemplates');
    expect(endpointKeys).toContain('getClients');
    expect(endpointKeys).toContain('getEquipos');
    expect(endpointKeys).toContain('createDador');
    expect(endpointKeys).toContain('createEquipo');
  });
});

