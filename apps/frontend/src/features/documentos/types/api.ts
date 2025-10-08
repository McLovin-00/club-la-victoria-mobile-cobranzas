export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
  defaults?: Record<string, unknown>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ListResponse<T> {
  data: T[];
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Tipos de apoyo específicos usados por endpoints de Documentos
export type Id = number | string;

export interface ListAndDefaults<T, D extends Record<string, unknown> = Record<string, unknown>> {
  list: T[];
  defaults?: D;
}


