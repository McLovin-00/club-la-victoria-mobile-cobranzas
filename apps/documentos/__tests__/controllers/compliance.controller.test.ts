import { Response } from 'express';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { debug: jest.fn() },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, _status: number, code: string) => {
    const e: any = new Error(message);
    e.code = code;
    return e;
  },
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: { evaluateEquipoClienteDetailed: jest.fn(async () => []) },
}));

import { ComplianceController } from '../../src/controllers/compliance.controller';
import { ComplianceService } from '../../src/services/compliance.service';

describe('ComplianceController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('getEquipoCompliance validates id and returns data', async () => {
    const res = makeRes();
    const badReq: Partial<AuthRequest> = { params: { id: '0' } };
    await expect(ComplianceController.getEquipoCompliance(badReq as AuthRequest, res as Response)).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null } as unknown);
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ clienteId: 7 }] as unknown);
    (ComplianceService.evaluateEquipoClienteDetailed as jest.Mock).mockResolvedValueOnce([{ templateId: 1 }] as unknown);
    prismaMock.document.findMany.mockResolvedValue([] as unknown);

    const req: Partial<AuthRequest> = { params: { id: '1' } };
    await ComplianceController.getEquipoCompliance(req as AuthRequest, res as Response);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('getEquipoCompliance throws not found when equipo missing', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    const res = makeRes();
    const req: Partial<AuthRequest> = { params: { id: '2' } };
    await expect(ComplianceController.getEquipoCompliance(req as AuthRequest, res as Response)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

});


