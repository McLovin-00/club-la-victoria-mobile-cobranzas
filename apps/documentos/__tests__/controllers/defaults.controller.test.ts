import { Response } from 'express';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';


jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn(async () => '1'), setConfig: jest.fn(async () => undefined) },
}));

import { SystemConfigService } from '../../src/services/system-config.service';
import { DefaultsController } from '../../src/controllers/defaults.controller';

describe('DefaultsController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  it('get reads defaults and update sets provided keys', async () => {
    const res = makeRes();
    const req: Partial<AuthRequest> = { tenantId: 1 };
    await DefaultsController.get(req as AuthRequest, res as Response);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = makeRes();
    const updateReq: Partial<AuthRequest> = {
      tenantId: 1,
      body: { defaultClienteId: 1, defaultDadorId: 2, missingCheckDelayMinutes: 3, noExpiryHorizonYears: 4 },
    };
    await DefaultsController.update(updateReq as AuthRequest, res2 as Response);
    expect(SystemConfigService.setConfig).toHaveBeenCalled();
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('get handles null configs and update supports partial values', async () => {
    (SystemConfigService.getConfig as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('9')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('2');

    const res = makeRes();
    const req: Partial<AuthRequest> = { tenantId: 2 };
    await DefaultsController.get(req as AuthRequest, res as Response);

    const payload = res.json.mock.calls[0][0] as { data: { defaultClienteId: number | null } };
    expect(payload.data.defaultClienteId).toBeNull();

    const res2 = makeRes();
    const updateReq: Partial<AuthRequest> = {
      tenantId: 2,
      body: { defaultClienteId: null, missingCheckDelayMinutes: 15 },
    };
    await DefaultsController.update(updateReq as AuthRequest, res2 as Response);

    expect(SystemConfigService.setConfig).toHaveBeenCalledWith('tenant:2:defaults.defaultClienteId', '');
    expect(SystemConfigService.setConfig).toHaveBeenCalledWith('tenant:2:defaults.missingCheckDelayMinutes', '15');
    expect(SystemConfigService.setConfig).not.toHaveBeenCalledWith('tenant:2:defaults.defaultDadorId', expect.anything());
  });

});


