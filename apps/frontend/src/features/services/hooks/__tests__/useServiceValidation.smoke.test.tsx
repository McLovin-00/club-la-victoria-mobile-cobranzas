/**
 * Propósito: Smoke tests de hooks de validación de servicios para subir coverage.
 */

import { renderHook, act } from '@testing-library/react';
import {
  useServiceNameValidation,
  useServiceVersionValidation,
  useServiceFormValidation,
  useServicePermissions,
} from '../useServiceValidation';

describe('useServiceValidation (smoke)', () => {
  it('valida nombre y versión', () => {
    const { result: name } = renderHook(() => useServiceNameValidation([{ id: 1, nombre: 'Srv' } as any], 2));
    act(() => {
      expect(name.current.validateName('Srv')).toBe(false); // duplicado
    });

    const { result: version } = renderHook(() => useServiceVersionValidation());
    act(() => {
      expect(version.current.validateVersion('1.0.0')).toBe(true);
      expect(version.current.validateVersion('@@@')).toBe(false);
    });
  });

  it('valida formulario completo', () => {
    const { result } = renderHook(() => useServiceFormValidation([{ id: 1, nombre: 'Srv' } as any], 2));
    act(() => {
      const ok = result.current.validateForm({
        nombre: 'NuevoServicio',
        descripcion: '',
        version: '1.0.0',
        estado: 'activo' as any,
      });
      expect(ok).toBe(true);
    });
  });

  it('permisos: solo superadmin puede crear', () => {
    const { result } = renderHook(() => useServicePermissions('superadmin'));
    expect(result.current.canCreate()).toBe(true);
  });
});


