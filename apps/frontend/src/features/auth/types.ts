// Tipos para el payload de login (lo que enviamos)
export interface Credentials {
  email: string;
  password: string;
}

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'OPERATOR' | 'ADMIN_INTERNO' | 'OPERADOR_INTERNO' | 'DADOR_DE_CARGA' | 'TRANSPORTISTA' | 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CLIENTE' | 'CLIENTE_TRANSPORTE' | 'RESOLVER';

// Tipos para la respuesta del login (lo que recibimos)
// Ajusta esto según la respuesta REAL de tu endpoint /login
export interface EmpresaWithTextoLabels {
  id?: number;
  nombre?: string;
  descripcion?: string;
  ntcliente1?: string;
  ntcliente2?: string;
  ntcliente3?: string;
  ntcliente4?: string;
  ntcliente5?: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  empresaId?: number | null;
  telegramUsername?: string | null;
  telegramUserId?: string | null;
  telegramLinkedAt?: string | null;
  mustChangePassword?: boolean | null;
  empresa?: {
    id: number;
    nombre: string;
  } | null;
  preferences?: {
    notifications: boolean;
    darkMode: boolean;
    language: string;
    cacheEnabled: boolean;
    compactMode: boolean;
  };
  // Asociaciones por rol
  dadorCargaId?: number | null;
  empresaTransportistaId?: number | null;
  choferId?: number | null;
  clienteId?: number | null;
  // Datos del chofer (si el usuario es un chofer)
  choferDni?: string | null;
  choferNombre?: string | null;
  choferApellido?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: UserResponse;
  token: string;
  refreshToken?: string;
  message?: string;
  timestamp: string;
}

// Tipos para el payload de registro (lo que enviamos)
// Ajusta según los campos requeridos por tu endpoint /register
export interface RegisterRequest {
  email: string;
  password: string;
  empresa_id?: number;
  role?: UserRole;
}

export interface RegisterPayload {
  email: string;
  password: string;
  empresaId?: number;
  role?: UserRole;
}
