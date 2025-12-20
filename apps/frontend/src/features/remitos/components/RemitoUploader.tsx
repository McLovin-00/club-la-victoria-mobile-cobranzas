import { useState, useCallback, useRef, useMemo } from 'react';
import { 
  CloudArrowUpIcon, 
  XMarkIcon, 
  PhotoIcon,
  DocumentIcon,
  PlusIcon,
  CameraIcon,
  UserIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useUploadRemitoMutation } from '../api/remitosApiSlice';
import { useGetChoferesQuery } from '../../documentos/api/documentosApiSlice';
import { useAppSelector } from '../../../store/hooks';

interface RemitoUploaderProps {
  onSuccess?: (remitoId: number) => void;
  dadorCargaId?: number;
}

interface ChoferOption {
  id: number;
  dni: string;
  nombre?: string;
  apellido?: string;
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
  const [choferSearch, setChoferSearch] = useState('');
  const [selectedChofer, setSelectedChofer] = useState<ChoferOption | null>(null);
  const [showChoferDropdown, setShowChoferDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const choferSearchRef = useRef<HTMLInputElement>(null);
  
  const [uploadRemito, { isLoading, isError, error }] = useUploadRemitoMutation();
  
  // Obtener usuario actual
  const user = useAppSelector((state) => state.auth?.user);
  const userRole = user?.role || '';
  const userChoferId = user?.choferId;
  
  // Si el usuario es CHOFER, no necesita selector
  const isChofer = userRole === 'CHOFER';
  
  // Roles que necesitan seleccionar chofer manualmente
  const needsChoferSelector = ['SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'].includes(userRole);
  
  // Buscar choferes - cargar siempre si necesita selector
  const empresaId = user?.empresaId || 1;
  const { data: choferesData } = useGetChoferesQuery(
    { empresaId, q: choferSearch || '', activo: true, limit: 20 },
    { skip: !needsChoferSelector }
  );
  
  const choferes = useMemo(() => choferesData?.data || [], [choferesData]);
  
  const handleSelectChofer = (chofer: ChoferOption) => {
    setSelectedChofer(chofer);
    setChoferSearch(`${chofer.nombre || ''} ${chofer.apellido || ''} - ${chofer.dni}`.trim());
    setShowChoferDropdown(false);
  };
  
  const clearChofer = () => {
    setSelectedChofer(null);
    setChoferSearch('');
  };
  
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
    
    // Si necesita selector de chofer y no seleccionó uno, advertir
    if (needsChoferSelector && !selectedChofer) {
      alert('Debe seleccionar un chofer');
      return;
    }
    
    try {
      // Determinar choferId
      const choferId = isChofer 
        ? userChoferId  // Usuario chofer: usar su propio ID
        : selectedChofer?.id;  // Otros roles: usar el seleccionado
      
      // Usar el mutation (que internamente usa fetch con FormData)
      const result = await uploadRemito({ 
        files: files.map(f => f.file), 
        dadorCargaId,
        choferId,
      }).unwrap();
      
      if (result.success) {
        onSuccess?.(result.data.id);
        setFiles([]);
        clearChofer();
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
      
      {/* Selector de Chofer (solo para roles que no son chofer) */}
      {needsChoferSelector && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <UserIcon className="inline h-4 w-4 mr-1" />
            Chofer
          </label>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  ref={choferSearchRef}
                  type="text"
                  value={choferSearch}
                  onChange={(e) => {
                    setChoferSearch(e.target.value);
                    setShowChoferDropdown(true);
                    if (selectedChofer) setSelectedChofer(null);
                  }}
                  onFocus={() => setShowChoferDropdown(true)}
                  onBlur={() => setTimeout(() => setShowChoferDropdown(false), 250)}
                  placeholder="Buscar por nombre o DNI..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  readOnly={!!selectedChofer}
                />
                
                {/* Dropdown de resultados */}
                {showChoferDropdown && !selectedChofer && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {choferes.length > 0 ? (
                      choferes.map((chofer) => (
                        <button
                          key={chofer.id}
                          type="button"
                          onClick={() => handleSelectChofer(chofer)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <UserIcon className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {chofer.nombre || ''} {chofer.apellido || ''}
                          </span>
                          <span className="text-slate-500 text-sm">
                            DNI: {chofer.dni}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                        No se encontraron choferes
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {selectedChofer && (
                <button
                  type="button"
                  onClick={clearChofer}
                  className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Limpiar selección"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            
            {/* Indicador de chofer seleccionado */}
            {selectedChofer && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  <strong>{selectedChofer.nombre} {selectedChofer.apellido}</strong> - DNI: {selectedChofer.dni}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Info para usuario chofer */}
      {isChofer && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <UserIcon className="h-4 w-4" />
            <span className="text-sm">Los remitos se asociarán automáticamente a tu perfil de chofer</span>
          </div>
        </div>
      )}

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
