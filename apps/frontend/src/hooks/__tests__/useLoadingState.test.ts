/**
 * Tests para el hook useLoadingState
 * Verifica la gestión de estados de carga múltiples
 */
import { renderHook, act } from '@testing-library/react';
import { useLoadingState } from '../useLoadingState';

describe('useLoadingState', () => {
  describe('estado inicial', () => {
    it('debe inicializar con isAnyLoading en false', () => {
      const { result } = renderHook(() => useLoadingState());
      expect(result.current.isAnyLoading).toBe(false);
    });

    it('debe retornar false para cualquier key no registrada', () => {
      const { result } = renderHook(() => useLoadingState());
      expect(result.current.isLoading('nonexistent')).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('debe establecer estado de carga para una key', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setLoading('fetchUsers', true);
      });

      expect(result.current.isLoading('fetchUsers')).toBe(true);
    });

    it('debe poder desactivar estado de carga', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setLoading('fetchUsers', true);
      });
      expect(result.current.isLoading('fetchUsers')).toBe(true);

      act(() => {
        result.current.setLoading('fetchUsers', false);
      });
      expect(result.current.isLoading('fetchUsers')).toBe(false);
    });

    it('debe manejar múltiples keys independientes', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setLoading('fetchUsers', true);
        result.current.setLoading('fetchDocuments', true);
      });

      expect(result.current.isLoading('fetchUsers')).toBe(true);
      expect(result.current.isLoading('fetchDocuments')).toBe(true);

      act(() => {
        result.current.setLoading('fetchUsers', false);
      });

      expect(result.current.isLoading('fetchUsers')).toBe(false);
      expect(result.current.isLoading('fetchDocuments')).toBe(true);
    });
  });

  describe('isLoading', () => {
    it('debe retornar boolean para cualquier key', () => {
      const { result } = renderHook(() => useLoadingState());

      expect(typeof result.current.isLoading('anyKey')).toBe('boolean');
    });

    it('debe retornar el estado correcto después de cambios', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setLoading('operation1', true);
      });

      expect(result.current.isLoading('operation1')).toBe(true);
      expect(result.current.isLoading('operation2')).toBe(false);
    });
  });

  describe('isAnyLoading', () => {
    it('debe ser true cuando hay al menos una operación cargando', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setLoading('operation1', true);
      });

      expect(result.current.isAnyLoading).toBe(true);
    });

    it('debe ser false cuando todas las operaciones terminaron', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setLoading('operation1', true);
        result.current.setLoading('operation2', true);
      });
      expect(result.current.isAnyLoading).toBe(true);

      act(() => {
        result.current.setLoading('operation1', false);
        result.current.setLoading('operation2', false);
      });
      expect(result.current.isAnyLoading).toBe(false);
    });

    it('debe seguir siendo true si queda alguna operación activa', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setLoading('op1', true);
        result.current.setLoading('op2', true);
        result.current.setLoading('op3', true);
      });

      act(() => {
        result.current.setLoading('op1', false);
        result.current.setLoading('op2', false);
      });

      expect(result.current.isAnyLoading).toBe(true);
      expect(result.current.isLoading('op3')).toBe(true);
    });
  });

  describe('casos de uso típicos', () => {
    it('debe simular carga de múltiples recursos', async () => {
      const { result } = renderHook(() => useLoadingState());

      // Iniciar cargas
      act(() => {
        result.current.setLoading('users', true);
        result.current.setLoading('documents', true);
        result.current.setLoading('settings', true);
      });

      expect(result.current.isAnyLoading).toBe(true);
      expect(result.current.isLoading('users')).toBe(true);
      expect(result.current.isLoading('documents')).toBe(true);
      expect(result.current.isLoading('settings')).toBe(true);

      // Finalizar cargas progresivamente
      act(() => {
        result.current.setLoading('users', false);
      });
      expect(result.current.isAnyLoading).toBe(true);

      act(() => {
        result.current.setLoading('documents', false);
      });
      expect(result.current.isAnyLoading).toBe(true);

      act(() => {
        result.current.setLoading('settings', false);
      });
      expect(result.current.isAnyLoading).toBe(false);
    });

    it('debe permitir reiniciar la misma operación', () => {
      const { result } = renderHook(() => useLoadingState());

      // Primera carga
      act(() => {
        result.current.setLoading('fetchData', true);
      });
      expect(result.current.isLoading('fetchData')).toBe(true);

      act(() => {
        result.current.setLoading('fetchData', false);
      });
      expect(result.current.isLoading('fetchData')).toBe(false);

      // Segunda carga (refresh)
      act(() => {
        result.current.setLoading('fetchData', true);
      });
      expect(result.current.isLoading('fetchData')).toBe(true);
    });
  });

  describe('estabilidad de referencias', () => {
    it('setLoading debe mantener referencia estable', () => {
      const { result, rerender } = renderHook(() => useLoadingState());
      const initialSetLoading = result.current.setLoading;

      rerender();

      expect(result.current.setLoading).toBe(initialSetLoading);
    });
  });
});

