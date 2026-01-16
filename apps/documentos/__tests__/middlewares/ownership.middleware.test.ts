import { Response } from 'express';
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { warn: jest.fn(), error: jest.fn() },
}));

import { ownsEquipo, canModifyEquipo, canApproveDocuments, canTransferEquipo } from '../../src/middlewares/ownership.middleware';

describe('ownership middlewares', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('ownsEquipo allows admin and blocks missing auth/id', async () => {
    const res = makeRes();
    const next = jest.fn();
    await ownsEquipo()({ user: null, params: { id: '1' } } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);

    const res2 = makeRes();
    await ownsEquipo()({ user: { role: 'ADMIN_INTERNO' }, params: { id: '1' } } as any, res2 as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('ownsEquipo validates id and returns 404 when equipo missing', async () => {
    const next = jest.fn();
    const res = makeRes();
    await ownsEquipo()({ user: { role: 'ADMIN', userId: 1, empresaId: 1 }, params: { id: 'x' } } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(400);

    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    const res2 = makeRes();
    await ownsEquipo()({ user: { role: 'ADMIN', userId: 1, empresaId: 1 }, params: { id: '1' } } as any, res2 as any, next);
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  it('ownsEquipo enforces role rules (CLIENTE)', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, empresaTransportistaId: null, clientes: [{ clienteId: 9 }] } as any);
    const res = makeRes();
    const next = jest.fn();
    await ownsEquipo()({ user: { role: 'CLIENTE', userId: 1, empresaId: 7 }, params: { id: '1' } } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('ownsEquipo enforces tenant for DADOR_DE_CARGA and TRANSPORTISTA and default branch', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2, dadorCargaId: 2, empresaTransportistaId: null, clientes: [] } as any);
    const res = makeRes();
    const next = jest.fn();
    await ownsEquipo()({ user: { role: 'DADOR_DE_CARGA', userId: 1, empresaId: 1 }, params: { id: '1' } } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2, dadorCargaId: 2, empresaTransportistaId: null, clientes: [] } as any);
    const res2 = makeRes();
    await ownsEquipo()({ user: { role: 'TRANSPORTISTA', userId: 1, empresaId: 1 }, params: { id: '1' } } as any, res2 as any, next);
    expect(res2.status).toHaveBeenCalledWith(403);

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2, dadorCargaId: 2, empresaTransportistaId: null, clientes: [] } as any);
    const res3 = makeRes();
    await ownsEquipo()({ user: { role: 'OPERATOR', userId: 1, empresaId: 1 }, params: { id: '1' } } as any, res3 as any, next);
    expect(res3.status).toHaveBeenCalledWith(403);
  });

  it('ownsEquipo 500 on exception', async () => {
    prismaMock.equipo.findUnique.mockRejectedValueOnce(new Error('boom'));
    const res = makeRes();
    const next = jest.fn();
    await ownsEquipo()({ user: { role: 'ADMIN', userId: 1, empresaId: 1 }, params: { id: '1' } } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('canModifyEquipo blocks non-allowed roles and delegates to ownsEquipo', async () => {
    const res = makeRes();
    const next = jest.fn();
    await canModifyEquipo()({ user: { role: 'OPERATOR' }, params: { id: '1' } } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, empresaTransportistaId: null, clientes: [] } as any);
    const res2 = makeRes();
    await canModifyEquipo()({ user: { role: 'DADOR_DE_CARGA', userId: 1, empresaId: 1 }, params: { id: '1' } } as any, res2 as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('canApproveDocuments and canTransferEquipo enforce roles', async () => {
    const res = makeRes();
    const next = jest.fn();
    await canApproveDocuments()({ user: { role: 'TRANSPORTISTA' } } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);

    const res2 = makeRes();
    await canTransferEquipo()({ user: { role: 'DADOR_DE_CARGA' } } as any, res2 as any, next);
    expect(res2.status).toHaveBeenCalledWith(403);

    const res3 = makeRes();
    await canApproveDocuments()({ user: { role: 'DADOR_DE_CARGA' } } as any, res3 as any, next);
    expect(next).toHaveBeenCalled();

    const res4 = makeRes();
    await canTransferEquipo()({ user: { role: 'ADMIN_INTERNO' } } as any, res4 as any, next);
    expect(next).toHaveBeenCalled();
  });
});


