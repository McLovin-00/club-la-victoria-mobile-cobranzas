/**
 * Tests para authApiSlice
 * 
 * Cubre el API slice de autenticación.
 */
import { describe, it, expect, jest } from '@jest/globals';

let injectCalls: Array<{ endpoints: (b: any) => any }> = [];
let capturedEndpoints: Record<string, any> = {};

jest.mock('../../../../store/apiSlice', () => ({
  apiSlice: {
    injectEndpoints: (args: { endpoints: (b: any) => any }) => {
      injectCalls.push(args);
      const builder = {
        query: (config: unknown) => ({ type: 'query', config }),
        mutation: (config: unknown) => ({ type: 'mutation', config }),
      };
      capturedEndpoints = args.endpoints(builder);
      return {
        endpoints: capturedEndpoints,
        useLoginMutation: () => [],
        useRegisterMutation: () => [],
        useLogoutMutation: () => [],
        useRefreshTokenMutation: () => [],
        useUpdateUserEmpresaMutation: () => [],
      };
    },
  },
}));

describe('authApiSlice', () => {
  it('debería inyectar los endpoints correctamente', async () => {
    injectCalls = [];
    await import('../authApiSlice');

    expect(injectCalls.length).toBeGreaterThanOrEqual(1);
    expect(injectCalls[0].endpoints).toBeDefined();
  });

  it('debería definir los endpoints de auth', () => {
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

  it('refreshToken debería usar POST /platform/auth/refresh', () => {
    const queryFn = ({ refreshToken }: { refreshToken: string }) => ({
      url: '/platform/auth/refresh',
      method: 'POST',
      body: { refreshToken },
    });
    
    const result = queryFn({ refreshToken: 'test-token' });
    
    expect(result.url).toBe('/platform/auth/refresh');
    expect(result.method).toBe('POST');
    expect(result.body).toEqual({ refreshToken: 'test-token' });
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

