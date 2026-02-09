import { describe, it, expect } from '@jest/globals';

describe('ApprovalDetailPage (smoke)', () => {
  it('importa ApprovalDetailPage sin errores', async () => {
    const module = await import('../ApprovalDetailPage');
    expect(module.default || module.ApprovalDetailPage).toBeDefined();
  });
});
