import { Response } from 'express';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';


jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn(async () => null), setConfig: jest.fn(async () => undefined) },
}));

jest.mock('../../src/services/notification.service', () => ({
  NotificationService: { send: jest.fn(async () => undefined), checkExpirations: jest.fn(async () => 1), checkMissingDocs: jest.fn(async () => 2) },
}));

import { SystemConfigService } from '../../src/services/system-config.service';
import { NotificationService } from '../../src/services/notification.service';
import { NotificationsController } from '../../src/controllers/notifications.controller';


describe('NotificationsController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  it('getConfig/updateConfig/test/run* endpoints', async () => {
    (SystemConfigService.getConfig as jest.Mock).mockResolvedValueOnce('true').mockResolvedValueOnce(JSON.stringify({})).mockResolvedValueOnce(JSON.stringify({}));
    const res = makeRes();
    const req: Partial<AuthRequest> = { tenantId: 1 };
    await NotificationsController.getConfig(req as AuthRequest, res as Response);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = makeRes();
    const updateReq: Partial<AuthRequest> = { tenantId: 1, body: { enabled: true, windows: {}, templates: {} } };
    await NotificationsController.updateConfig(updateReq as AuthRequest, res2 as Response);
    expect(SystemConfigService.setConfig).toHaveBeenCalled();

    const res3 = makeRes();
    const testReq: Partial<AuthRequest> = { tenantId: 1, body: {} };
    await NotificationsController.test(testReq as AuthRequest, res3 as Response);
    expect(res3.status).toHaveBeenCalledWith(400);

    const res4 = makeRes();
    const expReq: Partial<AuthRequest> = { tenantId: 1 };
    await NotificationsController.runExpirations(expReq as AuthRequest, res4 as Response);
    expect(res4.json).toHaveBeenCalledWith(expect.objectContaining({ sent: 1 }));

    const res5 = makeRes();
    const missingReq: Partial<AuthRequest> = { tenantId: 1 };
    await NotificationsController.runMissing(missingReq as AuthRequest, res5 as Response);
    expect(res5.json).toHaveBeenCalledWith(expect.objectContaining({ sent: 2 }));
  });

  it('test sends notification when msisdn provided', async () => {
    const res = makeRes();
    const req: Partial<AuthRequest> = { tenantId: 7, body: { msisdn: '549000', text: 'hola' } };
    await NotificationsController.test(req as AuthRequest, res as Response);
    expect(NotificationService.send).toHaveBeenCalledWith('549000', 'hola', expect.objectContaining({ tenantId: 7 }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});



