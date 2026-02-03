import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useProfile } from '../../hooks/useProfile';
import { showToast } from '../ui/Toast.utils';
import { AvatarUpload } from './AvatarUpload';
import { NotificationSettings } from './NotificationSettings';
import { PreferenciasApp } from './PreferenciasApp';
import { PullToRefresh } from '../mobile/PullToRefresh';
import {
  UserIcon,
  CogIcon,
  BellIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

type ProfileSection = 'personal' | 'notifications' | 'preferences';

export const PerfilMobile: React.FC = () => {
  const { profile, updateProfile, uploadAvatar, isUpdating, refreshProfile } = useProfile();
  const [activeSection, setActiveSection] = useState<ProfileSection | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    phone: profile?.phone ?? '',
    email: profile?.email ?? '',
  });

  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    if (profile) {
      const newFormData = {
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
      };
      setFormData(newFormData);
      
      // Check if there are changes
      const hasFormChanges = 
        newFormData.firstName !== (profile.firstName ?? '') ||
        newFormData.lastName !== (profile.lastName ?? '') ||
        newFormData.phone !== (profile.phone ?? '') ||
        newFormData.email !== (profile.email ?? '');
      setHasChanges(hasFormChanges);
    }
  }, [profile]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSavePersonalInfo = async () => {
    try {
      await updateProfile(formData);
      setHasChanges(false);
      showToast('Información personal actualizada', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al actualizar información', 'error');
    }
  };

  const handleAvatarUpdate = async (file: File) => {
    try {
      await uploadAvatar(file);
      showToast('Avatar actualizado correctamente', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al actualizar avatar', 'error');
    }
  };

  const handleRefresh = async () => {
    await refreshProfile();
    showToast('Perfil actualizado', 'success');
  };

  const SectionHeader: React.FC<{
    icon: React.ElementType;
    title: string;
    description: string;
    section: ProfileSection;
    gradient: string;
  }> = ({ icon: Icon, title, description, section, gradient }) => (
    <div
      onClick={() => setActiveSection(activeSection === section ? null : section)}
      className="cursor-pointer"
    >
      <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className={`${gradient} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-white/80 text-sm">{description}</p>
              </div>
            </div>
            <div className="text-white/80">
              {activeSection === section ? (
                <ChevronDownIcon className="h-6 w-6" />
              ) : (
                <ChevronRightIcon className="h-6 w-6" />
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
          {/* Header with Avatar */}
          <div className="mb-8">
            <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                <div className="relative">
                  <div className="text-center space-y-4">
                    <AvatarUpload
                      currentAvatar={profile.avatar}
                      onAvatarUpdate={handleAvatarUpdate}
                      isUploading={isUpdating}
                    />
                    <div>
                      <h1 className="text-2xl font-bold">
                        {profile.firstName && profile.lastName 
                          ? `${profile.firstName} ${profile.lastName}`
                          : profile.username
                        }
                      </h1>
                      <p className="text-blue-100">@{profile.username}</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                          {profile.role === 'CLIENTE_TRANSPORTE' ? 'Transportista' : profile.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Navigation Sections */}
          <div className="space-y-4">
            <SectionHeader
              icon={UserIcon}
              title="Información Personal"
              description="Datos básicos y de contacto"
              section="personal"
              gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
            />

            <SectionHeader
              icon={BellIcon}
              title="Notificaciones"
              description="Configurar alertas y mensajes"
              section="notifications"
              gradient="bg-gradient-to-r from-purple-500 to-pink-500"
            />

            <SectionHeader
              icon={CogIcon}
              title="Preferencias"
              description="Personalizar la aplicación"
              section="preferences"
              gradient="bg-gradient-to-r from-green-500 to-teal-500"
            />
          </div>

          {/* Section Content */}
          {activeSection === 'personal' && (
            <div className="mt-6 space-y-6">
              <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 text-white">
                  <h3 className="text-lg font-bold">Información Personal</h3>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <UserIcon className="h-4 w-4" />
                        Nombre
                      </label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Tu nombre"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <UserIcon className="h-4 w-4" />
                        Apellido
                      </label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Tu apellido"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <PhoneIcon className="h-4 w-4" />
                        Teléfono
                      </label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+54 9 11 1234 5678"
                        type="tel"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <EnvelopeIcon className="h-4 w-4" />
                        Email
                      </label>
                      <Input
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="tu@email.com"
                        type="email"
                        className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* System Info (Read-only) */}
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <IdentificationIcon className="h-5 w-5" />
                      Información del Sistema
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Usuario:</span>
                        <span className="ml-2 font-semibold text-gray-800">{profile.username}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Rol:</span>
                        <span className="ml-2 font-semibold text-gray-800">
                          {profile.role === 'CLIENTE_TRANSPORTE' ? 'Transportista' : profile.role}
                        </span>
                      </div>
                      {profile.empresaId && (
                        <div className="sm:col-span-2">
                          <span className="text-gray-600 flex items-center gap-1">
                            <BuildingOfficeIcon className="h-4 w-4" />
                            Empresa ID:
                          </span>
                          <span className="ml-2 font-semibold text-gray-800">{profile.empresaId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  {hasChanges && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        onClick={handleSavePersonalInfo}
                        disabled={isUpdating}
                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {isUpdating ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Guardando...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircleIcon className="h-5 w-5" />
                            <span>Guardar Cambios</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="mt-6">
              <NotificationSettings />
            </div>
          )}

          {activeSection === 'preferences' && (
            <div className="mt-6">
              <PreferenciasApp />
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
};
