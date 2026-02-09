import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { ToastVariant } from '../Toast.utils';

describe('showToast', () => {
  let showToast: typeof import('../Toast.utils').showToast;

  beforeEach(async () => {
    // Limpiar contenedor de toast si existe
    const existing = document.getElementById('toast-container');
    if (existing) existing.remove();
    // Importar dinámicamente para cada test
    const module = await import('../Toast.utils');
    showToast = module.showToast;
  });

  afterEach(() => {
    const container = document.getElementById('toast-container');
    if (container) container.remove();
    jest.restoreAllMocks();
  });

  it('crea toast-container si no existe', () => {
    expect(document.getElementById('toast-container')).toBeNull();
    showToast('test message');
    expect(document.getElementById('toast-container')).not.toBeNull();
  });

  it('reutiliza toast-container existente', () => {
    showToast('first');
    showToast('second');
    const containers = document.querySelectorAll('#toast-container');
    expect(containers.length).toBe(1);
  });

  it('retorna una función para cerrar el toast', () => {
    const close = showToast('closable');
    expect(typeof close).toBe('function');
  });

  it('toast-container tiene clases correctas', () => {
    showToast('test');
    const container = document.getElementById('toast-container');
    expect(container?.className).toContain('fixed');
    expect(container?.className).toContain('z-50');
  });

  it('acepta diferentes variantes', () => {
    const variants: ToastVariant[] = ['default', 'success', 'error', 'warning'];
    variants.forEach(variant => {
      const close = showToast(`message ${variant}`, variant);
      expect(typeof close).toBe('function');
    });
  });

  it('acepta duración personalizada', () => {
    const close = showToast('test', 'default', 10000);
    expect(typeof close).toBe('function');
  });

  it('acepta duración 0 para no auto-cerrar', () => {
    const close = showToast('persistent', 'default', 0);
    expect(typeof close).toBe('function');
  });
});
