/**
 * Tests reales para PlatformAuthController (cubre ramas principales sin DB real)
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';

describe('PlatformAuthController (real)', () => {
  async function loadWith(validationErrors: any[] = []) {
    jest.resetModules();

    const PlatformAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      updatePlatformUser: jest.fn(),
      deletePlatformUser: jest.fn(),
      registerClientWithTempPassword: jest.fn(),
      registerDadorWithTempPassword: jest.fn(),
      registerTransportistaWithTempPassword: jest.fn(),
      registerChoferWithTempPassword: jest.fn(),
      getUserProfile: jest.fn(),
      updatePassword: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      refreshAccessToken: jest.fn(),
      toggleUserActivo: jest.fn(),
    };

    const chain: any = new Proxy(
      {},
      {
        get: (_t, _prop) => () => chain,
      }
    );

    jest.doMock('express-validator', () => ({
      body: () => chain,
      validationResult: () => ({
        isEmpty: () => validationErrors.length === 0,
        array: () => validationErrors,
      }),
    }));

    jest.doMock('../../config/logger', () => ({
      AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    }));

    jest.doMock('../../services/platformAuth.service', () => ({
      PlatformAuthService,
    }));

    const mod = await import('../platformAuth.controller');
    return { controller: mod.PlatformAuthController, PlatformAuthService };
  }

  const MOCK_PROFILE = {
    id: 1, email: 'test@test.com', role: 'SUPERADMIN', empresaId: 1,
    dadorCargaId: null, empresaTransportistaId: null, choferId: null, clienteId: null,
    nombre: 'Test', apellido: 'User', activo: true, mustChangePassword: false,
    creadoPorId: null, createdAt: new Date(), updatedAt: new Date(),
  };

  it('login -> 500 on exception, 200 sets cookie on success, 401 on failure', async () => {
    const { controller, PlatformAuthService } = await loadWith([]);

    PlatformAuthService.login.mockRejectedValueOnce(new Error('fail'));
    const req0: any = { body: {}, ip: '1', get: () => 'ua' };
    const res0: any = { ...createMockRes(), cookie: jest.fn() };
    await controller.login(req0, res0);
    expect(res0.status).toHaveBeenCalledWith(500);

    PlatformAuthService.login.mockResolvedValueOnce({ success: true, token: 't', platformUser: { id: 1 } });
    const req: any = { body: { email: 'a', password: 'b' }, ip: '1', get: () => 'ua' };
    const res1: any = { ...createMockRes(), cookie: jest.fn() };
    await controller.login(req, res1);
    expect(res1.cookie).toHaveBeenCalled();
    expect(res1.status).toHaveBeenCalledWith(200);

    PlatformAuthService.login.mockResolvedValueOnce({ success: false, message: 'nope' });
    const res2: any = { ...createMockRes(), cookie: jest.fn() };
    await controller.login(req, res2);
    expect(res2.status).toHaveBeenCalledWith(401);
  });

  it('register -> 401 when no actor, 201 on success, 400 on failure', async () => {
    const { controller, PlatformAuthService } = await loadWith([]);
    const reqNoUser: any = { body: {}, user: undefined, ip: '1' };
    const res0 = createMockRes();
    await controller.register(reqNoUser, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(401);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(MOCK_PROFILE);
    PlatformAuthService.register.mockResolvedValueOnce({ success: true, message: 'ok', platformUser: { id: 1 } });
    const req: any = { body: { email: 'a' }, user: { userId: 9 }, ip: '1' };
    const res1 = createMockRes();
    await controller.register(req, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(201);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(MOCK_PROFILE);
    PlatformAuthService.register.mockResolvedValueOnce({ success: false, message: 'bad' });
    const res2 = createMockRes();
    await controller.register(req, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('updateUser/deleteUser -> 401 when no actor, 200 on success', async () => {
    const { controller, PlatformAuthService } = await loadWith([]);
    const res0 = createMockRes();
    await controller.updateUser({ user: undefined, params: { id: '1' }, body: {} } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(401);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(MOCK_PROFILE);
    PlatformAuthService.updatePlatformUser.mockResolvedValue({ id: 1 });
    const res1 = createMockRes();
    await controller.updateUser({ user: { userId: 1 }, params: { id: '1' }, body: {} } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);

    const res2 = createMockRes();
    await controller.deleteUser({ user: undefined, params: { id: '1' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(401);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(MOCK_PROFILE);
    PlatformAuthService.deletePlatformUser.mockResolvedValue(undefined);
    const res3 = createMockRes();
    await controller.deleteUser({ user: { userId: 1 }, params: { id: '1' } } as any, res3 as any);
    expect(res3.status).toHaveBeenCalledWith(200);
  });

  it('wizard endpoints -> 401 when no actor, 400 when service fails, 201 on success', async () => {
    const { controller, PlatformAuthService } = await loadWith([]);
    const res0 = createMockRes();
    await controller.registerClientWizard({ user: undefined, body: {}, params: {} } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(401);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(MOCK_PROFILE);
    PlatformAuthService.registerClientWithTempPassword.mockResolvedValueOnce({ success: false, message: 'bad' });
    const res1 = createMockRes();
    await controller.registerClientWizard({ user: { userId: 1 }, body: { email: 'a', clienteId: 1 } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(400);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(MOCK_PROFILE);
    PlatformAuthService.registerClientWithTempPassword.mockResolvedValueOnce({ success: true, message: 'ok', platformUser: { id: 1 }, tempPassword: 'tmp' });
    const res2 = createMockRes();
    await controller.registerClientWizard({ user: { userId: 1 }, body: { email: 'a', clienteId: 1 } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(201);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(MOCK_PROFILE);
    PlatformAuthService.registerDadorWithTempPassword.mockResolvedValueOnce({ success: true, message: 'ok', platformUser: { id: 2 }, tempPassword: 'tmp' });
    const res3 = createMockRes();
    await controller.registerDadorWizard({ user: { userId: 1 }, body: { email: 'a', dadorCargaId: 1 } } as any, res3 as any);
    expect(res3.status).toHaveBeenCalledWith(201);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(MOCK_PROFILE);
    PlatformAuthService.registerTransportistaWithTempPassword.mockResolvedValueOnce({ success: true, message: 'ok', platformUser: { id: 3 }, tempPassword: 'tmp' });
    const res4 = createMockRes();
    await controller.registerTransportistaWizard({ user: { userId: 1 }, body: { email: 'a', empresaTransportistaId: 1 } } as any, res4 as any);
    expect(res4.status).toHaveBeenCalledWith(201);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(MOCK_PROFILE);
    PlatformAuthService.registerChoferWithTempPassword.mockResolvedValueOnce({ success: true, message: 'ok', platformUser: { id: 4 }, tempPassword: 'tmp' });
    const res5 = createMockRes();
    await controller.registerChoferWizard({ user: { userId: 1 }, body: { email: 'a', choferId: 1 } } as any, res5 as any);
    expect(res5.status).toHaveBeenCalledWith(201);
  });

  it('logout clears cookie; getProfile 401/404/200; changePassword 401/200; verifyToken 401/200', async () => {
    const { controller, PlatformAuthService } = await loadWith([]);

    const resLogout: any = { ...createMockRes(), clearCookie: jest.fn() };
    await controller.logout({ headers: {}, cookies: undefined, ip: '1', get: () => 'ua' } as any, resLogout);
    expect(resLogout.clearCookie).toHaveBeenCalledWith('platformToken');

    const resP0 = createMockRes();
    await controller.getProfile({ user: undefined } as any, resP0 as any);
    expect(resP0.status).toHaveBeenCalledWith(401);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce(null);
    const resP1 = createMockRes();
    await controller.getProfile({ user: { userId: 1 } } as any, resP1 as any);
    expect(resP1.status).toHaveBeenCalledWith(404);

    PlatformAuthService.getUserProfile.mockResolvedValueOnce({ id: 1 });
    const resP2 = createMockRes();
    await controller.getProfile({ user: { userId: 1 } } as any, resP2 as any);
    expect(resP2.status).toHaveBeenCalledWith(200);

    const resC1 = createMockRes();
    await controller.changePassword({ user: undefined, body: {} } as any, resC1 as any);
    expect(resC1.status).toHaveBeenCalledWith(401);

    PlatformAuthService.updatePassword.mockResolvedValueOnce({ success: true, message: 'ok' });
    const resC2 = createMockRes();
    await controller.changePassword({ user: { userId: 1 }, body: { currentPassword: 'a', newPassword: 'b' }, ip: '1' } as any, resC2 as any);
    expect(resC2.status).toHaveBeenCalledWith(200);

    const resV0 = createMockRes();
    await controller.verifyToken({ user: undefined } as any, resV0 as any);
    expect(resV0.status).toHaveBeenCalledWith(401);

    const resV1 = createMockRes();
    await controller.verifyToken({ user: { userId: 1, email: 'a', role: 'ADMIN', empresaId: 1 } } as any, resV1 as any);
    expect(resV1.status).toHaveBeenCalledWith(200);
  });
});
