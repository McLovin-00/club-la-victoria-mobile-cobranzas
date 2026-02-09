import type { Response } from 'express';

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../src/schemas/audit.schemas', () => ({
  auditLogsQuerySchema: {},
}));

const findMany = jest.fn();
const count = jest.fn();
const dbClient: any = { auditLog: { findMany, count } };
const getClient = jest.fn(() => dbClient);

jest.mock('../../src/config/database', () => ({
  db: { getClient },
}));

// exceljs dynamic import (used by /logs.xlsx)
class FakeWorksheet {
  columns: any;
  addRow = jest.fn();
}
class FakeWorkbook {
  addWorksheet = jest.fn(() => new FakeWorksheet());
  xlsx = { write: jest.fn(async () => undefined) };
}
jest.mock('exceljs', () => ({ Workbook: FakeWorkbook }), { virtual: true });

import router from '../../src/routes/audit.routes';

function createRes(): Response & { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock; end: jest.Mock } {
  const res: any = { status: jest.fn(), json: jest.fn(), setHeader: jest.fn(), end: jest.fn() };
  res.status.mockImplementation(() => res);
  res.json.mockImplementation(() => res);
  return res;
}

function findGetHandler(path: string) {
  const layer: any = (router as any).stack.find((l: any) => l.route?.path === path && l.route?.methods?.get);
  if (!layer) throw new Error(`GET ${path} not found`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle as Function;
}

describe('audit.routes handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getClient.mockReturnValue(dbClient);
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
  });

  it('GET /logs returns empty when auditLog model missing and handles error', async () => {
    const handler = findGetHandler('/logs');
    getClient.mockReturnValueOnce({}); // no auditLog
    const res = createRes();
    await handler({ tenantId: 1, query: { page: 2, limit: 10 } } as any, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [], total: 0, page: 2, limit: 10 }));

    findMany.mockRejectedValueOnce(new Error('boom'));
    const res2 = createRes();
    await handler({ tenantId: 1, query: {} } as any, res2);
    expect(res2.status).toHaveBeenCalledWith(500);
  });

  it('GET /logs queries prisma with built where + paging', async () => {
    const handler = findGetHandler('/logs');
    findMany.mockResolvedValueOnce([{ id: 1 }]);
    count.mockResolvedValueOnce(25);
    const res = createRes();
    await handler(
      {
        tenantId: 99,
        query: { page: 2, limit: 10, userEmail: 'a@b', method: 'POST', statusCode: '201', pathContains: 'docs' },
      } as any,
      res
    );
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, total: 25, totalPages: 3 }));
  });

  it('GET /logs.csv returns header when model missing and generates CSV with escaping', async () => {
    const handler = findGetHandler('/logs.csv');

    getClient.mockReturnValueOnce({});
    const res = createRes();
    await handler({ tenantId: 1, query: {} } as any, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('text/csv'));
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining('id,createdAt'));

    // with rows
    findMany.mockResolvedValueOnce([
      { id: 1, createdAt: new Date('2020-01-01T00:00:00.000Z'), accion: 'A,"B"', method: 'GET', statusCode: 200, userId: 1, userRole: 'ADMIN', entityType: 'DOC', entityId: 2, path: '/x' },
    ]);
    const res2 = createRes();
    await handler({ tenantId: 1, query: {} } as any, res2);
    const out = (res2.end as jest.Mock).mock.calls[0][0] as string;
    expect(out).toContain('"A,""B"""'); // escaped quotes

    // error => 500
    findMany.mockRejectedValueOnce(new Error('boom'));
    const res3 = createRes();
    await handler({ tenantId: 1, query: {} } as any, res3);
    expect(res3.status).toHaveBeenCalledWith(500);
  });

  it('GET /logs.xlsx returns 200 when model missing and writes workbook when ok', async () => {
    const handler = findGetHandler('/logs.xlsx');

    getClient.mockReturnValueOnce({});
    const res = createRes();
    await handler({ tenantId: 1, query: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);

    findMany.mockResolvedValueOnce([{ id: 1, createdAt: new Date(), accion: 'A', method: 'GET', statusCode: 200, userId: 1, userRole: 'ADMIN', entityType: 'DOC', entityId: 2, path: '/x' }]);
    const res2 = createRes();
    await handler({ tenantId: 1, query: {} } as any, res2);
    expect(res2.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('spreadsheetml'));
    expect(res2.end).toHaveBeenCalled();

    // error => 500 json
    findMany.mockRejectedValueOnce(new Error('boom'));
    const res3 = createRes();
    await handler({ tenantId: 1, query: {} } as any, res3);
    expect(res3.status).toHaveBeenCalledWith(500);
  });
});


