/**
 * Tests para los hooks tipados del store
 * Verifica que useAppDispatch y useAppSelector estén correctamente exportados
 */
import { describe, it, expect } from '@jest/globals';

describe('store hooks', () => {
  describe('exportaciones', () => {
    it('debe exportar useAppDispatch', async () => {
      const module = await import('../hooks');
      expect(module.useAppDispatch).toBeDefined();
      expect(typeof module.useAppDispatch).toBe('function');
    });

    it('debe exportar useAppSelector', async () => {
      const module = await import('../hooks');
      expect(module.useAppSelector).toBeDefined();
      expect(typeof module.useAppSelector).toBe('function');
    });
  });

  describe('tipos', () => {
    it('useAppDispatch debe ser un hook de React', async () => {
      const module = await import('../hooks');
      // Los hooks de React tienen nombre que empieza con "use"
      expect(module.useAppDispatch.name).toContain('useAppDispatch');
    });

    it('useAppSelector debe ser un hook tipado', async () => {
      const module = await import('../hooks');
      // Verificar que es una función
      expect(typeof module.useAppSelector).toBe('function');
    });
  });
});
