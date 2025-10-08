import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export interface WhatsAppNotificationConfig {
  enabled: boolean;
  instanceId: string;
  phoneNumber: string;
  templates: {
    documentExpiry: string;
    urgentAlert: string;
    equipmentUpdate: string;
    general: string;
  };
}

export interface EvolutionInstance {
  id: string;
  name: string;
  serverUrl: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
  type: 'document_expiry' | 'urgent_alert' | 'equipment_update' | 'general';
}

interface WhatsAppNotificationsHook {
  config: WhatsAppNotificationConfig | null;
  instances: EvolutionInstance[];
  templates: NotificationTemplate[];
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  updateConfig: (config: Partial<WhatsAppNotificationConfig>) => Promise<void>;
  sendTestMessage: (phoneNumber: string, templateId: string, variables?: Record<string, string>) => Promise<void>;
  getInstanceStatus: (instanceId: string) => Promise<'connected' | 'disconnected' | 'error'>;
  refreshInstances: () => Promise<void>;
  createTemplate: (template: Omit<NotificationTemplate, 'id'>) => Promise<void>;
  updateTemplate: (templateId: string, updates: Partial<NotificationTemplate>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
}

export const useWhatsAppNotifications = (): WhatsAppNotificationsHook => {
  const authToken = useSelector((state: RootState) => (state as any)?.auth?.token);
  const empresaId = useSelector((state: RootState) => (state as any)?.auth?.user?.empresaId);
  
  const [config, setConfig] = useState<WhatsAppNotificationConfig | null>(null);
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `${import.meta.env.VITE_DOCUMENTOS_API_URL}/api/docs`;

  const authHeaders: HeadersInit = useMemo(() => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
    'Content-Type': 'application/json',
  }), [authToken, empresaId]);

  // Fetch initial configuration
  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/notifications/whatsapp/config`, {
        headers: authHeaders,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setConfig(data.data || {
        enabled: false,
        instanceId: '',
        phoneNumber: '',
        templates: {
          documentExpiry: '',
          urgentAlert: '',
          equipmentUpdate: '',
          general: '',
        },
      });
    } catch (error: any) {
      setError(error.message || 'Error fetching WhatsApp configuration');
      console.error('Error fetching WhatsApp config:', error);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, authHeaders]);

  // Fetch Evolution instances
  const fetchInstances = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/evolution/instances`, {
        headers: authHeaders,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setInstances(data.data || []);
    } catch (error: any) {
      console.error('Error fetching Evolution instances:', error);
      setInstances([]);
    }
  }, [baseUrl, authHeaders]);

  // Fetch notification templates
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/notifications/whatsapp/templates`, {
        headers: authHeaders,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error: any) {
      console.error('Error fetching notification templates:', error);
      setTemplates([]);
    }
  }, [baseUrl, authHeaders]);

  // Update configuration
  const updateConfig = useCallback(async (updates: Partial<WhatsAppNotificationConfig>) => {
    if (!config) return;

    setIsUpdating(true);
    setError(null);

    try {
      const newConfig = { ...config, ...updates };
      
      const response = await fetch(`${baseUrl}/notifications/whatsapp/config`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setConfig(data.data);
    } catch (error: any) {
      setError(error.message || 'Error updating WhatsApp configuration');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [config, baseUrl, authHeaders]);

  // Send test message
  const sendTestMessage = useCallback(async (
    phoneNumber: string, 
    templateId: string, 
    variables: Record<string, string> = {}
  ) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/notifications/whatsapp/test`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          phoneNumber,
          templateId,
          variables,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      setError(error.message || 'Error sending test message');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [baseUrl, authHeaders]);

  // Get instance status
  const getInstanceStatus = useCallback(async (instanceId: string): Promise<'connected' | 'disconnected' | 'error'> => {
    try {
      const response = await fetch(`${baseUrl}/evolution/instances/${instanceId}/status`, {
        headers: authHeaders,
        credentials: 'include',
      });

      if (!response.ok) {
        return 'error';
      }

      const data = await response.json();
      return data.data?.status || 'disconnected';
    } catch (error) {
      console.error('Error getting instance status:', error);
      return 'error';
    }
  }, [baseUrl, authHeaders]);

  // Refresh instances
  const refreshInstances = useCallback(async () => {
    await fetchInstances();
  }, [fetchInstances]);

  // Create notification template
  const createTemplate = useCallback(async (template: Omit<NotificationTemplate, 'id'>) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/notifications/whatsapp/templates`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTemplates(prev => [...prev, data.data]);
    } catch (error: any) {
      setError(error.message || 'Error creating template');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [baseUrl, authHeaders]);

  // Update notification template
  const updateTemplate = useCallback(async (templateId: string, updates: Partial<NotificationTemplate>) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/notifications/whatsapp/templates/${templateId}`, {
        method: 'PATCH',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTemplates(prev => prev.map(t => t.id === templateId ? data.data : t));
    } catch (error: any) {
      setError(error.message || 'Error updating template');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [baseUrl, authHeaders]);

  // Delete notification template
  const deleteTemplate = useCallback(async (templateId: string) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/notifications/whatsapp/templates/${templateId}`, {
        method: 'DELETE',
        headers: authHeaders,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error: any) {
      setError(error.message || 'Error deleting template');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [baseUrl, authHeaders]);

  // Initialize data
  useEffect(() => {
    if (authToken) {
      Promise.all([
        fetchConfig(),
        fetchInstances(),
        fetchTemplates(),
      ]);
    }
  }, [authToken, fetchConfig, fetchInstances, fetchTemplates]);

  return {
    config,
    instances,
    templates,
    isLoading,
    isUpdating,
    error,
    updateConfig,
    sendTestMessage,
    getInstanceStatus,
    refreshInstances,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
