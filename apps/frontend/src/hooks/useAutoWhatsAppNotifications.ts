import { useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useWhatsAppNotifications } from './useWhatsAppNotifications';
import { getRuntimeEnv } from '../lib/runtimeEnv';
import { 
  createWhatsAppNotificationService, 
  WhatsAppNotificationHelpers,
  WhatsAppValidation 
} from '../utils/whatsapp-notifications';

interface AutoNotificationConfig {
  enableDocumentExpiryAlerts: boolean;
  enableUrgentAlerts: boolean;
  enableEquipmentUpdates: boolean;
  documentExpiryThresholds: {
    urgent: number; // days
    warning: number; // days
  };
}

interface EquipmentDocument {
  id: number;
  equipoId: number;
  templateId: string;
  templateName: string;
  expiresAt: string | null;
  status: string;
}

interface EquipmentData {
  id: number;
  driverDniNorm: string;
  truckPlateNorm: string;
  trailerPlateNorm: string | null;
  choferPhones?: string[];
}

export const useAutoWhatsAppNotifications = (config: AutoNotificationConfig) => {
  const authToken = useSelector((state: RootState) => (state as any)?.auth?.token);
  const empresaId = useSelector((state: RootState) => (state as any)?.auth?.user?.empresaId);
  
  const { 
    config: whatsAppConfig, 
    templates,
    isLoading: isConfigLoading 
  } = useWhatsAppNotifications();

  const apiBase = (getRuntimeEnv('VITE_DOCUMENTOS_API_URL') || '').replace(/\/$/, '');
  const baseUrl = `${apiBase}/api/docs`;

  const authHeaders: HeadersInit = useMemo(() => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
  }), [authToken, empresaId]);

  const whatsAppService = useMemo(() => {
    if (!authToken || !whatsAppConfig?.enabled) return null;
    return createWhatsAppNotificationService(baseUrl, authHeaders);
  }, [authToken, whatsAppConfig?.enabled, baseUrl, authHeaders]);

  // Get template by type
  const getTemplateByType = useCallback((type: string) => {
    return templates.find(template => template.type === type);
  }, [templates]);

  // Send document expiry notifications
  const sendDocumentExpiryNotifications = useCallback(async (
    equipos: EquipmentData[],
    documents: EquipmentDocument[]
  ) => {
    if (!whatsAppService || !config.enableDocumentExpiryAlerts) return;

    const template = getTemplateByType('document_expiry');
    if (!template) {
      console.warn('No document expiry template configured');
      return;
    }

    const now = new Date();
    const notifications: Array<{
      equipoId: string;
      phoneNumber: string;
      documentType: string;
      expiryDate: Date;
      daysRemaining: number;
    }> = [];

    // Find documents that are expiring
    for (const doc of documents) {
      if (!doc.expiresAt) continue;

      const expiryDate = new Date(doc.expiresAt);
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Check if within notification thresholds
      if (daysRemaining <= config.documentExpiryThresholds.warning && daysRemaining > 0) {
        const equipo = equipos.find(e => e.id === doc.equipoId);
        if (!equipo?.choferPhones?.length) continue;

        // Send to all valid phone numbers for this driver
        for (const phone of equipo.choferPhones) {
          const sanitizedPhone = WhatsAppValidation.sanitizePhoneNumber(phone);
          if (WhatsAppValidation.isValidPhoneNumber(sanitizedPhone)) {
            notifications.push({
              equipoId: equipo.id.toString(),
              phoneNumber: sanitizedPhone,
              documentType: doc.templateName || `Template ${doc.templateId}`,
              expiryDate,
              daysRemaining,
            });
          }
        }
      }
    }

    // Send notifications
    for (const notification of notifications) {
      try {
        await WhatsAppNotificationHelpers.sendDocumentExpiryAlert(
          whatsAppService,
          notification.phoneNumber,
          notification.equipoId,
          notification.documentType,
          notification.expiryDate,
          template.id
        );
      } catch (error) {
        console.error('Error sending document expiry notification:', error);
      }
    }

    return notifications.length;
  }, [whatsAppService, config, getTemplateByType]);

  // Send urgent alerts
  const sendUrgentAlert = useCallback(async (
    equipoId: string,
    alertType: string,
    description: string,
    phoneNumbers: string[]
  ) => {
    if (!whatsAppService || !config.enableUrgentAlerts) return;

    const template = getTemplateByType('urgent_alert');
    if (!template) {
      console.warn('No urgent alert template configured');
      return;
    }

    const validPhones = phoneNumbers
      .map(phone => WhatsAppValidation.sanitizePhoneNumber(phone))
      .filter(phone => WhatsAppValidation.isValidPhoneNumber(phone));

    for (const phoneNumber of validPhones) {
      try {
        await WhatsAppNotificationHelpers.sendUrgentAlert(
          whatsAppService,
          phoneNumber,
          equipoId,
          alertType,
          description,
          template.id
        );
      } catch (error) {
        console.error('Error sending urgent alert:', error);
      }
    }

    return validPhones.length;
  }, [whatsAppService, config, getTemplateByType]);

  // Send equipment update notifications
  const sendEquipmentUpdate = useCallback(async (
    equipoId: string,
    updateType: string,
    details: string,
    phoneNumbers: string[]
  ) => {
    if (!whatsAppService || !config.enableEquipmentUpdates) return;

    const template = getTemplateByType('equipment_update');
    if (!template) {
      console.warn('No equipment update template configured');
      return;
    }

    const validPhones = phoneNumbers
      .map(phone => WhatsAppValidation.sanitizePhoneNumber(phone))
      .filter(phone => WhatsAppValidation.isValidPhoneNumber(phone));

    for (const phoneNumber of validPhones) {
      try {
        await WhatsAppNotificationHelpers.sendEquipmentUpdate(
          whatsAppService,
          phoneNumber,
          equipoId,
          updateType,
          details,
          template.id
        );
      } catch (error) {
        console.error('Error sending equipment update notification:', error);
      }
    }

    return validPhones.length;
  }, [whatsAppService, config, getTemplateByType]);

  // Schedule daily reminder checks
  const scheduleDailyReminderCheck = useCallback(async () => {
    if (!whatsAppService || !config.enableDocumentExpiryAlerts) return;

    try {
      // Fetch all equipment and documents
      const [equiposResponse, documentsResponse] = await Promise.all([
        fetch(`${baseUrl}/transportistas/mis-equipos`, {
          headers: authHeaders,
          credentials: 'include',
        }),
        fetch(`${baseUrl}/transportistas/documentos-expiring`, {
          headers: authHeaders,
          credentials: 'include',
        }),
      ]);

      if (!equiposResponse.ok || !documentsResponse.ok) {
        throw new Error('Failed to fetch data for daily reminders');
      }

      const equiposData = await equiposResponse.json();
      const documentsData = await documentsResponse.json();

      const equipos: EquipmentData[] = equiposData.data || [];
      const documents: EquipmentDocument[] = documentsData.data || [];

      // Schedule reminders for documents expiring within the next 30 days
      const reminders = documents
        .filter(doc => {
          if (!doc.expiresAt) return false;
          const expiryDate = new Date(doc.expiresAt);
          const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysRemaining > 0 && daysRemaining <= 30;
        })
        .map(doc => {
          const equipo = equipos.find(e => e.id === doc.equipoId);
          const validPhones = (equipo?.choferPhones || [])
            .map(phone => WhatsAppValidation.sanitizePhoneNumber(phone))
            .filter(phone => WhatsAppValidation.isValidPhoneNumber(phone));

          return validPhones.map(phoneNumber => ({
            phoneNumber,
            equipoId: equipo!.id.toString(),
            documentType: doc.templateName || `Template ${doc.templateId}`,
            expiryDate: new Date(doc.expiresAt!),
          }));
        })
        .flat();

      const template = getTemplateByType('document_expiry');
      if (template && reminders.length > 0) {
        await WhatsAppNotificationHelpers.scheduleDailyReminders(
          whatsAppService,
          reminders.map(reminder => ({
            ...reminder,
            templateId: template.id,
          }))
        );
      }

      return reminders.length;
    } catch (error) {
      console.error('Error scheduling daily reminders:', error);
      return 0;
    }
  }, [whatsAppService, config, baseUrl, authHeaders, getTemplateByType]);

  // Auto-schedule daily reminders (runs once when component mounts)
  useEffect(() => {
    if (!isConfigLoading && whatsAppService && config.enableDocumentExpiryAlerts) {
      // Schedule for next day at 9 AM
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(9, 0, 0, 0);

      const timeUntilNextDay = nextDay.getTime() - Date.now();
      
      const timeoutId = setTimeout(() => {
        scheduleDailyReminderCheck();
        
        // Then schedule daily
        setInterval(scheduleDailyReminderCheck, 24 * 60 * 60 * 1000);
      }, timeUntilNextDay);

      return () => clearTimeout(timeoutId);
    }
  }, [isConfigLoading, whatsAppService, config.enableDocumentExpiryAlerts, scheduleDailyReminderCheck]);

  return {
    isWhatsAppEnabled: whatsAppConfig?.enabled && whatsAppService !== null,
    hasValidTemplates: templates.length > 0,
    sendDocumentExpiryNotifications,
    sendUrgentAlert,
    sendEquipmentUpdate,
    scheduleDailyReminderCheck,
  };
};
