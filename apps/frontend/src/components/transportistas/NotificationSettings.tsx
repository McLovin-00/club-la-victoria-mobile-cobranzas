import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useProfile } from '../../hooks/useProfile';
import { showToast } from '../ui/Toast.utils';
import { WhatsAppNotificationManager } from './WhatsAppNotificationManager';
import {
  BellIcon,
  DevicePhoneMobileIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

interface NotificationPreferences {
  general: boolean;
  documentExpiry: boolean;
  urgentAlerts: boolean;
  equipment: boolean;
  whatsapp: boolean;
  email: boolean;
  push: boolean;
}

interface NotificationSettingsProps {
  onSave?: (preferences: NotificationPreferences) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onSave }) => {
  const { profile, updatePreferences, isUpdating } = useProfile();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    general: true,
    documentExpiry: true,
    urgentAlerts: true,
    equipment: true,
    whatsapp: true,
    email: false,
    push: false,
  });

  const [pushSupported, setPushSupported] = useState(false);

  // Initialize preferences from profile
  useEffect(() => {
    if (profile?.preferences) {
      setPreferences(prev => ({
        ...prev,
        ...profile.preferences,
      }));
    }
  }, [profile]);

  // Check push notification support
  useEffect(() => {
    setPushSupported('Notification' in window && 'serviceWorker' in navigator);
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      await updatePreferences({ notifications: preferences as any });
      onSave?.(preferences);
      showToast('Configuración de notificaciones guardada', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al guardar configuración', 'error');
    }
  };

  const requestPushPermission = async () => {
    if (!pushSupported) {
      showToast('Las notificaciones push no están disponibles en este dispositivo', 'error');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPreferences(prev => ({ ...prev, push: true }));
        showToast('Notificaciones push habilitadas', 'success');
      } else {
        showToast('Permiso de notificaciones denegado', 'error');
      }
    } catch (error) {
      showToast('Error al solicitar permisos de notificación', 'error');
    }
  };

  const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
  }> = ({ checked, onChange, disabled }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out
        ${checked ? 'bg-blue-500' : 'bg-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );

  const NotificationOption: React.FC<{
    icon: React.ElementType;
    title: string;
    description: string;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    special?: 'warning' | 'success' | 'primary';
  }> = ({ icon: Icon, title, description, checked, onChange, disabled, special }) => (
    <div className={`
      p-4 rounded-xl border-2 transition-all duration-200
      ${checked 
        ? special === 'warning' 
          ? 'border-orange-200 bg-orange-50' 
          : special === 'success'
          ? 'border-green-200 bg-green-50'
          : 'border-blue-200 bg-blue-50'
        : 'border-gray-200 bg-gray-50'
      }
      ${disabled ? 'opacity-60' : ''}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className={`
            p-2 rounded-xl
            ${checked 
              ? special === 'warning' 
                ? 'bg-orange-100' 
                : special === 'success'
                ? 'bg-green-100'
                : 'bg-blue-100'
              : 'bg-gray-100'
            }
          `}>
            <Icon className={`
              w-5 h-5
              ${checked 
                ? special === 'warning' 
                  ? 'text-orange-600' 
                  : special === 'success'
                  ? 'text-green-600'
                  : 'text-blue-600'
                : 'text-gray-500'
              }
            `} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm">{title}</h4>
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          </div>
        </div>
        <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );

  return (
    <div>
      <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <BellIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Configuración de Notificaciones</h2>
              <p className="text-blue-100 text-sm">Personaliza cómo quieres recibir las alertas</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Tipos de Notificaciones */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tipos de Notificaciones</h3>
            
            <NotificationOption
              icon={BellIcon}
              title="Notificaciones Generales"
              description="Mensajes del sistema y actualizaciones importantes"
              checked={preferences.general}
              onChange={() => handleToggle('general')}
            />

            <NotificationOption
              icon={DocumentIcon}
              title="Vencimiento de Documentos"
              description="Alertas cuando tus documentos están por vencer"
              checked={preferences.documentExpiry}
              onChange={() => handleToggle('documentExpiry')}
              special="warning"
            />

            <NotificationOption
              icon={ExclamationTriangleIcon}
              title="Alertas Urgentes"
              description="Notificaciones críticas que requieren acción inmediata"
              checked={preferences.urgentAlerts}
              onChange={() => handleToggle('urgentAlerts')}
              special="warning"
            />

            <NotificationOption
              icon={TruckIcon}
              title="Estado de Equipos"
              description="Cambios en el estado de tus vehículos registrados"
              checked={preferences.equipment}
              onChange={() => handleToggle('equipment')}
            />
          </div>

          {/* Canales de Entrega */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Canales de Entrega</h3>
            
            <NotificationOption
              icon={DevicePhoneMobileIcon}
              title="WhatsApp"
              description="Recibir notificaciones por WhatsApp (recomendado)"
              checked={preferences.whatsapp}
              onChange={() => handleToggle('whatsapp')}
              special="success"
            />

            <div className="relative">
              <NotificationOption
                icon={BellIcon}
                title="Notificaciones Push"
                description={
                  pushSupported 
                    ? "Notificaciones directas en tu dispositivo"
                    : "No disponible en este dispositivo"
                }
                checked={preferences.push}
                onChange={pushSupported ? requestPushPermission : () => {}}
                disabled={!pushSupported}
              />
              
              {!preferences.push && pushSupported && (
                <div className="absolute top-2 right-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={requestPushPermission}
                    className="text-xs px-2 py-1 h-7 border border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    Activar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Status Summary */}
          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <h4 className="font-semibold text-gray-800">Estado Actual</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">WhatsApp:</span>
                  <span className={preferences.whatsapp ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                    {preferences.whatsapp ? '✓ Activo' : '✗ Inactivo'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Push:</span>
                  <span className={preferences.push ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                    {preferences.push ? '✓ Activo' : '✗ Inactivo'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Urgentes:</span>
                  <span className={preferences.urgentAlerts ? 'text-orange-600 font-semibold' : 'text-gray-500'}>
                    {preferences.urgentAlerts ? '✓ Activo' : '✗ Inactivo'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Documentos:</span>
                  <span className={preferences.documentExpiry ? 'text-blue-600 font-semibold' : 'text-gray-500'}>
                    {preferences.documentExpiry ? '✓ Activo' : '✗ Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-gray-200">
            <Button
              onClick={handleSave}
              disabled={isUpdating}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isUpdating ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Guardando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircleIcon className="h-6 w-6" />
                  <span>Guardar Configuración</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* WhatsApp Configuration */}
      <div className="mt-8">
        <WhatsAppNotificationManager />
      </div>
    </div>
  );
};
