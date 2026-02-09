/**
 * Tests para el componente NotificationSettings
 * Verifica renderizado y comportamiento de configuración de notificaciones
 */
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('NotificationSettings', () => {
  let NotificationSettings: React.FC<{ onSave?: (prefs: any) => void }>;
  let mockUseProfile: any;
  let mockShowToast: jest.Mock;

  beforeAll(async () => {
    mockShowToast = jest.fn();
    mockUseProfile = {
      profile: {
        preferences: {
          general: true,
          documentExpiry: true,
          urgentAlerts: true,
          equipment: true,
          whatsapp: true,
          email: false,
          push: false,
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

    await jest.unstable_mockModule('../WhatsAppNotificationManager', () => ({
      WhatsAppNotificationManager: () => <div data-testid="whatsapp-manager">WhatsAppManager</div>,
    }));

    ({ NotificationSettings } = await import('../NotificationSettings'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.isUpdating = false;
  });

  describe('renderizado básico', () => {
    it('debe renderizar el título', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    });

    it('debe renderizar el subtítulo', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Personaliza cómo quieres recibir las alertas')).toBeInTheDocument();
    });

    it('debe renderizar el botón de guardar', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Guardar Configuración')).toBeInTheDocument();
    });

    it('debe renderizar WhatsAppNotificationManager', () => {
      render(<NotificationSettings />);
      expect(screen.getByTestId('whatsapp-manager')).toBeInTheDocument();
    });
  });

  describe('tipos de notificaciones', () => {
    it('debe mostrar sección de tipos de notificaciones', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Tipos de Notificaciones')).toBeInTheDocument();
    });

    it('debe mostrar opción de notificaciones generales', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Notificaciones Generales')).toBeInTheDocument();
      expect(screen.getByText('Mensajes del sistema y actualizaciones importantes')).toBeInTheDocument();
    });

    it('debe mostrar opción de vencimiento de documentos', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Vencimiento de Documentos')).toBeInTheDocument();
      expect(screen.getByText('Alertas cuando tus documentos están por vencer')).toBeInTheDocument();
    });

    it('debe mostrar opción de alertas urgentes', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Alertas Urgentes')).toBeInTheDocument();
      expect(screen.getByText('Notificaciones críticas que requieren acción inmediata')).toBeInTheDocument();
    });

    it('debe mostrar opción de estado de equipos', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Estado de Equipos')).toBeInTheDocument();
      expect(screen.getByText('Cambios en el estado de tus vehículos registrados')).toBeInTheDocument();
    });
  });

  describe('canales de entrega', () => {
    it('debe mostrar sección de canales de entrega', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Canales de Entrega')).toBeInTheDocument();
    });

    it('debe mostrar opción de WhatsApp', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Recibir notificaciones por WhatsApp (recomendado)')).toBeInTheDocument();
    });

    it('debe mostrar opción de notificaciones push', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Notificaciones Push')).toBeInTheDocument();
    });
  });

  describe('resumen de estado', () => {
    it('debe mostrar sección de estado actual', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Estado Actual')).toBeInTheDocument();
    });

    it('debe mostrar estado de WhatsApp', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('WhatsApp:')).toBeInTheDocument();
    });

    it('debe mostrar estado de Push', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Push:')).toBeInTheDocument();
    });

    it('debe mostrar estado de Urgentes', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Urgentes:')).toBeInTheDocument();
    });

    it('debe mostrar estado de Documentos', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Documentos:')).toBeInTheDocument();
    });
  });

  describe('guardar configuración', () => {
    it('debe llamar updatePreferences al guardar', async () => {
      render(<NotificationSettings />);
      
      fireEvent.click(screen.getByText('Guardar Configuración'));
      
      await waitFor(() => {
        expect(mockUseProfile.updatePreferences).toHaveBeenCalled();
      });
    });

    it('debe mostrar toast de éxito al guardar correctamente', async () => {
      render(<NotificationSettings />);
      
      fireEvent.click(screen.getByText('Guardar Configuración'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Configuración de notificaciones guardada', 'success');
      });
    });

    it('debe llamar onSave callback si se proporciona', async () => {
      const mockOnSave = jest.fn();
      render(<NotificationSettings onSave={mockOnSave} />);
      
      fireEvent.click(screen.getByText('Guardar Configuración'));
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('debe mostrar toast de error cuando falla', async () => {
      mockUseProfile.updatePreferences = jest.fn().mockRejectedValue(new Error('Error de red'));
      
      render(<NotificationSettings />);
      
      fireEvent.click(screen.getByText('Guardar Configuración'));
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error de red', 'error');
      });
    });

    it('debe mostrar estado de carga mientras guarda', () => {
      mockUseProfile.isUpdating = true;
      
      render(<NotificationSettings />);
      
      expect(screen.getByText('Guardando...')).toBeInTheDocument();
    });

    it('debe deshabilitar botón mientras guarda', () => {
      mockUseProfile.isUpdating = true;
      
      render(<NotificationSettings />);
      
      const button = screen.getByRole('button', { name: /Guardando/i });
      expect(button).toBeDisabled();
    });
  });
});

