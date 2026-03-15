import { Request, Response } from 'express';
import { PlatformAuthController, platformAuthValidation } from '../platformAuth.controller';
import { PlatformAuthService } from '../../services/platformAuth.service';
import { validationResult } from 'express-validator';

jest.mock('../../services/platformAuth.service', () => ({
    PlatformAuthService: {
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
    }
}));

jest.mock('express-validator', () => ({
    validationResult: jest.fn(),
    body: jest.fn(() => {
        const chain: any = {};
        chain.isEmail = jest.fn().mockReturnValue(chain);
        chain.normalizeEmail = jest.fn().mockReturnValue(chain);
        chain.withMessage = jest.fn().mockReturnValue(chain);
        chain.isLength = jest.fn().mockReturnValue(chain);
        chain.matches = jest.fn().mockReturnValue(chain);
        chain.optional = jest.fn().mockReturnValue(chain);
        chain.customSanitizer = jest.fn((sanitizer: any) => {
            try {
                if (typeof sanitizer === 'function') {
                    sanitizer('test');
                    sanitizer(123);
                }
            } catch (_e) { }
            return chain;
        });
        chain.isIn = jest.fn().mockReturnValue(chain);
        chain.isInt = jest.fn().mockReturnValue(chain);
        chain.notEmpty = jest.fn().mockReturnValue(chain);
        return chain;
    }),
}));
jest.mock('../../config/logger', () => ({
    AppLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

const MOCK_PROFILE = {
    id: 1,
    email: 'test@test.com',
    role: 'SUPERADMIN',
    empresaId: 1,
    dadorCargaId: null,
    empresaTransportistaId: null,
    choferId: null,
    clienteId: null,
    nombre: 'Test',
    apellido: 'User',
    activo: true,
    mustChangePassword: false,
    creadoPorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('PlatformAuthController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let cookieMock: jest.Mock;
    let clearCookieMock: jest.Mock;

    const mockValidationErrors = (isEmpty: boolean) => {
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => isEmpty,
            array: () => isEmpty ? [] : [{ msg: 'Invalid field' }],
        });
    };

    beforeEach(() => {
        jest.clearAllMocks();

        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        cookieMock = jest.fn();
        clearCookieMock = jest.fn();

        res = {
            status: statusMock,
            json: jsonMock,
            cookie: cookieMock,
            clearCookie: clearCookieMock,
        } as unknown as Response;

        mockValidationErrors(true);

        (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(MOCK_PROFILE);
    });

    describe('Validation Objects', () => {
        it('should define validation rules for updateUser', () => {
            expect(platformAuthValidation.updateUser).toBeDefined();
        });
    });

    describe('login', () => {
        it('logs in successfully', async () => {
            req = { body: { email: 'test@test.com', password: 'pass' }, ip: '127.0.0.1', get: jest.fn() } as any;
            (PlatformAuthService.login as jest.Mock).mockResolvedValue({
                success: true,
                token: 'tok',
                platformUser: { id: 1 }
            });

            await PlatformAuthController.login(req as Request, res as Response);

            expect(cookieMock).toHaveBeenCalledWith('platformToken', 'tok', expect.any(Object));
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('handles invalid credentials', async () => {
            req = { body: { email: 'bad', password: 'bad' }, get: jest.fn() } as any;
            (PlatformAuthService.login as jest.Mock).mockResolvedValue({ success: false, message: 'Bad creds' });

            await PlatformAuthController.login(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
        });

        it('handles server errors', async () => {
            req = { body: {}, get: jest.fn() } as any;
            (PlatformAuthService.login as jest.Mock).mockRejectedValue(new Error('Fail'));
            await PlatformAuthController.login(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('updateUser', () => {
        it('updates user successfully', async () => {
            req = {
                user: { userId: 1 },
                params: { id: '2' },
                body: { nombre: 'New' }
            } as any;
            (PlatformAuthService.updatePlatformUser as jest.Mock).mockResolvedValue({ id: 2 });

            await PlatformAuthController.updateUser(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('returns 401 if unauthenticated', async () => {
            req = { user: undefined } as any;
            (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(null);
            await PlatformAuthController.updateUser(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
        });

        it('handles validation errors', async () => {
            mockValidationErrors(false);
            req = { user: { userId: 1 }, params: { id: '2' }, body: {} } as any;
            await PlatformAuthController.updateUser(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('handles exceptions', async () => {
            req = { user: { userId: 1 }, params: { id: '1' }, body: {} } as any;
            (PlatformAuthService.updatePlatformUser as jest.Mock).mockRejectedValue(new Error('Fail'));
            await PlatformAuthController.updateUser(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteUser', () => {
        it('deletes user successfully', async () => {
            req = { user: { userId: 1 }, params: { id: '2' } } as any;
            (PlatformAuthService.deletePlatformUser as jest.Mock).mockResolvedValue(true);
            await PlatformAuthController.deleteUser(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('returns 401 if unauthenticated', async () => {
            req = { user: undefined } as any;
            (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(null);
            await PlatformAuthController.deleteUser(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
        });

        it('handles exceptions', async () => {
            req = { user: { userId: 1 }, params: { id: '1' } } as any;
            (PlatformAuthService.deletePlatformUser as jest.Mock).mockRejectedValue(new Error('Fail'));
            await PlatformAuthController.deleteUser(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('register', () => {
        it('registers successfully', async () => {
            req = { body: { email: 'new@test.com' }, user: { userId: 1 }, ip: '1.2.3.4' } as any;
            (PlatformAuthService.register as jest.Mock).mockResolvedValue({ success: true, platformUser: {}, message: 'ok' });
            await PlatformAuthController.register(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(201);
        });

        it('returns 401 if unauthenticated', async () => {
            req = { user: undefined, body: {} } as any;
            (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(null);
            await PlatformAuthController.register(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
        });

        it('handles service errors', async () => {
            req = { body: {}, user: { userId: 1 }, ip: '1' } as any;
            (PlatformAuthService.register as jest.Mock).mockResolvedValue({ success: false, message: 'Exists' });
            await PlatformAuthController.register(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('handles unexpected errors', async () => {
            req = { body: {}, user: { userId: 1 }, ip: '1' } as any;
            (PlatformAuthService.register as jest.Mock).mockRejectedValue(new Error('Fail'));
            await PlatformAuthController.register(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('Wizards', () => {
        const wizards = [
            { name: 'registerClientWizard', method: 'registerClientWithTempPassword', body: { clienteId: 10, email: 'a@b.com' }, data: { clienteId: 10, empresaId: null } },
            { name: 'registerDadorWizard', method: 'registerDadorWithTempPassword', body: { dadorCargaId: 10, email: 'a@b.com' }, data: { dadorCargaId: 10, empresaId: null } },
            { name: 'registerTransportistaWizard', method: 'registerTransportistaWithTempPassword', body: { empresaTransportistaId: 10, email: 'a@b.com' }, data: { empresaTransportistaId: 10, empresaId: null } },
            { name: 'registerChoferWizard', method: 'registerChoferWithTempPassword', body: { choferId: 10, email: 'a@b.com' }, data: { choferId: 10, empresaId: null } },
        ];

        wizards.forEach((wizard) => {
            describe(wizard.name, () => {
                const controllerMethod = (PlatformAuthController as any)[wizard.name];
                const serviceMethod = (PlatformAuthService as any)[wizard.method];

                it('success', async () => {
                    req = { user: { userId: 1 }, body: wizard.body } as any;
                    serviceMethod.mockResolvedValue({ success: true, platformUser: {}, tempPassword: '123' });
                    await controllerMethod(req as Request, res as Response);
                    expect(statusMock).toHaveBeenCalledWith(201);
                });

                it('success with empresaId', async () => {
                    req = { user: { userId: 1 }, body: { ...wizard.body, empresaId: 5 } } as any;
                    serviceMethod.mockResolvedValue({ success: true, platformUser: {}, tempPassword: '123' });
                    await controllerMethod(req as Request, res as Response);
                    expect(serviceMethod).toHaveBeenCalledWith(
                        expect.objectContaining({ ...wizard.data, empresaId: 5 }),
                        expect.anything()
                    );
                    expect(statusMock).toHaveBeenCalledWith(201);
                });

                it('returns 401 if unauthenticated', async () => {
                    req = { user: undefined, body: {} } as any;
                    (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(null);
                    await controllerMethod(req as Request, res as Response);
                    expect(statusMock).toHaveBeenCalledWith(401);
                });

                it('handles service failure', async () => {
                    req = { user: { userId: 1 }, body: wizard.body } as any;
                    serviceMethod.mockResolvedValue({ success: false, message: 'Fail' });
                    await controllerMethod(req as Request, res as Response);
                    expect(statusMock).toHaveBeenCalledWith(400);
                });

                it('handles exceptions', async () => {
                    req = { user: { userId: 1 }, body: wizard.body } as any;
                    serviceMethod.mockRejectedValue(new Error('Crash'));
                    await controllerMethod(req as Request, res as Response);
                    expect(statusMock).toHaveBeenCalledWith(500);
                });
            });
        });
    });

    describe('changePassword', () => {
        it('success', async () => {
            req = { user: { userId: 1 }, body: { currentPassword: 'old', newPassword: 'New1234!' }, ip: '1.1.1.1' } as any;
            (PlatformAuthService.updatePassword as jest.Mock).mockResolvedValue({ success: true, message: 'ok' });
            await PlatformAuthController.changePassword(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('returns 401 if unauthenticated', async () => {
            req = { user: undefined, body: {} } as any;
            await PlatformAuthController.changePassword(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
        });

        it('handles exceptions', async () => {
            req = { user: { userId: 1 }, body: { currentPassword: 'a', newPassword: 'b' }, ip: '1' } as any;
            (PlatformAuthService.updatePassword as jest.Mock).mockRejectedValue(new Error('Fail'));
            await PlatformAuthController.changePassword(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('logout', () => {
        it('clears cookie and revokes tokens', async () => {
            req = {
                headers: { authorization: 'Bearer tok123' },
                cookies: { platformToken: 'tok123' },
                user: { userId: 1 },
                ip: '127.0.0.1',
                get: jest.fn(),
            } as any;
            await PlatformAuthController.logout(req as Request, res as Response);
            expect(clearCookieMock).toHaveBeenCalledWith('platformToken');
            expect(PlatformAuthService.revokeToken).toHaveBeenCalledWith('tok123');
            expect(PlatformAuthService.revokeAllUserTokens).toHaveBeenCalledWith(1);
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('handles logout without authorization header', async () => {
            req = {
                headers: {},
                cookies: undefined,
                user: undefined,
                ip: '127.0.0.1',
                get: jest.fn(),
            } as any;
            await PlatformAuthController.logout(req as Request, res as Response);
            expect(clearCookieMock).toHaveBeenCalledWith('platformToken');
            expect(statusMock).toHaveBeenCalledWith(200);
        });
    });

    describe('getProfile', () => {
        it('success', async () => {
            req = { user: { userId: 1 } } as any;
            (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue({ id: 1 });
            await PlatformAuthController.getProfile(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('404 if not found', async () => {
            req = { user: { userId: 1 } } as any;
            (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(null);
            await PlatformAuthController.getProfile(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('401 if unauthenticated', async () => {
            req = { user: undefined } as any;
            await PlatformAuthController.getProfile(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
    });

    describe('verifyToken', () => {
        it('success', async () => {
            req = { user: { userId: 1, email: 'test@test.com', role: 'ADMIN', empresaId: 1 } } as any;
            await PlatformAuthController.verifyToken(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('401 if no user', async () => {
            req = { user: undefined } as any;
            await PlatformAuthController.verifyToken(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
        });

        it('handles exceptions', async () => {
            req = { get user() { throw new Error('Fail'); } } as any;
            await PlatformAuthController.verifyToken(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
});
