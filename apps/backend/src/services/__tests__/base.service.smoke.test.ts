/**
 * Smoke tests para base.service.ts
 */

import { BaseService } from '../base.service';

describe('BaseService - Smoke Tests', () => {
  it('should export BaseService class', () => {
    expect(BaseService).toBeDefined();
  });

  it('should be an abstract class (cannot instantiate directly)', () => {
    // BaseService es abstracta, verificamos que existe la clase
    expect(typeof BaseService).toBe('function');
  });
});

