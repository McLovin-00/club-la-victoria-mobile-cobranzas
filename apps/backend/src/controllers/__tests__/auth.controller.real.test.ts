/**
 * Tests reales para auth.controller.ts (sin servicios reales)
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const authService = {
  login: jest.fn(),
  register: jest.fn(),
  changePassword: jest.fn(),
  findByEmail: jest.fn(),
  refreshToken: jest.fn(),
  updateUserEmpresa: jest.fn(),
};

jest.mock('../../services/auth.service', () => ({
  authService,
}));

import * as controller from '../auth.controller';

describe('auth.controller (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('login: 400 on zod error, 200 on success, 401 on service error', async () => {
    const res0 = createMockRes();
    await controller.login({ body: { email: 'bad', password: '' } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    authService.login.mockResolvedValueOnce({ success: true });
    const res1 = createMockRes();
    await controller.login({ body: { email: 'a@b.com', password: 'x' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);

    authService.login.mockRejectedValueOnce(new Error('no'));
    const res2 = createMockRes();
    await controller.login({ body: { email: 'a@b.com', password: 'x' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(401);
  });

  it('register: 400 on zod error, 201 on success, 400 on error', async () => {
    const res0 = createMockRes();
    await controller.register({ body: { email: 'bad', password: '1' }, user: { userId: 1 } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    authService.register.mockResolvedValueOnce({ success: true });
    const res1 = createMockRes();
    await controller.register({ body: { email: 'A@B.com', password: '123456', role: 'user' }, user: { userId: 1 } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(201);

    authService.register.mockRejectedValueOnce(new Error('x'));
    const res2 = createMockRes();
    await controller.register({ body: { email: 'a@b.com', password: '123456' }, user: { userId: 1 } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('getCurrentUser returns user', async () => {
    const res = createMockRes();
    await controller.getCurrentUser({ user: { userId: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('changePassword: 400 on zod, 200 on success, 400 on error', async () => {
    const res0 = createMockRes();
    await controller.changePassword({ body: { currentPassword: '', newPassword: '1' }, user: { userId: 1 } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    authService.changePassword.mockResolvedValueOnce(undefined);
    const res1 = createMockRes();
    await controller.changePassword({ body: { currentPassword: 'a', newPassword: '123456' }, user: { userId: 1 } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);

    authService.changePassword.mockRejectedValueOnce(new Error('x'));
    const res2 = createMockRes();
    await controller.changePassword({ body: { currentPassword: 'a', newPassword: '123456' }, user: { userId: 1 } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('checkEmail: 200 exists true/false, 400 on zod, 500 on error', async () => {
    authService.findByEmail.mockResolvedValueOnce({ id: 1 });
    const res1 = createMockRes();
    await controller.checkEmail({ body: { email: 'a@b.com' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);

    authService.findByEmail.mockResolvedValueOnce(null);
    const res2 = createMockRes();
    await controller.checkEmail({ body: { email: 'a@b.com' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(200);

    const res0 = createMockRes();
    await controller.checkEmail({ body: { email: 'bad' } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    authService.findByEmail.mockRejectedValueOnce(new Error('x'));
    const res3 = createMockRes();
    await controller.checkEmail({ body: { email: 'a@b.com' } } as any, res3 as any);
    expect(res3.status).toHaveBeenCalledWith(500);
  });

  it('refreshToken: 401 on missing token, 200 on success, 401 on error', async () => {
    const res0 = createMockRes();
    await controller.refreshToken({ headers: {} } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(401);

    authService.refreshToken.mockResolvedValueOnce({ user: { id: 1 }, token: 't' });
    const res1 = createMockRes();
    await controller.refreshToken({ headers: { authorization: 'Bearer t' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);

    authService.refreshToken.mockRejectedValueOnce(new Error('x'));
    const res2 = createMockRes();
    await controller.refreshToken({ headers: { authorization: 'Bearer t' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(401);
  });

  it('updateEmpresa: 400 on zod, 200 on success, 400 on error', async () => {
    const res0 = createMockRes();
    await controller.updateEmpresa({ body: { empresaId: 'x' }, user: { userId: 1 } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    authService.updateUserEmpresa.mockResolvedValueOnce({ success: true });
    const res1 = createMockRes();
    await controller.updateEmpresa({ body: { empresaId: 1 }, user: { userId: 1 } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);

    authService.updateUserEmpresa.mockRejectedValueOnce(new Error('x'));
    const res2 = createMockRes();
    await controller.updateEmpresa({ body: { empresaId: 1 }, user: { userId: 1 } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(400);
  });
});


