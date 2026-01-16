/**
 * Tests completos para useWhatsAppNotifications hook
 * Verifica la gestión de configuración y notificaciones de WhatsApp
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Crear store mock con auth
const createMockStore = (token = 'test-token', empresaId = 1) => configureStore({
  reducer: {
    auth: () => ({
      token,
      user: { empresaId },
    }),
  },
});

// Wrapper con Provider
const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
};

describe('useWhatsAppNotifications - renderHook tests', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  const mockConfig = {
    enabled: true,
    instanceId: 'inst-1',
    phoneNumber: '+5411555555',
    templates: {
      documentExpiry: 'tpl-1',
      urgentAlert: 'tpl-2',
      equipmentUpdate: 'tpl-3',
      general: 'tpl-4',
    },
  };

  const mockInstances = [
    {
      id: 'inst-1',
      name: 'Instance 1',
      serverUrl: 'http://localhost:8080',
      apiKey: 'key-1',
      status: 'connected',
    },
  ];

  const mockTemplates = [
    {
      id: 'tpl-1',
      name: 'Document Expiry',
      message: 'Your document expires on {{date}}',
      variables: ['date'],
      type: 'document_expiry',
    },
    {
      id: 'tpl-2',
      name: 'Urgent Alert',
      message: 'Urgent: {{message}}',
      variables: ['message'],
      type: 'urgent_alert',
    },
  ];

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('debe iniciar con isLoading en true', async () => {
    // Mock que nunca resuelve para verificar estado inicial
    fetchSpy.mockImplementation(() => new Promise(() => {}));

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.config).toBeNull();
    expect(result.current.instances).toEqual([]);
    expect(result.current.templates).toEqual([]);
  });

  it('debe cargar config, instances y templates exitosamente', async () => {
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      if (String(url).includes('evolution/instances') && !String(url).includes('status')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockInstances }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/templates') && !String(url).includes('POST')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockTemplates }), { status: 200 })
        );
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

    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.instances).toEqual(mockInstances);
    expect(result.current.templates).toEqual(mockTemplates);
    expect(result.current.error).toBeNull();
  });

  it('debe manejar error al cargar config', async () => {
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('401');
  });

  it('updateConfig debe llamar a fetch con PUT cuando config está cargado', async () => {
    fetchSpy.mockImplementation((url, options) => {
      const method = (options as RequestInit)?.method;
      if (String(url).includes('whatsapp/config') && method === 'PUT') {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { ...mockConfig, enabled: false } }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    // Esperar a que config sea cargado (no null)
    await waitFor(() => {
      expect(result.current.config).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    // Verificar que config está definido antes de llamar updateConfig
    expect(result.current.config).toBeDefined();
    expect(result.current.config?.enabled).toBe(true);

    // Limpiar las llamadas anteriores a fetch
    fetchSpy.mockClear();
    
    // Re-mockear fetch para PUT
    fetchSpy.mockImplementation((url, options) => {
      const method = (options as RequestInit)?.method;
      if (String(url).includes('whatsapp/config') && method === 'PUT') {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { ...mockConfig, enabled: false } }), { status: 200 })
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    await act(async () => {
      await result.current.updateConfig({ enabled: false });
    });

    // Verificar que se llamó a fetch con PUT
    const putCalls = fetchSpy.mock.calls.filter(call => 
      String(call[0]).includes('whatsapp/config') && 
      (call[1] as RequestInit)?.method === 'PUT'
    );
    expect(putCalls.length).toBeGreaterThan(0);
    expect(result.current.isUpdating).toBe(false);
  });

  it('updateConfig debe manejar errores de API', async () => {
    fetchSpy.mockImplementation((url, options) => {
      const method = (options as RequestInit)?.method;
      if (String(url).includes('whatsapp/config') && method === 'PUT') {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Invalid config' }), { status: 400 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.config).toBeDefined();
    });

    // updateConfig puede rechazar o establecer error en el estado
    try {
      await act(async () => {
        await result.current.updateConfig({ enabled: false });
      });
    } catch (e) {
      // Error esperado
    }

    // Verificar que isUpdating vuelve a false
    expect(result.current.isUpdating).toBe(false);
  });

  it('sendTestMessage debe llamar a fetch con POST', async () => {
    fetchSpy.mockImplementation((url, options) => {
      const method = (options as RequestInit)?.method;
      if (String(url).includes('whatsapp/test') && method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, messageId: 'msg-123' }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendTestMessage('+5411555555', 'tpl-1', { date: '2024-12-31' });
    });

    // Verificar que se llamó a fetch con POST al endpoint de test
    const postCalls = fetchSpy.mock.calls.filter(call => 
      String(call[0]).includes('whatsapp/test') && 
      (call[1] as RequestInit)?.method === 'POST'
    );
    expect(postCalls.length).toBeGreaterThan(0);
    expect(result.current.isUpdating).toBe(false);
  });

  it('sendTestMessage debe manejar errores de API', async () => {
    fetchSpy.mockImplementation((url, options) => {
      const method = (options as RequestInit)?.method;
      if (String(url).includes('whatsapp/test') && method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Phone not registered' }), { status: 400 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // sendTestMessage puede rechazar o establecer error en el estado
    try {
      await act(async () => {
        await result.current.sendTestMessage('+5411555555', 'tpl-1');
      });
    } catch (e) {
      // Error esperado
    }

    // Verificar que isUpdating vuelve a false
    expect(result.current.isUpdating).toBe(false);
  });

  it('getInstanceStatus debe obtener el estado de una instancia', async () => {
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('instances/inst-1/status')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { status: 'connected' } }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let status: string = '';
    await act(async () => {
      status = await result.current.getInstanceStatus('inst-1');
    });

    expect(status).toBe('connected');
  });

  it('getInstanceStatus debe retornar error cuando falla', async () => {
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('instances/inst-1/status')) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let status: string = '';
    await act(async () => {
      status = await result.current.getInstanceStatus('inst-1');
    });

    expect(status).toBe('error');
  });

  it('refreshInstances debe recargar las instancias', async () => {
    const refreshedInstances = [
      ...mockInstances,
      { id: 'inst-2', name: 'Instance 2', serverUrl: 'http://localhost:8081', apiKey: 'key-2', status: 'disconnected' },
    ];

    let callCount = 0;
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('evolution/instances') && !String(url).includes('status')) {
        callCount++;
        const data = callCount === 1 ? mockInstances : refreshedInstances;
        return Promise.resolve(
          new Response(JSON.stringify({ data }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.instances).toHaveLength(1);

    await act(async () => {
      await result.current.refreshInstances();
    });

    expect(result.current.instances).toHaveLength(2);
  });

  it('createTemplate debe crear un nuevo template', async () => {
    const newTemplate = {
      id: 'tpl-new',
      name: 'New Template',
      message: 'Hello {{name}}',
      variables: ['name'],
      type: 'general' as const,
    };

    fetchSpy.mockImplementation((url, options) => {
      const method = (options as RequestInit)?.method;
      if (String(url).includes('whatsapp/templates') && method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ data: newTemplate }), { status: 201 })
        );
      }
      if (String(url).includes('whatsapp/templates')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockTemplates }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createTemplate({
        name: 'New Template',
        message: 'Hello {{name}}',
        variables: ['name'],
        type: 'general',
      });
    });

    expect(result.current.templates).toHaveLength(3);
    expect(result.current.templates[2].id).toBe('tpl-new');
  });

  it('updateTemplate debe actualizar un template existente', async () => {
    const updatedTemplate = {
      ...mockTemplates[0],
      message: 'Updated message {{date}}',
    };

    fetchSpy.mockImplementation((url, options) => {
      const method = (options as RequestInit)?.method;
      if (String(url).includes('whatsapp/templates/tpl-1') && method === 'PATCH') {
        return Promise.resolve(
          new Response(JSON.stringify({ data: updatedTemplate }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/templates')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockTemplates }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateTemplate('tpl-1', { message: 'Updated message {{date}}' });
    });

    expect(result.current.templates[0].message).toBe('Updated message {{date}}');
  });

  it('deleteTemplate debe eliminar un template', async () => {
    fetchSpy.mockImplementation((url, options) => {
      const method = (options as RequestInit)?.method;
      if (String(url).includes('whatsapp/templates/tpl-1') && method === 'DELETE') {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/templates')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockTemplates }), { status: 200 })
        );
      }
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockConfig }), { status: 200 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toHaveLength(2);

    await act(async () => {
      await result.current.deleteTemplate('tpl-1');
    });

    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].id).toBe('tpl-2');
  });

  it('no debe cargar datos si no hay authToken', async () => {
    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore('', 1); // sin token
    renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    // No debería hacer fetch sin token
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('debe usar config por defecto cuando la API no retorna data', async () => {
    fetchSpy.mockImplementation((url) => {
      if (String(url).includes('whatsapp/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({}), { status: 200 }) // sin data
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    });

    const { useWhatsAppNotifications } = await import('../useWhatsAppNotifications');
    const store = createMockStore();
    const { result } = renderHook(() => useWhatsAppNotifications(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Debería tener config por defecto
    expect(result.current.config).toEqual({
      enabled: false,
      instanceId: '',
      phoneNumber: '',
      templates: {
        documentExpiry: '',
        urgentAlert: '',
        equipmentUpdate: '',
        general: '',
      },
    });
  });
});

