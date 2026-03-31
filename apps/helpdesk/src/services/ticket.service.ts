import { prisma } from '../config/database';
import {
  Prisma,
  TicketCategory as PrismaTicketCategory,
  TicketSubcategory as PrismaTicketSubcategory,
  TicketStatus as PrismaTicketStatus,
  TicketPriority as PrismaTicketPriority,
  MessageSenderType as PrismaMessageSenderType,
  AttachmentType as PrismaAttachmentType,
} from '@helpdesk/prisma-client';
import { AppLogger } from '../config/logger';
import ticketReadStateService from './ticket-read-state.service';
import helpdeskInternalNotificationService from './helpdesk-internal-notification.service';
import { webSocketService } from './websocket.service';
import type { 
  Ticket, 
  TicketWithMessages, 
  TicketFilters, 
  PaginationParams, 
  PaginatedResult,
  HelpdeskStats,
  TicketViewerContext,
  TicketWithEmpresa,
} from '../types';
import { ticketCanBeViewedBy } from './tenant-scope';
import type { CreateTicketInput, TicketStatus, TicketPriority } from '../schemas/ticket.schema';

// Re-export types for convenience
export type { CreateTicketInput, TicketFilters, PaginationParams, PaginatedResult };

/**
 * Obtener el siguiente número de ticket secuencial
 */
const getNextTicketNumber = async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<number> => {
  const lastTicket = await tx.ticket.findFirst({
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  return (lastTicket?.number ?? 0) + 1;
};

/**
 * Crear un nuevo ticket
 */
export const createTicket = async (
  data: CreateTicketInput,
  userId: number,
  userName: string,
  source: 'platform' | 'telegram' = 'platform',
  empresaId?: number | null,
  empresaNombre?: string | null
): Promise<Ticket> => {
  return await prisma.$transaction(async (tx) => {
    const number = await getNextTicketNumber(tx);

    const ticket = await tx.ticket.create({
      data: {
        number,
        category: data.category as PrismaTicketCategory,
        subcategory: data.subcategory as PrismaTicketSubcategory,
        subject: data.subject,
        priority: data.priority as PrismaTicketPriority,
        status: PrismaTicketStatus.OPEN,
        empresaId: empresaId ?? null,
        empresaNombre: empresaNombre ?? null,
        createdBy: userId,
        createdByName: userName,
        source,
      },
    });

    // Create initial message
    await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: PrismaMessageSenderType.USER,
        senderId: String(userId),
        senderName: userName,
        content: data.message,
      },
    });

    AppLogger.info(`Ticket #${number} creado por usuario ${userId}`);

    return ticket as unknown as Ticket;
  });
};

type PersistedTicketAttachment = {
  type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
  filename: string;
  mimeType: string;
  size: number;
  minioKey: string;
};

/**
 * Asocia adjuntos ya subidos al primer mensaje USER del ticket (creacion via web con archivos).
 */
export const attachFilesToFirstUserMessage = async (
  ticketId: string,
  attachments: PersistedTicketAttachment[]
): Promise<void> => {
  if (attachments.length === 0) return;

  const first = await prisma.ticketMessage.findFirst({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (!first) {
    throw new Error('FIRST_MESSAGE_NOT_FOUND');
  }

  await prisma.messageAttachment.createMany({
    data: attachments.map(att => ({
      messageId: first.id,
      type: att.type as PrismaAttachmentType,
      filename: att.filename,
      mimeType: att.mimeType,
      size: att.size,
      minioKey: att.minioKey,
    })),
  });
};

/**
 * Obtener ticket por ID con mensajes (respeta multi-tenant y permisos de staff)
 */
export const getTicketById = async (
  ticketId: string,
  viewer: TicketViewerContext
): Promise<TicketWithMessages | null> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          attachments: true,
        },
      },
    },
  })

  if (!ticket) return null;

  if (
    !ticketCanBeViewedBy(
      { createdBy: ticket.createdBy, empresaId: ticket.empresaId ?? null },
      viewer
    )
  ) {
    return null;
  }

  return ticket as unknown as TicketWithMessages
};

/**
 * Obtener ticket por numero
 */
export const getTicketByNumber = async (number: number): Promise<Ticket | null> => {
  const ticket = await prisma.ticket.findUnique({
    where: { number },
  })
  return ticket as unknown as Ticket | null
}

/**
 * Listar tickets del usuario con filtros y paginacion
 */
export const getTicketsByUser = async (
  userId: number,
  filters: TicketFilters = {},
  pagination: PaginationParams = {}
): Promise<PaginatedResult<Ticket>> => {
  const page = pagination.page ?? 1
  const limit = pagination.limit ?? 20
  const skip = (page - 1) * limit

  const where: Prisma.TicketWhereInput = {
    createdBy: userId,
  }

  // Aplicar filtros
  if (filters.status) {
    where.status = filters.status as PrismaTicketStatus
  }
  if (filters.category) {
    where.category = filters.category as PrismaTicketCategory
  }
  if (filters.priority) {
    where.priority = filters.priority as PrismaTicketPriority
  }
  if (filters.search) {
    where.subject = { contains: filters.search, mode: 'insensitive' }
  }
  if (filters.from || filters.to) {
    where.createdAt = {}
    if (filters.from) where.createdAt.gte = filters.from
    if (filters.to) where.createdAt.lte = filters.to
  }

  const [total, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ])

  return {
    data: tickets as unknown as Ticket[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Listar todos los tickets (admin) - incluye empresa para RESOLVER
 */
export const getAllTickets = async (
  filters: TicketFilters = {},
  pagination: PaginationParams = {},
  includeEmpresa: boolean
): Promise<PaginatedResult<TicketWithEmpresa>> => {
  const page = pagination.page ?? 1
  const limit = pagination.limit ?? 20
  const skip = (page - 1) * limit

  const where: Prisma.TicketWhereInput = {}

  if (filters.empresaId !== undefined && filters.empresaId !== null) {
    where.empresaId = filters.empresaId
  }

  if (filters.status) {
    where.status = filters.status as PrismaTicketStatus
  }
  if (filters.category) {
    where.category = filters.category as PrismaTicketCategory
  }
  if (filters.priority) {
    where.priority = filters.priority as PrismaTicketPriority
  }
  if (filters.search) {
    where.OR = [
      { subject: { contains: filters.search, mode: 'insensitive' } },
      { createdByName: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  if (filters.from || filters.to) {
    where.createdAt = {}
    if (filters.from) where.createdAt.gte = filters.from
    if (filters.to) where.createdAt.lte = filters.to
  }

  // Nota: empresaNombre se almacena en el ticket al crearlo (campo denormalizado)
  // No hay relación con tabla Empresa porque está en otra base de datos (backend)
  const [total, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ])

  return {
    data: tickets as unknown as TicketWithEmpresa[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Validar transicion de estado
 */
const isValidStatusTransition = (
  currentStatus: TicketStatus,
  newStatus: TicketStatus
): boolean => {
  const validTransitions: Record<TicketStatus, TicketStatus[]> = {
    OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    IN_PROGRESS: ['RESOLVED', 'OPEN', 'CLOSED'],
    RESOLVED: ['CLOSED', 'IN_PROGRESS'],
    CLOSED: [], // No se puede cambiar desde CLOSED excepto reopen
  }
  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Actualizar estado del ticket
 */
export const updateTicketStatus = async (
  ticketId: string,
  newStatus: TicketStatus,
  userId?: number
): Promise<Ticket> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  })

  if (!ticket) {
    throw new Error('TICKET_NOT_FOUND')
  }

  const currentStatus = ticket.status as TicketStatus

  if (!isValidStatusTransition(currentStatus, newStatus)) {
    throw new Error(`INVALID_STATUS_TRANSITION:${currentStatus}:${newStatus}`)
  }

  const updateData: Prisma.TicketUpdateInput = {
    status: newStatus,
  }

  if (newStatus === 'RESOLVED') {
    updateData.resolvedAt = new Date()
  }
  if (newStatus === 'CLOSED') {
    updateData.closedAt = new Date()
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: updateData,
  })

  AppLogger.info(`Ticket ${ticketId} estado cambiado de ${currentStatus} a ${newStatus}`)

  webSocketService.emitStatusChange(ticketId, newStatus, 'resolver', ticket.createdBy)

  if (newStatus === 'CLOSED') {
    await helpdeskInternalNotificationService.notifyTicketClosedToUser(
      updated as unknown as Ticket,
      'Soporte'
    )
  }

  return updated as unknown as Ticket
}

/**
 * Cerrar ticket
 */
export const closeTicket = async (
  ticketId: string,
  userId: number
): Promise<Ticket> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  })

  if (!ticket) {
    throw new Error('TICKET_NOT_FOUND')
  }

  if (ticket.createdBy !== userId) {
    throw new Error('NOT_TICKET_OWNER')
  }

  if (ticket.status === 'CLOSED') {
    throw new Error('ALREADY_CLOSED')
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: PrismaTicketStatus.CLOSED,
      closedAt: new Date(),
    },
  })

  // Crear mensaje de sistema
  await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderType: PrismaMessageSenderType.SYSTEM,
      senderName: 'Sistema',
      content: 'Ticket cerrado por el usuario.',
    },
  })

  AppLogger.info(`Ticket ${ticketId} cerrado por usuario ${userId}`)

  await ticketReadStateService.markAsRead(ticketId, userId)
  webSocketService.emitStatusChange(ticketId, 'CLOSED', 'user', userId)

  return updated as unknown as Ticket
}

/**
 * Reabrir ticket (dentro de las 72hs)
 */
export const reopenTicket = async (
  ticketId: string,
  userId: number,
  message?: string
): Promise<Ticket> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  })

  if (!ticket) {
    throw new Error('TICKET_NOT_FOUND')
  }

  if (ticket.createdBy !== userId) {
    throw new Error('NOT_TICKET_OWNER')
  }

  if (ticket.status !== 'CLOSED') {
    throw new Error('TICKET_NOT_CLOSED')
  }

  // Verificar regla de 72 horas
  const closedAt = ticket.closedAt
  if (!closedAt) {
    throw new Error('NO_CLOSE_DATE')
  }

  const hoursSinceClosed = (Date.now() - closedAt.getTime()) / (1000 * 60 * 60)
  if (hoursSinceClosed > 72) {
    throw new Error('REOPEN_WINDOW_EXPIRED')
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: PrismaTicketStatus.OPEN,
      closedAt: null,
      resolvedAt: null,
    },
  })

  // Crear mensaje de sistema
  await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderType: PrismaMessageSenderType.SYSTEM,
      senderName: 'Sistema',
      content: message || 'Ticket reabierto por el usuario.',
    },
  })

  AppLogger.info(`Ticket ${ticketId} reabierto por usuario ${userId}`)

  await ticketReadStateService.markAsRead(ticketId, userId)
  webSocketService.emitStatusChange(ticketId, 'OPEN', 'user', userId)
  await helpdeskInternalNotificationService.notifyTicketReopenedToStaff(updated as unknown as Ticket)

  return updated as unknown as Ticket
}

/**
 * Obtener estadisticas del helpdesk (opcionalmente filtradas por tenant)
 */
export const getStats = async (empresaId?: number | null): Promise<HelpdeskStats> => {
  const tenantWhere: Prisma.TicketWhereInput = {}
  if (empresaId !== undefined && empresaId !== null) {
    tenantWhere.empresaId = empresaId
  }

  const [statusCounts, categoryCounts, priorityCounts, resolvedTickets] = await Promise.all([
    prisma.ticket.groupBy({
      by: ['status'],
      where: Object.keys(tenantWhere).length > 0 ? tenantWhere : undefined,
      _count: true,
    }),
    prisma.ticket.groupBy({
      by: ['category'],
      where: Object.keys(tenantWhere).length > 0 ? tenantWhere : undefined,
      _count: true,
    }),
    prisma.ticket.groupBy({
      by: ['priority'],
      where: Object.keys(tenantWhere).length > 0 ? tenantWhere : undefined,
      _count: true,
    }),
    prisma.ticket.findMany({
      where: {
        ...tenantWhere,
        status: 'RESOLVED',
        resolvedAt: { not: { equals: null } },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    }),
  ])

  // Calcular tiempo promedio de resolucion
  let avgResolutionTime: number | undefined
  if (resolvedTickets.length > 0) {
    const totalHours = resolvedTickets.reduce((sum, t) => {
      if (t.createdAt && t.resolvedAt) {
        return sum + (t.resolvedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60)
      }
      return sum
    }, 0)
    avgResolutionTime = totalHours / resolvedTickets.length
  }

  const stats: HelpdeskStats = {
    open: statusCounts.find((s) => s.status === 'OPEN')?._count ?? 0,
    inProgress: statusCounts.find((s) => s.status === 'IN_PROGRESS')?._count ?? 0,
    resolved: statusCounts.find((s) => s.status === 'RESOLVED')?._count ?? 0,
    closed: statusCounts.find((s) => s.status === 'CLOSED')?._count ?? 0,
    total: statusCounts.reduce((sum, s) => sum + s._count, 0),
    avgResolutionTime,
    byCategory: {
      technical: categoryCounts.find((c) => c.category === 'TECHNICAL')?._count ?? 0,
      operational: categoryCounts.find((c) => c.category === 'OPERATIONAL')?._count ?? 0,
    },
    byPriority: {
      low: priorityCounts.find((p) => p.priority === 'LOW')?._count ?? 0,
      normal: priorityCounts.find((p) => p.priority === 'NORMAL')?._count ?? 0,
      high: priorityCounts.find((p) => p.priority === 'HIGH')?._count ?? 0,
    },
  }

  return stats
}

/**
 * Actualizar prioridad confirmada (desde Telegram)
 */
export const updateConfirmedPriority = async (
  ticketId: string,
  priority: TicketPriority
): Promise<Ticket> => {
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      confirmedPriority: priority as PrismaTicketPriority,
    },
  })

  AppLogger.info(`Ticket ${ticketId} prioridad confirmada: ${priority}`)

  webSocketService.emitPriorityChange(ticketId, updated.priority, priority, updated.createdBy)

  return updated as unknown as Ticket
}

/**
 * Actualizar prioridad del ticket (desde plataforma web por RESOLVER)
 */
export const updatePriority = async (
  ticketId: string,
  priority: TicketPriority
): Promise<Ticket> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  })

  if (!ticket) {
    throw new Error('TICKET_NOT_FOUND')
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      priority: priority as PrismaTicketPriority,
    },
  })

  AppLogger.info(`Ticket ${ticketId} prioridad actualizada a: ${priority}`)

  webSocketService.emitPriorityChange(ticketId, ticket.priority as TicketPriority, priority, updated.createdBy)

  return updated as unknown as Ticket
}

/**
 * Asignar ticket
 */
export const assignTicket = async (
  ticketId: string,
  assignedTo: string
): Promise<Ticket> => {
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedTo },
  })

  AppLogger.info(`Ticket ${ticketId} asignado a ${assignedTo}`)

  return updated as unknown as Ticket
}

/**
 * Actualizar Telegram topic ID
 */
export const updateTelegramTopic = async (
  ticketId: string,
  topicId: number,
  groupId: string
): Promise<Ticket> => {
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      telegramTopicId: topicId,
      telegramGroupId: groupId,
    },
  })

  return updated as unknown as Ticket
}

/**
 * Obtener tickets listos para auto-cierre (RESOLVED > 72hs)
 */
export const getTicketsForAutoClose = async (hoursThreshold: number = 72): Promise<Ticket[]> => {
  const threshold = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000)

  const tickets = await prisma.ticket.findMany({
    where: {
      status: 'RESOLVED',
      resolvedAt: { lt: threshold },
    },
  })

  return tickets as unknown as Ticket[]
}

/**
 * Auto-cerrar ticket
 */
export const autoCloseTicket = async (ticketId: string): Promise<Ticket> => {
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: PrismaTicketStatus.CLOSED,
      closedAt: new Date(),
    },
  })

  // Crear mensaje de sistema
  await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderType: PrismaMessageSenderType.SYSTEM,
      senderName: 'Sistema',
      content: 'Ticket cerrado automaticamente por inactividad.',
    },
  })

  AppLogger.info(`Ticket ${ticketId} auto-cerrado`)

  webSocketService.emitStatusChange(ticketId, 'CLOSED', 'system', updated.createdBy)
  await helpdeskInternalNotificationService.notifyTicketClosedToUser(updated as unknown as Ticket, 'Sistema')

  return updated as unknown as Ticket
}

export const ticketService = {
  create: createTicket,
  attachFilesToFirstUserMessage,
  getById: getTicketById,
  getByNumber: getTicketByNumber,
  getByUser: getTicketsByUser,
  getAll: getAllTickets,
  updateStatus: updateTicketStatus,
  close: closeTicket,
  reopen: reopenTicket,
  getStats,
  updateConfirmedPriority,
  updatePriority,
  assign: assignTicket,
  updateTelegramTopic,
  getForAutoClose: getTicketsForAutoClose,
  autoClose: autoCloseTicket,
};

export default ticketService
