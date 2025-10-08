import { showToast } from '../components/ui/Toast.utils';

export interface NotificationPayload {
  type: 'document_expiry' | 'urgent_alert' | 'equipment_update' | 'general';
  phoneNumber: string;
  templateId?: string;
  variables?: Record<string, string>;
  message?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface WhatsAppNotificationService {
  send: (payload: NotificationPayload) => Promise<void>;
  sendBatch: (payloads: NotificationPayload[]) => Promise<void>;
  scheduleNotification: (payload: NotificationPayload, sendAt: Date) => Promise<void>;
  getStatus: (notificationId: string) => Promise<'pending' | 'sent' | 'failed' | 'delivered'>;
}

class WhatsAppNotificationManager implements WhatsAppNotificationService {
  private baseUrl: string;
  private authHeaders: HeadersInit;

  constructor(baseUrl: string, authHeaders: HeadersInit) {
    this.baseUrl = baseUrl;
    this.authHeaders = authHeaders;
  }

  async send(payload: NotificationPayload): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/whatsapp/send`, {
        method: 'POST',
        headers: {
          ...this.authHeaders,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (payload.priority === 'urgent') {
        showToast('Notificación urgente enviada por WhatsApp', 'success');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp notification:', error);
      
      if (payload.priority === 'urgent' || payload.priority === 'high') {
        showToast(`Error al enviar notificación: ${error.message}`, 'error');
      }
      
      throw error;
    }
  }

  async sendBatch(payloads: NotificationPayload[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/whatsapp/send-batch`, {
        method: 'POST',
        headers: {
          ...this.authHeaders,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ notifications: payloads }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      showToast(`${payloads.length} notificaciones WhatsApp programadas`, 'success');
      
      return result.data;
    } catch (error: any) {
      console.error('Error sending batch WhatsApp notifications:', error);
      showToast(`Error al enviar notificaciones: ${error.message}`, 'error');
      throw error;
    }
  }

  async scheduleNotification(payload: NotificationPayload, sendAt: Date): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/whatsapp/schedule`, {
        method: 'POST',
        headers: {
          ...this.authHeaders,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          sendAt: sendAt.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      showToast(`Notificación programada para ${sendAt.toLocaleString()}`, 'success');
      
      return result.data;
    } catch (error: any) {
      console.error('Error scheduling WhatsApp notification:', error);
      showToast(`Error al programar notificación: ${error.message}`, 'error');
      throw error;
    }
  }

  async getStatus(notificationId: string): Promise<'pending' | 'sent' | 'failed' | 'delivered'> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/whatsapp/${notificationId}/status`, {
        headers: this.authHeaders,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data?.status || 'pending';
    } catch (error: any) {
      console.error('Error getting notification status:', error);
      return 'failed';
    }
  }
}

// Factory function for creating notification service instances
export const createWhatsAppNotificationService = (
  baseUrl: string, 
  authHeaders: HeadersInit
): WhatsAppNotificationService => {
  return new WhatsAppNotificationManager(baseUrl, authHeaders);
};

// Pre-defined notification types with default templates
export const NotificationTemplates = {
  DOCUMENT_EXPIRY: {
    type: 'document_expiry' as const,
    priority: 'high' as const,
    getVariables: (equipoId: string, documentType: string, expiryDate: string, daysRemaining: number) => ({
      equipoId,
      documentType,
      expiryDate,
      daysRemaining: daysRemaining.toString(),
      urgency: daysRemaining <= 7 ? 'URGENTE' : 'Próximo',
    }),
  },
  
  URGENT_ALERT: {
    type: 'urgent_alert' as const,
    priority: 'urgent' as const,
    getVariables: (equipoId: string, alertType: string, description: string) => ({
      equipoId,
      alertType,
      description,
      timestamp: new Date().toLocaleString('es-AR'),
    }),
  },
  
  EQUIPMENT_UPDATE: {
    type: 'equipment_update' as const,
    priority: 'normal' as const,
    getVariables: (equipoId: string, updateType: string, details: string) => ({
      equipoId,
      updateType,
      details,
      timestamp: new Date().toLocaleString('es-AR'),
    }),
  },
  
  GENERAL: {
    type: 'general' as const,
    priority: 'normal' as const,
    getVariables: (message: string, additionalData?: Record<string, string>) => ({
      message,
      timestamp: new Date().toLocaleString('es-AR'),
      ...additionalData,
    }),
  },
};

// Helper functions for common notification scenarios
export const WhatsAppNotificationHelpers = {
  // Send document expiry notification
  sendDocumentExpiryAlert: async (
    service: WhatsAppNotificationService,
    phoneNumber: string,
    equipoId: string,
    documentType: string,
    expiryDate: Date,
    templateId?: string
  ) => {
    const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const template = NotificationTemplates.DOCUMENT_EXPIRY;
    
    await service.send({
      type: template.type,
      phoneNumber,
      templateId,
      variables: template.getVariables(
        equipoId,
        documentType,
        expiryDate.toLocaleDateString('es-AR'),
        daysRemaining
      ),
      priority: daysRemaining <= 3 ? 'urgent' : template.priority,
    });
  },

  // Send urgent alert
  sendUrgentAlert: async (
    service: WhatsAppNotificationService,
    phoneNumber: string,
    equipoId: string,
    alertType: string,
    description: string,
    templateId?: string
  ) => {
    const template = NotificationTemplates.URGENT_ALERT;
    
    await service.send({
      type: template.type,
      phoneNumber,
      templateId,
      variables: template.getVariables(equipoId, alertType, description),
      priority: template.priority,
    });
  },

  // Send equipment update notification
  sendEquipmentUpdate: async (
    service: WhatsAppNotificationService,
    phoneNumber: string,
    equipoId: string,
    updateType: string,
    details: string,
    templateId?: string
  ) => {
    const template = NotificationTemplates.EQUIPMENT_UPDATE;
    
    await service.send({
      type: template.type,
      phoneNumber,
      templateId,
      variables: template.getVariables(equipoId, updateType, details),
      priority: template.priority,
    });
  },

  // Send bulk notifications for multiple users
  sendBulkNotifications: async (
    service: WhatsAppNotificationService,
    notifications: Array<{
      phoneNumber: string;
      type: NotificationPayload['type'];
      templateId?: string;
      variables?: Record<string, string>;
      priority?: NotificationPayload['priority'];
    }>
  ) => {
    const payloads: NotificationPayload[] = notifications.map(notification => ({
      type: notification.type,
      phoneNumber: notification.phoneNumber,
      templateId: notification.templateId,
      variables: notification.variables,
      priority: notification.priority || 'normal',
    }));

    await service.sendBatch(payloads);
  },

  // Schedule daily document expiry reminders
  scheduleDailyReminders: async (
    service: WhatsAppNotificationService,
    reminders: Array<{
      phoneNumber: string;
      equipoId: string;
      documentType: string;
      expiryDate: Date;
      templateId?: string;
    }>
  ) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Send at 9 AM

    for (const reminder of reminders) {
      const daysRemaining = Math.ceil((reminder.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining > 0 && daysRemaining <= 30) { // Only schedule if expires within 30 days
        const template = NotificationTemplates.DOCUMENT_EXPIRY;
        
        await service.scheduleNotification({
          type: template.type,
          phoneNumber: reminder.phoneNumber,
          templateId: reminder.templateId,
          variables: template.getVariables(
            reminder.equipoId,
            reminder.documentType,
            reminder.expiryDate.toLocaleDateString('es-AR'),
            daysRemaining
          ),
          priority: daysRemaining <= 7 ? 'high' : 'normal',
        }, tomorrow);
      }
    }
  },
};

// Validation helpers
export const WhatsAppValidation = {
  isValidPhoneNumber: (phoneNumber: string): boolean => {
    // WhatsApp international format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,3}\d{4,14}$/;
    return phoneRegex.test(phoneNumber);
  },

  sanitizePhoneNumber: (phoneNumber: string): string => {
    // Remove all non-digit characters except leading +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    
    return cleaned;
  },

  validateTemplate: (message: string, variables: Record<string, string>): boolean => {
    // Check if all template variables are provided
    const templateVars = [...message.matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1]);
    return templateVars.every(variable => variables[variable] !== undefined);
  },
};
