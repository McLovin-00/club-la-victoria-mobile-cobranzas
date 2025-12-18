import { Request } from 'express';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  empresaId?: number;
  dadorId?: number;
  tenantId?: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  tenantId?: number;
  dadorId?: number;
}

export interface FlowiseRemitoResponse {
  numeroRemito: string | null;
  fechaOperacion: string | null;
  emisor: {
    nombre: string | null;
    detalle: string | null;
  };
  cliente: string | null;
  producto: string | null;
  transportista: string | null;
  chofer: {
    nombre: string | null;
    dni: string | null;
  };
  patentes: {
    chasis: string | null;
    acoplado: string | null;
  };
  pesosOrigen: {
    bruto: number | null;
    tara: number | null;
    neto: number | null;
  };
  pesosDestino: {
    bruto: number | null;
    tara: number | null;
    neto: number | null;
  } | null;
  confianza: number;
  camposDetectados: string[];
  errores: string[];
}

export interface RemitoAnalysisJobData {
  remitoId: number;
  imagenId: number;
  tenantEmpresaId: number;
  bucketName: string;
  objectKey: string;
}

