import { describe, it, expect } from '@jest/globals';

describe('Users Components (smoke)', () => {
  it('importa UserTable sin errores', async () => {
    await expect(import('../UserTable')).resolves.toBeDefined();
  });

  it('importa UserModal sin errores', async () => {
    await expect(import('../UserModal')).resolves.toBeDefined();
  });

  it('importa UserForm sin errores', async () => {
    await expect(import('../UserForm')).resolves.toBeDefined();
  });
});
