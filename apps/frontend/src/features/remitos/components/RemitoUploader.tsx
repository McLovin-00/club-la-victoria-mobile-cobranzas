import { useState, useCallback, useRef } from 'react';
import { CloudArrowUpIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useUploadRemitoMutation } from '../api/remitosApiSlice';

interface RemitoUploaderProps {
  onSuccess?: (remitoId: number) => void;
  dadorCargaId?: number;
}

export function RemitoUploader({ onSuccess, dadorCargaId }: RemitoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadRemito, { isLoading, isError, error }] = useUploadRemitoMutation();
  
  const handleFile = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      alert('Solo se permiten imágenes (JPG, PNG)');
      return;
    }
    
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);
  
  const handleSubmit = async () => {
    if (!file) return;
    
    try {
      const result = await uploadRemito({ file, dadorCargaId }).unwrap();
      if (result.success) {
        onSuccess?.(result.data.id);
        setFile(null);
        setPreview(null);
      }
    } catch (err) {
      console.error('Error subiendo remito:', err);
    }
  };
  
  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        📤 Cargar Remito
      </h3>
      
      {/* Área de drop */}
      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
            }
          `}
        >
          <CloudArrowUpIcon className="h-12 w-12 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Arrastrá la imagen del remito aquí
          </p>
          <p className="text-slate-400 text-sm mt-1">
            o hacé clic para seleccionar
          </p>
          <p className="text-slate-400 text-xs mt-3">
            Formatos: JPG, PNG • Máximo 15MB
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
            <img 
              src={preview} 
              alt="Vista previa del remito" 
              className="w-full max-h-80 object-contain"
            />
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              <XMarkIcon className="h-5 w-5 text-slate-500 hover:text-red-500" />
            </button>
          </div>
          
          {/* Info del archivo */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <PhotoIcon className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{file?.name}</span>
              <span className="text-slate-400">
                ({(file?.size || 0 / 1024 / 1024).toFixed(1)} MB)
              </span>
            </div>
          </div>
          
          {/* Botón de enviar */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`
              mt-4 w-full py-2.5 px-4 rounded-lg font-medium transition-colors
              ${isLoading 
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Subiendo...
              </span>
            ) : (
              'Enviar para Análisis'
            )}
          </button>
        </div>
      )}
      
      {/* Error */}
      {isError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {(error as any)?.data?.message || 'Error al subir el remito'}
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
      />
    </div>
  );
}

