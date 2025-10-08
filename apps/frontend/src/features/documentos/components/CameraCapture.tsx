import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';
import { useCameraPermissions } from '../../../hooks/useCameraPermissions';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (files: File[]) => void;
  title?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ isOpen, onClose, onCapture, title }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { permissionStatus, requestPermission } = useCameraPermissions();

  useEffect(() => {
    const start = async () => {
      if (!isOpen) return;
      setError(null);
      
      // Check browser compatibility
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Tu navegador no soporta el acceso a la cámara. Por favor actualiza tu navegador o usa uno compatible.');
        return;
      }

      // Check permissions first
      if (permissionStatus === 'not-supported') {
        setError('Tu dispositivo no soporta el acceso a la cámara.');
        return;
      }

      if (permissionStatus === 'denied') {
        setError('Permisos de cámara denegados. Por favor habilita el acceso a la cámara en la configuración de tu navegador.');
        return;
      }

      try {
        // Request permission if needed
        if (permissionStatus === 'prompt') {
          const newStatus = await requestPermission();
          if (newStatus !== 'granted') {
            setError('Se requieren permisos de cámara para usar esta función.');
            return;
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        console.error('Camera access error:', e);
        let errorMessage = 'No se pudo acceder a la cámara';
        
        if (e.name === 'NotAllowedError') {
          errorMessage = 'Permisos de cámara denegados. Por favor habilita el acceso a la cámara.';
        } else if (e.name === 'NotFoundError') {
          errorMessage = 'No se encontró ninguna cámara en tu dispositivo.';
        } else if (e.name === 'NotReadableError') {
          errorMessage = 'La cámara está siendo usada por otra aplicación.';
        } else if (e.name === 'OverconstrainedError') {
          errorMessage = 'La configuración de cámara solicitada no está disponible.';
        } else if (e.name === 'SecurityError') {
          errorMessage = 'Acceso a la cámara bloqueado por razones de seguridad. Asegúrate de estar usando HTTPS.';
        }
        
        setError(errorMessage);
      }
    };
    start();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        try { videoRef.current.pause(); } catch {}
      }
      setCaptured([]);
    };
  }, [isOpen, permissionStatus, requestPermission]);

  if (!isOpen) return null;

  const takePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
    if (!blob) return;
    const file = new File([blob], `photo_${Date.now()}_${captured.length + 1}.jpg`, { type: 'image/jpeg' });
    setCaptured((arr) => [...arr, file]);
  };

  const removeAt = (idx: number) => {
    setCaptured((arr) => arr.filter((_, i) => i !== idx));
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50'>
      <div className='bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden'>
        <div className='flex items-center justify-between px-4 py-3 border-b'>
          <div className='font-semibold'>{title || 'Capturar fotos'}</div>
          <Button variant='ghost' size='sm' onClick={onClose}><XMarkIcon className='h-5 w-5' /></Button>
        </div>
        <div className='p-4 grid gap-4'>
          {error && <div className='text-red-600 text-sm'>{error}</div>}
          <div className='relative rounded-lg overflow-hidden bg-black'>
            <video ref={videoRef} playsInline muted className='w-full h-auto' />
            <div className='absolute bottom-3 left-0 right-0 flex items-center justify-center'>
              <Button type='button' className='bg-blue-600 hover:bg-blue-700' onClick={takePhoto}>
                <CameraIcon className='h-5 w-5 mr-2' /> Tomar foto
              </Button>
            </div>
          </div>
          {captured.length > 0 && (
            <div>
              <div className='text-sm mb-2'>Fotos capturadas: {captured.length}</div>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                {captured.map((f, idx) => (
                  <div key={idx} className='relative border rounded-md p-1'>
                    <img src={URL.createObjectURL(f)} alt={`captura-${idx}`} className='w-full h-24 object-cover rounded' />
                    <button type='button' className='absolute top-1 right-1 text-xs bg-white/80 rounded px-1' onClick={() => removeAt(idx)}>Quitar</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className='flex justify-end gap-2 border-t pt-3'>
            <Button variant='outline' onClick={onClose}>Cancelar</Button>
            <Button disabled={captured.length === 0} onClick={() => { onCapture(captured); onClose(); }}>Usar fotos</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;


