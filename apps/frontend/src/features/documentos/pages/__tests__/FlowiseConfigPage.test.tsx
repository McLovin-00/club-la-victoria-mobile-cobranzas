import { describe, it, expect } from '@jest/globals';

describe('FlowiseConfigPage (smoke)', () => {
  it('importa FlowiseConfigPage sin errores', async () => {
    const module = await import('../FlowiseConfigPage');
    expect(module.default || module.FlowiseConfigPage).toBeDefined();
  });
});

