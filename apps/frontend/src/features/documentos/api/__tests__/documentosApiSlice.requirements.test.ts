// Tests de client requirements endpoints en documentosApiSlice
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('documentosApiSlice - Client Requirements Endpoints Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports useGetClientRequirementsQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetClientRequirementsQuery).toBeDefined();
  });

  it('exports useAddClientRequirementMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useAddClientRequirementMutation).toBeDefined();
  });

  it('exports useRemoveClientRequirementMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useRemoveClientRequirementMutation).toBeDefined();
  });

  it('exports useGetConsolidatedTemplatesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetConsolidatedTemplatesQuery).toBeDefined();
  });

  it('exports useLazyGetConsolidatedTemplatesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazyGetConsolidatedTemplatesQuery).toBeDefined();
  });

  it('exports useCheckMissingDocsForClientQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCheckMissingDocsForClientQuery).toBeDefined();
  });

  it('exports useLazyCheckMissingDocsForClientQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useLazyCheckMissingDocsForClientQuery).toBeDefined();
  });

  it('verify getClientRequirements endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getClientRequirements).toBeDefined();
  });

  it('verify addClientRequirement endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.addClientRequirement).toBeDefined();
  });

  it('verify removeClientRequirement endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.removeClientRequirement).toBeDefined();
  });

  it('verify getConsolidatedTemplates endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getConsolidatedTemplates).toBeDefined();
  });

  it('verify checkMissingDocsForClient endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.checkMissingDocsForClient).toBeDefined();
  });

  it('verify getClientRequirements provides ClientRequirements tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getClientRequirements;
    expect(endpoint?.init?.()?.providesTags).toContain('ClientRequirements');
  });

  it('verify getConsolidatedTemplates provides ClientRequirements tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getConsolidatedTemplates;
    expect(endpoint?.init?.()?.providesTags).toContain('ClientRequirements');
  });

  it('verify addClientRequirement invalidates ClientRequirements tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.addClientRequirement;
    expect(endpoint?.init?.()?.invalidatesTags).toContain('ClientRequirements');
  });

  it('verify removeClientRequirement invalidates ClientRequirements tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.removeClientRequirement;
    expect(endpoint?.init?.()?.invalidatesTags).toContain('ClientRequirements');
  });

  it('verify addClientRequirement uses POST method', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.addClientRequirement;
    expect(endpoint?.init?.()?.method).toBe('POST');
  });

  it('verify removeClientRequirement uses DELETE method', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.removeClientRequirement;
    expect(endpoint?.init?.()?.method).toBe('DELETE');
  });

  it('verify addClientRequirement transformResponse exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.addClientRequirement;
    expect(endpoint?.init?.()?.transformResponse).toBeDefined();
  });

  it('verify getClientRequirements transformResponse exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getClientRequirements;
    expect(endpoint?.init?.()?.transformResponse).toBeDefined();
  });

  it('verify getConsolidatedTemplates transformResponse exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getConsolidatedTemplates;
    expect(endpoint?.init?.()?.transformResponse).toBeDefined();
  });

  it('verify checkMissingDocsForClient transformResponse exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.checkMissingDocsForClient;
    expect(endpoint?.init?.()?.transformResponse).toBeDefined();
  });
});
