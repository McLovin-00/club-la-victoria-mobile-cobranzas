import request from 'supertest';
import express from 'express';

jest.mock('../src/middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.tenantId = 1; next(); },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../src/config/database', () => ({
  prisma: {
    equipoCliente: {
      findMany: jest.fn().mockResolvedValue([{ equipoId: 10 }, { equipoId: 20 }]),
    },
  },
}));

const calcMock = jest.fn()
  .mockResolvedValueOnce({ equipoId: 10, estado: 'verde', breakdown: { faltantes: 0, vencidos: 0, proximos: 0, vigentes: 3, pendientes: 0, rechazados: 0 } })
  .mockResolvedValueOnce({ equipoId: 20, estado: 'rojo', breakdown: { faltantes: 1, vencidos: 1, proximos: 0, vigentes: 0, pendientes: 0, rechazados: 0 } });
jest.mock('../src/services/equipo-estado.service', () => ({
  EquipoEstadoService: {
    calculateEquipoEstado: (...args: any[]) => calcMock(...args),
  },
}));

// Mock ExcelJS (shape: { Workbook })
jest.mock('exceljs', () => ({
  Workbook: class Workbook {
    worksheets: any[] = [];
    addWorksheet(name: string) { const ws = { name, columns: [], addRow: jest.fn() }; this.worksheets.push(ws); return ws; }
    xlsx = { write: (res: any) => { if (typeof res.end === 'function') res.end(); return Promise.resolve(); } };
  },
}));

const clientsRouter = require('../src/routes/clients.routes').default;

describe('Clients routes - summary.xlsx by client', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/docs/clients', clientsRouter);

  it('GET /:clienteId/summary.xlsx streams an xlsx', async () => {
    const res = await request(app).get('/api/docs/clients/77/summary.xlsx');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('attachment; filename=cliente_77_equipos_estado.xlsx');
    expect(calcMock).toHaveBeenCalledWith(10, 77);
    expect(calcMock).toHaveBeenCalledWith(20, 77);
  });
});


