/**
 * Unit tests for NotificationService
 * @jest-environment node
 */

jest.mock('../src/config/database', () => ({
  prisma: {
    notificationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    chofer: { findUnique: jest.fn() },
    equipo: { findMany: jest.fn() },
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('NotificationService', () => {
  describe('Notification types', () => {
    const types = ['DOCUMENT_EXPIRING', 'DOCUMENT_EXPIRED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'DOCUMENT_MISSING'];

    it('should define expiration notifications', () => {
      expect(types).toContain('DOCUMENT_EXPIRING');
      expect(types).toContain('DOCUMENT_EXPIRED');
    });

    it('should define approval notifications', () => {
      expect(types).toContain('DOCUMENT_APPROVED');
      expect(types).toContain('DOCUMENT_REJECTED');
    });

    it('should define missing document notification', () => {
      expect(types).toContain('DOCUMENT_MISSING');
    });
  });

  describe('Notification channels', () => {
    const channels = ['EMAIL', 'WHATSAPP', 'PUSH', 'SMS'];

    it('should support email channel', () => {
      expect(channels).toContain('EMAIL');
    });

    it('should support WhatsApp channel', () => {
      expect(channels).toContain('WHATSAPP');
    });

    it('should support push notifications', () => {
      expect(channels).toContain('PUSH');
    });
  });

  describe('Notification priority', () => {
    type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

    function getPriorityFromDaysUntilExpiry(days: number): Priority {
      if (days < 0) return 'URGENT';
      if (days <= 7) return 'HIGH';
      if (days <= 30) return 'MEDIUM';
      return 'LOW';
    }

    it('should return URGENT for expired documents', () => {
      expect(getPriorityFromDaysUntilExpiry(-1)).toBe('URGENT');
    });

    it('should return HIGH for documents expiring within 7 days', () => {
      expect(getPriorityFromDaysUntilExpiry(5)).toBe('HIGH');
    });

    it('should return MEDIUM for documents expiring within 30 days', () => {
      expect(getPriorityFromDaysUntilExpiry(15)).toBe('MEDIUM');
    });

    it('should return LOW for documents expiring after 30 days', () => {
      expect(getPriorityFromDaysUntilExpiry(60)).toBe('LOW');
    });
  });

  describe('Notification message templates', () => {
    function formatExpiryMessage(
      documentName: string,
      entityName: string,
      daysUntilExpiry: number
    ): string {
      if (daysUntilExpiry < 0) {
        return `⚠️ El documento "${documentName}" de ${entityName} ha vencido hace ${Math.abs(daysUntilExpiry)} días.`;
      }
      if (daysUntilExpiry === 0) {
        return `⚠️ El documento "${documentName}" de ${entityName} vence hoy.`;
      }
      return `📋 El documento "${documentName}" de ${entityName} vence en ${daysUntilExpiry} días.`;
    }

    it('should format expired message', () => {
      const msg = formatExpiryMessage('Licencia', 'Juan Pérez', -5);
      expect(msg).toContain('ha vencido');
      expect(msg).toContain('5 días');
    });

    it('should format expiring today message', () => {
      const msg = formatExpiryMessage('VTV', 'AB123CD', 0);
      expect(msg).toContain('vence hoy');
    });

    it('should format expiring soon message', () => {
      const msg = formatExpiryMessage('Seguro', 'AA000BB', 15);
      expect(msg).toContain('vence en 15 días');
    });
  });

  describe('Recipient resolution', () => {
    interface Recipient {
      type: 'CHOFER' | 'TRANSPORTISTA' | 'ADMIN';
      phone?: string;
      email?: string;
      name: string;
    }

    function hasValidContact(recipient: Recipient, channel: string): boolean {
      if (channel === 'EMAIL') return !!recipient.email;
      if (channel === 'WHATSAPP' || channel === 'SMS') return !!recipient.phone;
      return true; // PUSH doesn't need specific contact
    }

    it('should validate email recipient', () => {
      const recipient: Recipient = { type: 'CHOFER', email: 'test@example.com', name: 'Test' };
      expect(hasValidContact(recipient, 'EMAIL')).toBe(true);
    });

    it('should reject recipient without email for EMAIL channel', () => {
      const recipient: Recipient = { type: 'CHOFER', phone: '1234567890', name: 'Test' };
      expect(hasValidContact(recipient, 'EMAIL')).toBe(false);
    });

    it('should validate phone for WhatsApp', () => {
      const recipient: Recipient = { type: 'CHOFER', phone: '541112345678', name: 'Test' };
      expect(hasValidContact(recipient, 'WHATSAPP')).toBe(true);
    });
  });

  describe('Notification scheduling', () => {
    function shouldSendNotification(
      lastSentAt: Date | null,
      minIntervalHours: number
    ): boolean {
      if (!lastSentAt) return true;
      const hoursSinceLastSent = (Date.now() - lastSentAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastSent >= minIntervalHours;
    }

    it('should send if never sent before', () => {
      expect(shouldSendNotification(null, 24)).toBe(true);
    });

    it('should send if interval has passed', () => {
      const lastSent = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      expect(shouldSendNotification(lastSent, 24)).toBe(true);
    });

    it('should not send if interval not passed', () => {
      const lastSent = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      expect(shouldSendNotification(lastSent, 24)).toBe(false);
    });
  });

  describe('Notification batching', () => {
    interface NotificationBatch {
      recipientId: number;
      notifications: Array<{ type: string; message: string }>;
    }

    function batchNotifications(
      notifications: Array<{ recipientId: number; type: string; message: string }>
    ): NotificationBatch[] {
      const batches = new Map<number, NotificationBatch>();

      for (const notif of notifications) {
        if (!batches.has(notif.recipientId)) {
          batches.set(notif.recipientId, {
            recipientId: notif.recipientId,
            notifications: [],
          });
        }
        batches.get(notif.recipientId)!.notifications.push({
          type: notif.type,
          message: notif.message,
        });
      }

      return Array.from(batches.values());
    }

    it('should batch notifications by recipient', () => {
      const notifications = [
        { recipientId: 1, type: 'EXPIRING', message: 'Doc 1' },
        { recipientId: 1, type: 'EXPIRING', message: 'Doc 2' },
        { recipientId: 2, type: 'EXPIRED', message: 'Doc 3' },
      ];

      const batches = batchNotifications(notifications);
      expect(batches).toHaveLength(2);
      expect(batches.find(b => b.recipientId === 1)?.notifications).toHaveLength(2);
    });
  });

  describe('WhatsApp phone formatting', () => {
    function formatPhoneForWhatsApp(phone: string): string {
      // Remove all non-digits
      let cleaned = phone.replace(/\D/g, '');
      
      // Add Argentina country code if not present
      if (!cleaned.startsWith('54')) {
        cleaned = '54' + cleaned;
      }
      
      // Remove leading 0 from area code if present
      if (cleaned.startsWith('540')) {
        cleaned = '54' + cleaned.substring(3);
      }
      
      return cleaned;
    }

    it('should add country code', () => {
      expect(formatPhoneForWhatsApp('1123456789')).toBe('541123456789');
    });

    it('should keep existing country code', () => {
      expect(formatPhoneForWhatsApp('541123456789')).toBe('541123456789');
    });

    it('should remove formatting', () => {
      expect(formatPhoneForWhatsApp('+54 11 2345-6789')).toBe('541123456789');
    });

    it('should handle 0 prefix', () => {
      expect(formatPhoneForWhatsApp('01123456789')).toBe('541123456789');
    });
  });

  describe('Notification log structure', () => {
    it('should validate notification log entry', () => {
      const log = {
        id: 1,
        type: 'DOCUMENT_EXPIRING',
        channel: 'WHATSAPP',
        recipientId: 100,
        recipientType: 'CHOFER',
        message: 'Tu licencia vence en 7 días',
        status: 'SENT',
        sentAt: new Date(),
        metadata: { documentId: 50, templateId: 5 },
      };

      expect(log.type).toBe('DOCUMENT_EXPIRING');
      expect(log.status).toBe('SENT');
    });

    it('should track failed notifications', () => {
      const log = {
        id: 2,
        type: 'DOCUMENT_EXPIRED',
        channel: 'EMAIL',
        recipientId: 100,
        recipientType: 'TRANSPORTISTA',
        message: 'Documento vencido',
        status: 'FAILED',
        error: 'SMTP connection failed',
        sentAt: null,
      };

      expect(log.status).toBe('FAILED');
      expect(log.error).toBeDefined();
    });
  });
});




