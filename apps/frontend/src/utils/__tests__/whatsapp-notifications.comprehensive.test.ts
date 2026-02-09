/**
 * Tests comprehensivos para whatsapp-notifications utilities
 * Cubre todos los helpers, templates y validación
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

import {
  createWhatsAppNotificationService,
  NotificationTemplates,
  WhatsAppNotificationHelpers,
  WhatsAppValidation,
} from '../whatsapp-notifications';

describe('whatsapp-notifications - tests comprehensivos', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    document.body.innerHTML = '';
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('WhatsAppValidation', () => {
    describe('isValidPhoneNumber', () => {
      it('debe validar número con formato internacional correcto', () => {
        expect(WhatsAppValidation.isValidPhoneNumber('+5491112345678')).toBe(true);
        expect(WhatsAppValidation.isValidPhoneNumber('+12025551234')).toBe(true);
        expect(WhatsAppValidation.isValidPhoneNumber('+447911123456')).toBe(true);
      });

      it('debe rechazar números sin + inicial', () => {
        expect(WhatsAppValidation.isValidPhoneNumber('5491112345678')).toBe(false);
      });

      it('debe rechazar números muy cortos', () => {
        expect(WhatsAppValidation.isValidPhoneNumber('+123')).toBe(false);
      });

      it('debe rechazar números con letras', () => {
        expect(WhatsAppValidation.isValidPhoneNumber('+54911ABC5678')).toBe(false);
      });

      it('debe rechazar números que empiezan con 0 después del +', () => {
        expect(WhatsAppValidation.isValidPhoneNumber('+0111234567')).toBe(false);
      });
    });

    describe('sanitizePhoneNumber', () => {
      it('debe limpiar espacios y caracteres especiales', () => {
        expect(WhatsAppValidation.sanitizePhoneNumber('+54 9 11 1234-5678')).toBe('+5491112345678');
      });

      it('debe agregar + si no existe', () => {
        expect(WhatsAppValidation.sanitizePhoneNumber('5491112345678')).toBe('+5491112345678');
      });

      it('debe mantener el + existente', () => {
        expect(WhatsAppValidation.sanitizePhoneNumber('+5491112345678')).toBe('+5491112345678');
      });

      it('debe remover paréntesis y guiones', () => {
        expect(WhatsAppValidation.sanitizePhoneNumber('+1 (202) 555-1234')).toBe('+12025551234');
      });
    });

    describe('validateTemplate', () => {
      it('debe retornar true si todas las variables están provistas', () => {
        const message = 'Hola {{nombre}}, tu documento {{documento}} vence el {{fecha}}';
        const variables = { nombre: 'Juan', documento: 'DNI', fecha: '2024-12-31' };
        
        expect(WhatsAppValidation.validateTemplate(message, variables)).toBe(true);
      });

      it('debe retornar false si faltan variables', () => {
        const message = 'Hola {{nombre}}, tu documento {{documento}} vence';
        const variables = { nombre: 'Juan' };
        
        expect(WhatsAppValidation.validateTemplate(message, variables)).toBe(false);
      });

      it('debe retornar true si no hay variables en el mensaje', () => {
        const message = 'Mensaje sin variables';
        const variables = {};
        
        expect(WhatsAppValidation.validateTemplate(message, variables)).toBe(true);
      });
    });
  });

  describe('NotificationTemplates', () => {
    describe('DOCUMENT_EXPIRY', () => {
      it('debe generar variables correctas', () => {
        const vars = NotificationTemplates.DOCUMENT_EXPIRY.getVariables('E1', 'Licencia', '31/12/2024', 10);
        
        expect(vars.equipoId).toBe('E1');
        expect(vars.documentType).toBe('Licencia');
        expect(vars.expiryDate).toBe('31/12/2024');
        expect(vars.daysRemaining).toBe('10');
        expect(vars.urgency).toBe('Próximo');
      });

      it('debe marcar como URGENTE si días <= 7', () => {
        const vars = NotificationTemplates.DOCUMENT_EXPIRY.getVariables('E1', 'DNI', '01/01/2024', 7);
        expect(vars.urgency).toBe('URGENTE');
      });

      it('debe tener tipo y prioridad correctos', () => {
        expect(NotificationTemplates.DOCUMENT_EXPIRY.type).toBe('document_expiry');
        expect(NotificationTemplates.DOCUMENT_EXPIRY.priority).toBe('high');
      });
    });

    describe('URGENT_ALERT', () => {
      it('debe generar variables correctas', () => {
        const vars = NotificationTemplates.URGENT_ALERT.getVariables('E2', 'VENCIMIENTO', 'Documento vencido');
        
        expect(vars.equipoId).toBe('E2');
        expect(vars.alertType).toBe('VENCIMIENTO');
        expect(vars.description).toBe('Documento vencido');
        expect(vars.timestamp).toBeDefined();
      });

      it('debe tener tipo y prioridad correctos', () => {
        expect(NotificationTemplates.URGENT_ALERT.type).toBe('urgent_alert');
        expect(NotificationTemplates.URGENT_ALERT.priority).toBe('urgent');
      });
    });

    describe('EQUIPMENT_UPDATE', () => {
      it('debe generar variables correctas', () => {
        const vars = NotificationTemplates.EQUIPMENT_UPDATE.getVariables('E3', 'CAMBIO_PATENTE', 'Nueva patente');
        
        expect(vars.equipoId).toBe('E3');
        expect(vars.updateType).toBe('CAMBIO_PATENTE');
        expect(vars.details).toBe('Nueva patente');
        expect(vars.timestamp).toBeDefined();
      });

      it('debe tener tipo y prioridad correctos', () => {
        expect(NotificationTemplates.EQUIPMENT_UPDATE.type).toBe('equipment_update');
        expect(NotificationTemplates.EQUIPMENT_UPDATE.priority).toBe('normal');
      });
    });

    describe('GENERAL', () => {
      it('debe generar variables correctas sin datos adicionales', () => {
        const vars = NotificationTemplates.GENERAL.getVariables('Mensaje general');
        
        expect(vars.message).toBe('Mensaje general');
        expect(vars.timestamp).toBeDefined();
      });

      it('debe incluir datos adicionales', () => {
        const vars = NotificationTemplates.GENERAL.getVariables('Mensaje', { extra: 'valor' });
        
        expect(vars.message).toBe('Mensaje');
        expect(vars.extra).toBe('valor');
      });

      it('debe tener tipo y prioridad correctos', () => {
        expect(NotificationTemplates.GENERAL.type).toBe('general');
        expect(NotificationTemplates.GENERAL.priority).toBe('normal');
      });
    });
  });

  describe('WhatsAppNotificationHelpers', () => {
    const mockService = {
      send: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      sendBatch: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      scheduleNotification: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      getStatus: jest.fn<() => Promise<'pending' | 'sent' | 'failed' | 'delivered'>>().mockResolvedValue('sent'),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('sendDocumentExpiryAlert', () => {
      it('debe enviar alerta con prioridad urgent si días <= 3', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01').getTime());

        await WhatsAppNotificationHelpers.sendDocumentExpiryAlert(
          mockService,
          '+5491112345678',
          'E1',
          'DNI',
          new Date('2024-01-03'),
          'template-1'
        );

        expect(mockService.send).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'urgent' })
        );
      });

      it('debe enviar alerta con prioridad high si días > 3', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01').getTime());

        await WhatsAppNotificationHelpers.sendDocumentExpiryAlert(
          mockService,
          '+5491112345678',
          'E1',
          'DNI',
          new Date('2024-01-10'),
          'template-1'
        );

        expect(mockService.send).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'high' })
        );
      });

      it('debe incluir templateId si se provee', async () => {
        await WhatsAppNotificationHelpers.sendDocumentExpiryAlert(
          mockService,
          '+5491112345678',
          'E1',
          'DNI',
          new Date('2024-12-31'),
          'my-template'
        );

        expect(mockService.send).toHaveBeenCalledWith(
          expect.objectContaining({ templateId: 'my-template' })
        );
      });
    });

    describe('sendUrgentAlert', () => {
      it('debe enviar alerta con tipo urgent_alert', async () => {
        await WhatsAppNotificationHelpers.sendUrgentAlert(
          mockService,
          '+5491112345678',
          'E1',
          'VENCIMIENTO',
          'Documento vencido'
        );

        expect(mockService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'urgent_alert',
            priority: 'urgent',
          })
        );
      });
    });

    describe('sendEquipmentUpdate', () => {
      it('debe enviar actualización de equipo', async () => {
        await WhatsAppNotificationHelpers.sendEquipmentUpdate(
          mockService,
          '+5491112345678',
          'E1',
          'CAMBIO',
          'Detalles del cambio',
          'template-equip'
        );

        expect(mockService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'equipment_update',
            priority: 'normal',
          })
        );
      });
    });

    describe('sendBulkNotifications', () => {
      it('debe enviar múltiples notificaciones en batch', async () => {
        const notifications = [
          { phoneNumber: '+5491112345678', type: 'general' as const },
          { phoneNumber: '+5491187654321', type: 'general' as const, priority: 'high' as const },
        ];

        await WhatsAppNotificationHelpers.sendBulkNotifications(mockService, notifications);

        expect(mockService.sendBatch).toHaveBeenCalledWith([
          expect.objectContaining({ phoneNumber: '+5491112345678', priority: 'normal' }),
          expect.objectContaining({ phoneNumber: '+5491187654321', priority: 'high' }),
        ]);
      });
    });

    describe('scheduleDailyReminders', () => {
      it('debe programar recordatorios para documentos próximos a vencer', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01').getTime());

        const reminders = [
          {
            phoneNumber: '+5491112345678',
            equipoId: 'E1',
            documentType: 'DNI',
            expiryDate: new Date('2024-01-15'),
            templateId: 'template-1',
          },
        ];

        await WhatsAppNotificationHelpers.scheduleDailyReminders(mockService, reminders);

        expect(mockService.scheduleNotification).toHaveBeenCalled();
      });

      it('debe usar prioridad high si días <= 7', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01').getTime());

        const reminders = [
          {
            phoneNumber: '+5491112345678',
            equipoId: 'E1',
            documentType: 'DNI',
            expiryDate: new Date('2024-01-05'), // 4 días
          },
        ];

        await WhatsAppNotificationHelpers.scheduleDailyReminders(mockService, reminders);

        expect(mockService.scheduleNotification).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'high' }),
          expect.any(Date)
        );
      });

      it('no debe programar si documento ya venció', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-15').getTime());

        const reminders = [
          {
            phoneNumber: '+5491112345678',
            equipoId: 'E1',
            documentType: 'DNI',
            expiryDate: new Date('2024-01-01'), // Ya venció
          },
        ];

        await WhatsAppNotificationHelpers.scheduleDailyReminders(mockService, reminders);

        expect(mockService.scheduleNotification).not.toHaveBeenCalled();
      });

      it('no debe programar si vence en más de 30 días', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01').getTime());

        const reminders = [
          {
            phoneNumber: '+5491112345678',
            equipoId: 'E1',
            documentType: 'DNI',
            expiryDate: new Date('2024-03-01'), // Más de 30 días
          },
        ];

        await WhatsAppNotificationHelpers.scheduleDailyReminders(mockService, reminders);

        expect(mockService.scheduleNotification).not.toHaveBeenCalled();
      });
    });
  });

  describe('WhatsAppNotificationManager (service)', () => {
    describe('send', () => {
      it('debe enviar notificación correctamente', async () => {
        fetchSpy.mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { id: '1' } }), { status: 200 })
        );

        const service = createWhatsAppNotificationService('http://api', {});

        await service.send({
          type: 'general',
          phoneNumber: '+5491112345678',
          priority: 'normal',
          message: 'Test',
        });

        expect(fetchSpy).toHaveBeenCalledWith(
          'http://api/notifications/whatsapp/send',
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('debe manejar error con message del servidor', async () => {
        fetchSpy.mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'Custom error' }), { status: 400 })
        );

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const service = createWhatsAppNotificationService('http://api', {});

        await expect(
          service.send({ type: 'general', phoneNumber: '+54911', priority: 'high', message: 'x' })
        ).rejects.toThrow('Custom error');

        consoleSpy.mockRestore();
      });

      it('debe manejar error sin message del servidor', async () => {
        fetchSpy.mockResolvedValueOnce(
          new Response('{}', { status: 500 })
        );

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const service = createWhatsAppNotificationService('http://api', {});

        await expect(
          service.send({ type: 'general', phoneNumber: '+54911', priority: 'low', message: 'x' })
        ).rejects.toThrow(/500/);

        consoleSpy.mockRestore();
      });
    });

    describe('sendBatch', () => {
      it('debe enviar batch correctamente', async () => {
        fetchSpy.mockResolvedValueOnce(
          new Response(JSON.stringify({ data: {} }), { status: 200 })
        );

        const service = createWhatsAppNotificationService('http://api', {});

        await service.sendBatch([
          { type: 'general', phoneNumber: '+54911', priority: 'normal', message: 'x' },
        ]);

        expect(fetchSpy).toHaveBeenCalledWith(
          'http://api/notifications/whatsapp/send-batch',
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('debe manejar error en batch', async () => {
        fetchSpy.mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'Batch failed' }), { status: 500 })
        );

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const service = createWhatsAppNotificationService('http://api', {});

        await expect(
          service.sendBatch([{ type: 'general', phoneNumber: '+54911', priority: 'normal', message: 'x' }])
        ).rejects.toThrow('Batch failed');

        consoleSpy.mockRestore();
      });
    });

    describe('scheduleNotification', () => {
      it('debe programar notificación correctamente', async () => {
        fetchSpy.mockResolvedValueOnce(
          new Response(JSON.stringify({ data: {} }), { status: 200 })
        );

        const service = createWhatsAppNotificationService('http://api', {});

        await service.scheduleNotification(
          { type: 'general', phoneNumber: '+54911', priority: 'normal', message: 'x' },
          new Date('2024-12-31')
        );

        expect(fetchSpy).toHaveBeenCalledWith(
          'http://api/notifications/whatsapp/schedule',
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('debe manejar error en schedule', async () => {
        fetchSpy.mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'Schedule failed' }), { status: 400 })
        );

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const service = createWhatsAppNotificationService('http://api', {});

        await expect(
          service.scheduleNotification(
            { type: 'general', phoneNumber: '+54911', priority: 'normal', message: 'x' },
            new Date()
          )
        ).rejects.toThrow('Schedule failed');

        consoleSpy.mockRestore();
      });
    });

    describe('getStatus', () => {
      it('debe obtener status correctamente', async () => {
        fetchSpy.mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { status: 'delivered' } }), { status: 200 })
        );

        const service = createWhatsAppNotificationService('http://api', {});

        const status = await service.getStatus('notification-1');

        expect(status).toBe('delivered');
      });

      it('debe retornar pending si no hay status en data', async () => {
        fetchSpy.mockResolvedValueOnce(
          new Response(JSON.stringify({ data: {} }), { status: 200 })
        );

        const service = createWhatsAppNotificationService('http://api', {});

        const status = await service.getStatus('notification-1');

        expect(status).toBe('pending');
      });

      it('debe retornar failed en error de red', async () => {
        fetchSpy.mockRejectedValueOnce(new Error('Network error'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const service = createWhatsAppNotificationService('http://api', {});

        const status = await service.getStatus('notification-1');

        expect(status).toBe('failed');

        consoleSpy.mockRestore();
      });
    });
  });
});

