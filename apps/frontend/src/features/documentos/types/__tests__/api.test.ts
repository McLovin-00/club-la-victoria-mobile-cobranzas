// Tests de tipos API en documentos feature
import { describe, it, expect, jest } from '@jest/globals';

describe('documentos feature - API Types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe exportar tipos API', async () => {
    const types = await import('../types/api');
    expect(types).toBeDefined();
  });

  it('debe tener tipos principales exportados', async () => {
    const types = await import('../types/api');
    // Verificar que el módulo tiene exports
    expect(Object.keys(types).length).toBeGreaterThan(0);
  });

  it('debe exportar tipos de entidades', async () => {
    const types = await import('../types/entities');
    expect(types).toBeDefined();
  });

  it('debe tener tipos de documentos definidos', async () => {
    const types = await import('../types/entities');
    expect(Object.keys(types).length).toBeGreaterThan(0);
  });
});
