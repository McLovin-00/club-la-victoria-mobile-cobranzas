// Tipos base para usuarios
export type UserRole = 'admin' | 'user' | 'superadmin';

// Interfaz para un usuario completo
export interface User {
  id: number;
  email: string;
  role: UserRole;
  empresa_id?: number | null;
  empresaId?: number | null; // Mantener compatibilidad
  createdAt?: string;
  updatedAt?: string;
  // Información de la empresa relacionada
  empresa?: {
    id: number;
    nombre: string;
    descripcion?: string;
  } | null;
}

// Payload para crear un nuevo usuario
export interface CreateUserPayload {
  email: string;
  password: string;
  role: 'user' | 'admin';
  empresaId?: number | null;
}

// Payload para actualizar un usuario existente
export interface UpdateUserPayload {
  email?: string;
  password?: string;
  role?: 'user' | 'admin';
  empresaId?: number | null;
}

// Respuesta del backend para lista de usuarios
export interface UsersResponse {
  success: boolean;
  data: User[];
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
  timestamp: string;
}

// Respuesta del backend para un usuario individual
export interface UserResponse {
  success: boolean;
  data: User;
  token?: string; // Token incluido en respuestas de creación/login
  message?: string;
  timestamp: string;
}

// Parámetros para consultas de usuarios
export interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  empresaId?: number;
}

// Respuesta de verificación de email
export interface CheckEmailResponse {
  exists: boolean;
  email: string;
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

// Estados de formulario
export interface UserFormState {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'admin';
  empresaId: number | null;
}

// Props del formulario de usuario
export interface UserFormProps {
  mode: 'create' | 'edit';
  user?: User | null;
  empresas: Array<{ id: number; nombre: string }>;
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => void;
  onClose: () => void;
  isLoading?: boolean;
}

// Props del modal de usuario
export interface UserModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  user?: User | null;
  onClose: () => void;
}

// Estado de la tabla de usuarios
export interface UserTableState {
  users: User[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  search: string;
  roleFilter: UserRole | '';
  empresaFilter: number | null;
}

// Acción de la tabla de usuarios
export type UserTableAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USERS'; payload: { users: User[]; total: number } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_ROLE_FILTER'; payload: UserRole | '' }
  | { type: 'SET_EMPRESA_FILTER'; payload: number | null }
  | { type: 'RESET_FILTERS' };

// Hook personalizado para gestión de usuarios
export interface UseUsersResult {
  users: User[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  search: string;
  roleFilter: UserRole | '';
  empresaFilter: number | null;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setRoleFilter: (role: UserRole | '') => void;
  setEmpresaFilter: (empresaId: number | null) => void;
  resetFilters: () => void;
  refetch: () => void;
}
