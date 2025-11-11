import { prisma } from '../config/database';
import { ComplianceService } from './compliance.service';

export type EquipoSemaforo = 'rojo' | 'rojo_azul' | 'amarillo' | 'verde' | 'azul' | 'gris';

export interface EquipoEstadoResult {
  equipoId: number;
  clienteId?: number;
  estado: EquipoSemaforo;
  breakdown: {
    faltantes: number;
    proximos: number;
    vigentes: number;
    pendientes: number;
    rechazados: number;
    vencidos: number;
    sinRequisitos: boolean;
  };
}

export class EquipoEstadoService {
  static async calculateEquipoEstado(equipoId: number, clienteId?: number): Promise<EquipoEstadoResult> {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: { id: true, tenantEmpresaId: true, dadorCargaId: true, driverId: true, truckId: true, trailerId: true },
    });
    if (!equipo) {
      return {
        equipoId,
        clienteId,
        estado: 'gris',
        breakdown: { faltantes: 0, proximos: 0, vigentes: 0, pendientes: 0, rechazados: 0, vencidos: 0, sinRequisitos: true },
      };
    }

    // 1) Compliance por cliente si se pasó clienteId (usando estados detallados)
    let faltantes = 0;
    let proximos = 0;
    let vigentes = 0;
    let sinRequisitos = false;
    if (clienteId) {
      const reqs = await ComplianceService.evaluateEquipoClienteDetailed(equipoId, clienteId);
      if (reqs.length === 0) {
        sinRequisitos = true;
      } else {
        for (const r of reqs) {
          if (r.state === 'FALTANTE') faltantes++;
          else if (r.state === 'PROXIMO') proximos++;
          else if (r.state === 'VIGENTE') vigentes++;
          else if (r.state === 'VENCIDO') { /* se contabiliza en vencidos más abajo desde docs globales */ }
          else if (r.state === 'RECHAZADO') { /* se contabiliza en rechazados más abajo desde docs globales */ }
          else if (r.state === 'PENDIENTE') { /* se contabiliza en pendientes más abajo desde docs globales */ }
        }
      }
    }

    // 2) Pendientes/rechazados/vencidos por documentos de las entidades del equipo (últimos)
    const clauses: any[] = [];
    if (equipo.driverId) clauses.push({ entityType: 'CHOFER' as any, entityId: equipo.driverId });
    if (equipo.truckId) clauses.push({ entityType: 'CAMION' as any, entityId: equipo.truckId });
    if (equipo.trailerId) clauses.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });

    let pendientes = 0;
    let rechazados = 0;
    let vencidos = 0;
    if (clauses.length) {
      const docs = await prisma.document.findMany({
        where: {
          tenantEmpresaId: equipo.tenantEmpresaId,
          dadorCargaId: equipo.dadorCargaId,
          OR: clauses,
        },
        select: { status: true, expiresAt: true },
      });
      const now = Date.now();
      for (const d of docs) {
        if (d.status === 'RECHAZADO') rechazados++;
        else if (d.status === 'PENDIENTE' || d.status === 'PENDIENTE_APROBACION' || d.status === 'VALIDANDO' || d.status === 'CLASIFICANDO') pendientes++;
        if (d.expiresAt && new Date(d.expiresAt).getTime() < now) vencidos++;
      }
    }

    // 3) Agregación a color según prioridad: rojo > rojo+azul > amarillo > verde > azul > gris
    let estado: EquipoSemaforo = 'gris';
    if (faltantes > 0 || vencidos > 0 || rechazados > 0) {
      estado = pendientes > 0 ? 'rojo_azul' : 'rojo';
    } else if (proximos > 0) {
      estado = 'amarillo';
    } else if (vigentes > 0) {
      estado = 'verde';
    } else if (pendientes > 0) {
      estado = 'azul';
    } else {
      estado = 'gris'; // sin requisitos y sin documentos
    }

    return {
      equipoId,
      clienteId,
      estado,
      breakdown: { faltantes, proximos, vigentes, pendientes, rechazados, vencidos, sinRequisitos },
    };
  }
}


