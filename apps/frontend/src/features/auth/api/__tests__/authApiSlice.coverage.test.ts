import { describe, it, expect, jest, beforeEach } from '@jest/globals';

let mockInjectEndpoints: jest.Mock;

const loadEndpoints = async () => {
  let captured: Record<string, any> = {};

  mockInjectEndpoints = jest.fn();
  mockInjectEndpoints.mockImplementation(({ endpoints }) => {
    const builder = {
      mutation: (config: unknown) => ({ type: 'mutation', config }),
    };
    captured = endpoints(builder);
    return {
      endpoints: captured,
      useLoginMutation: jest.fn(),
      useRegisterMutation: jest.fn(),
      useLogoutMutation: jest.fn(),
      useRefreshTokenMutation: jest.fn(),
      useUpdateUserEmpresaMutation: jest.fn(),
    };
  });

  await jest.unstable_mockModule('../../../../store/apiSlice', () => ({
    apiSlice: {
      injectEndpoints: mockInjectEndpoints,
    },
  }));

  await import('../authApiSlice');
  return captured;
};

describe('authApiSlice endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('defines core auth endpoints', async () => {
    const endpoints = await loadEndpoints();

    expect(endpoints).toHaveProperty('login');
    expect(endpoints).toHaveProperty('register');
    expect(endpoints).toHaveProperty('logout');
    expect(endpoints).toHaveProperty('refreshToken');
    expect(endpoints).toHaveProperty('updateUserEmpresa');
  });

  it('builds login query and handles transformErrorResponse', async () => {
    const endpoints = await loadEndpoints();
    const loginConfig = endpoints.login.config;

    const queryResult = loginConfig.query({
      email: 'test@test.com',
      password: 'password',
    });

    expect(queryResult).toEqual({
      url: '/platform/auth/login',
      method: 'POST',
      body: { email: 'test@test.com', password: 'password' },
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const errorResponse = { status: 401 };
    const transformed = loginConfig.transformErrorResponse(errorResponse);

    expect(consoleSpy).toHaveBeenCalledWith('Error en login:', errorResponse);
    expect(transformed).toBe(errorResponse);

    consoleSpy.mockRestore();
  });

  it('builds register, logout, refreshToken, and updateUserEmpresa queries', async () => {
    const endpoints = await loadEndpoints();

    expect(
      endpoints.register.config.query({ email: 'new@test.com', password: 'pass' })
    ).toEqual({
      url: '/platform/auth/register',
      method: 'POST',
      body: { email: 'new@test.com', password: 'pass' },
    });

    expect(endpoints.logout.config.query()).toEqual({
      url: '/platform/auth/logout',
      method: 'POST',
    });

    expect(endpoints.refreshToken.config.query()).toEqual({
      url: '/platform/auth/refresh-token',
      method: 'POST',
    });

    expect(endpoints.updateUserEmpresa.config.query({ empresaId: 12 })).toEqual({
      url: '/usuarios/update-empresa',
      method: 'POST',
      body: { empresaId: 12 },
    });
  });
});
