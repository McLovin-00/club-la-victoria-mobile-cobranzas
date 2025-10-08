// User related types
export interface User {
  id: number;
  email: string;
  role: UserRole;
  empresaId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  user = 'user',
  admin = 'admin',
  superadmin = 'superadmin',
}

// Auth related types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  data: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: UserRole;
  empresaId?: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  initialized: boolean;
}

// Empresa related types
export interface Empresa {
  id: number;
  nombre: string;
  descripcion?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmpresaRequest {
  nombre: string;
  descripcion?: string;
}

export interface EmpresaResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  createdAt: string;
  updatedAt: string;
}

// Dashboard related types
export interface DashboardStats {
  totalUsers: number;
  totalEmpresas: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: number;
  type: 'user_created' | 'user_updated' | 'empresa_created' | 'empresa_updated';
  description: string;
  timestamp: Date;
  userId?: number;
  empresaId?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  timestamp: Date;
  path: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}

// Filter and sort types
export interface FilterOptions {
  search?: string;
  role?: UserRole;
  empresaId?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Redux related types
export interface RootState {
  auth: AuthState;
  // Add other slices as needed
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Database related types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface DatabaseInitializationResult {
  success: boolean;
  message: string;
  databaseCreated: boolean;
  migrationsRun: boolean;
  seedsExecuted: boolean;
  duration: number;
}

// HTTP related types
export interface HttpConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

// Environment types
export type Environment = 'development' | 'production' | 'test';

export interface EnvironmentConfig {
  NODE_ENV: Environment;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  LOG_LEVEL: string;
}

// Middleware types
export interface RequestUser {
  id: number;
  email: string;
  role: UserRole;
  empresaId?: number;
}

// Audit related types
export interface AuditLog {
  id: number;
  action: string;
  tableName: string;
  recordId: number;
  oldData?: any;
  newData?: any;
  userId: number;
  timestamp: Date;
}

// All types are exported from this main index file
// Additional type modules can be added here as the project grows
