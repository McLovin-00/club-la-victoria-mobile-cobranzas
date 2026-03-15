import { describe, it, expect, jest } from '@jest/globals';

let capturedEndpoints: Record<string, any> = {};

const builder = {
  mutation: (config: unknown) => ({ type: 'mutation', config }),
};

jest.mock('../../../../store/apiSlice', () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }: { endpoints: (b: any) => any }) => {
      capturedEndpoints = endpoints(builder);
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

describe('authApiSlice endpoints', () => {
  it('defines core auth endpoints', async () => {
    await import('../authApiSlice');

    expect(capturedEndpoints).toHaveProperty('login');
    expect(capturedEndpoints).toHaveProperty('register');
    expect(capturedEndpoints).toHaveProperty('logout');
    expect(capturedEndpoints).toHaveProperty('refreshToken');
    expect(capturedEndpoints).toHaveProperty('updateUserEmpresa');
  });

  it('builds login query and handles transformErrorResponse', () => {
    const loginConfig = capturedEndpoints.login.config;

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

  it('builds register, logout, refreshToken, and updateUserEmpresa queries', () => {
    expect(
      capturedEndpoints.register.config.query({ email: 'new@test.com', password: 'pass' })
    ).toEqual({
      url: '/platform/auth/register',
      method: 'POST',
      body: { email: 'new@test.com', password: 'pass' },
    });

    expect(capturedEndpoints.logout.config.query()).toEqual({
      url: '/platform/auth/logout',
      method: 'POST',
    });

    expect(capturedEndpoints.refreshToken.config.query({ refreshToken: 'abc' })).toEqual({
      url: '/platform/auth/refresh',
      method: 'POST',
      body: { refreshToken: 'abc' },
    });

    expect(capturedEndpoints.updateUserEmpresa.config.query({ empresaId: 12 })).toEqual({
      url: '/usuarios/update-empresa',
      method: 'POST',
      body: { empresaId: 12 },
    });
  });
});
