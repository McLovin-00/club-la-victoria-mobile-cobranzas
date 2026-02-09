/**
 * Tests adicionales para cubrir líneas faltantes en useWhatsAppNotifications
 * Enfocado en las líneas 114, 134, 228-229, 252-253, 259-260, 280-281, 287-288, 307-308, 313-314
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../store/apiSlice';

// Crear store con auth
const createMockStore = (hasToken = true) => configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: () => ({
      token: hasToken ? 'test-token' : null,
      user: hasToken ? { empresaId: 1 } : null,
    }),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
};

describe('useWhatsAppNotifications - cobertura líneas faltantes', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;
  let consoleSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  describe('fetchInstances error handling (línea 114)', () => {
    it('setea instances a array vacío cuando fetch falla', async () => {
      // Config OK, instances FAIL, templates OK
      fetchSpy.mockImplementation((url) => {
        const urlStr = String(url);
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances')) {
          return Promise.resolve(new Response('', { status: 500 }));
        }
        if (urlStr.includes('/templates')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.instances).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching Evolution instances:', expect.any(Error));
    });
  });

  describe('fetchTemplates error handling (línea 134)', () => {
    it('setea templates a array vacío cuando fetch falla', async () => {
      // Config OK, instances OK, templates FAIL
      fetchSpy.mockImplementation((url) => {
        const urlStr = String(url);
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/templates')) {
          return Promise.resolve(new Response('', { status: 500 }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.templates).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching notification templates:', expect.any(Error));
    });
  });

  describe('getInstanceStatus error handling (líneas 228-229)', () => {
    it('retorna "error" cuando fetch falla', async () => {
      fetchSpy.mockImplementation((url) => {
        const urlStr = String(url);
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances') && urlStr.includes('/status')) {
          return Promise.reject(new Error('Network error'));
        }
        if (urlStr.includes('/instances')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/templates')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let status: string = 'unknown';
      await act(async () => {
        status = await result.current.getInstanceStatus('test-instance');
      });

      expect(status).toBe('error');
      expect(consoleSpy).toHaveBeenCalledWith('Error getting instance status:', expect.any(Error));
    });

    it('retorna "error" cuando response.ok es false', async () => {
      fetchSpy.mockImplementation((url) => {
        const urlStr = String(url);
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances') && urlStr.includes('/status')) {
          return Promise.resolve(new Response('', { status: 500 }));
        }
        if (urlStr.includes('/instances')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/templates')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let status: string = 'unknown';
      await act(async () => {
        status = await result.current.getInstanceStatus('test-instance');
      });

      expect(status).toBe('error');
    });

    it('retorna "disconnected" cuando data.status es undefined', async () => {
      fetchSpy.mockImplementation((url) => {
        const urlStr = String(url);
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances') && urlStr.includes('/status')) {
          return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/templates')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let status: string = 'unknown';
      await act(async () => {
        status = await result.current.getInstanceStatus('test-instance');
      });

      expect(status).toBe('disconnected');
    });
  });

  describe('createTemplate error handling (líneas 252-253, 259-260)', () => {
    it('setea error y lanza excepción cuando response no es ok', async () => {
      let postCalled = false;
      
      fetchSpy.mockImplementation((url, options) => {
        const urlStr = String(url);
        const method = options && (options as RequestInit).method;
        
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        // POST request fails
        if (method === 'POST') {
          postCalled = true;
          return Promise.resolve(new Response(JSON.stringify({ message: 'Template creation failed' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
        }
        // GET templates OK
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let threwError = false;
      await act(async () => {
        try {
          await result.current.createTemplate({
            name: 'Test',
            message: 'Hello',
            variables: [],
            type: 'general',
          });
        } catch (e) {
          threwError = true;
        }
      });

      expect(postCalled).toBe(true);
      expect(threwError).toBe(true);
      expect(result.current.error).toContain('Template creation failed');
    });

    it('usa mensaje de error por defecto cuando response.json() falla', async () => {
      fetchSpy.mockImplementation((url, options) => {
        const urlStr = String(url);
        const method = options && (options as RequestInit).method;
        
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        // POST fails with non-JSON response
        if (method === 'POST') {
          return Promise.resolve(new Response('Not JSON', { status: 400 }));
        }
        // GET templates OK
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let threwError = false;
      let errorMessage = '';
      await act(async () => {
        try {
          await result.current.createTemplate({
            name: 'Test',
            message: 'Hello',
            variables: [],
            type: 'general',
          });
        } catch (e: any) {
          threwError = true;
          errorMessage = e.message;
        }
      });

      expect(threwError).toBe(true);
      expect(errorMessage).toContain('HTTP error');
    });
  });

  describe('updateTemplate error handling (líneas 280-281, 287-288)', () => {
    it('setea error y lanza excepción cuando PATCH falla', async () => {
      fetchSpy.mockImplementation((url, options) => {
        const urlStr = String(url);
        const method = options && (options as RequestInit).method;
        
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        // PATCH fails
        if (method === 'PATCH') {
          return Promise.resolve(new Response(JSON.stringify({ message: 'Update failed' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
        }
        // GET templates OK
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: 't1', name: 'T1', message: 'M', variables: [], type: 'general' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let threwError = false;
      await act(async () => {
        try {
          await result.current.updateTemplate('t1', { name: 'Updated' });
        } catch (e) {
          threwError = true;
        }
      });

      expect(threwError).toBe(true);
      expect(result.current.error).toContain('Update failed');
    });
  });

  describe('deleteTemplate error handling (líneas 307-308, 313-314)', () => {
    it('setea error y lanza excepción cuando DELETE falla', async () => {
      fetchSpy.mockImplementation((url, options) => {
        const urlStr = String(url);
        const method = options && (options as RequestInit).method;
        
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        // DELETE fails
        if (method === 'DELETE') {
          return Promise.resolve(new Response(JSON.stringify({ message: 'Delete failed' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
        }
        // GET templates OK
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: 't1', name: 'T1', message: 'M', variables: [], type: 'general' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let threwError = false;
      await act(async () => {
        try {
          await result.current.deleteTemplate('t1');
        } catch (e) {
          threwError = true;
        }
      });

      expect(threwError).toBe(true);
      expect(result.current.error).toContain('Delete failed');
    });
  });

  describe('refreshInstances', () => {
    it('llama a fetchInstances', async () => {
      let instancesCallCount = 0;

      fetchSpy.mockImplementation((url) => {
        const urlStr = String(url);
        if (urlStr.includes('/config')) {
          return Promise.resolve(new Response(JSON.stringify({
            data: { enabled: true, instanceId: 'i1', phoneNumber: '123', templates: {} }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/instances')) {
          instancesCallCount++;
          return Promise.resolve(new Response(JSON.stringify({ data: [{ id: 'i1', name: 'Instance 1', serverUrl: '', apiKey: '', status: 'connected' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (urlStr.includes('/templates')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore();
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = instancesCallCount;

      await act(async () => {
        await result.current.refreshInstances();
      });

      expect(instancesCallCount).toBe(initialCallCount + 1);
    });
  });

  describe('sin authToken', () => {
    it('no hace fetch cuando no hay token', async () => {
      const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
      const store = createMockStore(false);
      const { result } = renderHook(() => useWhatsAppNotifications(), {
        wrapper: createWrapper(store),
      });

      // Sin token, no debería hacer fetch pero isLoading inicia en true
      expect(result.current.config).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});

