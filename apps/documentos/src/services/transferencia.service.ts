import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import type { EntityType, EstadoSolicitud } from '.prisma/documentos';
import { InternalNotificationService } from './internal-notification.service';

// ============================================================================
// TransferenciaService - Gestión de solicitudes de transferencia de entidades
// Las entidades solo pueden pertenecer a un dador. Para reutilizar documentos
// de entidades de otro dador, se requiere una solicitud de transferencia
// que debe ser aprobada por un ADMIN o ADMIN_INTERNO.
// ============================================================================

/** Entidad a transferir */
export interface EntidadTransferencia {
  tipo: EntityType;
  id: number;
  identificador: string;  // DNI, CUIT o Patente
  nombre?: string;
}

/** Input para crear solicitud de transferencia */
export interface CrearSolicitudInput {
  tenantEmpresaId: number;
  solicitanteUserId: number;
  solicitanteUserEmail?: string;
  solicitanteDadorId: number;
  dadorActualId: number;
  entidades: EntidadTransferencia[];
  motivo: string;
}

/** Resultado de crear solicitud */
export interface CrearSolicitudResult {
  id: number;
  estado: EstadoSolicitud;
  entidades: EntidadTransferencia[];
  equiposAfectados: number[];
}

/** Solicitud de transferencia con datos expandidos */
export interface SolicitudTransferenciaDTO {
  id: number;
  tenantEmpresaId: number;
  solicitanteUserId: number;
  solicitanteUserEmail: string | null;
  solicitanteDadorId: number;
  solicitanteDadorNombre: string | null;
  dadorActualId: number;
  dadorActualNombre: string | null;
  entidades: EntidadTransferencia[];
  equiposAfectados: number[];
  estado: EstadoSolicitud;
  motivo: string | null;
  resueltoPorUserId: number | null;
  resueltoPorUserEmail: string | null;
  resueltoAt: Date | null;
  motivoRechazo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Obtiene el nombre del dador de carga
 */
async function obtenerNombreDador(dadorId: number): Promise<string | null> {
  const dador = await prisma.dadorCarga.findUnique({
    where: { id: dadorId },
    select: { razonSocial: true },
  });
  return dador?.razonSocial || null;
}

/**
 * Busca equipos afectados por la transferencia de entidades
 */
async function buscarEquiposAfectados(
  tenantEmpresaId: number,
  dadorCargaId: number,
  entidades: EntidadTransferencia[]
): Promise<number[]> {
  const equipoIds = new Set<number>();

  for (const entidad of entidades) {
    let whereClause: Record<string, unknown> = {
      tenantEmpresaId,
      dadorCargaId,
      activo: true,
    };

    switch (entidad.tipo) {
      case 'CHOFER':
        whereClause.driverId = entidad.id;
        break;
      case 'CAMION':
        whereClause.truckId = entidad.id;
        break;
      case 'ACOPLADO':
        whereClause.trailerId = entidad.id;
        break;
      case 'EMPRESA_TRANSPORTISTA':
        whereClause.empresaTransportistaId = entidad.id;
        break;
      default:
        continue;
    }

    const equipos = await prisma.equipo.findMany({
      where: whereClause,
      select: { id: true },
    });

    for (const eq of equipos) {
      equipoIds.add(eq.id);
    }
  }

  return Array.from(equipoIds);
}

/**
 * Obtiene usuarios admin del tenant para notificar.
 * Busca userIds distintos que hayan recibido notificaciones previas del tenant,
 * ya que el microservicio documentos no tiene acceso a la tabla de usuarios del backend.
 */
async function obtenerAdminsParaNotificar(tenantEmpresaId: number): Promise<number[]> {
  try {
    const rows = await prisma.internalNotification.findMany({
      where: { tenantEmpresaId, deleted: false },
      select: { userId: true },
      distinct: ['userId'],
    });
    const ids = rows.map(r => r.userId).filter(id => id > 0);
    if (ids.length === 0) {
      AppLogger.warn('No se encontraron destinatarios para notificar transferencia', { tenantEmpresaId });
    }
    return ids;
  } catch (err) {
    AppLogger.error('Error buscando admins para notificar', err);
    return [];
  }
}

/** Transfiere una entidad individual dentro de una transacción */
async function transferirEntidad(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  entidad: EntidadTransferencia,
  nuevoDadorId: number
): Promise<void> {
  switch (entidad.tipo) {
    case 'CHOFER':
      await tx.chofer.update({ where: { id: entidad.id }, data: { dadorCargaId: nuevoDadorId } });
      break;
    case 'CAMION':
      await tx.camion.update({ where: { id: entidad.id }, data: { dadorCargaId: nuevoDadorId } });
      break;
    case 'ACOPLADO':
      await tx.acoplado.update({ where: { id: entidad.id }, data: { dadorCargaId: nuevoDadorId } });
      break;
    case 'EMPRESA_TRANSPORTISTA':
      await tx.empresaTransportista.update({ where: { id: entidad.id }, data: { dadorCargaId: nuevoDadorId } });
      break;
    default:
      throw new Error(`Tipo de entidad no soportado: ${entidad.tipo}`);
  }
}

/** Verifica que cada entidad exista y pertenezca al dador indicado */
async function validarEntidadesExisten(
  entidades: EntidadTransferencia[],
  dadorActualId: number
): Promise<void> {
  for (const ent of entidades) {
    let existe: { dadorCargaId: number } | null = null;
    switch (ent.tipo) {
      case 'CHOFER':
        existe = await prisma.chofer.findUnique({ where: { id: ent.id }, select: { dadorCargaId: true } });
        break;
      case 'CAMION':
        existe = await prisma.camion.findUnique({ where: { id: ent.id }, select: { dadorCargaId: true } });
        break;
      case 'ACOPLADO':
        existe = await prisma.acoplado.findUnique({ where: { id: ent.id }, select: { dadorCargaId: true } });
        break;
      case 'EMPRESA_TRANSPORTISTA':
        existe = await prisma.empresaTransportista.findUnique({ where: { id: ent.id }, select: { dadorCargaId: true } });
        break;
    }
    if (!existe) {
      throw new Error(`${ent.tipo} con id ${ent.id} (${ent.identificador}) no existe`);
    }
    if (existe.dadorCargaId !== dadorActualId) {
      throw new Error(`${ent.tipo} ${ent.identificador} no pertenece al dador indicado`);
    }
  }
}

export class TransferenciaService {
  /**
   * Crea una nueva solicitud de transferencia
   */
  static async crearSolicitud(input: CrearSolicitudInput): Promise<CrearSolicitudResult> {
    const {
      tenantEmpresaId,
      solicitanteUserId,
      solicitanteUserEmail,
      solicitanteDadorId,
      dadorActualId,
      entidades,
      motivo,
    } = input;

    AppLogger.info('📝 Creando solicitud de transferencia', {
      tenantEmpresaId,
      solicitanteUserId,
      solicitanteDadorId,
      dadorActualId,
      entidadesCount: entidades.length,
    });

    // Verificar que las entidades existan y pertenezcan al dador actual
    await validarEntidadesExisten(entidades, dadorActualId);

    // Verificar que no exista una solicitud pendiente para las mismas entidades
    const solicitudesPendientes = await prisma.solicitudTransferencia.findMany({
      where: {
        tenantEmpresaId,
        solicitanteDadorId,
        dadorActualId,
        estado: 'PENDIENTE',
      },
    });

    // Verificar overlap de entidades
    for (const sol of solicitudesPendientes) {
      const entidadesExistentes = sol.entidades as unknown as EntidadTransferencia[];
      for (const entNueva of entidades) {
        const overlap = entidadesExistentes.some(
          e => e.tipo === entNueva.tipo && e.id === entNueva.id
        );
        if (overlap) {
          throw new Error(
            `Ya existe una solicitud pendiente para ${entNueva.tipo} ${entNueva.identificador}`
          );
        }
      }
    }

    // Obtener nombres de dadores
    const [solicitanteDadorNombre, dadorActualNombre] = await Promise.all([
      obtenerNombreDador(solicitanteDadorId),
      obtenerNombreDador(dadorActualId),
    ]);

    // Buscar equipos afectados
    const equiposAfectados = await buscarEquiposAfectados(
      tenantEmpresaId,
      dadorActualId,
      entidades
    );

    // Crear la solicitud
    const solicitud = await prisma.solicitudTransferencia.create({
      data: {
        tenantEmpresaId,
        solicitanteUserId,
        solicitanteUserEmail,
        solicitanteDadorId,
        solicitanteDadorNombre,
        dadorActualId,
        dadorActualNombre,
        entidades: entidades as any,
        equiposAfectados: equiposAfectados as any,
        estado: 'PENDIENTE',
        motivo,
      },
    });

    AppLogger.info('✅ Solicitud de transferencia creada', {
      solicitudId: solicitud.id,
      equiposAfectados: equiposAfectados.length,
    });

    // Notificar a admins internos
    const admins = await obtenerAdminsParaNotificar(tenantEmpresaId);
    for (const adminId of admins) {
      await InternalNotificationService.create({
        tenantEmpresaId,
        userId: adminId,
        type: 'TRANSFERENCIA_SOLICITADA',
        title: 'Nueva solicitud de transferencia',
        message: `${solicitanteDadorNombre} solicita transferir ${entidades.length} entidad(es) de ${dadorActualNombre}`,
        link: `/admin/transferencias/${solicitud.id}`,
        priority: 'high',
        metadata: { solicitudId: solicitud.id },
      });
    }

    return {
      id: solicitud.id,
      estado: solicitud.estado,
      entidades,
      equiposAfectados,
    };
  }

  /**
   * Lista solicitudes de transferencia
   */
  static async listarSolicitudes(params: {
    tenantEmpresaId: number;
    estado?: EstadoSolicitud;
    dadorCargaId?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ solicitudes: SolicitudTransferenciaDTO[]; total: number }> {
    const { tenantEmpresaId, estado, dadorCargaId, limit = 50, offset = 0 } = params;

    const where: Record<string, unknown> = { tenantEmpresaId };
    if (estado) where.estado = estado;
    if (dadorCargaId) {
      where.OR = [
        { solicitanteDadorId: dadorCargaId },
        { dadorActualId: dadorCargaId },
      ];
    }

    const [solicitudes, total] = await Promise.all([
      prisma.solicitudTransferencia.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.solicitudTransferencia.count({ where }),
    ]);

    return {
      solicitudes: solicitudes.map(s => ({
        ...s,
        entidades: s.entidades as unknown as EntidadTransferencia[],
        equiposAfectados: (s.equiposAfectados as unknown as number[]) || [],
      })),
      total,
    };
  }

  /**
   * Obtiene una solicitud por ID
   */
  static async obtenerSolicitud(
    tenantEmpresaId: number,
    solicitudId: number
  ): Promise<SolicitudTransferenciaDTO | null> {
    const solicitud = await prisma.solicitudTransferencia.findFirst({
      where: { id: solicitudId, tenantEmpresaId },
    });

    if (!solicitud) return null;

    return {
      ...solicitud,
      entidades: solicitud.entidades as unknown as EntidadTransferencia[],
      equiposAfectados: (solicitud.equiposAfectados as unknown as number[]) || [],
    };
  }

  /**
   * Aprueba una solicitud de transferencia
   * Solo puede ser ejecutado por ADMIN o ADMIN_INTERNO
   */
  static async aprobarSolicitud(params: {
    tenantEmpresaId: number;
    solicitudId: number;
    aprobadorUserId: number;
    aprobadorUserEmail?: string;
  }): Promise<{ success: boolean; message: string; entidadesTransferidas: number }> {
    const { tenantEmpresaId, solicitudId, aprobadorUserId, aprobadorUserEmail } = params;

    AppLogger.info('✅ Aprobando solicitud de transferencia', { solicitudId, aprobadorUserId });

    const solicitud = await prisma.solicitudTransferencia.findFirst({
      where: { id: solicitudId, tenantEmpresaId, estado: 'PENDIENTE' },
    });

    if (!solicitud) {
      return { success: false, message: 'Solicitud no encontrada o ya procesada', entidadesTransferidas: 0 };
    }

    const entidades = solicitud.entidades as unknown as EntidadTransferencia[];
    const solicitanteDadorId = solicitud.solicitanteDadorId;

    // Ejecutar transferencia en transacción atómica
    const entidadesTransferidas = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const entidad of entidades) {
        await transferirEntidad(tx, entidad, solicitanteDadorId);
        count++;
      }

      await tx.solicitudTransferencia.update({
        where: { id: solicitudId },
        data: {
          estado: 'APROBADA',
          resueltoPorUserId: aprobadorUserId,
          resueltoPorUserEmail: aprobadorUserEmail,
          resueltoAt: new Date(),
        },
      });

      return count;
    });

    AppLogger.info('✅ Transferencia completada', {
      solicitudId,
      entidadesTransferidas,
      nuevoDadorId: solicitanteDadorId,
    });

    // Notificar al solicitante
    await InternalNotificationService.create({
      tenantEmpresaId,
      userId: solicitud.solicitanteUserId,
      type: 'TRANSFERENCIA_APROBADA',
      title: 'Transferencia aprobada',
      message: `Tu solicitud de transferencia de ${entidadesTransferidas} entidad(es) ha sido aprobada`,
      link: `/transferencias/${solicitudId}`,
      priority: 'normal',
      metadata: { solicitudId },
    });

    // Notificar a los admins del dador que perdió las entidades
    try {
      const adminsDadorActual = await obtenerAdminsParaNotificar(tenantEmpresaId);
      for (const adminId of adminsDadorActual) {
        if (adminId === solicitud.solicitanteUserId) continue;
        await InternalNotificationService.create({
          tenantEmpresaId,
          userId: adminId,
          type: 'TRANSFERENCIA_APROBADA',
          title: 'Entidades transferidas a otro dador',
          message: `Se transfirieron ${entidadesTransferidas} entidad(es) al dador ${solicitud.solicitanteDadorNombre ?? 'desconocido'}`,
          link: `/transferencias/${solicitudId}`,
          priority: 'high',
          metadata: { solicitudId, dadorDestinoId: solicitanteDadorId },
        });
      }
    } catch (notifErr) {
      AppLogger.warn('Error notificando admins del dador actual', { error: (notifErr as Error).message });
    }

    return {
      success: true,
      message: `Transferencia completada: ${entidadesTransferidas} entidad(es) transferida(s)`,
      entidadesTransferidas,
    };
  }

  /**
   * Rechaza una solicitud de transferencia
   */
  static async rechazarSolicitud(params: {
    tenantEmpresaId: number;
    solicitudId: number;
    rechazadorUserId: number;
    rechazadorUserEmail?: string;
    motivoRechazo: string;
  }): Promise<{ success: boolean; message: string }> {
    const { tenantEmpresaId, solicitudId, rechazadorUserId, rechazadorUserEmail, motivoRechazo } = params;

    AppLogger.info('❌ Rechazando solicitud de transferencia', { solicitudId, rechazadorUserId });

    const solicitud = await prisma.solicitudTransferencia.findFirst({
      where: { id: solicitudId, tenantEmpresaId, estado: 'PENDIENTE' },
    });

    if (!solicitud) {
      return { success: false, message: 'Solicitud no encontrada o ya procesada' };
    }

    await prisma.solicitudTransferencia.update({
      where: { id: solicitudId },
      data: {
        estado: 'RECHAZADA',
        resueltoPorUserId: rechazadorUserId,
        resueltoPorUserEmail: rechazadorUserEmail,
        resueltoAt: new Date(),
        motivoRechazo,
      },
    });

    AppLogger.info('❌ Solicitud rechazada', { solicitudId, motivoRechazo });

    // Notificar al solicitante
    await InternalNotificationService.create({
      tenantEmpresaId,
      userId: solicitud.solicitanteUserId,
      type: 'TRANSFERENCIA_RECHAZADA',
      title: 'Transferencia rechazada',
      message: `Tu solicitud de transferencia ha sido rechazada: ${motivoRechazo}`,
      link: `/transferencias/${solicitudId}`,
      priority: 'normal',
      metadata: { solicitudId, motivoRechazo },
    });

    return { success: true, message: 'Solicitud rechazada' };
  }

  /**
   * Cancela una solicitud propia (solo el solicitante)
   */
  static async cancelarSolicitud(params: {
    tenantEmpresaId: number;
    solicitudId: number;
    usuarioId: number;
  }): Promise<{ success: boolean; message: string }> {
    const { tenantEmpresaId, solicitudId, usuarioId } = params;

    const solicitud = await prisma.solicitudTransferencia.findFirst({
      where: {
        id: solicitudId,
        tenantEmpresaId,
        estado: 'PENDIENTE',
        solicitanteUserId: usuarioId,
      },
    });

    if (!solicitud) {
      return { success: false, message: 'Solicitud no encontrada o no puedes cancelarla' };
    }

    await prisma.solicitudTransferencia.update({
      where: { id: solicitudId },
      data: {
        estado: 'CANCELADA',
        resueltoAt: new Date(),
      },
    });

    AppLogger.info('🚫 Solicitud cancelada por solicitante', { solicitudId, usuarioId });

    return { success: true, message: 'Solicitud cancelada' };
  }
}
