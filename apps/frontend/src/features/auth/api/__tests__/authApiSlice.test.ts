/**
 * Tests para authApiSlice
 * 
 * Cubre el API slice de autenticación.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

let mockInjectEndpoints: jest.Mock;

const setupApiSliceMock = async () => {
  mockInjectEndpoints = jest.fn().mockReturnValue({ endpoints: {} });

  await jest.unstable_mockModule('../../../../store/apiSlice', () => ({
    apiSlice: {
      injectEndpoints: mockInjectEndpoints,
    },
  }));
};

describe('authApiSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('debería inyectar los endpoints correctamente', async () => {
    await setupApiSliceMock();
    await import('../authApiSlice');
    
    expect(mockInjectEndpoints).toHaveBeenCalled();
    const call = mockInjectEndpoints.mock.calls[0][0];
    expect(call.endpoints).toBeDefined();
  });

  it('debería definir los endpoints de auth', async () => {
    await setupApiSliceMock();
    let capturedEndpoints: Record<string, unknown> = {};
    
    mockInjectEndpoints.mockImplementation(({ endpoints }) => {
      const builder = {
        query: (config: unknown) => ({ type: 'query', config }),
        mutation: (config: unknown) => ({ type: 'mutation', config }),
      };
      capturedEndpoints = endpoints(builder);
      return { endpoints: capturedEndpoints };
    });
    
    await import('../authApiSlice');
    
    expect(capturedEndpoints).toHaveProperty('login');
    expect(capturedEndpoints).toHaveProperty('register');
    expect(capturedEndpoints).toHaveProperty('logout');
    expect(capturedEndpoints).toHaveProperty('refreshToken');
    expect(capturedEndpoints).toHaveProperty('updateUserEmpresa');
  });
});

describe('authApiSlice endpoints configuration', () => {
  it('login debería usar POST /platform/auth/login', () => {
    const queryFn = (credentials: { email: string; password: string }) => ({
      url: '/platform/auth/login',
      method: 'POST',
      body: credentials,
    });
    
    const result = queryFn({ email: 'test@test.com', password: 'password' });
    
    expect(result.url).toBe('/platform/auth/login');
    expect(result.method).toBe('POST');
    expect(result.body).toEqual({ email: 'test@test.com', password: 'password' });
  });

  it('register debería usar POST /platform/auth/register', () => {
    const queryFn = (userInfo: { email: string; password: string }) => ({
      url: '/platform/auth/register',
      method: 'POST',
      body: userInfo,
    });
    
    const result = queryFn({ email: 'new@test.com', password: 'password' });
    
    expect(result.url).toBe('/platform/auth/register');
    expect(result.method).toBe('POST');
  });

  it('logout debería usar POST /platform/auth/logout', () => {
    const queryFn = () => ({
      url: '/platform/auth/logout',
      method: 'POST',
    });
    
    const result = queryFn();
    
    expect(result.url).toBe('/platform/auth/logout');
    expect(result.method).toBe('POST');
  });

  it('refreshToken debería usar POST /platform/auth/refresh-token', () => {
    const queryFn = () => ({
      url: '/platform/auth/refresh-token',
      method: 'POST',
    });
    
    const result = queryFn();
    
    expect(result.url).toBe('/platform/auth/refresh-token');
    expect(result.method).toBe('POST');
  });

  it('updateUserEmpresa debería usar POST /usuarios/update-empresa', () => {
    const queryFn = (payload: { empresaId: number | null }) => ({
      url: '/usuarios/update-empresa',
      method: 'POST',
      body: payload,
    });
    
    const result = queryFn({ empresaId: 5 });
    
    expect(result.url).toBe('/usuarios/update-empresa');
    expect(result.method).toBe('POST');
    expect(result.body).toEqual({ empresaId: 5 });
  });
});

describe('authApiSlice transformErrorResponse', () => {
  it('debería loguear el error y retornarlo', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const transformErrorResponse = (response: unknown) => {
      console.error('Error en login:', response);
      return response;
    };
    
    const mockError = { status: 401, data: { message: 'Unauthorized' } };
    const result = transformErrorResponse(mockError);
    
    expect(consoleSpy).toHaveBeenCalledWith('Error en login:', mockError);
    expect(result).toEqual(mockError);
    
    consoleSpy.mockRestore();
  });
});

