/**
 * Tests para el componente PreferenciasApp
 * Verifica renderizado y comportamiento de preferencias de aplicación
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('PreferenciasApp', () => {
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
  });

  describe('renderizado básico', () => {
    it('debe renderizar el título', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Preferencias de Aplicación')).toBeInTheDocument();
    });

    it('debe renderizar el subtítulo', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Personaliza tu experiencia de usuario')).toBeInTheDocument();
    });

    it('debe renderizar el botón de guardar', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Guardar Preferencias')).toBeInTheDocument();
    });
  });

  describe('sección de apariencia', () => {
    it('debe mostrar sección de apariencia', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Apariencia')).toBeInTheDocument();
    });

    it('debe mostrar opción de modo oscuro', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Modo Oscuro')).toBeInTheDocument();
      expect(screen.getByText('Interfaz oscura para mayor comodidad nocturna')).toBeInTheDocument();
    });

    it('debe mostrar opción de modo compacto', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Modo Compacto')).toBeInTheDocument();
      expect(screen.getByText('Interfaz más densa con menos espaciado')).toBeInTheDocument();
    });
  });

  describe('sección de idioma', () => {
    it('debe mostrar sección de idioma y región', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Idioma y Región')).toBeInTheDocument();
    });

    it('debe mostrar selector de idioma', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Idioma de la Aplicación')).toBeInTheDocument();
      expect(screen.getByText('Selecciona tu idioma preferido')).toBeInTheDocument();
    });

    it('debe mostrar opciones de idioma', () => {
      render(<PreferenciasApp />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      
      // Verificar que las opciones existen
      expect(screen.getByRole('option', { name: 'Español' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Português' })).toBeInTheDocument();
    });
  });

  describe('sección de rendimiento', () => {
    it('debe mostrar sección de rendimiento', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Rendimiento')).toBeInTheDocument();
    });

    it('debe mostrar opción de caché de datos', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Caché de Datos')).toBeInTheDocument();
      expect(screen.getByText('Almacenar datos localmente para mayor velocidad')).toBeInTheDocument();
    });

    it('debe mostrar opción de auto-guardado', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Auto-guardado')).toBeInTheDocument();
      expect(screen.getByText('Guardar cambios automáticamente')).toBeInTheDocument();
    });
  });

  describe('sección de almacenamiento', () => {
    it('debe mostrar sección de almacenamiento', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Almacenamiento')).toBeInTheDocument();
    });

    it('debe mostrar uso de caché', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Uso de Caché')).toBeInTheDocument();
      expect(screen.getByText('Datos almacenados localmente')).toBeInTheDocument();
    });

    it('debe mostrar botón de limpiar caché', () => {
      render(<PreferenciasApp />);
      expect(screen.getByRole('button', { name: 'Limpiar' })).toBeInTheDocument();
    });
  });

  describe('información del sistema', () => {
    it('debe mostrar sección de información del sistema', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Información del Sistema')).toBeInTheDocument();
    });

    it('debe mostrar información del navegador', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Navegador:')).toBeInTheDocument();
    });

    it('debe mostrar información de la plataforma', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Plataforma:')).toBeInTheDocument();
    });

    it('debe mostrar estado de conexión', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('Conexión:')).toBeInTheDocument();
    });

    it('debe mostrar estado de PWA', () => {
      render(<PreferenciasApp />);
      expect(screen.getByText('PWA:')).toBeInTheDocument();
    });
  });

  describe('guardar preferencias', () => {
    it('debe llamar updatePreferences al guardar', async () => {
      render(<PreferenciasApp />);
      
      fireEvent.click(screen.getByText('Guardar Preferencias'));
      
      await waitFor(() => {
        expect(mockUseProfile.updatePreferences).toHaveBeenCalled();
      });
    });

    it('debe mostrar toast de éxito al guardar correctamente', async () => {
      render(<PreferenciasApp />);
      
      fireEvent.click(screen.getByText('Guardar Preferencias'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Preferencias guardadas correctamente', 'success');
      });
    });

    it('debe mostrar estado de carga mientras guarda', () => {
      mockUseProfile.isUpdating = true;
      
      render(<PreferenciasApp />);
      
      expect(screen.getByText('Guardando...')).toBeInTheDocument();
    });
  });

  describe('limpiar caché', () => {
    it('debe mostrar toast de éxito al limpiar caché', async () => {
      // Mock de caches API
      (global as any).caches = {
        keys: jest.fn().mockResolvedValue([]),
      };

      render(<PreferenciasApp />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Caché limpiado correctamente', 'success');
      });
    });
  });
});

