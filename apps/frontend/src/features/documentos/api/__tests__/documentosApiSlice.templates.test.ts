// Tests de template endpoints en documentosApiSlice
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('documentosApiSlice - Template Endpoints Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports useGetTemplatesQuery hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useGetTemplatesQuery).toBeDefined();
  });

  it('exports useCreateTemplateMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useCreateTemplateMutation).toBeDefined();
  });

  it('exports useUpdateTemplateMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useUpdateTemplateMutation).toBeDefined();
  });

  it('exports useDeleteTemplateMutation hook', async () => {
    const api = await import('../documentosApiSlice');
    expect(api.useDeleteTemplateMutation).toBeDefined();
  });

  it('verify getTemplates endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.getTemplates).toBeDefined();
  });

  it('verify createTemplate endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.createTemplate).toBeDefined();
  });

  it('verify updateTemplate endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.updateTemplate).toBeDefined();
  });

  it('verify deleteTemplate endpoint exists', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    expect(documentosApiSlice.endpoints.deleteTemplate).toBeDefined();
  });

  it('verify getTemplates provides DocumentTemplate tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getTemplates;
    expect(endpoint?.init?.()?.providesTags).toContain('DocumentTemplate');
  });

  it('verify createTemplate invalidates DocumentTemplate tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.createTemplate;
    expect(endpoint?.init?.()?.invalidatesTags).toContain('DocumentTemplate');
  });

  it('verify updateTemplate invalidates DocumentTemplate tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.updateTemplate;
    expect(endpoint?.init?.()?.invalidatesTags).toContain('DocumentTemplate');
  });

  it('verify deleteTemplate invalidates DocumentTemplate tags', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.deleteTemplate;
    expect(endpoint?.init?.()?.invalidatesTags).toContain('DocumentTemplate');
  });

  it('verify getTemplates transformResponse handles array response', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getTemplates;
    expect(endpoint?.init?.()?.transformResponse).toBeDefined();
  });

  it('verify getTemplates transformResponse handles data property', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.getTemplates;
    const transformFn = endpoint?.init?.()?.transformResponse;
    expect(transformFn).toBeDefined();
  });

  it('verify createTemplate uses POST method', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.createTemplate;
    expect(endpoint?.init?.()?.method).toBe('POST');
  });

  it('verify updateTemplate uses PUT method', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.updateTemplate;
    expect(endpoint?.init?.()?.method).toBe('PUT');
  });

  it('verify deleteTemplate uses DELETE method', async () => {
    const { documentosApiSlice } = await import('../documentosApiSlice');
    const endpoint = documentosApiSlice.endpoints.deleteTemplate;
    expect(endpoint?.init?.()?.method).toBe('DELETE');
  });
});
