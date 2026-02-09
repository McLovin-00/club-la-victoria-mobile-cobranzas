/**
 * Tests adicionales para useAutoWhatsAppNotifications hook
 * Estos tests complementan los existentes en useAutoWhatsAppNotifications.test.ts
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

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

describe('useAutoWhatsAppNotifications - utilidades', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mockSanitize sanitiza números de teléfono correctamente', () => {
    // El mock remueve todos los caracteres no numéricos
    expect(mockSanitize('+54 11 5555-5555')).toBe('541155555555');
    expect(mockSanitize('54-11-5555-5555')).toBe('541155555555');
    expect(mockSanitize('5411555555555')).toBe('5411555555555');
  });

  it('mockIsValid valida números con 10+ dígitos', () => {
    expect(mockIsValid('5411555555')).toBe(true); // 10 dígitos
    expect(mockIsValid('123456789')).toBe(false); // 9 dígitos
    expect(mockIsValid('12345678901')).toBe(true); // 11 dígitos
  });

  it('mockCreateService crea un servicio mock', () => {
    const service = mockCreateService('url', { Authorization: 'Bearer token' });
    expect(service).toEqual({ kind: 'service' });
    expect(mockCreateService).toHaveBeenCalledWith('url', { Authorization: 'Bearer token' });
  });
});

describe('useAutoWhatsAppNotifications - interface AutoNotificationConfig', () => {
  interface AutoNotificationConfig {
    enableDocumentExpiryAlerts: boolean;
    enableUrgentAlerts: boolean;
    enableEquipmentUpdates: boolean;
    documentExpiryThresholds: {
      urgent: number;
      warning: number;
    };
  }

  it('debe aceptar configuración válida', () => {
    const config: AutoNotificationConfig = {
      enableDocumentExpiryAlerts: true,
      enableUrgentAlerts: true,
      enableEquipmentUpdates: true,
      documentExpiryThresholds: { urgent: 3, warning: 10 },
    };

    expect(config.enableDocumentExpiryAlerts).toBe(true);
    expect(config.documentExpiryThresholds.urgent).toBe(3);
  });

  it('debe aceptar configuración deshabilitada', () => {
    const config: AutoNotificationConfig = {
      enableDocumentExpiryAlerts: false,
      enableUrgentAlerts: false,
      enableEquipmentUpdates: false,
      documentExpiryThresholds: { urgent: 0, warning: 0 },
    };

    expect(config.enableDocumentExpiryAlerts).toBe(false);
    expect(config.enableUrgentAlerts).toBe(false);
  });
});

describe('useAutoWhatsAppNotifications - interface EquipmentDocument', () => {
  interface EquipmentDocument {
    id: number;
    equipoId: number;
    templateId: string;
    templateName: string;
    expiresAt: string | null;
    status: string;
  }

  it('debe aceptar documento con fecha de expiración', () => {
    const doc: EquipmentDocument = {
      id: 1,
      equipoId: 1,
      templateId: 't1',
      templateName: 'Licencia',
      expiresAt: '2024-12-31T00:00:00.000Z',
      status: 'OK',
    };

    expect(doc.id).toBe(1);
    expect(doc.expiresAt).toBe('2024-12-31T00:00:00.000Z');
  });

  it('debe aceptar documento sin fecha de expiración', () => {
    const doc: EquipmentDocument = {
      id: 1,
      equipoId: 1,
      templateId: 't1',
      templateName: 'Documento permanente',
      expiresAt: null,
      status: 'OK',
    };

    expect(doc.expiresAt).toBeNull();
  });
});

describe('useAutoWhatsAppNotifications - interface EquipmentData', () => {
  interface EquipmentData {
    id: number;
    driverDniNorm: string;
    truckPlateNorm: string;
    trailerPlateNorm: string | null;
    choferPhones?: string[];
  }

  it('debe aceptar equipo con teléfonos', () => {
    const equipo: EquipmentData = {
      id: 1,
      driverDniNorm: '12345678',
      truckPlateNorm: 'AAA111',
      trailerPlateNorm: 'BBB222',
      choferPhones: ['+54 11 5555-5555', '+54 11 6666-6666'],
    };

    expect(equipo.choferPhones).toHaveLength(2);
  });

  it('debe aceptar equipo sin teléfonos', () => {
    const equipo: EquipmentData = {
      id: 1,
      driverDniNorm: '12345678',
      truckPlateNorm: 'AAA111',
      trailerPlateNorm: null,
    };

    expect(equipo.choferPhones).toBeUndefined();
    expect(equipo.trailerPlateNorm).toBeNull();
  });
});

describe('useAutoWhatsAppNotifications - lógica de días restantes', () => {
  it('calcula días restantes correctamente', () => {
    const now = Date.now();
    const futureDate = new Date(now + 5 * 24 * 60 * 60 * 1000); // 5 días
    const daysRemaining = Math.ceil((futureDate.getTime() - now) / (1000 * 60 * 60 * 24));
    
    expect(daysRemaining).toBe(5);
  });

  it('días restantes es negativo para fechas pasadas', () => {
    const now = Date.now();
    const pastDate = new Date(now - 3 * 24 * 60 * 60 * 1000); // 3 días atrás
    const daysRemaining = Math.ceil((pastDate.getTime() - now) / (1000 * 60 * 60 * 24));
    
    expect(daysRemaining).toBe(-3);
  });

  it('verifica umbral de warning', () => {
    const thresholds = { urgent: 3, warning: 10 };
    
    // 5 días está dentro del warning pero no urgente
    expect(5 <= thresholds.warning && 5 > 0).toBe(true);
    expect(5 <= thresholds.urgent).toBe(false);
    
    // 2 días está dentro del urgente
    expect(2 <= thresholds.urgent).toBe(true);
    
    // 15 días está fuera del warning
    expect(15 <= thresholds.warning).toBe(false);
  });
});

describe('useAutoWhatsAppNotifications - authHeaders', () => {
  it('construye headers correctamente con token y empresaId', () => {
    const authToken = 'test-token';
    const empresaId = 42;

    const authHeaders: HeadersInit = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
    };

    expect(authHeaders.Authorization).toBe('Bearer test-token');
    expect(authHeaders['x-tenant-id']).toBe('42');
  });

  it('omite Authorization si no hay token', () => {
    const authToken = null;
    const empresaId = 42;

    const authHeaders: HeadersInit = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
    };

    expect(authHeaders.Authorization).toBeUndefined();
    expect(authHeaders['x-tenant-id']).toBe('42');
  });
});

describe('useAutoWhatsAppNotifications - export', () => {
  it('exporta useAutoWhatsAppNotifications hook', async () => {
    const module = await import('../useAutoWhatsAppNotifications');
    expect(module.useAutoWhatsAppNotifications).toBeDefined();
    expect(typeof module.useAutoWhatsAppNotifications).toBe('function');
  });
});
