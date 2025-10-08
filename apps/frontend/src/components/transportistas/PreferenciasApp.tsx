import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useProfile } from '../../hooks/useProfile';
import { showToast } from '../ui/Toast.utils';
import {
  CogIcon,
  MoonIcon,
  SunIcon,
  GlobeAltIcon,
  ServerIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface AppPreferences {
  darkMode: boolean;
  language: string;
  cacheEnabled: boolean;
  compactMode: boolean;
  autoSave: boolean;
  offlineMode: boolean;
}

interface PreferenciasAppProps {
  onSave?: (preferences: AppPreferences) => void;
}

export const PreferenciasApp: React.FC<PreferenciasAppProps> = ({ onSave }) => {
  const { profile, updatePreferences, isUpdating } = useProfile();
  
  const [preferences, setPreferences] = useState<AppPreferences>({
    darkMode: false,
    language: 'es',
    cacheEnabled: true,
    compactMode: false,
    autoSave: true,
    offlineMode: false,
  });

  const [cacheSize, setCacheSize] = useState<string>('0 MB');

  // Initialize preferences from profile
  useEffect(() => {
    if (profile?.preferences) {
      setPreferences(prev => ({
        ...prev,
        ...profile.preferences,
      }));
    }
  }, [profile]);

  // Calculate cache size
  useEffect(() => {
    const calculateCacheSize = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const sizeInMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
          setCacheSize(`${sizeInMB} MB`);
        } catch (error) {
          console.warn('Error calculating cache size:', error);
        }
      }
    };

    calculateCacheSize();
  }, []);

  const handleToggle = (key: keyof AppPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLanguageChange = (language: string) => {
    setPreferences(prev => ({
      ...prev,
      language,
    }));
  };

  const handleSave = async () => {
    try {
      await updatePreferences(preferences as any);
      onSave?.(preferences);
      showToast('Preferencias guardadas correctamente', 'success');
      
      // Apply dark mode immediately
      if (preferences.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error: any) {
      showToast(error.message || 'Error al guardar preferencias', 'error');
    }
  };

  const clearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage (preserving auth data)
      const authData = localStorage.getItem('auth');
      localStorage.clear();
      if (authData) {
        localStorage.setItem('auth', authData);
      }
      
      setCacheSize('0 MB');
      showToast('Caché limpiado correctamente', 'success');
    } catch (error) {
      showToast('Error al limpiar caché', 'error');
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

  const PreferenceOption: React.FC<{
    icon: React.ElementType;
    title: string;
    description: string;
    checked?: boolean;
    onChange?: () => void;
    children?: React.ReactNode;
  }> = ({ icon: Icon, title, description, checked, onChange, children }) => (
    <div className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-xl bg-blue-100">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm">{title}</h4>
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {children}
          {onChange && <ToggleSwitch checked={checked!} onChange={onChange} />}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-xl">
            <CogIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Preferencias de Aplicación</h2>
            <p className="text-purple-100 text-sm">Personaliza tu experiencia de usuario</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Apariencia */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Apariencia</h3>
          
          <PreferenceOption
            icon={preferences.darkMode ? MoonIcon : SunIcon}
            title="Modo Oscuro"
            description="Interfaz oscura para mayor comodidad nocturna"
            checked={preferences.darkMode}
            onChange={() => handleToggle('darkMode')}
          />

          <PreferenceOption
            icon={ComputerDesktopIcon}
            title="Modo Compacto"
            description="Interfaz más densa con menos espaciado"
            checked={preferences.compactMode}
            onChange={() => handleToggle('compactMode')}
          />
        </div>

        {/* Idioma */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Idioma y Región</h3>
          
          <PreferenceOption
            icon={GlobeAltIcon}
            title="Idioma de la Aplicación"
            description="Selecciona tu idioma preferido"
          >
            <select
              value={preferences.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </PreferenceOption>
        </div>

        {/* Rendimiento */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Rendimiento</h3>
          
          <PreferenceOption
            icon={ServerIcon}
            title="Caché de Datos"
            description="Almacenar datos localmente para mayor velocidad"
            checked={preferences.cacheEnabled}
            onChange={() => handleToggle('cacheEnabled')}
          />

          <PreferenceOption
            icon={ArrowPathIcon}
            title="Auto-guardado"
            description="Guardar cambios automáticamente"
            checked={preferences.autoSave}
            onChange={() => handleToggle('autoSave')}
          />
        </div>

        {/* Almacenamiento */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Almacenamiento</h3>
          
          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100">
                  <ServerIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">Uso de Caché</h4>
                  <p className="text-xs text-gray-600">Datos almacenados localmente</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-800">{cacheSize}</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearCache}
                  className="text-xs px-2 py-1 h-7 border border-red-300 text-red-600 hover:bg-red-50 mt-1"
                >
                  Limpiar
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 bg-white rounded-lg p-3">
              <p><strong>Nota:</strong> Limpiar el caché puede hacer que la aplicación sea más lenta temporalmente hasta que se vuelvan a cargar los datos.</p>
            </div>
          </div>
        </div>

        {/* Información del Sistema */}
        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <ComputerDesktopIcon className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-gray-800">Información del Sistema</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Navegador:</span>
                <span className="text-gray-800 font-medium">
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' :
                   navigator.userAgent.includes('Firefox') ? 'Firefox' :
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Otro'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Plataforma:</span>
                <span className="text-gray-800 font-medium">
                  {/Android/i.test(navigator.userAgent) ? 'Android' :
                   /iPhone|iPad/i.test(navigator.userAgent) ? 'iOS' :
                   /Windows/i.test(navigator.userAgent) ? 'Windows' :
                   /Mac/i.test(navigator.userAgent) ? 'macOS' : 'Escritorio'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Conexión:</span>
                <span className="text-green-600 font-semibold">
                  {navigator.onLine ? '✓ Conectado' : '✗ Sin conexión'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">PWA:</span>
                <span className="text-gray-600">
                  {window.matchMedia('(display-mode: standalone)').matches ? 'Sí' : 'No'}
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
            className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isUpdating ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Guardando...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <CheckCircleIcon className="h-6 w-6" />
                <span>Guardar Preferencias</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
