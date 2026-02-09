import { Response } from 'express';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, _status: number, code: string) => {
    const e: any = new Error(message);
    e.code = code;
    return e;
  },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: {
    getFlowiseConfig: jest.fn(async () => ({ enabled: true, baseUrl: 'http://x', apiKey: 'secret', flowId: 'f', timeout: 30000 })),
    updateFlowiseConfig: jest.fn(async () => undefined),
  },
}));

import { FlowiseConfigController } from '../../src/controllers/flowise-config.controller';
import { SystemConfigService } from '../../src/services/system-config.service';

describe('FlowiseConfigController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  it('getConfig denies non-superadmin and returns masked apiKey', async () => {
    const res = makeRes();
    await expect(FlowiseConfigController.getConfig({ user: { role: 'ADMIN' } } as any, res as any)).rejects.toMatchObject({ code: 'GET_CONFIG_ERROR' });

    const res2 = makeRes();
    await FlowiseConfigController.getConfig({ user: { role: 'SUPERADMIN' } } as any, res2 as any);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ apiKey: '***cret' }));
  });

  it('updateConfig validates superadmin and input', async () => {
    const res = makeRes();
    await expect(FlowiseConfigController.updateConfig({ user: { role: 'ADMIN' }, body: {} } as any, res as any)).rejects.toMatchObject({ code: 'ACCESS_DENIED' });

    const res2 = makeRes();
    await FlowiseConfigController.updateConfig({ user: { role: 'SUPERADMIN', userId: 1 }, body: { enabled: true, baseUrl: 'http://x', flowId: 'f', timeout: 30000 } } as any, res2 as any);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('updateConfig keeps apiKey when placeholder is sent', async () => {
    const res = makeRes();
    await FlowiseConfigController.updateConfig(
      { user: { role: 'SUPERADMIN', userId: 1 }, body: { enabled: true, baseUrl: 'http://x', flowId: 'f', apiKey: '***cret', timeout: 30000 } } as any,
      res as any
    );
    expect((SystemConfigService.updateFlowiseConfig as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({ apiKey: 'secret' })
    );
  });

  it('testConnection returns 400 on access denied/validation errors', async () => {
    const res = makeRes();
    await FlowiseConfigController.testConnection({ user: { role: 'ADMIN', userId: 1 }, body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);

    const res2 = makeRes();
    await FlowiseConfigController.testConnection({ user: { role: 'SUPERADMIN', userId: 1 }, body: { baseUrl: '' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('testConnection success when server responds 404/405 and handles fetch errors', async () => {
    const originalFetch = (global as any).fetch;
    (global as any).fetch = jest.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found' }));

    const res = makeRes();
    await FlowiseConfigController.testConnection(
      { user: { role: 'SUPERADMIN', userId: 1 }, body: { baseUrl: 'http://x', flowId: 'f', timeout: 30000 } } as any,
      res as any
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, status: 404 }));

    // HTTP error => 400
    (global as any).fetch = jest.fn(async () => ({ ok: false, status: 500, statusText: 'ERR' }));
    const res2 = makeRes();
    await FlowiseConfigController.testConnection(
      { user: { role: 'SUPERADMIN', userId: 1 }, body: { baseUrl: 'http://x', flowId: 'f', timeout: 30000 } } as any,
      res2 as any
    );
    expect(res2.status).toHaveBeenCalledWith(400);

    // AbortError => 400 timeout message
    (global as any).fetch = jest.fn(async () => {
      const e: any = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    });
    const res3 = makeRes();
    await FlowiseConfigController.testConnection(
      { user: { role: 'SUPERADMIN', userId: 1 }, body: { baseUrl: 'http://x', flowId: 'f', timeout: 5000 } } as any,
      res3 as any
    );
    expect(res3.status).toHaveBeenCalledWith(400);

    (global as any).fetch = originalFetch;
  });

  it('getStatus denies non-superadmin and returns enabled/configured', async () => {
    const res = makeRes();
    await expect(FlowiseConfigController.getStatus({ user: { role: 'ADMIN' } } as any, res as any)).rejects.toMatchObject({ code: 'GET_STATUS_ERROR' });

    const res2 = makeRes();
    await FlowiseConfigController.getStatus({ user: { role: 'SUPERADMIN' } } as any, res2 as any);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, configured: true }));
  });
});


