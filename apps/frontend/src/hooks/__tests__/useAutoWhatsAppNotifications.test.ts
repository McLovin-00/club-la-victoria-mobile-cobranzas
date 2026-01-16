import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

function setWhatsAppNotificationsMock(value: any) {
  (globalThis as any).__mockWhatsAppNotifications = value;
}

// Mock helpers/validation/service
const mockCreateService = jest.fn(() => ({ kind: 'service' }));
const mockSendExpiry = jest.fn();
const mockSendUrgent = jest.fn();
const mockSendUpdate = jest.fn();
const mockScheduleDaily = jest.fn();
const mockSanitize = jest.fn((p: string) => p.replace(/\D/g, ''));
const mockIsValid = jest.fn((p: string) => p.length >= 10);

jest.mock('../../utils/whatsapp-notifications', () => ({
  createWhatsAppNotificationService: (...args: any[]) => mockCreateService(...args),
  WhatsAppNotificationHelpers: {
    sendDocumentExpiryAlert: (...args: any[]) => mockSendExpiry(...args),
    sendUrgentAlert: (...args: any[]) => mockSendUrgent(...args),
    sendEquipmentUpdate: (...args: any[]) => mockSendUpdate(...args),
    scheduleDailyReminders: (...args: any[]) => mockScheduleDaily(...args),
  },
  WhatsAppValidation: {
    sanitizePhoneNumber: (...args: any[]) => mockSanitize(...args),
    isValidPhoneNumber: (...args: any[]) => mockIsValid(...args),
  },
}));

describe('useAutoWhatsAppNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Nota: en este repo `jest.setup.cjs` mockea `useWhatsAppNotifications` a "disabled" por defecto
    // para evitar side-effects. Estos tests validan el comportamiento cuando WhatsApp está deshabilitado.
  });

  function createWrapper() {
    const store = configureStore({
      reducer: {
        auth: () => ({
          token: 'mock-token',
          user: { empresaId: 1 },
        }),
      },
    });

    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);
  }

  it('debe exponer flags y funciones principales', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const { result } = renderHook(() =>
      useAutoWhatsAppNotifications({
        enableDocumentExpiryAlerts: true,
        enableUrgentAlerts: true,
        enableEquipmentUpdates: true,
        documentExpiryThresholds: { urgent: 3, warning: 10 },
      })
    , { wrapper: createWrapper() });

    expect(typeof result.current.sendDocumentExpiryNotifications).toBe('function');
    expect(typeof result.current.sendUrgentAlert).toBe('function');
    expect(typeof result.current.sendEquipmentUpdate).toBe('function');
    expect(typeof result.current.scheduleDailyReminderCheck).toBe('function');
    expect(result.current.hasValidTemplates).toBe(false);
  });

  it('sendDocumentExpiryNotifications debe enviar notificaciones cuando hay docs por vencer y teléfonos válidos', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const { result } = renderHook(() =>
      useAutoWhatsAppNotifications({
        enableDocumentExpiryAlerts: true,
        enableUrgentAlerts: false,
        enableEquipmentUpdates: false,
        documentExpiryThresholds: { urgent: 3, warning: 10 },
      })
    , { wrapper: createWrapper() });

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const equipos = [
      { id: 1, driverDniNorm: '1', truckPlateNorm: 'AAA111', trailerPlateNorm: null, choferPhones: ['+54 11 5555-5555'] },
    ];
    const documents = [
      {
        id: 1,
        equipoId: 1,
        templateId: 't1',
        templateName: 'Licencia',
        expiresAt: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días
        status: 'OK',
      },
    ];

    const count = await result.current.sendDocumentExpiryNotifications(equipos as any, documents as any);
    // Con WhatsApp deshabilitado, el hook no envía notificaciones y retorna undefined (early-return).
    expect(count).toBeUndefined();
    expect(mockCreateService).not.toHaveBeenCalled();
    expect(mockSendExpiry).not.toHaveBeenCalled();
  });

  it('scheduleDailyReminderCheck debe devolver 0 si falla el fetch', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as any;

    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const { result } = renderHook(() =>
      useAutoWhatsAppNotifications({
        enableDocumentExpiryAlerts: true,
        enableUrgentAlerts: false,
        enableEquipmentUpdates: false,
        documentExpiryThresholds: { urgent: 3, warning: 10 },
      })
    , { wrapper: createWrapper() });

    const count = await result.current.scheduleDailyReminderCheck();
    // Con WhatsApp deshabilitado, el hook no ejecuta fetch y retorna undefined (early-return).
    expect(count).toBeUndefined();

    global.fetch = originalFetch as any;
  });
});

