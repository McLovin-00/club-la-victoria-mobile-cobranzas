// Tipos base para servicios
export type ServiceEstado = 'activo' | 'inactivo' | 'mantenimiento';

// Interfaz para un servicio completo
export interface Service {
  id: number;
  nombre: string;
  descripcion?: string | null;
  version?: string | null;
  estado: ServiceEstado;
  createdAt: string;
  updatedAt: string;
  // Información adicional
  _count?: {
    instances: number;
  };
}

// Interfaz para servicio simple (para dropdowns)
export interface ServiceSimple {
  id: number;
  nombre: string;
}

// Payloads para operaciones CRUD
export interface CreateServicePayload {
  nombre: string;
  descripcion?: string;
  version?: string;
  estado?: ServiceEstado;
}

export interface UpdateServicePayload {
  nombre?: string;
  descripcion?: string;
  version?: string;
  estado?: ServiceEstado;
}

// Parámetros de consulta
export interface ServicesQueryParams {
  search?: string;
  estado?: ServiceEstado;
  limit?: number;
  offset?: number;
}

// Respuestas del backend
export interface ServicesResponse {
  success: boolean;
  data: Service[];
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
  timestamp: string;
}

export interface ServiceResponse {
  success: boolean;
  data: Service;
  message?: string;
  timestamp: string;
}

// Estadísticas de servicios
export interface ServiceStats {
  total: number;
  activos: number;
  inactivos: number;
  mantenimiento: number;
  withInstances: number;
  withoutInstances: number;
  averageInstancesPerService: number;
}

// Estados de formulario
export interface ServiceFormState {
  nombre: string;
  descripcion: string;
  version: string;
  estado: ServiceEstado;
}

// Props del formulario de servicio
export interface ServiceFormProps {
  mode: 'create' | 'edit';
  service?: Service | null;
  onSubmit: (data: CreateServicePayload | UpdateServicePayload) => void;
  onClose: () => void;
  isLoading?: boolean;
}

// Props del modal de servicio
export interface ServiceModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  service?: Service | null;
  onClose: () => void;
  onSuccess?: () => void;
}

// Estado de la tabla de servicios
export interface ServiceTableState {
  services: Service[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  search: string;
  estadoFilter: ServiceEstado | '';
}

// Acciones de la tabla de servicios
export type ServiceTableAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SERVICES'; payload: { services: Service[]; total: number } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_ESTADO_FILTER'; payload: ServiceEstado | '' }
  | { type: 'RESET_FILTERS' };

// Hook personalizado para gestión de servicios
export interface UseServicesResult {
  services: Service[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  search: string;
  estadoFilter: ServiceEstado | '';
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setEstadoFilter: (estado: ServiceEstado | '') => void;
  resetFilters: () => void;
  refetch: () => void;
}

// Error de API
export interface ApiError {
  success: false;
  error: string;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  timestamp: string;
} 