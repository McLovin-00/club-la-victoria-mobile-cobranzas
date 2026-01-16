/**
 * Tests de coverage para useAutoWhatsAppNotifications
 * Este archivo mockea useWhatsAppNotifications con enabled: true
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

let mockWhatsAppConfig = {
  enabled: true,
  templates: [
    { id: 't1', type: 'document_expiry', template: 'Documento por vencer: {{dias}} días' },
    { id: 't2', type: 'urgent_alert', template: 'Alerta urgente: {{mensaje}}' },
    { id: 't3', type: 'equipment_update', template: 'Actualización de equipo: {{tipo}}' },
  ],
  isLoading: false,
};

jest.mock('../../utils/whatsapp-notifications', () => ({
  createWhatsAppNotificationService: jest.fn(() => ({})),
  WhatsAppNotificationHelpers: {
    sendDocumentExpiryAlert: jest.fn().mockResolvedValue(undefined),
    sendUrgentAlert: jest.fn().mockResolvedValue(undefined),
    sendEquipmentUpdate: jest.fn().mockResolvedValue(undefined),
    scheduleDailyReminders: jest.fn().mockResolvedValue(undefined),
  },
  WhatsAppValidation: {
    sanitizePhoneNumber: (p: string) => p.replace(/\D/g, ''),
    isValidPhoneNumber: (p: string) => p.length >= 10,
  },
}));

jest.mock('../../lib/runtimeEnv', () => ({
  getRuntimeEnv: () => 'http://localhost:4802',
}));

jest.mock('../../hooks/useWhatsAppNotifications', () => ({
  useWhatsAppNotifications: () => mockWhatsAppConfig,
}));

const createMockStore = () => configureStore({
  reducer: {
    auth: () => ({
      token: 'test-token',
      user: { empresaId: 1, id: 1, email: 'test@test.com', role: 'ADMIN' },
    }),
  },
});

const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
};

describe('useAutoWhatsAppNotifications - Full Coverage', () => {
  const now = Date.now();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    mockWhatsAppConfig = {
      enabled: true,
      templates: [
        { id: 't1', type: 'document_expiry', template: 'Documento por vencer: {{dias}} días' },
        { id: 't2', type: 'urgent_alert', template: 'Alerta urgente: {{mensaje}}' },
        { id: 't3', type: 'equipment_update', template: 'Actualización de equipo: {{tipo}}' },
      ],
      isLoading: false,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('exposes all functions when WhatsApp enabled', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = createMockStore();

    const { result } = renderHook(() => useAutoWhatsAppNotifications({
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    }), { wrapper: createWrapper(store) });

    expect(result.current.isWhatsAppEnabled).toBe(true);
    expect(result.current.hasValidTemplates).toBe(true);
    expect(typeof result.current.sendDocumentExpiryNotifications).toBe('function');
    expect(typeof result.current.sendUrgentAlert).toBe('function');
    expect(typeof result.current.sendEquipmentUpdate).toBe('function');
    expect(typeof result.current.scheduleDailyReminderCheck).toBe('function');
  });

  it('sendDocumentExpiryNotifications returns count', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = createMockStore();

    const { result } = renderHook(() => useAutoWhatsAppNotifications({
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    }), { wrapper: createWrapper(store) });

    const count = await result.current.sendDocumentExpiryNotifications(
      [{ id: 1, driverDniNorm: '1', truckPlateNorm: 'AAA', trailerPlateNorm: null, choferPhones: ['+5491112345678'] }] as any,
      [{ id: 1, equipoId: 1, templateId: 't1', templateName: 'Licencia', expiresAt: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'OK' }] as any
    );

    expect(count).toBeDefined();
  });

  it('sendUrgentAlert is callable', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = createMockStore();

    const { result } = renderHook(() => useAutoWhatsAppNotifications({
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    }), { wrapper: createWrapper(store) });

    await result.current.sendUrgentAlert(
      '+5491112345678',
      'Test alert',
      { prioridad: 'URGENTE', sector: 'Operaciones' } as any
    );
  });

  it('sendEquipmentUpdate is callable', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = createMockStore();

    const { result } = renderHook(() => useAutoWhatsAppNotifications({
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    }), { wrapper: createWrapper(store) });

    await result.current.sendEquipmentUpdate(
      '+5491112345678',
      { truckPlate: 'AAA', trailerPlate: null, updateType: 'revision_aprobada', observaciones: 'Todo OK' } as any
    );
  });

  it('hasValidTemplates is true when templates exist', async () => {
    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = createMockStore();

    const { result } = renderHook(() => useAutoWhatsAppNotifications({
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    }), { wrapper: createWrapper(store) });

    expect(result.current.hasValidTemplates).toBe(true);
  });

  it('feature disabled returns early', async () => {
    mockWhatsAppConfig = {
      enabled: false,
      templates: [],
      isLoading: false,
    };

    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = createMockStore();

    const { result } = renderHook(() => useAutoWhatsAppNotifications({
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    }), { wrapper: createWrapper(store) });

    expect(result.current.isWhatsAppEnabled).toBeFalsy();
    expect(result.current.hasValidTemplates).toBeFalsy();
  });

  it('no templates returns hasValidTemplates false', async () => {
    mockWhatsAppConfig = {
      enabled: true,
      templates: [],
      isLoading: false,
    };

    const { useAutoWhatsAppNotifications } = await import('../useAutoWhatsAppNotifications');
    const store = createMockStore();

    const { result } = renderHook(() => useAutoWhatsAppNotifications({
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    }), { wrapper: createWrapper(store) });

    expect(result.current.hasValidTemplates).toBeFalsy();
  });
});
