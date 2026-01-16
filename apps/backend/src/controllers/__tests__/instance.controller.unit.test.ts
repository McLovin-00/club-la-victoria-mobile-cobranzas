
// Definir el mock factory antes de los imports
jest.mock('../../services/instance.service', () => {
    const mockMethods = {
        findMany: jest.fn(),
        findManyByEmpresa: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        getStats: jest.fn(),
        changeEstado: jest.fn(),
        validateEmpresaAccess: jest.fn(),
    };
    return {
        InstanceService: {
            getInstance: jest.fn(() => mockMethods),
        },
    };
});

jest.mock('../../config/logger', () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

import { Response } from 'express';
import { AuthRequest } from '../../middlewares/platformAuth.middleware';
// Importar después de mocks
import { InstanceService } from '../../services/instance.service';
import * as instanceController from '../instance.controller';

describe('Instance Controller', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let sendMock: jest.Mock;

    // Acceso al mock del servicio
    const serviceMock = InstanceService.getInstance() as any;

    beforeEach(() => {
        jest.clearAllMocks();

        jsonMock = jest.fn();
        sendMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });

        res = {
            status: statusMock,
            json: jsonMock,
            send: sendMock,
        } as unknown as Response;

        // Default Request con todas las props necesarias para evitar destructuring de undefined
        req = {
            params: {},
            query: {},
            body: {},
            user: { role: 'OPERATOR', userId: 1, empresaId: undefined, email: 'test@example.com' },
        };
    });

    describe('getInstances', () => {
        it('SUPERADMIN fetches all instances', async () => {
            Object.assign(req, { user: { role: 'SUPERADMIN', userId: 1 }, query: {} });
            serviceMock.findMany.mockResolvedValue([]);

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(serviceMock.findMany).toHaveBeenCalled();
            expect(serviceMock.findManyByEmpresa).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [] });
        });

        it('ADMIN fetches company instances', async () => {
            Object.assign(req, { user: { role: 'ADMIN', userId: 1, empresaId: 5 }, query: {} });
            serviceMock.findManyByEmpresa.mockResolvedValue([]);

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(serviceMock.findManyByEmpresa).toHaveBeenCalledWith(5, expect.anything());
        });

        it('OPERATOR fetches company instances', async () => {
            Object.assign(req, { user: { role: 'OPERATOR', userId: 1, empresaId: 5 }, query: {} });
            serviceMock.findManyByEmpresa.mockResolvedValue([]);

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(serviceMock.findManyByEmpresa).toHaveBeenCalledWith(5, expect.anything());
        });

        it('USER without permissions returns empty', async () => {
            // Usamos un rol que no tenga acceso si existe, o simulamos no empresa
            Object.assign(req, { user: { role: 'OPERATOR' }, query: {} }); // Sin empresaId

            await instanceController.getInstances(req as AuthRequest, res as Response);

            // La lógica dice: if SUPERADMIN... else if ADMIN & emp... else if OPERATOR & emp... ELSE -> empty
            // Así que OPERATOR sin empresaId cae en ELSE.
            expect(serviceMock.findMany).not.toHaveBeenCalled();
            expect(serviceMock.findManyByEmpresa).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [] });
        });

        it('handles query filters', async () => {
            Object.assign(req, {
                user: { role: 'SUPERADMIN' },
                query: { search: 'test', serviceId: '1', limit: '10' }
            });
            serviceMock.findMany.mockResolvedValue([]);

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(serviceMock.findMany).toHaveBeenCalledWith(expect.objectContaining({
                search: 'test',
                serviceId: 1,
                limit: 10
            }));
        });

        it('handles errors', async () => {
            Object.assign(req, { user: { role: 'SUPERADMIN' }, query: {} });
            serviceMock.findMany.mockRejectedValue(new Error('Fail'));

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('getInstanceById', () => {
        it('returns 404 if not found', async () => {
            Object.assign(req, { params: { id: '1' }, user: { userId: 1 } });
            serviceMock.findById.mockResolvedValue(null);

            await instanceController.getInstanceById(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('SUPERADMIN can view any instance', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'SUPERADMIN' } });
            serviceMock.findById.mockResolvedValue({ id: 1, empresaId: 99 });

            await instanceController.getInstanceById(req as AuthRequest, res as Response);

            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
        });

        it('ADMIN can view own company instance', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.findById.mockResolvedValue({ id: 1, empresaId: 5 });

            await instanceController.getInstanceById(req as AuthRequest, res as Response);

            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
        });

        it('ADMIN cannot view other company instance', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.findById.mockResolvedValue({ id: 1, empresaId: 99 });

            await instanceController.getInstanceById(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('User without permission returns 403', async () => {
            // Rol sin acceso (o sin empresa)
            Object.assign(req, { params: { id: '1' }, user: { role: 'OPERATOR' } }); // sin empresaId
            serviceMock.findById.mockResolvedValue({ id: 1, empresaId: 5 });

            await instanceController.getInstanceById(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('handles errors', async () => {
            Object.assign(req, { params: { id: '1' }, user: { userId: 1 } });
            serviceMock.findById.mockRejectedValue(new Error('Fail'));

            await instanceController.getInstanceById(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('createInstance', () => {
        it('SUPERADMIN creates instance with empresaId', async () => {
            Object.assign(req, { body: { nombre: 'Test', empresaId: 5 }, user: { role: 'SUPERADMIN' } });
            serviceMock.create.mockResolvedValue({ id: 1 });

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(serviceMock.create).toHaveBeenCalledWith(expect.objectContaining({ empresaId: 5 }));
            expect(statusMock).toHaveBeenCalledWith(201);
        });

        it('SUPERADMIN fails without empresaId', async () => {
            Object.assign(req, { body: { nombre: 'Test' }, user: { role: 'SUPERADMIN' } });

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('ADMIN creates instance for own company', async () => {
            Object.assign(req, { body: { nombre: 'Test' }, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.create.mockResolvedValue({ id: 1 });

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(serviceMock.create).toHaveBeenCalledWith(expect.objectContaining({ empresaId: 5 }));
            expect(statusMock).toHaveBeenCalledWith(201);
        });

        it('Other users cannot create', async () => {
            Object.assign(req, { body: {}, user: { role: 'OPERATOR' } });

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('handles existing name error', async () => {
            Object.assign(req, { body: {}, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.create.mockRejectedValue(new Error('Ya existe una instancia con este nombre'));

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('handles invalid service error', async () => {
            Object.assign(req, { body: {}, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.create.mockRejectedValue(new Error('El servicio especificado no existe'));

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('handles invalid empresa error', async () => {
            Object.assign(req, { body: {}, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.create.mockRejectedValue(new Error('La empresa especificada no existe'));

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('handles generic errors', async () => {
            Object.assign(req, { body: {}, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.create.mockRejectedValue(new Error('Fail'));

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('updateInstance', () => {
        it('SUPERADMIN updates any instance', async () => {
            Object.assign(req, { params: { id: '1' }, body: {}, user: { role: 'SUPERADMIN' } });
            serviceMock.update.mockResolvedValue({ id: 1 });

            await instanceController.updateInstance(req as AuthRequest, res as Response);

            expect(jsonMock).toHaveBeenCalled();
        });

        it('ADMIN can update own instance', async () => {
            Object.assign(req, { params: { id: '1' }, body: {}, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.validateEmpresaAccess.mockResolvedValue(true);
            serviceMock.update.mockResolvedValue({ id: 1 });

            await instanceController.updateInstance(req as AuthRequest, res as Response);

            expect(serviceMock.validateEmpresaAccess).toHaveBeenCalledWith(1, 5);
            expect(jsonMock).toHaveBeenCalled();
        });

        it('ADMIN cannot update other instance', async () => {
            Object.assign(req, { params: { id: '1' }, body: {}, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.validateEmpresaAccess.mockResolvedValue(false);

            await instanceController.updateInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('Other users cannot update', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'OPERATOR' } });

            await instanceController.updateInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('handles not found by error message', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'SUPERADMIN' }, body: {} });
            serviceMock.update.mockRejectedValue(new Error('La instancia no existe'));

            await instanceController.updateInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('handles duplicate name', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'SUPERADMIN' }, body: {} });
            serviceMock.update.mockRejectedValue(new Error('Ya existe una instancia con este nombre'));

            await instanceController.updateInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('handles generic errors', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'SUPERADMIN' }, body: {} });
            serviceMock.update.mockRejectedValue(new Error('Fail'));

            await instanceController.updateInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteInstance', () => {
        it('SUPERADMIN deletes', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'SUPERADMIN' } });
            serviceMock.delete.mockResolvedValue(undefined);

            await instanceController.deleteInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(204);
        });

        it('ADMIN deletes own instance', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.validateEmpresaAccess.mockResolvedValue(true);

            await instanceController.deleteInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(204);
        });

        it('ADMIN fails to delete other instance', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.validateEmpresaAccess.mockResolvedValue(false);

            await instanceController.deleteInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('Other users cannot delete', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'OPERATOR' } });

            await instanceController.deleteInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('handles not found error', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'SUPERADMIN' } });
            serviceMock.delete.mockRejectedValue(new Error('La instancia no existe'));

            await instanceController.deleteInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('handles generic errors', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'SUPERADMIN' } });
            serviceMock.delete.mockRejectedValue(new Error('Fail'));

            await instanceController.deleteInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('getInstanceStats', () => {
        it('SUPERADMIN gets stats', async () => {
            Object.assign(req, { user: { role: 'SUPERADMIN' } });
            serviceMock.getStats.mockResolvedValue({});

            await instanceController.getInstanceStats(req as AuthRequest, res as Response);

            expect(serviceMock.getStats).toHaveBeenCalledWith(); // No arguments
            expect(jsonMock).toHaveBeenCalled();
        });

        it('ADMIN gets own stats', async () => {
            Object.assign(req, { user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.getStats.mockResolvedValue({});

            await instanceController.getInstanceStats(req as AuthRequest, res as Response);

            expect(serviceMock.getStats).toHaveBeenCalledWith(5);
        });

        it('Other users get empty stats', async () => {
            Object.assign(req, { user: { role: 'OPERATOR' } }); // Role sin empresa

            await instanceController.getInstanceStats(req as AuthRequest, res as Response);

            expect(serviceMock.getStats).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ total: 0 }));
        });

        it('handles errors', async () => {
            Object.assign(req, { user: { role: 'SUPERADMIN' } });
            serviceMock.getStats.mockRejectedValue(new Error('Fail'));

            await instanceController.getInstanceStats(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('changeInstanceEstado', () => {
        it('SUPERADMIN changes status', async () => {
            Object.assign(req, { params: { id: '1' }, body: { estado: 'ACTIVE' }, user: { role: 'SUPERADMIN' } });
            serviceMock.changeEstado.mockResolvedValue({});

            await instanceController.changeInstanceEstado(req as AuthRequest, res as Response);

            expect(serviceMock.changeEstado).toHaveBeenCalledWith(1, 'ACTIVE');
            expect(jsonMock).toHaveBeenCalled();
        });

        it('ADMIN changes status if access', async () => {
            Object.assign(req, { params: { id: '1' }, body: { estado: 'ACTIVE' }, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.validateEmpresaAccess.mockResolvedValue(true);
            serviceMock.changeEstado.mockResolvedValue({});

            await instanceController.changeInstanceEstado(req as AuthRequest, res as Response);

            expect(jsonMock).toHaveBeenCalled();
        });

        it('ADMIN fails if no access', async () => {
            Object.assign(req, { params: { id: '1' }, body: {}, user: { role: 'ADMIN', empresaId: 5 } });
            serviceMock.validateEmpresaAccess.mockResolvedValue(false);

            await instanceController.changeInstanceEstado(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('Operator cannot change status', async () => {
            Object.assign(req, { params: { id: '1' }, user: { role: 'OPERATOR' } });

            await instanceController.changeInstanceEstado(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('handles errors', async () => {
            Object.assign(req, { params: { id: '1' }, body: {}, user: { role: 'SUPERADMIN' } });
            serviceMock.changeEstado.mockRejectedValue(new Error('Fail'));

            await instanceController.changeInstanceEstado(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
});
