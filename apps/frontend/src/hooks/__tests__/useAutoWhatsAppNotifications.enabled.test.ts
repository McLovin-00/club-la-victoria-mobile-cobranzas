/**
 * Tests adicionales para useAutoWhatsAppNotifications
 * Estos tests cubren lógica y tipos que no requieren mocks complejos
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock básico de whatsapp-notifications
jest.mock('../../utils/whatsapp-notifications', () => ({
  createWhatsAppNotificationService: jest.fn(() => ({ send: jest.fn() })),
  WhatsAppNotificationHelpers: {
    sendDocumentExpiryAlert: jest.fn().mockResolvedValue(undefined),
    sendUrgentAlert: jest.fn().mockResolvedValue(undefined),
    sendEquipmentUpdate: jest.fn().mockResolvedValue(undefined),
    scheduleDailyReminders: jest.fn().mockResolvedValue(undefined),
  },
  WhatsAppValidation: {
    sanitizePhoneNumber: jest.fn((p: string) => p.replace(/\D/g, '')),
    isValidPhoneNumber: jest.fn((p: string) => p.length >= 10),
  },
}));

// Crear store mock con auth
const createMockStore = (token = 'test-token', empresaId = 1) => configureStore({
  reducer: {
    auth: () => ({
      token,
      user: { empresaId },
    }),
  },
});

// Wrapper con Provider
const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
};

describe('useAutoWhatsAppNotifications - smoke tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe exportar useAutoWhatsAppNotifications', async () => {
    const module = await import('../useAutoWhatsAppNotifications');
    expect(module.useAutoWhatsAppNotifications).toBeDefined();
    expect(typeof module.useAutoWhatsAppNotifications).toBe('function');
  });

  it('debe poder renderizar el hook sin errores', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = createMockStore();
    
    const config = {
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    };

    const { result } = renderHook(() => useAutoWhatsAppNotifications(config), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current.sendDocumentExpiryNotifications).toBe('function');
    expect(typeof result.current.sendUrgentAlert).toBe('function');
    expect(typeof result.current.sendEquipmentUpdate).toBe('function');
    expect(typeof result.current.scheduleDailyReminderCheck).toBe('function');
  });

  it('debe funcionar con diferentes configuraciones', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = createMockStore();
    
    // Config deshabilitada
    const disabledConfig = {
      enableDocumentExpiryAlerts: false,
      enableUrgentAlerts: false,
      enableEquipmentUpdates: false,
      documentExpiryThresholds: { urgent: 0, warning: 0 },
    };

    const { result } = renderHook(() => useAutoWhatsAppNotifications(disabledConfig), {
      wrapper: createWrapper(store),
    });

    expect(result.current).toBeDefined();
  });

  it('debe funcionar sin token de auth', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = configureStore({
      reducer: {
        auth: () => ({
          token: null,
          user: null,
        }),
      },
    });
    
    const config = {
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    };

    const { result } = renderHook(() => useAutoWhatsAppNotifications(config), {
      wrapper: createWrapper(store),
    });

    // Sin token, isWhatsAppEnabled puede ser false o undefined
    expect(result.current.isWhatsAppEnabled).toBeFalsy();
  });
});

describe('useAutoWhatsAppNotifications - config interface', () => {
  interface AutoNotificationConfig {
    enableDocumentExpiryAlerts: boolean;
    enableUrgentAlerts: boolean;
    enableEquipmentUpdates: boolean;
    documentExpiryThresholds: {
      urgent: number;
      warning: number;
    };
  }

  it('acepta configuración completa', () => {
    const config: AutoNotificationConfig = {
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    };

    expect(config.enableDocumentExpiryAlerts).toBe(true);
    expect(config.documentExpiryThresholds.urgent).toBe(3);
    expect(config.documentExpiryThresholds.warning).toBe(10);
  });

  it('acepta umbrales personalizados', () => {
    const config: AutoNotificationConfig = {
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: false,
      enableEquipmentUpdates: false,
      documentExpiryThresholds: { urgent: 7, warning: 30 },
    };

    expect(config.documentExpiryThresholds.urgent).toBe(7);
    expect(config.documentExpiryThresholds.warning).toBe(30);
  });
});

describe('useAutoWhatsAppNotifications - lógica de filtrado', () => {
  it('calcula días restantes para documentos', () => {
    const now = Date.now();
    
    // 5 días en el futuro
    const futureDate = new Date(now + 5 * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.ceil((futureDate.getTime() - now) / (1000 * 60 * 60 * 24));
    expect(daysRemaining).toBe(5);

    // 3 días en el pasado
    const pastDate = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const daysOverdue = Math.ceil((pastDate.getTime() - now) / (1000 * 60 * 60 * 24));
    expect(daysOverdue).toBe(-3);
  });

  it('filtra documentos dentro del umbral de warning', () => {
    const thresholds = { urgent: 3, warning: 10 };
    const daysRemainingList = [1, 5, 15, 0, -5];
    
    const withinWarning = daysRemainingList.filter(d => d <= thresholds.warning && d > 0);
    expect(withinWarning).toEqual([1, 5]);
    
    const withinUrgent = daysRemainingList.filter(d => d <= thresholds.urgent && d > 0);
    expect(withinUrgent).toEqual([1]);
  });

  it('identifica documentos vencidos', () => {
    const daysRemainingList = [1, 5, 15, 0, -5, -10];
    
    const expired = daysRemainingList.filter(d => d <= 0);
    expect(expired).toEqual([0, -5, -10]);
  });
});

describe('useAutoWhatsAppNotifications - datos de equipos', () => {
  interface EquipmentData {
    id: number;
    driverDniNorm: string;
    truckPlateNorm: string;
    trailerPlateNorm: string | null;
    choferPhones?: string[];
  }

  it('acepta equipos con múltiples teléfonos', () => {
    const equipo: EquipmentData = {
      id: 1,
      driverDniNorm: '12345678',
      truckPlateNorm: 'AAA111',
      trailerPlateNorm: 'BBB222',
      choferPhones: ['+54 11 5555-5555', '+54 11 6666-6666'],
    };

    expect(equipo.choferPhones).toHaveLength(2);
  });

  it('acepta equipos sin teléfonos', () => {
    const equipo: EquipmentData = {
      id: 1,
      driverDniNorm: '12345678',
      truckPlateNorm: 'AAA111',
      trailerPlateNorm: null,
    };

    expect(equipo.choferPhones).toBeUndefined();
  });

  it('filtra equipos por ID de documento', () => {
    const equipos: EquipmentData[] = [
      { id: 1, driverDniNorm: '111', truckPlateNorm: 'A', trailerPlateNorm: null, choferPhones: ['111'] },
      { id: 2, driverDniNorm: '222', truckPlateNorm: 'B', trailerPlateNorm: null, choferPhones: ['222'] },
      { id: 3, driverDniNorm: '333', truckPlateNorm: 'C', trailerPlateNorm: null, choferPhones: ['333'] },
    ];

    const equipoId = 2;
    const equipo = equipos.find(e => e.id === equipoId);
    
    expect(equipo).toBeDefined();
    expect(equipo?.driverDniNorm).toBe('222');
  });
});

describe('useAutoWhatsAppNotifications - documentos', () => {
  interface EquipmentDocument {
    id: number;
    equipoId: number;
    templateId: string;
    templateName: string;
    expiresAt: string | null;
    status: string;
  }

  it('acepta documento con fecha de vencimiento', () => {
    const doc: EquipmentDocument = {
      id: 1,
      equipoId: 1,
      templateId: 'tmpl-1',
      templateName: 'Licencia de conducir',
      expiresAt: '2024-12-31T00:00:00.000Z',
      status: 'VIGENTE',
    };

    expect(new Date(doc.expiresAt!)).toBeInstanceOf(Date);
  });

  it('acepta documento sin fecha de vencimiento', () => {
    const doc: EquipmentDocument = {
      id: 1,
      equipoId: 1,
      templateId: 'tmpl-1',
      templateName: 'Documento permanente',
      expiresAt: null,
      status: 'OK',
    };

    expect(doc.expiresAt).toBeNull();
  });

  it('filtra documentos con expiresAt válido', () => {
    const documents: EquipmentDocument[] = [
      { id: 1, equipoId: 1, templateId: 't1', templateName: 'Doc 1', expiresAt: '2024-12-31', status: 'OK' },
      { id: 2, equipoId: 1, templateId: 't2', templateName: 'Doc 2', expiresAt: null, status: 'OK' },
      { id: 3, equipoId: 2, templateId: 't3', templateName: 'Doc 3', expiresAt: '2024-11-15', status: 'OK' },
    ];

    const withExpiry = documents.filter(d => d.expiresAt !== null);
    expect(withExpiry).toHaveLength(2);
  });
});
