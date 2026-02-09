// Tests de empresas transportistas endpoints en documentosApiSlice
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('documentosApiSlice - Empresas Transportistas Endpoints Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports useGetEmpresasTransportistasQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEmpresasTransportistasQuery).toBeDefined();
  });

  it('exports useGetEmpresaTransportistaByIdQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEmpresaTransportistaByIdQuery).toBeDefined();
  });

  it('exports useCreateEmpresaTransportistaMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateEmpresaTransportistaMutation).toBeDefined();
  });

  it('exports useUpdateEmpresaTransportistaMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateEmpresaTransportistaMutation).toBeDefined();
  });

  it('exports useDeleteEmpresaTransportistaMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteEmpresaTransportistaMutation).toBeDefined();
  });

  it('exports useGetEmpresaTransportistaChoferesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEmpresaTransportistaChoferesQuery).toBeDefined();
  });

  it('exports useGetEmpresaTransportistaEquiposQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetEmpresaTransportistaEquiposQuery).toBeDefined();
  });

  it('verify getEmpresasTransportistas endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEmpresasTransportistas).toBeDefined();
  });

  it('verify getEmpresaTransportistaById endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEmpresaTransportistaById).toBeDefined();
  });

  it('verify createEmpresaTransportista endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.createEmpresaTransportista).toBeDefined();
  });

  it('verify updateEmpresaTransportista endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.updateEmpresaTransportista).toBeDefined();
  });

  it('verify deleteEmpresaTransportista endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.deleteEmpresaTransportista).toBeDefined();
  });

  it('verify getEmpresaTransportistaChoferes endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEmpresaTransportistaChoferes).toBeDefined();
  });

  it('verify getEmpresaTransportistaEquipos endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getEmpresaTransportistaEquipos).toBeDefined();
  });

  it('verify getEmpresasTransportistas provides EmpresasTransportistas tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEmpresasTransportistas;
    expect(endpoint?.init?.()?.providesTags).toContain('EmpresasTransportistas');
  });

  it('verify getEmpresaTransportistaById provides EmpresasTransportistas tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEmpresaTransportistaById;
    const providesTags = endpoint?.init?.()?.providesTags;
    expect(providesTags).toBeTruthy();
  });

  it('verify createEmpresaTransportista invalidates EmpresasTransportistas tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.createEmpresaTransportista;
    expect(endpoint?.init?.()?.invalidatesTags).toContain('EmpresasTransportistas');
  });

  it('verify updateEmpresaTransportista invalidates EmpresasTransportistas tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.updateEmpresaTransportista;
    expect(endpoint?.init?.()?.invalidatesTags).toContain('EmpresasTransportistas');
  });

  it('verify deleteEmpresaTransportista invalidates EmpresasTransportistas tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.deleteEmpresaTransportista;
    expect(endpoint?.init?.()?.invalidatesTags).toContain('EmpresasTransportistas');
  });

  it('verify getEmpresaTransportistaChoferes provides correct tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEmpresaTransportistaChoferes;
    const providesTags = endpoint?.init?.()?.providesTags;
    expect(providesTags).toContain('EmpresasTransportistas');
    expect(providesTags).toContain('Maestros');
  });

  it('verify getEmpresaTransportistaEquipos provides correct tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getEmpresaTransportistaEquipos;
    const providesTags = endpoint?.init?.()?.providesTags;
    expect(providesTags).toContain('EmpresasTransportistas');
    expect(providesTags).toContain('Equipos');
  });

  it('verify createEmpresaTransportista uses POST method', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.createEmpresaTransportista;
    expect(endpoint?.init?.()?.method).toBe('POST');
  });

  it('verify updateEmpresaTransportista uses PUT method', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.updateEmpresaTransportista;
    expect(endpoint?.init?.()?.method).toBe('PUT');
  });

  it('verify deleteEmpresaTransportista uses DELETE method', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.deleteEmpresaTransportista;
    expect(endpoint?.init?.()?.method).toBe('DELETE');
  });

  it('verify transportistasSearch endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.transportistasSearch).toBeDefined();
  });
});
