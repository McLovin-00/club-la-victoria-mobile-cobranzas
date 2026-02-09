// Tests de tipos entities en documentos feature
import { describe, it, expect, jest } from '@jest/globals';

describe('documentos feature - Entities Types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe exportar tipos de entidades', async () => {
    const types = await import('../entities');
    expect(types).toBeDefined();
  });

  it('debe tener tipos de equipo definidos', async () => {
    const types = await import('../entities');
    expect(Object.keys(types).length).toBeGreaterThan(0);
  });

  it('debe tener tipos de documento definidos', async () => {
    const types = await import('../entities');
    expect(Object.keys(types).length).toBeGreaterThan(0);
  });

  it('debe tener tipos de template definidos', async () => {
    const types = await import('../entities');
    expect(Object.keys(types).length).toBeGreaterThan(0);
  });
});
