import { useState, useCallback, useRef } from 'react';

export interface ImageUploadOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface ImageUploadResult {
  file: File;
  preview: string;
  width: number;
  height: number;
  size: number;
}

interface ImageUploadHook {
  isUploading: boolean;
  error: string | null;
  uploadImage: (file: File, options?: ImageUploadOptions) => Promise<ImageUploadResult>;
  captureFromCamera: (options?: ImageUploadOptions) => Promise<ImageUploadResult>;
  selectFromGallery: (options?: ImageUploadOptions) => Promise<ImageUploadResult>;
  compressImage: (file: File, options?: ImageUploadOptions) => Promise<File>;
  createPreview: (file: File) => Promise<string>;
}

const DEFAULT_OPTIONS: Required<ImageUploadOptions> = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
};

export const useImageUpload = (): ImageUploadHook => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateFile = useCallback((file: File, options: Required<ImageUploadOptions>): void => {
    if (!options.allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido. Solo se permiten: ${options.allowedTypes.join(', ')}`);
    }

    if (file.size > options.maxSizeBytes) {
      const maxMB = (options.maxSizeBytes / (1024 * 1024)).toFixed(1);
      throw new Error(`El archivo es demasiado grande. Máximo permitido: ${maxMB}MB`);
    }
  }, []);

  const createPreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Error al crear vista previa'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  }, []);

  const getImageDimensions = useCallback((file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const compressImage = useCallback(async (file: File, options: ImageUploadOptions = {}): Promise<File> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Si ya está dentro del tamaño límite, no comprimir
    if (file.size <= opts.maxSizeBytes) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto de canvas'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspecto
        let { width, height } = img;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen comprimida
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a blob con calidad especificada
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir la imagen'));
              return;
            }

            // Crear nuevo archivo con el blob comprimido
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          file.type,
          opts.quality
        );
      };

      img.onerror = () => reject(new Error('Error al cargar la imagen para compresión'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadImage = useCallback(async (file: File, options: ImageUploadOptions = {}): Promise<ImageUploadResult> => {
    setIsUploading(true);
    setError(null);

    try {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      
      // Validar archivo
      validateFile(file, opts);

      // Comprimir si es necesario
      const compressedFile = await compressImage(file, opts);

      // Obtener dimensiones
      const dimensions = await getImageDimensions(compressedFile);

      // Crear preview
      const preview = await createPreview(compressedFile);

      return {
        file: compressedFile,
        preview,
        width: dimensions.width,
        height: dimensions.height,
        size: compressedFile.size,
      };
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [validateFile, compressImage, getImageDimensions, createPreview]);

  const captureFromCamera = useCallback(async (options: ImageUploadOptions = {}): Promise<ImageUploadResult> => {
    setError(null);

    // Check browser compatibility
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const message = 'Tu navegador no soporta el acceso a la cámara. Por favor actualiza tu navegador o usa uno compatible.';
      setError(message);
      throw new Error(message);
    }

    try {
      // Solicitar acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });

      return new Promise((resolve, reject) => {
        // Crear elementos de video y canvas para captura
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('No se pudo crear el contexto de canvas'));
          return;
        }

        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Capturar frame
          ctx.drawImage(video, 0, 0);

          // Detener stream
          stream.getTracks().forEach(track => track.stop());

          // Convertir a blob
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Error al capturar imagen'));
              return;
            }

            try {
              const file = new File([blob], `camera-${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              const result = await uploadImage(file, options);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }, 'image/jpeg', 0.8);
        };
      });
    } catch (error: any) {
      console.error('Camera access error in useImageUpload:', error);
      let message = 'Error al acceder a la cámara';
      
      if (error.name === 'NotAllowedError') {
        message = 'Permiso de cámara denegado. Por favor habilita el acceso a la cámara.';
      } else if (error.name === 'NotFoundError') {
        message = 'No se encontró ninguna cámara en tu dispositivo.';
      } else if (error.name === 'NotReadableError') {
        message = 'La cámara está siendo usada por otra aplicación.';
      } else if (error.name === 'OverconstrainedError') {
        message = 'La configuración de cámara solicitada no está disponible.';
      } else if (error.name === 'SecurityError') {
        message = 'Acceso a la cámara bloqueado por razones de seguridad. Asegúrate de estar usando HTTPS.';
      }
      
      setError(message);
      throw new Error(message);
    }
  }, [uploadImage]);

  const selectFromGallery = useCallback((options: ImageUploadOptions = {}): Promise<ImageUploadResult> => {
    return new Promise((resolve, reject) => {
      // Crear input file si no existe
      if (!fileInputRef.current) {
        fileInputRef.current = document.createElement('input');
        fileInputRef.current.type = 'file';
        fileInputRef.current.accept = 'image/*';
        fileInputRef.current.style.display = 'none';
        document.body.appendChild(fileInputRef.current);
      }

      const handleFileSelect = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
          reject(new Error('No se seleccionó ningún archivo'));
          return;
        }

        try {
          const result = await uploadImage(file, options);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          // Limpiar input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      fileInputRef.current.onchange = handleFileSelect;
      fileInputRef.current.click();
    });
  }, [uploadImage]);

  return {
    isUploading,
    error,
    uploadImage,
    captureFromCamera,
    selectFromGallery,
    compressImage,
    createPreview,
  };
};
