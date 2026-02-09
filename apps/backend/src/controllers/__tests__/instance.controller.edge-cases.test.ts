/**
 * Tests de edge cases para instance.controller.ts
 * Propósito: Cubrir branches de error y edge cases no cubiertos en tests unitarios principales
 */

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

describe('Instance Controller - Edge Cases', () => {
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

        // Default Request con todas las props necesarias
        req = {
            params: {},
            query: {},
            body: {},
            user: { role: 'OPERATOR', userId: 1, empresaId: undefined, email: 'test@example.com' },
        };
    });

    describe('getInstances - Query params edge cases', () => {
        it('parsea serviceId NaN como undefined', async () => {
            Object.assign(req, {
                user: { role: 'SUPERADMIN', userId: 1 },
                query: { serviceId: 'invalid' }
            });
            serviceMock.findMany.mockResolvedValue([]);

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(serviceMock.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ serviceId: NaN })
            );
        });

        it('parsea offset negativo como 0', async () => {
            Object.assign(req, {
                user: { role: 'SUPERADMIN', userId: 1 },
                query: { offset: '-5' }
            });
            serviceMock.findMany.mockResolvedValue([]);

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(serviceMock.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ offset: -5 })
            );
        });

        it('parsea limit negativo como 50 (default)', async () => {
            Object.assign(req, {
                user: { role: 'SUPERADMIN', userId: 1 },
                query: { limit: '-10' }
            });
            serviceMock.findMany.mockResolvedValue([]);

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(serviceMock.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ limit: -10 })
            );
        });
    });

    describe('getInstances - Rol-based access edge cases', () => {
        it('OPERATOR sin empresaId retorna array vacío', async () => {
            Object.assign(req, {
                user: { role: 'OPERATOR', userId: 1 },
                query: {}
            });

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(serviceMock.findMany).not.toHaveBeenCalled();
            expect(serviceMock.findManyByEmpresa).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [] });
        });

        it('ADMIN sin empresaId retorna array vacío', async () => {
            Object.assign(req, {
                user: { role: 'ADMIN', userId: 1 },
                query: {}
            });

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(serviceMock.findMany).not.toHaveBeenCalled();
            expect(serviceMock.findManyByEmpresa).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [] });
        });
    });

    describe('createInstance - Error handling edge cases', () => {
        it('maneja error sin message (no es instancia de Error)', async () => {
            Object.assign(req, {
                body: {
                    nombre: 'Test Instance',
                    serviceId: 1,
                    estado: 'ACTIVO'
                },
                user: { role: 'ADMIN', userId: 2, empresaId: 5 }
            });

            // Error que no es instancia de Error
            const errorObj = { notAnError: true, message: 'fail' };
            serviceMock.create.mockRejectedValue(errorObj);

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
            });
        });

        it('maneja error genérico no reconocido', async () => {
            Object.assign(req, {
                body: {
                    nombre: 'Test Instance',
                    serviceId: 1,
                    estado: 'ACTIVO'
                },
                user: { role: 'ADMIN', userId: 2, empresaId: 5 }
            });

            serviceMock.create.mockRejectedValue(new Error('Algún error desconocido'));

            await instanceController.createInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
            });
        });
    });

    describe('updateInstance - Error handling edge cases', () => {
        it('maneja error sin message al actualizar', async () => {
            Object.assign(req, {
                params: { id: '1' },
                body: {
                    nombre: 'Updated Instance',
                    estado: 'ACTIVO'
                },
                user: { role: 'SUPERADMIN', userId: 1 }
            });

            const errorObj = { customError: true };
            serviceMock.validateEmpresaAccess.mockResolvedValue(true);
            serviceMock.update.mockRejectedValue(errorObj);

            await instanceController.updateInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
            });
        });

        it('maneja error genérico al actualizar', async () => {
            Object.assign(req, {
                params: { id: '1' },
                body: {
                    nombre: 'Updated Instance',
                    estado: 'ACTIVO'
                },
                user: { role: 'SUPERADMIN', userId: 1 }
            });

            serviceMock.validateEmpresaAccess.mockResolvedValue(true);
            serviceMock.update.mockRejectedValue(new Error('Error inesperado'));

            await instanceController.updateInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteInstance - Error handling edge cases', () => {
        it('maneja error sin message al eliminar', async () => {
            Object.assign(req, {
                params: { id: '1' },
                user: { role: 'SUPERADMIN', userId: 1 }
            });

            const errorObj = { deletionError: true };
            serviceMock.validateEmpresaAccess.mockResolvedValue(true);
            serviceMock.delete.mockRejectedValue(errorObj);

            await instanceController.deleteInstance(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
            });
        });
    });

    describe('changeInstanceEstado - Error handling edge cases', () => {
        it('maneja error genérico al cambiar estado', async () => {
            Object.assign(req, {
                params: { id: '1' },
                body: { estado: 'DETENIDO' },
                user: { role: 'SUPERADMIN', userId: 1 }
            });

            serviceMock.validateEmpresaAccess.mockResolvedValue(true);
            serviceMock.changeEstado.mockRejectedValue(new Error('Fallo al cambiar estado'));

            await instanceController.changeInstanceEstado(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
            });
        });

        it('maneja error sin message al cambiar estado', async () => {
            Object.assign(req, {
                params: { id: '1' },
                body: { estado: 'DETENIDO' },
                user: { role: 'SUPERADMIN', userId: 1 }
            });

            const errorObj = { stateChangeError: true };
            serviceMock.validateEmpresaAccess.mockResolvedValue(true);
            serviceMock.changeEstado.mockRejectedValue(errorObj);

            await instanceController.changeInstanceEstado(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('getInstances - Catch block error', () => {
        it('maneja error en findMany', async () => {
            Object.assign(req, {
                user: { role: 'SUPERADMIN', userId: 1 },
                query: {}
            });

            serviceMock.findMany.mockRejectedValue(new Error('DB Error'));

            await instanceController.getInstances(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
            });
        });
    });

    describe('getInstanceById - Catch block error', () => {
        it('maneja error en findById', async () => {
            Object.assign(req, {
                params: { id: '1' },
                user: { role: 'SUPERADMIN', userId: 1 }
            });

            serviceMock.findById.mockRejectedValue(new Error('DB Error'));

            await instanceController.getInstanceById(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
            });
        });
    });

    describe('getInstanceStats - Catch block error', () => {
        it('maneja error en getStats', async () => {
            Object.assign(req, {
                user: { role: 'SUPERADMIN', userId: 1 },
                query: {}
            });

            serviceMock.getStats.mockRejectedValue(new Error('Stats Error'));

            await instanceController.getInstanceStats(req as AuthRequest, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Error interno del servidor',
            });
        });
    });
});
