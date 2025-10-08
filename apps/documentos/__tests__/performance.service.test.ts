const { performanceService } = require('../dist/services/performance.service');

jest.mock('../dist/config/database', () => ({
  db: {
    getClient: () => ({
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ tenantId: 1, redCount: 0, yellowCount: 1, greenCount: 2, totalCount: 3 }]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    }),
  },
}));

describe('PerformanceService', () => {
  it('getPerTenantAggregates returns array', async () => {
    const arr = await performanceService.getPerTenantAggregates();
    expect(Array.isArray(arr)).toBe(true);
  });
});
