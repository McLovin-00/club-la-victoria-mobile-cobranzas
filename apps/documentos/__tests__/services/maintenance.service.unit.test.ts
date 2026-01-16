import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn() },
}));

import { MaintenanceService } from '../../src/services/maintenance.service';
import { SystemConfigService } from '../../src/services/system-config.service';

describe('MaintenanceService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('normalizeDocumentExpires updates tenants with expiresAt null', async () => {
    prismaMock.document.findMany.mockResolvedValueOnce([{ tenantEmpresaId: 1 }, { tenantEmpresaId: 2 }]);
    (SystemConfigService.getConfig as jest.Mock)
      .mockResolvedValueOnce('10') // tenant 1
      .mockResolvedValueOnce(null) // global for tenant 2
      .mockResolvedValueOnce('100');
    prismaMock.document.updateMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 3 });

    await MaintenanceService.normalizeDocumentExpires();

    expect(prismaMock.document.updateMany).toHaveBeenCalledTimes(2);
  });

  it('normalizeDocumentExpires swallows errors', async () => {
    prismaMock.document.findMany.mockRejectedValueOnce(new Error('db'));
    await MaintenanceService.normalizeDocumentExpires();
  });
});


