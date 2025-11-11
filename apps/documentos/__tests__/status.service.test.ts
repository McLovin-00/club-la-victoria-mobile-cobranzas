const { StatusService } = require('../src/services/status.service');

jest.mock('../src/config/database', () => ({
  db: {
    getClient: () => ({
      document: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'APROBADO', _count: { status: 3 } },
          { status: 'PENDIENTE', _count: { status: 1 } },
        ]),
        findMany: jest.fn().mockResolvedValue([
          { entityType: 'CHOFER', entityId: 1 },
          { entityType: 'CAMION', entityId: 2 },
        ]),
      },
    }),
  },
}));

describe('StatusService', () => {
  it('calculateEntityStatus: verde/amarillo/rojo', () => {
    expect(StatusService.calculateEntityStatus({ total: 0, aprobado: 0, pendiente: 0, rechazado: 0, vencido: 0 })).toBe('rojo');
    expect(StatusService.calculateEntityStatus({ total: 5, aprobado: 5, pendiente: 0, rechazado: 0, vencido: 0 })).toBe('verde');
    expect(StatusService.calculateEntityStatus({ total: 2, aprobado: 0, pendiente: 1, rechazado: 0, vencido: 1 })).toBe('rojo');
    expect(StatusService.calculateEntityStatus({ total: 2, aprobado: 1, pendiente: 1, rechazado: 0, vencido: 0 })).toBe('amarillo');
  });

  it('getEmpresaStatusSummary retorna estructura', async () => {
    const res = await StatusService.getEmpresaStatusSummary(1, 10);
    expect(res).toHaveProperty('empresaId', 10);
    expect(res).toHaveProperty('overallStatus');
  });
});
