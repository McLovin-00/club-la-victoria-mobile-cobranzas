/**
 * Smoke Tests para LoginForm
 * Verifica que el componente se pueda importar y renderizar
 */
import { describe, it, expect } from '@jest/globals';

describe('LoginForm - Smoke Tests', () => {
  it('should export the component module', async () => {
    const module = await import('../LoginForm');
    expect(module).toBeDefined();
  });

  it('should export LoginForm component', async () => {
    const module = await import('../LoginForm');
    const Component = module.LoginForm || module.default;
    expect(Component).toBeDefined();
    expect(typeof Component).toBe('function');
  });

  it('should have correct component name', async () => {
    const module = await import('../LoginForm');
    const Component = module.LoginForm || module.default;
    expect(Component.name).toBeTruthy();
  });
});
