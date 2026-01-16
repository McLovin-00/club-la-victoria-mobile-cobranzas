import type { Request, Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

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

const jwtVerifyMock = jest.fn();
jest.mock('jsonwebtoken', () => ({
  verify: (token: string) => jwtVerifyMock(token),
}));

jest.mock('exceljs', () => {
  class WorksheetMock {
    columns: Array<unknown> = [];
    addRow = jest.fn();
    getRow() {
      return { font: {}, fill: {}, alignment: {}, height: 0 };
    }
    eachRow = jest.fn((cb: (row: { eachCell: (cellCb: (cell: { border: Record<string, unknown>; alignment: Record<string, unknown> }) => void) => void }, num: number) => void) => {
      cb({ eachCell: (cellCb) => cellCb({ border: {}, alignment: {} }) }, 2);
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
  return { __esModule: true, default: { Workbook: WorkbookMock }, Workbook: WorkbookMock };
});

const minioServiceMock = { getObject: jest.fn(async () => ({})) };
jest.mock('../../src/services/minio.service', () => ({ minioService: minioServiceMock }));

const notificationServiceMock = {
  checkMissingForEquipo: jest.fn(async () => 2),
  send: jest.fn(async () => undefined),
};

jest.mock('../../src/services/notification.service', () => ({
  NotificationService: notificationServiceMock,
}));

const complianceServiceMock = {
  evaluateEquipoCliente: jest.fn(async () => [{ state: 'FALTANTE' }]),
};

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: complianceServiceMock,
}));

const equipoEstadoServiceMock = {
  calculateEquipoEstado: jest.fn(async () => ({ estado: 'OK' })),
};

jest.mock('../../src/services/equipo-estado.service', () => ({
  EquipoEstadoService: equipoEstadoServiceMock,
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: { log: jest.fn(), logEquipoChange: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: Request, _res: Response, next: () => void) => next(),
  authorize: () => (_req: Request, _res: Response, next: () => void) => next(),
  validate: () => (_req: Request, _res: Response, next: () => void) => next(),
}));

jest.mock('../../src/middlewares/ownership.middleware', () => ({
  ownsEquipo: () => (_req: Request, _res: Response, next: () => void) => next(),
  canModifyEquipo: () => (_req: Request, _res: Response, next: () => void) => next(),
  canTransferEquipo: () => (_req: Request, _res: Response, next: () => void) => next(),
}));

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

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  end: jest.Mock;
  headersSent?: boolean;
};

type RouterLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

const findHandler = (method: 'get' | 'post' | 'patch', path: string) => {
  const stack = (router as unknown as { stack: RouterLayer[] }).stack;
  const layer = stack.find((item) => item.route?.path === path && item.route?.methods?.[method]);
  if (!layer?.route) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle;
};

const createRes = (): MockResponse & { send: jest.Mock } => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
    send: jest.fn(),
    headersSent: false,
  } as unknown as MockResponse & { send: jest.Mock };
  res.status.mockReturnValue(res);
  res.send.mockReturnValue(res);
  return res;
};

describe('equipos.routes extra handlers', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('PATCH /:id/toggle-activo valida boolean', async () => {
    const handler = findHandler('patch', '/:id/toggle-activo');
    const res = createRes();
    const req = { params: { id: '1' }, body: { activo: 'si' } } as unknown as Request;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('PATCH /:id/toggle-activo devuelve 404 si no existe', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    const handler = findHandler('patch', '/:id/toggle-activo');
    const res = createRes();
    const req = { params: { id: '1' }, body: { activo: true }, user: { role: 'ADMIN' } } as unknown as Request;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('PATCH /:id/toggle-activo devuelve 403 si no tiene permisos', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, dadorCargaId: 5, empresaTransportistaId: 10 });
    const handler = findHandler('patch', '/:id/toggle-activo');
    const res = createRes();
    const req = { params: { id: '1' }, body: { activo: true }, user: { role: 'DADOR_DE_CARGA', dadorCargaId: 7 } } as unknown as Request;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('PATCH /:id/toggle-activo actualiza cuando es transportista dueño', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, dadorCargaId: 5, empresaTransportistaId: 10 });
    prismaMock.equipo.update.mockResolvedValueOnce({ id: 1, activo: false });
    const handler = findHandler('patch', '/:id/toggle-activo');
    const res = createRes();
    const req = {
      params: { id: '1' },
      body: { activo: false },
      user: { role: 'TRANSPORTISTA', empresaTransportistaId: 10, id: 20 },
    } as unknown as Request;
    await handler(req, res);
    expect(prismaMock.equipo.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, activo: false } });
  });

  it('POST /download/vigentes-form devuelve 403 si rol no permitido', async () => {
    jwtVerifyMock.mockReturnValueOnce({ role: 'CHOFER' });
    const handler = findHandler('post', '/download/vigentes-form');
    const res = createRes();
    const req = { body: { token: 't', equipoIds: '1' } } as unknown as Request;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('POST /download/vigentes-form valida max equipos', async () => {
    jwtVerifyMock.mockReturnValueOnce({ role: 'ADMIN' });
    const handler = findHandler('post', '/download/vigentes-form');
    const res = createRes();
    const ids = Array.from({ length: 501 }, (_, idx) => idx + 1).join(',');
    const req = { body: { token: 't', equipoIds: ids } } as unknown as Request;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('POST /download/vigentes-form captura error en generación', async () => {
    jwtVerifyMock.mockReturnValueOnce({ role: 'ADMIN' });
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: 3,
      truckId: 4,
      trailerId: null,
      driverDniNorm: '1',
      truckPlateNorm: 'AA',
      trailerPlateNorm: null,
      empresaTransportistaId: null,
      empresaTransportista: { cuit: '1', razonSocial: 'ET' },
    });
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '1', nombre: 'N', apellido: 'A' });
    prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: 'AA' });
    prismaMock.document.findMany.mockResolvedValueOnce([
      { id: 1, filePath: 'docs-t1/a.pdf', entityType: 'CAMION', entityId: 4, fileName: 'a.pdf', template: { name: 'Seguro' } },
    ]);
    minioServiceMock.getObject.mockRejectedValueOnce(new Error('boom'));
    const handler = findHandler('post', '/download/vigentes-form');
    const res = createRes();
    const req = { body: { token: 't', equipoIds: '1' } } as unknown as Request;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('POST /:equipoId/check-missing-now retorna cantidad enviada', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ tenantEmpresaId: 1 });
    const handler = findHandler('post', '/:equipoId/check-missing-now');
    const res = createRes();
    const req = { params: { equipoId: '1' } } as unknown as Request;
    await handler(req, res);
    expect(notificationServiceMock.checkMissingForEquipo).toHaveBeenCalledWith(1, 1);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { sent: 2 } });
  });

  it('POST /:equipoId/request-missing devuelve 404 si no existe', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    const handler = findHandler('post', '/:equipoId/request-missing');
    const res = createRes();
    const req = { params: { equipoId: '1' } } as unknown as Request;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('POST /:equipoId/request-missing envía avisos al chofer', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, driverId: 3 });
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ clienteId: 9 }]);
    prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({ notifyDriverEnabled: true });
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ phones: ['+549111', '+549222', '+549333', '+549444'] });
    complianceServiceMock.evaluateEquipoCliente.mockResolvedValueOnce([{ state: 'FALTANTE' }]);

    const handler = findHandler('post', '/:equipoId/request-missing');
    const res = createRes();
    const req = { params: { equipoId: '1' } } as unknown as Request;
    await handler(req, res);
    expect(notificationServiceMock.send).toHaveBeenCalledTimes(3);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /search/dnis responde 500 en error', async () => {
    prismaMock.equipo.findMany.mockRejectedValueOnce(new Error('boom'));
    const handler = findHandler('post', '/search/dnis');
    const res = createRes();
    const req = { tenantId: 1, body: { dnis: ['30123456'] } } as unknown as Request;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('POST /download/vigentes ejecuta stream', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: null,
      truckId: null,
      trailerId: null,
      driverDniNorm: '1',
      truckPlateNorm: 'AA',
      trailerPlateNorm: null,
      empresaTransportistaId: null,
      empresaTransportista: { cuit: '1', razonSocial: 'ET' },
    });
    prismaMock.chofer.findUnique.mockResolvedValueOnce(null);
    prismaMock.camion.findUnique.mockResolvedValueOnce(null);
    prismaMock.document.findMany.mockResolvedValueOnce([]);

    const handler = findHandler('post', '/download/vigentes');
    const res = createRes();
    const req = { tenantId: 1, body: { equipoIds: [1] }, user: { userId: 1, role: 'ADMIN' } } as unknown as Request;
    await handler(req, res);
    expect(archiveMock.finalize).toHaveBeenCalled();
  });

  it('GET /:id/summary.xlsx agrega filas cuando hay documentos', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: null,
      truckId: null,
      trailerId: null,
      empresaTransportistaId: null,
    });
    prismaMock.document.findMany.mockResolvedValueOnce([
      { id: 1, entityType: 'CAMION', entityId: 10, template: { name: 'Doc', entityType: 'CAMION' }, status: 'APROBADO', uploadedAt: new Date(), expiresAt: null },
    ]);
    const handler = findHandler('get', '/:id/summary.xlsx');
    const res = createRes();
    const req = { params: { id: '1' } } as unknown as Request;
    await handler(req, res);
    expect(res.end).toHaveBeenCalled();
  });
});
