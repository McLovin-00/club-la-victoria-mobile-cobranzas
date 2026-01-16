import { Response } from 'express';

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn(async () => null), setConfig: jest.fn(async () => undefined) },
}));

import { SystemConfigService } from '../../src/services/system-config.service';
import { EvolutionConfigController } from '../../src/controllers/evolution-config.controller';

describe('EvolutionConfigController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).fetch = jest.fn();
  });

  it('getConfig/updateConfig validate inputs', async () => {
    const res = makeRes();
    await EvolutionConfigController.getConfig({ tenantId: 1 } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = makeRes();
    await EvolutionConfigController.updateConfig({ tenantId: 1, body: { server: null, token: 't', instance: 'i' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(400);

    const res3 = makeRes();
    await EvolutionConfigController.updateConfig({ tenantId: 1, body: { server: 'http://x', token: 't', instance: 'i' } } as any, res3 as any);
    expect(SystemConfigService.setConfig).toHaveBeenCalled();
  });

  it('testConnection returns missing params and returns ok when server responds', async () => {
    const res = makeRes();
    await EvolutionConfigController.testConnection({ tenantId: 1 } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));

    (SystemConfigService.getConfig as jest.Mock)
      .mockResolvedValueOnce('http://localhost')
      .mockResolvedValueOnce('token')
      .mockResolvedValueOnce('inst');

    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ message: 'hi', version: '1' }) });
    const res2 = makeRes();
    await EvolutionConfigController.testConnection({ tenantId: 1 } as any, res2 as any);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('testConnection normalizes server URL and uses fallback endpoints', async () => {
    (SystemConfigService.getConfig as jest.Mock)
      .mockResolvedValueOnce('https://https://example.com/') // weird double scheme + trailing slash
      .mockResolvedValueOnce('token')
      .mockResolvedValueOnce('inst');

    // root fails
    (globalThis as any).fetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      // fallback /health ok
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    const res = makeRes();
    await EvolutionConfigController.testConnection({ tenantId: 1 } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: expect.stringContaining('/health') }));
    // verify URL normalized (no trailing slash, single scheme)
    expect((globalThis as any).fetch.mock.calls[0][0]).toBe('http://example.com/');
  });

  it('testConnection root ok without message => success and 502 when all candidates fail', async () => {
    // root ok but JSON without "message"
    (SystemConfigService.getConfig as jest.Mock)
      .mockResolvedValueOnce('localhost:3000')
      .mockResolvedValueOnce('token')
      .mockResolvedValueOnce('inst');

    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });
    const res = makeRes();
    await EvolutionConfigController.testConnection({ tenantId: 1 } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    // all fail => 502
    (SystemConfigService.getConfig as jest.Mock)
      .mockResolvedValueOnce('http://localhost')
      .mockResolvedValueOnce('token')
      .mockResolvedValueOnce('inst');

    // root throws
    (globalThis as any).fetch
      .mockRejectedValueOnce(new Error('down'))
      // candidates all non-ok
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    const res2 = makeRes();
    await EvolutionConfigController.testConnection({ tenantId: 1 } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(502);
  });

  it('testConnection covers inner catch and outer catch (500)', async () => {
    (SystemConfigService.getConfig as jest.Mock)
      .mockResolvedValueOnce('http://localhost')
      .mockResolvedValueOnce('token')
      .mockResolvedValueOnce('inst');

    // root throws, candidates throw => hits inner catch (lastError = e.message)
    (globalThis as any).fetch.mockRejectedValue(new Error('boom'));

    // status throws only for 502 to force outer catch
    const json = jest.fn();
    const status = jest.fn((code: number) => {
      if (code === 502) throw new Error('status boom');
      return { json };
    });
    const res: any = { json, status };

    await EvolutionConfigController.testConnection({ tenantId: 1 } as any, res as any);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});


