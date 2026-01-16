/**
 * Propósito: tipos del dataset de seed para E2E.
 */

export type SeedData = {
  // Contexto general
  tenantEmpresaId: number;
  dadorCargaId: number;
  clienteId: number;

  // Equipo creado para pruebas
  equipoId: number;
  empresaTransportistaId: number;
  choferId: number;
  camionId: number;
  acopladoId: number | null;

  // Identificadores “naturales” (útiles para búsqueda por UI)
  choferDni: string;
  camionPatente: string;
  acopladoPatente?: string;

  // Documentos
  templateIds: {
    EMPRESA_TRANSPORTISTA?: number;
    CHOFER?: number;
    CAMION?: number;
    ACOPLADO?: number;
  };
  initialDocumentIds: number[]; // docs subidos por ADMIN_INTERNO (quedan pendientes)
  pendingRenewalDocumentId?: number; // doc subido por TRANSPORTISTA (pendiente)
};


