// Tests de search y autocomplete endpoints en documentosApiSlice
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('documentosApiSlice - Search Endpoints Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports useSearchEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useSearchEquiposQuery).toBeDefined();
  });

  it('exports useLazySearchEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazySearchEquiposQuery).toBeDefined();
  });

  it('exports useSearchEquiposPagedQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useSearchEquiposPagedQuery).toBeDefined();
  });

  it('exports useLazySearchEquiposPagedQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazySearchEquiposPagedQuery).toBeDefined();
  });

  it('exports useSearchEquiposByDnisMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useSearchEquiposByDnisMutation).toBeDefined();
  });

  it('exports useTransportistasSearchMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useTransportistasSearchMutation).toBeDefined();
  });

  it('exports useGetDefaultsQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetDefaultsQuery).toBeDefined();
  });

  it('exports useGetDadoresQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetDadoresQuery).toBeDefined();
  });

  it('exports useGetClientsQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetClientsQuery).toBeDefined();
  });

  it('exports useGetChoferesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetChoferesQuery).toBeDefined();
  });

  it('exports useGetCamionesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetCamionesQuery).toBeDefined();
  });

  it('exports useGetAcopladosQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetAcopladosQuery).toBeDefined();
  });

  it('exports useGetEmpresasTransportistasQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEmpresasTransportistasQuery).toBeDefined();
  });

  it('exports useDownloadVigentesBulkMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDownloadVigentesBulkMutation).toBeDefined();
  });

  // Verify endpoint existence
  it('verify searchEquipos endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.searchEquipos).toBeDefined();
  });

  it('verify searchEquiposPaged endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.searchEquiposPaged).toBeDefined();
  });

  it('verify searchEquiposByDnis endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.searchEquiposByDnis).toBeDefined();
  });

  it('verify transportistasSearch endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.transportistasSearch).toBeDefined();
  });

  it('verify getDefaults endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getDefaults).toBeDefined();
  });

  it('verify getDadores endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getDadores).toBeDefined();
  });

  it('verify getClients endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getClients).toBeDefined();
  });

  it('verify getChoferes endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getChoferes).toBeDefined();
  });

  it('verify getCamiones endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getCamiones).toBeDefined();
  });

  it('verify getAcoplados endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getAcoplados).toBeDefined();
  });

  it('verify getEmpresasTransportistas endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEmpresasTransportistas).toBeDefined();
  });

  it('verify downloadVigentesBulk endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.downloadVigentesBulk).toBeDefined();
  });

  // Verify tags
  it('verify searchEquipos provides Search tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.searchEquipos;
    expect(endpoint?.init?.()?.providesTags).toContain('Search');
  });

  it('verify searchEquiposPaged provides Search tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.searchEquiposPaged;
    expect(endpoint?.init?.()?.providesTags).toContain('Search');
  });

  it('verify getDadores provides Clients tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getDadores;
    expect(endpoint?.init?.()?.providesTags).toContain('Clients');
  });

  it('verify getClients provides Clients tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getClients;
    expect(endpoint?.init?.()?.providesTags).toContain('Clients');
  });

  it('verify getChoferes provides Maestros tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getChoferes;
    expect(endpoint?.init?.()?.providesTags).toContain('Maestros');
  });

  it('verify getCamiones provides Maestros tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getCamiones;
    expect(endpoint?.init?.()?.providesTags).toContain('Maestros');
  });

  it('verify getAcoplados provides Maestros tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getAcoplados;
    expect(endpoint?.init?.()?.providesTags).toContain('Maestros');
  });

  it('verify getEmpresasTransportistas provides EmpresasTransportistas tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEmpresasTransportistas;
    expect(endpoint?.init?.()?.providesTags).toContain('EmpresasTransportistas');
  });

  it('verify getDefaults provides Clients tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getDefaults;
    expect(endpoint?.init?.()?.providesTags).toContain('Clients');
  });
});
