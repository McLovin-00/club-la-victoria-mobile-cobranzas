import { Response } from 'express';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';


jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, _status: number, code: string) => {
    const e: any = new Error(message);
    e.code = code;
    return e;
  },
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: { ensureBucketExists: jest.fn(async () => undefined) },
}));

import { StorageController } from '../../src/controllers/storage.controller';
import { minioService } from '../../src/services/minio.service';


describe('StorageController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  it('initTenantBucket requires tenant and succeeds when present', async () => {
    const res = makeRes();
    const reqMissing: Partial<AuthRequest> = { tenantId: undefined };
    await expect(StorageController.initTenantBucket(reqMissing as AuthRequest, res as Response)).rejects.toMatchObject({ code: 'TENANT_REQUIRED' });

    const res2 = makeRes();
    const reqOk: Partial<AuthRequest> = { tenantId: 1 };
    await StorageController.initTenantBucket(reqOk as AuthRequest, res2 as Response);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('initTenantBucket wraps unknown errors', async () => {
    (minioService.ensureBucketExists as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const res = makeRes();
    const reqOk: Partial<AuthRequest> = { tenantId: 2 };
    await expect(StorageController.initTenantBucket(reqOk as AuthRequest, res as Response)).rejects.toMatchObject({ code: 'STORAGE_INIT_ERROR' });
  });

});


