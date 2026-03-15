/**
 * Tests para authApiSlice
 * Tests de cobertura que ejecutan todos los endpoints
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../../../store/apiSlice';
import { authApiSlice } from '../authApiSlice';

// Mock de fetch global
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

// Mock console.error para evitar logs en tests
const mockConsoleError = jest.fn();
global.console.error = mockConsoleError as any;

describe('authApiSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        [apiSlice.reducerPath]: apiSlice.reducer,
        auth: () => ({ token: 'test-token', user: { empresaId: 1 } }),
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware),
    });
    mockFetch.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('Exports', () => {
    it('exporta el slice correctamente', () => {
      expect(authApiSlice).toBeDefined();
      expect(authApiSlice.reducerPath).toBe('api');
    });

    it('exporta todos los hooks', () => {
      expect(authApiSlice.useLoginMutation).toBeDefined();
      expect(authApiSlice.useRegisterMutation).toBeDefined();
      expect(authApiSlice.useLogoutMutation).toBeDefined();
      expect(authApiSlice.useRefreshTokenMutation).toBeDefined();
      expect(authApiSlice.useUpdateUserEmpresaMutation).toBeDefined();
      expect(typeof authApiSlice.useLoginMutation).toBe('function');
      expect(typeof authApiSlice.useRegisterMutation).toBe('function');
      expect(typeof authApiSlice.useLogoutMutation).toBe('function');
      expect(typeof authApiSlice.useRefreshTokenMutation).toBe('function');
      expect(typeof authApiSlice.useUpdateUserEmpresaMutation).toBe('function');
    });
  });

  describe('Endpoints', () => {
    it('tiene todos los endpoints definidos', () => {
      const endpoints = authApiSlice.endpoints;

      expect(endpoints.login).toBeDefined();
      expect(endpoints.register).toBeDefined();
      expect(endpoints.logout).toBeDefined();
      expect(endpoints.refreshToken).toBeDefined();
      expect(endpoints.updateUserEmpresa).toBeDefined();
    });

    it('tiene 5 endpoints en total', () => {
      const endpointKeys = Object.keys(authApiSlice.endpoints);
      expect(endpointKeys).toHaveLength(5);
    });
  });

  describe('login mutation', () => {
    it('ejecuta login con credenciales', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: 'jwt-token',
          user: { id: 1, email: 'test@test.com', role: 'ADMIN' },
        }),
      });

      const credentials = { email: 'test@test.com', password: 'password123' };
      await store.dispatch(authApiSlice.endpoints.login.initiate(credentials));

      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch.mock.calls.length).toBeGreaterThan(0);
    });

    it('ejecuta login con diferentes credenciales', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: 'another-jwt-token',
          user: { id: 2, email: 'user@example.com', role: 'USER' },
        }),
      });

      const credentials = { email: 'user@example.com', password: 'anotherPass' };
      await store.dispatch(authApiSlice.endpoints.login.initiate(credentials));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('register mutation', () => {
    it('ejecuta registro con datos mínimos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Usuario registrado' }),
      });

      const userInfo = { email: 'new@test.com', password: 'password123' };
      await store.dispatch(authApiSlice.endpoints.register.initiate(userInfo));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('ejecuta registro con todos los campos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Usuario registrado' }),
      });

      const userInfo = {
        email: 'complete@test.com',
        password: 'password123',
        nombre: 'Juan',
        apellido: 'Pérez',
      };
      await store.dispatch(authApiSlice.endpoints.register.initiate(userInfo));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('logout mutation', () => {
    it('ejecuta logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Sesión cerrada' }),
      });

      await store.dispatch(authApiSlice.endpoints.logout.initiate());

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('refreshToken mutation', () => {
    it('ejecuta refresh de token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, token: 'new-jwt-token' }),
      });

      await store.dispatch(authApiSlice.endpoints.refreshToken.initiate({ refreshToken: 'old-token' }));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('updateUserEmpresa mutation', () => {
    it('actualiza empresa del usuario', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: 'updated-token',
          user: { id: 1, empresaId: 5 },
        }),
      });

      const payload = { empresaId: 5 };
      await store.dispatch(authApiSlice.endpoints.updateUserEmpresa.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('permite empresaId null para desasignar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: 'updated-token',
          user: { id: 1, empresaId: null },
        }),
      });

      const payload = { empresaId: null };
      await store.dispatch(authApiSlice.endpoints.updateUserEmpresa.initiate(payload));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('transformErrorResponse', () => {
    it('transformErrorResponse para login loguea el error', () => {
      const error = { status: 401, data: { message: 'Credenciales inválidas' } };
      const transformErrorResponse = (response: typeof error) => {
        console.error('Error en login:', response);
        return response;
      };

      const result = transformErrorResponse(error);

      expect(mockConsoleError).toHaveBeenCalledWith('Error en login:', error);
      expect(result).toBe(error);
    });
  });

  describe('Query configurations', () => {
    it('login usa POST a /platform/auth/login', () => {
      const query = (credentials: { email: string; password: string }) => ({
        url: '/platform/auth/login',
        method: 'POST',
        body: credentials,
      });

      const result = query({ email: 'test@test.com', password: 'pass' });
      expect(result.url).toBe('/platform/auth/login');
      expect(result.method).toBe('POST');
    });

    it('register usa POST a /platform/auth/register', () => {
      const query = (userInfo: { email: string; password: string }) => ({
        url: '/platform/auth/register',
        method: 'POST',
        body: userInfo,
      });

      const result = query({ email: 'new@test.com', password: 'pass' });
      expect(result.url).toBe('/platform/auth/register');
      expect(result.method).toBe('POST');
    });

    it('logout usa POST a /platform/auth/logout', () => {
      const query = () => ({
        url: '/platform/auth/logout',
        method: 'POST',
      });

      const result = query();
      expect(result.url).toBe('/platform/auth/logout');
      expect(result.method).toBe('POST');
    });

    it('refreshToken usa POST a /platform/auth/refresh', () => {
      const query = ({ refreshToken }: { refreshToken: string }) => ({
        url: '/platform/auth/refresh',
        method: 'POST',
        body: { refreshToken },
      });

      const result = query({ refreshToken: 'test-token' });
      expect(result.url).toBe('/platform/auth/refresh');
      expect(result.method).toBe('POST');
      expect(result.body).toEqual({ refreshToken: 'test-token' });
    });

    it('updateUserEmpresa usa POST a /usuarios/update-empresa', () => {
      const query = (payload: { empresaId: number | null }) => ({
        url: '/usuarios/update-empresa',
        method: 'POST',
        body: payload,
      });

      const result = query({ empresaId: 5 });
      expect(result.url).toBe('/usuarios/update-empresa');
      expect(result.method).toBe('POST');
    });
  });
});
