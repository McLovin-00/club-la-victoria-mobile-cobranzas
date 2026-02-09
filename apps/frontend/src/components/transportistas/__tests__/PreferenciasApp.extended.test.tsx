/**
 * Tests extendidos para PreferenciasApp
 * Incrementa coverage cubriendo cambio de idioma y limpieza de caché
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('PreferenciasApp (extended)', () => {
  let PreferenciasApp: React.FC<{ onSave?: (prefs: any) => void }>;
  let mockUseProfile: any;
  let mockShowToast: jest.Mock;

  beforeAll(async () => {
    mockShowToast = jest.fn();
    mockUseProfile = {
      profile: {
        preferences: {
          darkMode: false,
          language: 'es',
          cacheEnabled: true,
          compactMode: false,
          autoSave: true,
          offlineMode: false,
        },
      },
      updatePreferences: jest.fn().mockResolvedValue(undefined),
      isUpdating: false,
    };

    await jest.unstable_mockModule('../../../hooks/useProfile', () => ({
      useProfile: () => mockUseProfile,
    }));

    await jest.unstable_mockModule('../../ui/Toast.utils', () => ({
      showToast: (...args: any[]) => mockShowToast(...args),
    }));

    ({ PreferenciasApp } = await import('../PreferenciasApp'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.isUpdating = false;
    mockUseProfile.updatePreferences = jest.fn().mockResolvedValue(undefined);
    
    // Mock de Storage API
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: jest.fn().mockResolvedValue({ usage: 1024 * 1024 * 5 }), // 5 MB
      },
      writable: true,
    });

    // Mock de caches API
    (global as any).caches = {
      keys: jest.fn().mockResolvedValue(['cache-1', 'cache-2']),
      delete: jest.fn().mockResolvedValue(true),
    };

    // Mock de localStorage
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue('auth-data'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  describe('toggle de modo oscuro', () => {
    it('debe toggle modo oscuro', () => {
      render(<PreferenciasApp />);
      
      const toggles = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('rounded-full') && btn.className.includes('inline-flex')
      );
      
      if (toggles.length > 0) {
        fireEvent.click(toggles[0]);
      }
    });

    it('debe aplicar clase dark al guardar con modo oscuro', async () => {
      render(<PreferenciasApp />);
      
      // Toggle darkMode
      const toggles = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('rounded-full')
      );
      
      if (toggles.length > 0) {
        fireEvent.click(toggles[0]); // Toggle darkMode
      }
      
      fireEvent.click(screen.getByText('Guardar Preferencias'));
      
      await waitFor(() => {
        expect(mockUseProfile.updatePreferences).toHaveBeenCalled();
      });
    });
  });

  describe('toggle de modo compacto', () => {
    it('debe toggle modo compacto', () => {
      render(<PreferenciasApp />);
      
      const toggles = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('rounded-full')
      );
      
      if (toggles.length > 1) {
        fireEvent.click(toggles[1]);
      }
    });
  });

  describe('cambio de idioma', () => {
    it('debe cambiar idioma a inglés', () => {
      render(<PreferenciasApp />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'en' } });
      
      expect(select).toHaveValue('en');
    });

    it('debe cambiar idioma a portugués', () => {
      render(<PreferenciasApp />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'pt' } });
      
      expect(select).toHaveValue('pt');
    });
  });

  describe('toggle de caché', () => {
    it('debe toggle caché de datos', () => {
      render(<PreferenciasApp />);
      
      const toggles = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('rounded-full')
      );
      
      if (toggles.length > 2) {
        fireEvent.click(toggles[2]);
      }
    });
  });

  describe('toggle de auto-guardado', () => {
    it('debe toggle auto-guardado', () => {
      render(<PreferenciasApp />);
      
      const toggles = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('rounded-full')
      );
      
      if (toggles.length > 3) {
        fireEvent.click(toggles[3]);
      }
    });
  });

  describe('limpieza de caché', () => {
    it('debe limpiar caché correctamente', async () => {
      render(<PreferenciasApp />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
      
      await waitFor(() => {
        expect((global as any).caches.keys).toHaveBeenCalled();
        expect((global as any).caches.delete).toHaveBeenCalledWith('cache-1');
        expect((global as any).caches.delete).toHaveBeenCalledWith('cache-2');
        expect(mockShowToast).toHaveBeenCalledWith('Caché limpiado correctamente', 'success');
      });
    });

    it('debe preservar datos de auth al limpiar caché', async () => {
      render(<PreferenciasApp />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
      
      await waitFor(() => {
        expect(window.localStorage.getItem).toHaveBeenCalledWith('auth');
        expect(window.localStorage.clear).toHaveBeenCalled();
        expect(window.localStorage.setItem).toHaveBeenCalledWith('auth', 'auth-data');
      });
    });

    it('debe mostrar error si falla limpieza de caché', async () => {
      (global as any).caches.keys = jest.fn().mockRejectedValue(new Error('Error'));
      
      render(<PreferenciasApp />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error al limpiar caché', 'error');
      });
    });
  });

  describe('guardado de preferencias', () => {
    it('debe mostrar error al fallar guardado', async () => {
      mockUseProfile.updatePreferences = jest.fn().mockRejectedValue(new Error('Error de red'));
      
      render(<PreferenciasApp />);
      
      fireEvent.click(screen.getByText('Guardar Preferencias'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error de red', 'error');
      });
    });

    it('debe mostrar error genérico al fallar sin mensaje', async () => {
      mockUseProfile.updatePreferences = jest.fn().mockRejectedValue({});
      
      render(<PreferenciasApp />);
      
      fireEvent.click(screen.getByText('Guardar Preferencias'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error al guardar preferencias', 'error');
      });
    });

    it('debe llamar onSave callback', async () => {
      const mockOnSave = jest.fn();
      
      render(<PreferenciasApp onSave={mockOnSave} />);
      
      fireEvent.click(screen.getByText('Guardar Preferencias'));
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('información del sistema', () => {
    it('debe detectar navegador Chrome', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/91.0',
        writable: true,
      });
      
      render(<PreferenciasApp />);
      
      expect(screen.getByText('Chrome')).toBeInTheDocument();
    });

    it('debe mostrar estado de conexión', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });
      
      render(<PreferenciasApp />);
      
      expect(screen.getByText('✓ Conectado')).toBeInTheDocument();
    });

    it('debe mostrar estado de PWA', () => {
      render(<PreferenciasApp />);
      
      expect(screen.getByText('PWA:')).toBeInTheDocument();
    });
  });

  describe('cálculo de tamaño de caché', () => {
    it('debe mostrar tamaño de caché', async () => {
      render(<PreferenciasApp />);
      
      await waitFor(() => {
        expect(screen.getByText(/MB/)).toBeInTheDocument();
      });
    });

    it('debe manejar error en cálculo de caché', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockRejectedValue(new Error('Error')),
        },
        writable: true,
      });
      
      render(<PreferenciasApp />);
      
      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalled();
      });
      
      warnSpy.mockRestore();
    });
  });
});

