import { prisma } from '../config/database';
import { ComplianceService } from './compliance.service';

export type EquipoSemaforo = 'rojo' | 'rojo_azul' | 'amarillo' | 'verde' | 'azul' | 'gris';

export interface EquipoEstadoResult {
  equipoId: number;
  clienteId?: number;
  estado: EquipoSemaforo;
  breakdown: EquipoBreakdown;
}

interface EquipoBreakdown {
  faltantes: number;
  proximos: number;
  vigentes: number;
  pendientes: number;
  rechazados: number;
  vencidos: number;
  sinRequisitos: boolean;
}

const PENDING_STATUSES = ['PENDIENTE', 'PENDIENTE_APROBACION', 'VALIDANDO', 'CLASIFICANDO'];

/** Calcula compliance por cliente */
async function calculateClienteCompliance(equipoId: number, clienteId: number): Promise<{ faltantes: number; proximos: number; vigentes: number; sinRequisitos: boolean }> {
  const reqs = await ComplianceService.evaluateEquipoClienteDetailed(equipoId, clienteId);
  if (reqs.length === 0) {
    return { faltantes: 0, proximos: 0, vigentes: 0, sinRequisitos: true };
  }
  
  let faltantes = 0, proximos = 0, vigentes = 0;
  for (const r of reqs) {
    if (r.state === 'FALTANTE') faltantes++;
    else if (r.state === 'PROXIMO') proximos++;
    else if (r.state === 'VIGENTE') vigentes++;
  }
  return { faltantes, proximos, vigentes, sinRequisitos: false };
}

/** Cuenta estados de documentos de las entidades del equipo */
async function countDocumentStatuses(
  equipo: { tenantEmpresaId: number; dadorCargaId: number; driverId: number | null; truckId: number | null; trailerId: number | null }
): Promise<{ pendientes: number; rechazados: number; vencidos: number }> {
  const clauses: any[] = [];
  if (equipo.driverId) clauses.push({ entityType: 'CHOFER', entityId: equipo.driverId });
  if (equipo.truckId) clauses.push({ entityType: 'CAMION', entityId: equipo.truckId });
  if (equipo.trailerId) clauses.push({ entityType: 'ACOPLADO', entityId: equipo.trailerId });

  if (clauses.length === 0) {
    return { pendientes: 0, rechazados: 0, vencidos: 0 };
  }

  const docs = await prisma.document.findMany({
    where: { tenantEmpresaId: equipo.tenantEmpresaId, dadorCargaId: equipo.dadorCargaId, OR: clauses },
    select: { status: true, expiresAt: true },
  });

  let pendientes = 0, rechazados = 0, vencidos = 0;
  const now = Date.now();
  for (const d of docs) {
    if (d.status === 'RECHAZADO') rechazados++;
    else if (PENDING_STATUSES.includes(d.status)) pendientes++;
    if (d.expiresAt && new Date(d.expiresAt).getTime() < now) vencidos++;
  }
  return { pendientes, rechazados, vencidos };
}

/** Determina el color del semáforo según prioridad */
function determineSemaforo(breakdown: EquipoBreakdown): EquipoSemaforo {
  const { faltantes, vencidos, rechazados, proximos, vigentes, pendientes } = breakdown;
  
  if (faltantes > 0 || vencidos > 0 || rechazados > 0) {
    return pendientes > 0 ? 'rojo_azul' : 'rojo';
  }
  if (proximos > 0) return 'amarillo';
  if (vigentes > 0) return 'verde';
  if (pendientes > 0) return 'azul';
  return 'gris';
}

export class EquipoEstadoService {
  static async calculateEquipoEstado(equipoId: number, clienteId?: number): Promise<EquipoEstadoResult> {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: { id: true, tenantEmpresaId: true, dadorCargaId: true, driverId: true, truckId: true, trailerId: true },
    });

    const emptyBreakdown: EquipoBreakdown = { faltantes: 0, proximos: 0, vigentes: 0, pendientes: 0, rechazados: 0, vencidos: 0, sinRequisitos: true };
    
    if (!equipo) {
      return { equipoId, clienteId, estado: 'gris', breakdown: emptyBreakdown };
    }

    // 1) Compliance por cliente
    const compliance = clienteId 
      ? await calculateClienteCompliance(equipoId, clienteId)
      : { faltantes: 0, proximos: 0, vigentes: 0, sinRequisitos: false };

    // 2) Estados de documentos
    const docStats = await countDocumentStatuses(equipo);

    // 3) Construir breakdown y determinar semáforo
    const breakdown: EquipoBreakdown = {
      ...compliance,
      ...docStats,
    };
    const estado = determineSemaforo(breakdown);

    return { equipoId, clienteId, estado, breakdown };
  }
}


