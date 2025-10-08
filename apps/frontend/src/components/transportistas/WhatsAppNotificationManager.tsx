import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useWhatsAppNotifications } from '../../hooks/useWhatsAppNotifications';
import { showToast } from '../ui/Toast.utils';
import {
  DevicePhoneMobileIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface WhatsAppNotificationManagerProps {
  className?: string;
}

export const WhatsAppNotificationManager: React.FC<WhatsAppNotificationManagerProps> = ({ className }) => {
  const {
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
  } = useWhatsAppNotifications();

  const [testPhone, setTestPhone] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [instanceStatuses, setInstanceStatuses] = useState<Record<string, string>>({});
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  
  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    message: '',
    type: 'general' as 'document_expiry' | 'urgent_alert' | 'equipment_update' | 'general',
  });

  // Check instance statuses periodically
  useEffect(() => {
    const checkStatuses = async () => {
      if (instances.length === 0) return;
      
      const statuses: Record<string, string> = {};
      for (const instance of instances) {
        try {
          const status = await getInstanceStatus(instance.id);
          statuses[instance.id] = status;
        } catch (error) {
          statuses[instance.id] = 'error';
        }
      }
      setInstanceStatuses(statuses);
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [instances, getInstanceStatus]);

  const handleToggleEnabled = async () => {
    if (!config) return;
    
    try {
      await updateConfig({ enabled: !config.enabled });
      showToast(
        config.enabled 
          ? 'Notificaciones WhatsApp deshabilitadas' 
          : 'Notificaciones WhatsApp habilitadas', 
        'success'
      );
    } catch (error: any) {
      showToast(error.message || 'Error al actualizar configuración', 'error');
    }
  };

  const handleInstanceChange = async (instanceId: string) => {
    try {
      await updateConfig({ instanceId });
      showToast('Instancia de Evolution API actualizada', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al actualizar instancia', 'error');
    }
  };

  const handlePhoneNumberChange = async (phoneNumber: string) => {
    try {
      await updateConfig({ phoneNumber });
      showToast('Número de teléfono actualizado', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al actualizar número', 'error');
    }
  };

  const handleSendTest = async () => {
    if (!testPhone || !selectedTemplate) {
      showToast('Selecciona un teléfono y un template', 'error');
      return;
    }

    try {
      await sendTestMessage(testPhone, selectedTemplate, {
        nombre: 'Usuario Test',
        fecha: new Date().toLocaleDateString(),
        equipo: '123',
      });
      showToast('Mensaje de prueba enviado correctamente', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al enviar mensaje de prueba', 'error');
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.message) {
      showToast('Completa todos los campos', 'error');
      return;
    }

    try {
      // Extract variables from message (format: {{variable}})
      const variables = [...newTemplate.message.matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1]);
      
      await createTemplate({
        name: newTemplate.name,
        message: newTemplate.message,
        type: newTemplate.type,
        variables,
      });
      
      setNewTemplate({ name: '', message: '', type: 'general' });
      setShowTemplateForm(false);
      showToast('Template creado correctamente', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al crear template', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-700 border-green-200';
      case 'disconnected': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon className="h-4 w-4" />;
      case 'disconnected': return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'error': return <XCircleIcon className="h-4 w-4" />;
      default: return <CogIcon className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={`p-6 text-center ${className || ''}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando configuración de WhatsApp...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 text-center border-red-200 bg-red-50 ${className || ''}`}>
        <XCircleIcon className="h-8 w-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-700">{error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          className="mt-4"
          variant="outline"
        >
          Reintentar
        </Button>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Main Configuration */}
      <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <DevicePhoneMobileIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Notificaciones WhatsApp</h2>
                <p className="text-green-100 text-sm">Configuración via Evolution API</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                className={`px-3 py-1 ${config?.enabled ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}
              >
                {config?.enabled ? '✓ Activo' : '✗ Inactivo'}
              </Badge>
              <Button
                onClick={handleToggleEnabled}
                variant="outline"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                disabled={isUpdating}
              >
                {config?.enabled ? 'Deshabilitar' : 'Habilitar'}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Instance Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Instancia Evolution API</h3>
              <Button
                onClick={refreshInstances}
                variant="outline"
                size="sm"
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Actualizar
              </Button>
            </div>
            
            {instances.length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
                <h4 className="font-semibold text-yellow-800 mb-2">No hay instancias disponibles</h4>
                <p className="text-yellow-700 text-sm mb-4">
                  Configura al menos una instancia de Evolution API para enviar notificaciones
                </p>
                <Button 
                  onClick={() => window.open('/configuracion/evolution', '_blank')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Configurar Evolution API
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    className={`
                      p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${config?.instanceId === instance.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }
                    `}
                    onClick={() => handleInstanceChange(instance.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">{instance.name}</h4>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(instanceStatuses[instance.id] || 'unknown')}
                        <Badge className={getStatusColor(instanceStatuses[instance.id] || 'unknown')}>
                          {instanceStatuses[instance.id] || 'Verificando...'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{instance.serverUrl}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phone Configuration */}
          {config?.enabled && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Configuración de Teléfono</h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Número de teléfono para notificaciones
                </label>
                <Input
                  value={config.phoneNumber}
                  onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  placeholder="+54 9 11 1234 5678"
                  className="h-12 rounded-xl border-2 border-gray-200 focus:border-green-500"
                />
                <p className="text-xs text-gray-500">
                  Formato internacional requerido (ej: +5491123456789)
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Test Section */}
      {config?.enabled && config.instanceId && (
        <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <PaperAirplaneIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Mensaje de Prueba</h3>
                <p className="text-blue-100 text-sm">Envía un mensaje para verificar la configuración</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Teléfono de prueba</label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+54 9 11 1234 5678"
                  className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full h-12 text-base rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors"
                >
                  <option value="">Seleccionar template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <Button
              onClick={handleSendTest}
              disabled={!testPhone || !selectedTemplate || isUpdating}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl"
            >
              {isUpdating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Enviando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <PaperAirplaneIcon className="h-5 w-5" />
                  <span>Enviar Mensaje de Prueba</span>
                </div>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Templates Management */}
      <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Templates de Mensajes</h3>
                <p className="text-purple-100 text-sm">Gestiona las plantillas de notificaciones</p>
              </div>
            </div>
            <Button
              onClick={() => setShowTemplateForm(!showTemplateForm)}
              variant="outline"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo Template
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* New Template Form */}
          {showTemplateForm && (
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 space-y-4">
              <h4 className="font-semibold text-gray-800">Crear Nuevo Template</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre del template"
                    className="h-10 rounded-xl border-2 border-gray-200 focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select
                    value={newTemplate.type}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full h-10 text-sm rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors"
                  >
                    <option value="general">General</option>
                    <option value="document_expiry">Vencimiento de Documento</option>
                    <option value="urgent_alert">Alerta Urgente</option>
                    <option value="equipment_update">Actualización de Equipo</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Mensaje</label>
                <textarea
                  value={newTemplate.message}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Hola {{nombre}}, tu documento vence el {{fecha}}..."
                  rows={3}
                  className="w-full p-3 text-sm rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors resize-none"
                />
                <p className="text-xs text-gray-500">
                  Usa {`{{variable}}`} para campos dinámicos (ej: {`{{nombre}}, {{fecha}}, {{equipo}}`})
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateTemplate}
                  disabled={isUpdating}
                  className="bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-2"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Crear Template
                </Button>
                <Button
                  onClick={() => setShowTemplateForm(false)}
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Templates List */}
          {templates.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 border-2 border-gray-200 rounded-xl">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-600 mb-2">No hay templates configurados</h4>
              <p className="text-gray-500 text-sm">Crea templates para personalizar tus notificaciones</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                        {template.type.replace('_', ' ')}
                      </Badge>
                      <h4 className="font-semibold text-gray-800">{template.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTemplate(template.id)}
                        className="text-gray-600 hover:text-blue-600 border-gray-300 hover:border-blue-300"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id)}
                        className="text-gray-600 hover:text-red-600 border-gray-300 hover:border-red-300"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{template.message}</p>
                  {template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.variables.map((variable, index) => (
                        <Badge key={index} className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
