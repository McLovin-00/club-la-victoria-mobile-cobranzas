import type { Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mocks hoist-safe
const archiveMock = {
  on: jest.fn(),
  pipe: jest.fn(),
  append: jest.fn(),
  finalize: jest.fn(),
  abort: jest.fn(),
};
const archiverFn = jest.fn(() => archiveMock);

jest.mock('archiver', () => ({
  __esModule: true,
  default: archiverFn,
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'PUBLIC_KEY'),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('exceljs', () => {
  class WorksheetMock {
    columns: any[] = [];
    getRow() {
      return { font: {}, fill: {}, alignment: {}, height: 0 };
    }
    addRow = jest.fn();
    eachRow = jest.fn((cb: any) => {
      // Simular una sola fila de datos para cubrir el callback
      cb({ eachCell: (cellCb: any) => cellCb({ border: {}, alignment: {} }) }, 2);
    });
  }
  class WorkbookMock {
    creator = '';
    addWorksheet = jest.fn(() => new WorksheetMock());
    xlsx = {
      writeBuffer: jest.fn(async () => Buffer.from('xlsx')),
      write: jest.fn(async () => undefined),
    };
  }
  const excel = { Workbook: WorkbookMock };
  return { __esModule: true, default: excel, Workbook: WorkbookMock };
});

const minioServiceMock = { getObject: jest.fn(async () => ({}) ) };
jest.mock('../../src/services/minio.service', () => ({ minioService: minioServiceMock }));

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: { log: jest.fn(), logEquipoChange: jest.fn() },
}));

// Middlewares: no-op para no depender de auth real
jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/middlewares/ownership.middleware', () => ({
  ownsEquipo: () => (_req: any, _res: any, next: any) => next(),
  canModifyEquipo: () => (_req: any, _res: any, next: any) => next(),
  canTransferEquipo: () => (_req: any, _res: any, next: any) => next(),
}));

// Controller methods mocked (no nos interesa cubrir controladores acá)
jest.mock('../../src/controllers/equipos.controller', () => ({
  EquiposController: {
    list: jest.fn(),
    searchPaged: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    createMinimal: jest.fn(),
    createCompleto: jest.fn(),
    rollbackCompleto: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    history: jest.fn(),
    getAuditHistory: jest.fn(),
    getRequisitos: jest.fn(),
    updateEntidades: jest.fn(),
    addCliente: jest.fn(),
    removeClienteWithArchive: jest.fn(),
    transferir: jest.fn(),
    associateCliente: jest.fn(),
    removeCliente: jest.fn(),
  },
}));

import router from '../../src/routes/equipos.routes';

function createRes(): Response & {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  send: jest.Mock;
  end: jest.Mock;
  headersSent?: boolean;
} {
  const res: any = {
    status: jest.fn(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    headersSent: false,
  };
  res.status.mockImplementation(() => res);
  return res;
}

function findHandler(method: 'get' | 'post', path: string) {
  const layer: any = (router as any).stack.find((l: any) => l.route?.path === path && l.route?.methods?.[method]);
  if (!layer) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle as Function; // último handler
}

describe('equipos.routes handlers', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    // reset cache interno del módulo (jwt key / archiver singleton) entre tests
    jest.resetModules();
  });

  it('POST /download/vigentes-form => 401 si falta token o inválido', async () => {
    const handler = findHandler('post', '/download/vigentes-form');
    const res = createRes();
    await handler({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);

    const jwt = require('jsonwebtoken');
    jwt.verify.mockImplementationOnce(() => {
      throw new Error('invalid');
    });
    const res2 = createRes();
    await handler({ body: { token: 't' } }, res2);
    expect(res2.status).toHaveBeenCalledWith(401);
  });

  it('POST /download/vigentes-form => genera zip con excel y docs', async () => {
    const jwt = require('jsonwebtoken');
    jwt.verify.mockReturnValueOnce({ tenantEmpresaId: 1, role: 'ADMIN' });

    // equipos permitidos
    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    // streamVigentesZip
    prismaMock.equipo.findUnique
      .mockResolvedValueOnce({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 9,
        driverId: 11,
        truckId: 22,
        trailerId: null,
        driverDniNorm: '1',
        truckPlateNorm: 'AA',
        trailerPlateNorm: null,
        empresaTransportistaId: null,
        empresaTransportista: { cuit: '307', razonSocial: 'ET' },
      })
      .mockResolvedValueOnce({
        id: 2,
        tenantEmpresaId: 1,
        dadorCargaId: 9,
        driverId: 12,
        truckId: 23,
        trailerId: null,
        driverDniNorm: '2',
        truckPlateNorm: 'BB',
        trailerPlateNorm: null,
        empresaTransportistaId: null,
        empresaTransportista: { cuit: '307', razonSocial: 'ET' },
      });

    prismaMock.chofer.findUnique.mockResolvedValue({ dni: '1', nombre: 'N', apellido: 'A' } as any);
    prismaMock.camion.findUnique.mockResolvedValue({ patente: 'AA' } as any);
    prismaMock.document.findMany.mockResolvedValue([
      { id: 1, filePath: 'docs-t1/a.pdf', entityType: 'CAMION', entityId: 22, fileName: 'a.pdf', template: { name: 'Seguro' } },
    ] as any);

    minioServiceMock.getObject.mockResolvedValue({} as any);

    const handler = findHandler('post', '/download/vigentes-form');
    const res = createRes();

    await handler({ body: { token: 't', equipoIds: [2, 1] } }, res);

    expect(archiverFn).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
    expect(archiveMock.pipe).toHaveBeenCalledWith(res);
    expect(archiveMock.append).toHaveBeenCalled(); // docs + excel
    expect(archiveMock.finalize).toHaveBeenCalled();
  });

  it('GET /:id/summary.xlsx => genera xlsx', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 9,
      driverId: 11,
      truckId: 22,
      trailerId: null,
      driverDniNorm: '1',
      truckPlateNorm: 'AA',
      trailerPlateNorm: null,
      empresaTransportista: { cuit: '307', razonSocial: 'ET' },
    } as any);
    prismaMock.document.findMany.mockResolvedValueOnce([]);
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '1', nombre: 'N', apellido: 'A' } as any);
    prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: 'AA' } as any);

    const handler = findHandler('get', '/:id/summary.xlsx');
    const res = createRes();
    await handler({ params: { id: '1' } }, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.end).toHaveBeenCalled();
  });
});


