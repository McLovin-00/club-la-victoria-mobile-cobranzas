/**
 * Tests completos para useProfile hook
 * Verifica la gestión del perfil de usuario
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Usuario mock para auth store
const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '+54 11 1234-5678',
  avatar: 'http://example.com/avatar.jpg',
  role: 'TRANSPORTISTA',
  empresaId: 1,
  preferences: {
    notifications: true,
    darkMode: false,
    language: 'es',
    cacheEnabled: true,
    compactMode: false,
  },
};

// Crear store mock con auth
const createMockStore = (user = mockUser, token = 'test-token') => configureStore({
  reducer: {
    auth: () => ({
      token,
      user,
    }),
  },
});

// Wrapper con Provider
const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
};

describe('useProfile - renderHook tests', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('debe inicializar profile desde el user de auth', async () => {
    const { useProfile } = await import('../useProfile');
    const store = createMockStore();
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toBeDefined();
    expect(result.current.profile?.username).toBe('testuser');
    expect(result.current.profile?.email).toBe('test@example.com');
    expect(result.current.profile?.firstName).toBe('Test');
    expect(result.current.profile?.preferences?.notifications).toBe(true);
  });

  it('debe usar preferences por defecto si user no tiene preferences', async () => {
    const userWithoutPrefs = { ...mockUser, preferences: undefined };
    const { useProfile } = await import('../useProfile');
    const store = createMockStore(userWithoutPrefs);
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile?.preferences?.notifications).toBe(true);
    expect(result.current.profile?.preferences?.darkMode).toBe(false);
    expect(result.current.profile?.preferences?.language).toBe('es');
  });

  it('updateProfile debe actualizar el perfil exitosamente', async () => {
    const updatedProfile = {
      ...mockUser,
      firstName: 'Updated',
      lastName: 'Name',
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: updatedProfile }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore();
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    await act(async () => {
      await result.current.updateProfile({ firstName: 'Updated', lastName: 'Name' });
    });

    expect(result.current.profile?.firstName).toBe('Updated');
    expect(result.current.profile?.lastName).toBe('Name');
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('updateProfile debe manejar errores de la API', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Validation failed' }), {
        status: 400,
        statusText: 'Bad Request',
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore();
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    // updateProfile puede rechazar o establecer error en el estado
    try {
      await act(async () => {
        await result.current.updateProfile({ firstName: 'Bad' });
      });
    } catch (e) {
      // Error esperado
    }

    // Verificar que isUpdating vuelve a false
    expect(result.current.isUpdating).toBe(false);
  });

  it('updatePreferences debe actualizar preferencias exitosamente', async () => {
    const updatedPreferences = {
      notifications: false,
      darkMode: true,
      language: 'en',
      cacheEnabled: false,
      compactMode: true,
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: updatedPreferences }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore();
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    await act(async () => {
      await result.current.updatePreferences({ darkMode: true, compactMode: true });
    });

    expect(result.current.profile?.preferences?.darkMode).toBe(true);
    expect(result.current.profile?.preferences?.compactMode).toBe(true);
    expect(result.current.isUpdating).toBe(false);
  });

  it('updatePreferences debe manejar errores', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Server error' }), {
        status: 500,
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore();
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    await expect(
      act(async () => {
        await result.current.updatePreferences({ darkMode: true });
      })
    ).rejects.toThrow();

    expect(result.current.error).toBeDefined();
  });

  it('uploadAvatar debe subir avatar exitosamente', async () => {
    const newAvatarUrl = 'http://example.com/new-avatar.jpg';

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { avatar: newAvatarUrl } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore();
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    const mockFile = new File(['fake-image'], 'avatar.jpg', { type: 'image/jpeg' });

    await act(async () => {
      const avatarUrl = await result.current.uploadAvatar(mockFile);
      expect(avatarUrl).toBe(newAvatarUrl);
    });

    expect(result.current.profile?.avatar).toBe(newAvatarUrl);
    expect(result.current.isUpdating).toBe(false);
  });

  it('uploadAvatar debe manejar errores', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'File too large' }), {
        status: 413,
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore();
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    const mockFile = new File(['fake-image'], 'avatar.jpg', { type: 'image/jpeg' });

    // uploadAvatar puede rechazar o establecer error en el estado
    try {
      await act(async () => {
        await result.current.uploadAvatar(mockFile);
      });
    } catch (e) {
      // Error esperado
    }

    // Verificar que isUpdating vuelve a false
    expect(result.current.isUpdating).toBe(false);
  });

  it('refreshProfile debe recargar el perfil desde la API', async () => {
    const refreshedProfile = {
      ...mockUser,
      firstName: 'Refreshed',
      email: 'refreshed@example.com',
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: refreshedProfile }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore();
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(result.current.profile?.firstName).toBe('Refreshed');
  });

  it('refreshProfile debe manejar errores', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore();
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(result.current.error).toContain('Not found');
  });

  it('no debe ejecutar operaciones si no hay profile', async () => {
    const { useProfile } = await import('../useProfile');
    const store = createMockStore(null as any, 'test-token');
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    // Sin user, profile es null
    expect(result.current.profile).toBeNull();

    // updateProfile no debería hacer nada
    await act(async () => {
      await result.current.updateProfile({ firstName: 'Test' });
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refreshProfile no debe ejecutarse sin token', async () => {
    const { useProfile } = await import('../useProfile');
    const store = createMockStore(mockUser, ''); // sin token
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('debe construir authHeaders correctamente para updateProfile', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockUser }), {
        status: 200,
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore({ ...mockUser, empresaId: 42 }, 'my-token');
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    await act(async () => {
      await result.current.updateProfile({ firstName: 'New' });
    });

    const fetchCall = fetchSpy.mock.calls[0];
    const requestInit = fetchCall[1] as RequestInit;
    
    expect(requestInit.headers).toBeDefined();
    expect((requestInit.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');
    expect((requestInit.headers as Record<string, string>)['x-tenant-id']).toBe('42');
    expect(requestInit.method).toBe('PATCH');
  });

  it('uploadAvatar no debe incluir Content-Type header (FormData)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { avatar: 'url' } }), {
        status: 200,
      })
    );

    const { useProfile } = await import('../useProfile');
    const store = createMockStore({ ...mockUser, empresaId: 42 }, 'my-token');
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });

    const mockFile = new File(['fake'], 'avatar.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.uploadAvatar(mockFile);
    });

    const fetchCall = fetchSpy.mock.calls[0];
    const requestInit = fetchCall[1] as RequestInit;
    
    // No debería tener Content-Type porque usamos FormData
    expect((requestInit.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(requestInit.method).toBe('POST');
    expect(requestInit.body).toBeInstanceOf(FormData);
  });
});

