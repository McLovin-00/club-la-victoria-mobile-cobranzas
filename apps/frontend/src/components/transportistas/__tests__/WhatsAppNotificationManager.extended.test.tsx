/**
 * Tests extendidos para WhatsAppNotificationManager refactorizados para ESM y robustez
 * Incrementa coverage cubriendo todos los branches y funcionalidades
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mocks estables
const mockShowToast = jest.fn();
const mockUpdateConfig = jest.fn();
const mockSendTestMessage = jest.fn();
const mockGetInstanceStatus = jest.fn();
const mockRefreshInstances = jest.fn();
const mockCreateTemplate = jest.fn();
const mockUpdateTemplate = jest.fn();
const mockDeleteTemplate = jest.fn();

const mockUseWhatsAppNotificationsValue = {
  config: {
    enabled: true,
    instanceId: 'inst-1',
    phoneNumber: '+541112345678',
  },
  instances: [
    { id: 'inst-1', name: 'Instancia Principal', serverUrl: 'https://api.evolution.io' },
    { id: 'inst-2', name: 'Instancia Secundaria', serverUrl: 'https://api2.evolution.io' },
  ],
  templates: [
    { id: 'tpl-1', name: 'Vencimiento', type: 'document_expiry', message: 'Hola {{nombre}}, tu documento vence el {{fecha}}', variables: ['nombre', 'fecha'] },
    { id: 'tpl-2', name: 'Alerta', type: 'urgent_alert', message: 'Urgente: {{mensaje}}', variables: ['mensaje'] },
  ],
  isLoading: false,
  isUpdating: false,
  error: null as string | null,
  updateConfig: mockUpdateConfig,
  sendTestMessage: mockSendTestMessage,
  getInstanceStatus: mockGetInstanceStatus,
  refreshInstances: mockRefreshInstances,
  createTemplate: mockCreateTemplate,
  updateTemplate: mockUpdateTemplate,
  deleteTemplate: mockDeleteTemplate,
};

// Mock del hook personalizado
jest.unstable_mockModule('../../../hooks/useWhatsAppNotifications', () => ({
  useWhatsAppNotifications: () => ({
    ...mockUseWhatsAppNotificationsValue,
  }),
}));

// Mock de Toast.utils
jest.unstable_mockModule('../../ui/Toast.utils', () => ({
  showToast: mockShowToast,
}));

// Import dinámico del componente
const { WhatsAppNotificationManager } = await import('../WhatsAppNotificationManager');

describe('WhatsAppNotificationManager (extended)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset defaults
    mockUseWhatsAppNotificationsValue.isLoading = false;
    mockUseWhatsAppNotificationsValue.isUpdating = false;
    mockUseWhatsAppNotificationsValue.error = null;
    mockUseWhatsAppNotificationsValue.config = {
      enabled: true,
      instanceId: 'inst-1',
      phoneNumber: '+541112345678',
    };
    mockUseWhatsAppNotificationsValue.instances = [
      { id: 'inst-1', name: 'Instancia Principal', serverUrl: 'https://api.evolution.io' },
      { id: 'inst-2', name: 'Instancia Secundaria', serverUrl: 'https://api2.evolution.io' },
    ];
    mockUseWhatsAppNotificationsValue.templates = [
      { id: 'tpl-1', name: 'Vencimiento', type: 'document_expiry', message: 'Hola {{nombre}}', variables: ['nombre'] },
    ];

    mockGetInstanceStatus.mockResolvedValue('connected');
    mockUpdateConfig.mockResolvedValue(undefined);
    mockSendTestMessage.mockResolvedValue(undefined);
    mockRefreshInstances.mockResolvedValue(undefined);
    mockCreateTemplate.mockResolvedValue(undefined);
    mockDeleteTemplate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('estado de carga', () => {
    it('debe mostrar spinner cuando está cargando', () => {
      mockUseWhatsAppNotificationsValue.isLoading = true;
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText(/Cargando configuración de WhatsApp/i)).toBeInTheDocument();
    });
  });

  describe('estado de error', () => {
    it('debe mostrar mensaje de error cuando hay error', () => {
      mockUseWhatsAppNotificationsValue.error = 'Error de conexión con Evolution API';
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('Error de conexión con Evolution API')).toBeInTheDocument();
    });

    it('debe mostrar botón de reintentar en error', () => {
      mockUseWhatsAppNotificationsValue.error = 'Error';
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
  });

  describe('renderizado principal', () => {
    it('debe renderizar el título', () => {
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('Notificaciones WhatsApp')).toBeInTheDocument();
    });

    it('debe mostrar badge de activo cuando está habilitado', () => {
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('✓ Activo')).toBeInTheDocument();
    });

    it('debe mostrar badge de inactivo cuando está deshabilitado', () => {
      mockUseWhatsAppNotificationsValue.config!.enabled = false;
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('✗ Inactivo')).toBeInTheDocument();
    });

    it('debe aplicar className personalizado', () => {
      const { container } = render(<WhatsAppNotificationManager className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('toggle habilitar/deshabilitar', () => {
    it('debe llamar updateConfig al hacer toggle', async () => {
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Deshabilitar'));

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith({ enabled: false });
      });
    });

    it('debe mostrar toast de éxito al deshabilitar', async () => {
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Deshabilitar'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Notificaciones WhatsApp deshabilitadas', 'success');
      });
    });

    it('debe mostrar toast de éxito al habilitar', async () => {
      mockUseWhatsAppNotificationsValue.config!.enabled = false;
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Habilitar'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Notificaciones WhatsApp habilitadas', 'success');
      });
    });

    it('debe mostrar toast de error cuando falla toggle', async () => {
      mockUpdateConfig.mockRejectedValueOnce(new Error('Error de red'));
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Deshabilitar'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error de red', 'error');
      });
    });

    it('no debe llamar updateConfig si config es null', async () => {
      (mockUseWhatsAppNotificationsValue as any).config = null;
      render(<WhatsAppNotificationManager />);

      const toggleBtn = screen.getByText('Habilitar');
      fireEvent.click(toggleBtn);

      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });
  });

  describe('instancias', () => {
    it('debe mostrar las instancias disponibles', () => {
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('Instancia Principal')).toBeInTheDocument();
      expect(screen.getByText('Instancia Secundaria')).toBeInTheDocument();
    });

    it('debe mostrar mensaje cuando no hay instancias', () => {
      mockUseWhatsAppNotificationsValue.instances = [];
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('No hay instancias disponibles')).toBeInTheDocument();
    });

    it('debe llamar updateConfig al seleccionar instancia', async () => {
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Instancia Secundaria'));

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith({ instanceId: 'inst-2' });
      });
    });

    it('debe llamar refreshInstances al hacer clic en actualizar', async () => {
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Actualizar'));

      expect(mockRefreshInstances).toHaveBeenCalled();
    });

    it('debe mostrar estado de instancia connected', async () => {
      mockGetInstanceStatus.mockResolvedValue('connected');
      render(<WhatsAppNotificationManager />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        const connectedBadges = screen.getAllByText('connected');
        expect(connectedBadges.length).toBeGreaterThan(0);
        expect(connectedBadges[0]).toBeInTheDocument();
      });
    });

    it('debe manejar error al obtener estado de instancia', async () => {
      mockGetInstanceStatus.mockRejectedValue(new Error('Error'));
      render(<WhatsAppNotificationManager />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        const errorBadges = screen.getAllByText('error');
        expect(errorBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('configuración de teléfono', () => {
    it('debe mostrar input de teléfono cuando está habilitado', () => {
      render(<WhatsAppNotificationManager />);
      // Hay 2 con el mismo placeholder (config y test)
      const inputs = screen.getAllByPlaceholderText('+54 9 11 1234 5678');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('debe actualizar teléfono al cambiar input', async () => {
      render(<WhatsAppNotificationManager />);

      const input = screen.getByDisplayValue('+541112345678');
      fireEvent.change(input, { target: { value: '+541198765432' } });

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith({ phoneNumber: '+541198765432' });
      });
    });
  });

  describe('mensaje de prueba', () => {
    it('debe mostrar sección de mensaje de prueba cuando está habilitado con instancia', () => {
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('Mensaje de Prueba')).toBeInTheDocument();
    });

    it('no debe mostrar sección si no hay instanceId', () => {
      mockUseWhatsAppNotificationsValue.config!.instanceId = null;
      render(<WhatsAppNotificationManager />);
      expect(screen.queryByText('Mensaje de Prueba')).not.toBeInTheDocument();
    });

    it('debe tener el botón deshabilitado si no hay teléfono o template', () => {
      render(<WhatsAppNotificationManager />);

      const btn = screen.getByText('Enviar Mensaje de Prueba').closest('button');
      expect(btn).toBeDisabled();
    });

    it('debe enviar mensaje de prueba correctamente', async () => {
      render(<WhatsAppNotificationManager />);

      // Llenar teléfono de prueba
      const inputs = screen.getAllByPlaceholderText('+54 9 11 1234 5678');
      const phoneInput = inputs[inputs.length - 1]; // El de prueba suele ser el último
      fireEvent.change(phoneInput, { target: { value: '+541199999999' } });

      // Seleccionar template
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'tpl-1' } });

      // Enviar
      const btn = screen.getByText('Enviar Mensaje de Prueba');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockSendTestMessage).toHaveBeenCalled();
      });
    });

    it('debe mostrar toast de error al fallar envío', async () => {
      mockSendTestMessage.mockRejectedValueOnce(new Error('Error de envío'));
      render(<WhatsAppNotificationManager />);

      const inputs = screen.getAllByPlaceholderText('+54 9 11 1234 5678');
      const phoneInput = inputs[inputs.length - 1];
      fireEvent.change(phoneInput, { target: { value: '+541199999999' } });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'tpl-1' } });

      fireEvent.click(screen.getByText('Enviar Mensaje de Prueba'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error de envío', 'error');
      });
    });
  });

  describe('templates', () => {
    it('debe mostrar templates existentes', () => {
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('Templates de Mensajes')).toBeInTheDocument();
      const templates = screen.getAllByText('Vencimiento');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toBeInTheDocument();
    });

    it('debe mostrar mensaje cuando no hay templates', () => {
      mockUseWhatsAppNotificationsValue.templates = [];
      render(<WhatsAppNotificationManager />);
      expect(screen.getByText('No hay templates configurados')).toBeInTheDocument();
    });

    it('debe abrir formulario de nuevo template', () => {
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Nuevo Template'));

      expect(screen.getByText('Crear Nuevo Template')).toBeInTheDocument();
    });

    it('debe cerrar formulario al cancelar', () => {
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Nuevo Template'));
      expect(screen.getByText('Crear Nuevo Template')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancelar'));
      expect(screen.queryByText('Crear Nuevo Template')).not.toBeInTheDocument();
    });

    it('debe mostrar error si campos vacíos al crear template', async () => {
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Nuevo Template'));
      fireEvent.click(screen.getByText('Crear Template'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Completa todos los campos', 'error');
      });
    });

    it('debe crear template correctamente', async () => {
      render(<WhatsAppNotificationManager />);

      fireEvent.click(screen.getByText('Nuevo Template'));

      const nameInput = screen.getByPlaceholderText('Nombre del template');
      fireEvent.change(nameInput, { target: { value: 'Nuevo Template' } });

      const messageInput = screen.getByPlaceholderText(/Hola \{\{nombre\}\}/);
      fireEvent.change(messageInput, { target: { value: 'Mensaje con {{variable}}' } });

      fireEvent.click(screen.getByText('Crear Template'));

      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Nuevo Template',
          message: 'Mensaje con {{variable}}',
          variables: ['variable'],
        }));
      });
    });

    it('debe eliminar template', async () => {
      mockUseWhatsAppNotificationsValue.templates = [
        { id: 'tpl-1', name: 'Template1', type: 'general', message: 'Mensaje', variables: [] },
      ];
      render(<WhatsAppNotificationManager />);

      // Buscar botón con ícono de basura
      const deleteButtons = screen.getAllByRole('button');
      // Buscamos el que está en la lista de templates
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      await waitFor(() => {
        expect(mockDeleteTemplate).toHaveBeenCalled();
      });
    });

    it('debe mostrar variables del template', () => {
      mockUseWhatsAppNotificationsValue.templates = [
        { id: 'tpl-1', name: 'Template', type: 'general', message: 'Hola {{nombre}}', variables: ['nombre', 'fecha'] },
      ];
      render(<WhatsAppNotificationManager />);

      expect(screen.getByText('{{nombre}}')).toBeInTheDocument();
      expect(screen.getByText('{{fecha}}')).toBeInTheDocument();
    });
  });

  describe('funciones auxiliares de estado', () => {
    it('debe mostrar icono correcto para conectados (varios)', async () => {
      mockGetInstanceStatus.mockResolvedValue('connected');
      render(<WhatsAppNotificationManager />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        const icons = screen.getAllByText('connected');
        expect(icons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('polling de estado', () => {
    it('debe verificar estados cada 30 segundos', async () => {
      render(<WhatsAppNotificationManager />);

      // Primera verificación
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(mockGetInstanceStatus).toHaveBeenCalled();

      // Limpiar y avanzar 30 segundos
      mockGetInstanceStatus.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockGetInstanceStatus).toHaveBeenCalled();
    });
  });
});
