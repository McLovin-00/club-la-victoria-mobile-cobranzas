// Tipos base para el microservicio de Documentos (Frontend)

export type EntityType = 'DADOR' | 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';

export interface EmpresaTransportista {
  id: number;
  dadorCargaId: number;
  razonSocial: string;
  cuit: string;
  activo: boolean;
  notas?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentClassification {
  detectedEntityType?: EntityType | string;
  detectedEntityId?: string | number;
  detectedDocumentType?: string;
  // confidence es opcional; puede no ser mostrado en UI
  confidence?: number | null;
}

export interface ApprovalPendingDocument {
  id: number;
  entityType?: EntityType | string | null;
  entityId?: string | number | null;
  uploadedAt: string;
  classification?: DocumentClassification | null;
}

export interface ApprovalStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  avgReviewMinutes: number;
}

export interface DadorCarga {
  id: number;
  razonSocial: string;
  cuit: string;
  activo: boolean;
  notas?: string | null;
  phones?: string[];
}

export interface Chofer {
  id: number;
  empresaId: number;
  dni: string;
  nombre?: string | null;
  apellido?: string | null;
  activo: boolean;
  phones?: string[];
}

export interface Camion {
  id: number;
  empresaId: number;
  patente: string;
  marca?: string | null;
  modelo?: string | null;
  activo: boolean;
}

export interface Acoplado {
  id: number;
  empresaId: number;
  patente: string;
  tipo?: string | null;
  activo: boolean;
}

// Clientes que consumen equipos/documentos
export interface Cliente {
  id: number;
  razonSocial: string;
  cuit: string;
  activo: boolean;
  notas?: string | null;
}

// Resumen de equipo utilizado en UI y endpoints
export interface EquipoSummary {
  id: number;
  empresaId: number;
  driverId: number;
  truckId: number;
  trailerId?: number;
  empresaTransportistaId?: number | null;
  driverDniNorm: string;
  truckPlateNorm: string;
  trailerPlateNorm?: string;
  validFrom: string;
  validTo?: string;
  estado: 'activa' | 'finalizada';
}

// Campos adicionales opcionales que algunos endpoints devuelven
export interface EquipoExtras {
  dador?: { razonSocial: string; cuit: string };
  clientes?: Array<{ clienteId: number }>;
}

export type EquipoWithExtras = EquipoSummary & EquipoExtras;

// Documentos mínimos por equipo para portal de clientes
export interface EquipoDocumento {
  id: number;
  templateId: number;
  entityType: 'CHOFER' | 'CAMION' | 'ACOPLADO';
  expiresAt?: string | null;
  status?: string;
  fileName?: string;
}

// Algunos endpoints devuelven { equipo } o el equipo directo
export type ClienteEquipoItem = EquipoWithExtras | { equipo: EquipoWithExtras };

