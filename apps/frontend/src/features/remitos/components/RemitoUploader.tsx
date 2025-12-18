import { useState, useCallback, useRef } from 'react';
import { 
  CloudArrowUpIcon, 
  XMarkIcon, 
  PhotoIcon,
  DocumentIcon,
  PlusIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import { useUploadRemitoMutation } from '../api/remitosApiSlice';

interface RemitoUploaderProps {
  onSuccess?: (remitoId: number) => void;
  dadorCargaId?: number;
}

interface FilePreview {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'pdf';
}

export function RemitoUploader({ onSuccess, dadorCargaId }: RemitoUploaderProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadRemito, { isLoading, isError, error }] = useUploadRemitoMutation();
  
  const handleFiles = useCallback((selectedFiles: FileList | File[]) => {
    const newFiles: FilePreview[] = [];
    
    for (const file of Array.from(selectedFiles)) {
      // Validar tipo
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (!isImage && !isPdf) {
        alert('Solo se permiten imágenes (JPG, PNG) o PDF');
        continue;
      }
      
      // Si hay un PDF, solo puede haber uno
      if (isPdf && (files.some(f => f.type === 'pdf') || newFiles.some(f => f.type === 'pdf'))) {
        alert('Solo se permite un PDF por remito');
        continue;
      }
      
      // No mezclar PDF con imágenes
      if (isPdf && (files.length > 0 || newFiles.length > 0)) {
        const hasImages = files.some(f => f.type === 'image') || newFiles.some(f => f.type === 'image');
        if (hasImages) {
          alert('No se puede mezclar PDF con imágenes');
          continue;
        }
      }
      if (isImage && files.some(f => f.type === 'pdf')) {
        alert('No se puede mezclar imágenes con PDF');
        continue;
      }
      
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles(prev => [...prev, {
            id,
            file,
            preview: e.target?.result as string,
            type: 'image',
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        newFiles.push({
          id,
          file,
          preview: '', // PDF no tiene preview
          type: 'pdf',
        });
      }
    }
    
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, [files]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);
  
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };
  
  const handleSubmit = async () => {
    if (files.length === 0) return;
    
    try {
      // Crear FormData con todos los archivos
      const formData = new FormData();
      for (const f of files) {
        formData.append('imagenes', f.file);
      }
      if (dadorCargaId) {
        formData.append('dadorCargaId', String(dadorCargaId));
      }
      
      // Usar el mutation (que internamente usa fetch con FormData)
      const result = await uploadRemito({ 
        files: files.map(f => f.file), 
        dadorCargaId 
      }).unwrap();
      
      if (result.success) {
        onSuccess?.(result.data.id);
        setFiles([]);
      }
    } catch (err) {
      console.error('Error subiendo remito:', err);
    }
  };
  
  const clearAll = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const hasPdf = files.some(f => f.type === 'pdf');
  const hasImages = files.some(f => f.type === 'image');
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          📤 Cargar Remito
        </h3>
        {files.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-slate-500 hover:text-red-500"
          >
            Limpiar todo
          </button>
        )}
      </div>
      
      {/* Área de drop / selección */}
      {files.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center
            transition-colors
            ${isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
            }
          `}
        >
          <CloudArrowUpIcon className="h-12 w-12 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">
            Arrastrá las imágenes del remito aquí
          </p>
          <p className="text-slate-400 text-sm mb-4">
            Podés subir varias fotos (se combinarán en una) o un PDF
          </p>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PhotoIcon className="h-5 w-5" />
              Seleccionar archivos
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <CameraIcon className="h-5 w-5" />
              Tomar foto
            </button>
          </div>
          
          <p className="text-slate-400 text-xs mt-4">
            Formatos: JPG, PNG, PDF • Máximo 20MB por archivo
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grid de previews */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((f, idx) => (
              <div key={f.id} className="relative group">
                {f.type === 'image' ? (
                  <img 
                    src={f.preview} 
                    alt={`Imagen ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg bg-slate-100 dark:bg-slate-700"
                  />
                ) : (
                  <div className="w-full h-32 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <DocumentIcon className="h-10 w-10 text-red-500" />
                    <span className="text-xs text-slate-500 mt-1 truncate max-w-full px-2">
                      {f.file.name}
                    </span>
                  </div>
                )}
                
                {/* Badge de orden */}
                <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {idx + 1}
                </span>
                
                {/* Botón eliminar */}
                <button
                  onClick={() => removeFile(f.id)}
                  className="absolute top-1 right-1 p-1 bg-white dark:bg-slate-800 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                  <XMarkIcon className="h-4 w-4 text-slate-500 hover:text-red-500" />
                </button>
              </div>
            ))}
            
            {/* Botón agregar más (solo si son imágenes) */}
            {hasImages && files.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <PlusIcon className="h-8 w-8 text-slate-400" />
                <span className="text-xs text-slate-500 mt-1">Agregar más</span>
              </button>
            )}
          </div>
          
          {/* Info y acciones */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {files.length} {files.length === 1 ? 'archivo' : 'archivos'} seleccionado{files.length !== 1 && 's'}
              {hasImages && files.length > 1 && (
                <span className="text-slate-400 ml-2">(se combinarán en PDF)</span>
              )}
            </div>
          </div>
          
          {/* Botón de enviar */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || files.length === 0}
            className={`
              w-full py-3 px-4 rounded-lg font-medium transition-colors
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
                Subiendo y procesando...
              </span>
            ) : (
              `Enviar ${files.length > 1 ? `${files.length} imágenes` : 'remito'} para Análisis`
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
      
      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
      
      {/* Input cámara oculto */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
