/**
 * Tipos para Grupos Familiares en la app móvil de cobranzas
 */

/**
 * Grupo familiar con resumen de miembros y deudas
 * Respuesta de GET /cobradores/mobile/grupos-familiares
 */
export interface GrupoFamiliar {
  id: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  cantidadMiembros: number;
  miembrosConDeuda: number;
  totalPendiente: number;
}

/**
 * Cuota pendiente de un miembro
 */
export interface CuotaPendiente {
  id: number;
  periodo: string;
  monto: number;
}

/**
 * Miembro de un grupo familiar con sus cuotas pendientes
 */
export interface MiembroGrupo {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string;
  telefono?: string;
  cantidadCuotasPendientes: number;
  totalPendiente: number;
  cuotasPendientes: CuotaPendiente[];
}

/**
 * Detalle completo de un grupo familiar con todos sus miembros
 * Respuesta de GET /cobradores/mobile/grupos-familiares/:id
 */
export interface GrupoFamiliarDetalle {
  id: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  cantidadMiembros: number;
  miembrosConDeuda: number;
  totalPendiente: number;
  miembros: MiembroGrupo[];
}

/**
 * Socio con información de grupo familiar
 * Extensión de la respuesta de búsqueda de socios
 */
export interface SocioConGrupo {
  id: number;
  nombre: string;
  apellido: string;
  estado?: string;
  dni?: string;
  telefono?: string;
  cantidadCuotasPendientes?: number;
  grupoFamiliar?: {
    id: number;
    nombre: string;
  };
}

/**
 * Concepto de cobro (parte de CobroSocioPayload)
 */
export interface ConceptoCobro {
  concepto: string;
  monto: number;
}

/**
 * Método de pago (parte de CobroGrupalPayload)
 */
export interface MetodoPago {
  metodoPagoId: number;
  monto: number;
}

/**
 * Datos de cobro para un socio individual
 */
export interface CobroSocioPayload {
  socioId: number;
  cuotaIds?: number[];
  conceptos?: ConceptoCobro[];
}

/**
 * Payload para registrar cobro grupal
 * POST /cobros/pagos/operacion-grupal
 */
export interface CobroGrupalPayload {
  cobros: CobroSocioPayload[];
  pagos: MetodoPago[];
  actorCobro: string;
  origenCobro: string;
  cobradorId?: number;
  installationId?: string;
  total: number;
  idempotencyKey?: string;
}
