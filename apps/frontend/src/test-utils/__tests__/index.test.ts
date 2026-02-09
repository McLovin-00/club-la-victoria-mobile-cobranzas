/**
 * Tests para test-utils/index.ts
 * Verifica que las exportaciones funcionan correctamente
 */
import { describe, it, expect } from '@jest/globals';
import * as testUtils from '../index';

describe('test-utils exports', () => {
  it('exporta testWrappers', () => {
    expect(testUtils.AllProviders).toBeDefined();
  });

  it('exporta mockApiResponses', () => {
    expect(testUtils.mockDadores).toBeDefined();
    expect(testUtils.mockChoferes).toBeDefined();
    expect(testUtils.mockTemplates).toBeDefined();
  });

  it('exporta funciones de testing-library', () => {
    expect(testUtils.render).toBeDefined();
    expect(testUtils.screen).toBeDefined();
    expect(testUtils.fireEvent).toBeDefined();
    expect(testUtils.waitFor).toBeDefined();
    expect(testUtils.within).toBeDefined();
  });

  it('exporta userEvent', () => {
    expect(testUtils.userEvent).toBeDefined();
  });
});

