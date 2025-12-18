export interface Remito {
  id: number;
  createdAt: string;
  updatedAt: string;
  
  // Datos extraídos
  numeroRemito: string | null;
  fechaOperacion: string | null;
  emisorNombre: string | null;
  emisorDetalle: string | null;
  clienteNombre: string | null;
  producto: string | null;
  transportistaNombre: string | null;
  choferNombre: string | null;
  choferDni: string | null;
  patenteChasis: string | null;
  patenteAcoplado: string | null;
  
  // Pesos origen
  pesoOrigenBruto: number | null;
  pesoOrigenTara: number | null;
  pesoOrigenNeto: number | null;
  
  // Pesos destino
  pesoDestinoBruto: number | null;
  pesoDestinoTara: number | null;
  pesoDestinoNeto: number | null;
  tieneTicketDestino: boolean;
  
  // IDs de vinculación
  equipoId: number | null;
  choferId: number | null;
  
  // Tenant
  dadorCargaId: number;
  tenantEmpresaId: number;
  
  // Estado
  estado: RemitoEstado;
  cargadoPorUserId: number;
  cargadoPorRol: string;
  aprobadoPorUserId: number | null;
  aprobadoAt: string | null;
  rechazadoPorUserId: number | null;
  rechazadoAt: string | null;
  motivoRechazo: string | null;
  
  // IA
  confianzaIA: number | null;
  camposDetectados: string[];
  erroresAnalisis: string[];
  analizadoAt: string | null;
  
  // Imágenes
  imagenes: RemitoImagen[];
}

export type RemitoEstado = 
  | 'PENDIENTE_ANALISIS'
  | 'EN_ANALISIS'
  | 'PENDIENTE_APROBACION'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'ERROR_ANALISIS';

export interface RemitoImagen {
  id: number;
  remitoId: number;
  bucketName: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  tipo: 'REMITO_PRINCIPAL' | 'REMITO_REVERSO' | 'TICKET_DESTINO' | 'ADICIONAL';
  orden: number;
  procesadoPorIA: boolean;
  createdAt: string;
  url?: string;
}

export interface RemitoStats {
  total: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
}

export interface RemitosListParams {
  estado?: RemitoEstado;
  fechaDesde?: string;
  fechaHasta?: string;
  numeroRemito?: string;
  page?: number;
  limit?: number;
}

export interface RemitosListResponse {
  success: boolean;
  data: Remito[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const ESTADO_LABELS: Record<RemitoEstado, string> = {
  PENDIENTE_ANALISIS: 'Pendiente de Análisis',
  EN_ANALISIS: 'En Análisis',
  PENDIENTE_APROBACION: 'Pendiente Aprobación',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  ERROR_ANALISIS: 'Error en Análisis',
};

export const ESTADO_COLORS: Record<RemitoEstado, string> = {
  PENDIENTE_ANALISIS: 'bg-gray-100 text-gray-700',
  EN_ANALISIS: 'bg-blue-100 text-blue-700',
  PENDIENTE_APROBACION: 'bg-yellow-100 text-yellow-700',
  APROBADO: 'bg-green-100 text-green-700',
  RECHAZADO: 'bg-red-100 text-red-700',
  ERROR_ANALISIS: 'bg-red-100 text-red-700',
};

