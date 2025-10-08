import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useCameraPermissions } from '../../hooks/useCameraPermissions';
import { useImageUpload } from '../../hooks/useImageUpload';
import { showToast } from '../ui/Toast.utils';
import {
  CameraIcon,
  PhotoIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { TouchFeedback } from '../mobile/TouchFeedback';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarUpdate: (file: File) => Promise<void>;
  isUploading?: boolean;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarUpdate,
  isUploading = false,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const { permissionStatus, requestPermission, openCameraSettings } = useCameraPermissions();
  const { captureFromCamera, selectFromGallery, error: uploadError } = useImageUpload();

  const handleCameraCapture = async () => {
    try {
      if (permissionStatus === 'denied') {
        showToast('Permiso de cámara denegado. Revisa la configuración de tu navegador.', 'error');
        return;
      }

      if (permissionStatus === 'prompt') {
        const status = await requestPermission();
        if (status !== 'granted') {
          showToast('Se requiere permiso de cámara para tomar fotos', 'error');
          return;
        }
      }

      const result = await captureFromCamera({
        maxSizeBytes: 2 * 1024 * 1024, // 2MB
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.9,
      });

      await onAvatarUpdate(result.file);
      setShowOptions(false);
      showToast('Avatar actualizado correctamente', 'success');
    } catch (error: any) {
      console.error('Error capturing from camera:', error);
      showToast(error.message || 'Error al capturar foto', 'error');
    }
  };

  const handleGallerySelect = async () => {
    try {
      const result = await selectFromGallery({
        maxSizeBytes: 2 * 1024 * 1024, // 2MB
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.9,
      });

      await onAvatarUpdate(result.file);
      setShowOptions(false);
      showToast('Avatar actualizado correctamente', 'success');
    } catch (error: any) {
      console.error('Error selecting from gallery:', error);
      showToast(error.message || 'Error al seleccionar imagen', 'error');
    }
  };

  const getPermissionMessage = () => {
    switch (permissionStatus) {
      case 'denied':
        return 'Permisos de cámara denegados';
      case 'not-supported':
        return 'Cámara no disponible';
      case 'prompt':
        return 'Permitir acceso a cámara';
      default:
        return 'Tomar foto';
    }
  };

  return (
    <div className="space-y-4">
      {/* Avatar display */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Avatar"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
              <UserCircleIcon className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
            </div>
          )}
          
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Upload button */}
        <TouchFeedback
          onClick={() => setShowOptions(true)}
          disabled={isUploading}
          className="px-6 py-3"
        >
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200">
            <span className="flex items-center gap-2">
              <CameraIcon className="w-5 h-5" />
              Cambiar foto
            </span>
          </div>
        </TouchFeedback>
      </div>

      {/* Options modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center p-4">
          <Card className="w-full max-w-sm bg-white rounded-t-2xl animate-slide-up">
            <div className="p-6 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Cambiar Avatar</h3>
                <p className="text-sm text-gray-600">Elige cómo quieres actualizar tu foto</p>
              </div>

              <div className="space-y-3">
                {/* Camera option */}
                <TouchFeedback
                  onClick={handleCameraCapture}
                  disabled={isUploading || permissionStatus === 'not-supported'}
                  className="w-full"
                >
                  <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <CameraIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-gray-800">{getPermissionMessage()}</h4>
                      <p className="text-sm text-gray-600">Usar la cámara del dispositivo</p>
                    </div>
                    {permissionStatus === 'denied' && (
                      <TouchFeedback onClick={openCameraSettings}>
                        <CogIcon className="w-5 h-5 text-orange-500" />
                      </TouchFeedback>
                    )}
                  </div>
                </TouchFeedback>

                {/* Gallery option */}
                <TouchFeedback
                  onClick={handleGallerySelect}
                  disabled={isUploading}
                  className="w-full"
                >
                  <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="bg-green-100 p-3 rounded-xl">
                      <PhotoIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-gray-800">Seleccionar de galería</h4>
                      <p className="text-sm text-gray-600">Elegir desde tus fotos</p>
                    </div>
                  </div>
                </TouchFeedback>
              </div>

              {/* Error display */}
              {uploadError && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{uploadError}</p>
                </div>
              )}

              {/* Cancel button */}
              <Button
                variant="outline"
                onClick={() => setShowOptions(false)}
                className="w-full h-12 border-2 border-gray-300 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold"
                disabled={isUploading}
              >
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
