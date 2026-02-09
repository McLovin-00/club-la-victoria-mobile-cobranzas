import { Request, Response } from 'express';
// Primero definir mocks antes de importar el controlador
const mockFindById = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockGetStats = jest.fn();

// Mock dependencies
jest.mock('../../services/platformAuth.service', () => ({}));

// Mock del servicio completo
jest.mock('../../services/empresa.service', () => {
    return {
        EmpresaService: {
            getInstance: jest.fn(() => ({
                findById: mockFindById,
                findMany: mockFindMany,
                create: mockCreate,
                update: mockUpdate,
                delete: mockDelete,
                getStats: mockGetStats,
            })),
        },
    };
});

jest.mock('../../config/logger', () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

// Ahora importar el controlador
import * as empresaController from '../empresa.controller';

describe('Empresa Controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        res = {
            status: statusMock,
            json: jsonMock,
        } as unknown as Response;
    });

    describe('getAllEmpresas', () => {
        it('returns empty list for ADMIN/OPERATOR without empresaId', async () => {
            req = {
                platformUser: { role: 'ADMIN', empresaId: null } as any,
            } as any;

            mockFindById.mockResolvedValue(null);

            await empresaController.getAllEmpresas(req as Request, res as Response);

            expect(mockFindById).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [] });
        });

        it('returns single empresa for OPERATOR with empresaId', async () => {
            req = {
                platformUser: { role: 'OPERATOR', empresaId: 11 } as any,
            } as any;

            const mockEmpresa = { id: 11, nombre: 'Empresa 11' };
            mockFindById.mockResolvedValue(mockEmpresa);

            await empresaController.getAllEmpresas(req as Request, res as Response);

            expect(mockFindById).toHaveBeenCalledWith(11);
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [mockEmpresa] });
        });

        it('returns single empresa for ADMIN with empresaId', async () => {
            req = {
                platformUser: { role: 'ADMIN', empresaId: 10 } as any,
            } as any;

            const mockEmpresa = { id: 10, nombre: 'Empresa 10' };
            mockFindById.mockResolvedValue(mockEmpresa);

            await empresaController.getAllEmpresas(req as Request, res as Response);

            expect(mockFindById).toHaveBeenCalledWith(10);
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [mockEmpresa] });
        });

        it('returns tenant empresa for SUPERADMIN when tenantId is set', async () => {
            req = { tenantId: 20, platformUser: { role: 'SUPERADMIN' } } as any;

            const mockEmpresa = { id: 20, nombre: 'Empresa 20' };
            mockFindById.mockResolvedValue(mockEmpresa);

            await empresaController.getAllEmpresas(req as Request, res as Response);

            expect(mockFindById).toHaveBeenCalledWith(20);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [mockEmpresa] });
        });

        it('returns all empresas for SUPERADMIN without tenantId', async () => {
            req = { platformUser: { role: 'SUPERADMIN' }, tenantId: undefined } as any;
            mockFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

            await empresaController.getAllEmpresas(req as Request, res as Response);

            expect(mockFindMany).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }, { id: 2 }] });
        });

        // Test errors
        it('handles errors', async () => {
            req = { platformUser: { role: 'SUPERADMIN' } } as any;
            mockFindMany.mockRejectedValue(new Error('Fail'));
            await empresaController.getAllEmpresas(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('getAllEmpresasSimple', () => {
        it('returns simplified list of empresas', async () => {
            mockFindMany.mockResolvedValue([{ id: 1 }]);

            await empresaController.getAllEmpresasSimple({} as Request, res as Response);

            expect(mockFindMany).toHaveBeenCalledWith({ limit: 1000 });
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                data: [{ id: 1 }],
            });
        });

        it('handles errors', async () => {
            mockFindMany.mockRejectedValue(new Error('Fail'));
            await empresaController.getAllEmpresasSimple({} as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('getEmpresaById', () => {
        it('returns empresa', async () => {
            req = { params: { id: '1' }, platformUser: { userId: 1 } } as any;
            mockFindById.mockResolvedValue({ id: 1 });
            await empresaController.getEmpresaById(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('returns 404', async () => {
            req = { params: { id: '1' }, platformUser: { userId: 1 } } as any;
            mockFindById.mockResolvedValue(null);
            await empresaController.getEmpresaById(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('returns 500 on error', async () => {
            req = { params: { id: '1' }, platformUser: { userId: 1 } } as any;
            mockFindById.mockRejectedValue(new Error('Fail'));
            await empresaController.getEmpresaById(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('createEmpresa', () => {
        it('creates', async () => {
            req = { body: { nombre: 'N' }, platformUser: { userId: 1 } } as any;
            mockCreate.mockResolvedValue({ id: 1 });
            await empresaController.createEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(201);
        });

        it('returns 400 on unique constraint', async () => {
            req = { body: { nombre: 'N' }, platformUser: { userId: 1 } } as any;
            mockCreate.mockRejectedValue(new Error('unique constraint'));
            await empresaController.createEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('returns 500 on error', async () => {
            req = { body: { nombre: 'N' }, platformUser: { userId: 1 } } as any;
            mockCreate.mockRejectedValue(new Error('Fail'));
            await empresaController.createEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('updateEmpresa', () => {
        it('updates', async () => {
            req = { params: { id: '1' }, body: {}, platformUser: { userId: 1 } } as any;
            mockUpdate.mockResolvedValue({ id: 1 });
            await empresaController.updateEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('returns 404 when not found', async () => {
            req = { params: { id: '1' }, body: {}, platformUser: { userId: 1 } } as any;
            mockUpdate.mockResolvedValue(null);
            await empresaController.updateEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('returns 400 on unique constraint', async () => {
            req = { params: { id: '1' }, body: {}, platformUser: { userId: 1 } } as any;
            mockUpdate.mockRejectedValue(new Error('unique constraint'));
            await empresaController.updateEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
        });

        it('returns 500 on error', async () => {
            req = { params: { id: '1' }, body: {}, platformUser: { userId: 1 } } as any;
            mockUpdate.mockRejectedValue(new Error('Fail'));
            await empresaController.updateEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteEmpresa', () => {
        it('deletes', async () => {
            req = { params: { id: '1' }, platformUser: { userId: 1 } } as any;
            mockFindById.mockResolvedValue({ id: 1 });
            mockDelete.mockResolvedValue({ id: 1 });
            await empresaController.deleteEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('returns 404 when missing', async () => {
            req = { params: { id: '1' }, platformUser: { userId: 1 } } as any;
            mockFindById.mockResolvedValue(null);
            await empresaController.deleteEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('returns 500 on error', async () => {
            req = { params: { id: '1' }, platformUser: { userId: 1 } } as any;
            mockFindById.mockResolvedValue({ id: 1 });
            mockDelete.mockRejectedValue(new Error('Fail'));
            await empresaController.deleteEmpresa(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('getEmpresaStats', () => {
        it('returns stats', async () => {
            mockGetStats.mockResolvedValue({ total: 1 });
            await empresaController.getEmpresaStats({ platformUser: { userId: 1 } } as any, res as Response);
            expect(jsonMock).toHaveBeenCalledWith({ total: 1 });
        });

        it('returns 500 on error', async () => {
            mockGetStats.mockRejectedValue(new Error('Fail'));
            await empresaController.getEmpresaStats({ platformUser: { userId: 1 } } as any, res as Response);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
});
