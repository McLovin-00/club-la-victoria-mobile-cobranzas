/**
 * Smoke test para LoginForm
 * Verifica que el módulo se puede importar correctamente
 */
import { describe, it, expect } from '@jest/globals';

describe('LoginForm - Smoke Test', () => {
  it('should export the component module', async () => {
    // Dynamic import to verify module loads without syntax errors
    const module = await import('../LoginForm');

    // Verify it has exports
    expect(module).toBeDefined();
  });

  it('should export LoginForm component', async () => {
    const module = await import('../LoginForm');

    // Check for named export or default export
    const Component = module.LoginForm || module.default;
    expect(Component).toBeDefined();
    expect(typeof Component).toBe('function');
  });

  it('should have correct component name', async () => {
    const module = await import('../LoginForm');
    const Component = module.LoginForm || module.default;

    // React components typically have a name property
    expect(Component.name).toBeTruthy();
  });
});
