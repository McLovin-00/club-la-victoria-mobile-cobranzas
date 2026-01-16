/**
 * Smoke test para TransportistasPortalPage
 * Verifica que el módulo se puede importar correctamente
 */
import { describe, it, expect } from '@jest/globals';

describe('TransportistasPortalPage - Smoke Test', () => {
  it('should export the component module', async () => {
    // Dynamic import to verify module loads without syntax errors
    const module = await import('../TransportistasPortalPage');

    // Verify it has exports
    expect(module).toBeDefined();
  });

  it('should export TransportistasPortalPage component', async () => {
    const module = await import('../TransportistasPortalPage');

    // Check for named export
    expect(module.TransportistasPortalPage).toBeDefined();
    expect(typeof module.TransportistasPortalPage).toBe('function');
  });

  it('should have correct component name', async () => {
    const module = await import('../TransportistasPortalPage');
    const Component = module.TransportistasPortalPage;

    // React components typically have a name property
    expect(Component.name).toBeTruthy();
  });
});
