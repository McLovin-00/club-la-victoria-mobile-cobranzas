/**
 * Ticket Factory for Unit Tests
 * Provides factory functions to create test ticket data
 */

import { Ticket, TicketStatus, TicketCategory, TicketSubcategory, TicketPriority } from '@helpdesk/prisma-client';

type TicketWithoutRelations = Omit<Ticket, 'messages' | 'readStates'>;

let ticketCounter = 0;

function generateTicketId(): string {
  ticketCounter += 1;
  return `clxTicket${String(ticketCounter).padStart(20, 'x')}`;
}

function generateTicketNumber(): number {
  return ticketCounter;
}

export interface TicketBuildOptions {
  id?: string;
  number?: number;
  category?: TicketCategory;
  subcategory?: TicketSubcategory;
  subject?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  confirmedPriority?: TicketPriority | null;
  empresaId?: number | null;
  empresaNombre?: string | null;
  createdBy?: number;
  createdByName?: string;
  assignedTo?: string | null;
  telegramTopicId?: number | null;
  telegramGroupId?: string | null;
  source?: string;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Build a single ticket with default values
 */
export function buildTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  const now = new Date();
  
  return {
    id: options.id ?? generateTicketId(),
    number: options.number ?? generateTicketNumber(),
    category: options.category ?? 'TECHNICAL',
    subcategory: options.subcategory ?? 'ERROR',
    subject: options.subject ?? 'Test ticket subject',
    status: options.status ?? 'OPEN',
    priority: options.priority ?? 'NORMAL',
    confirmedPriority: options.confirmedPriority ?? null,
    empresaId: options.empresaId ?? 1,
    empresaNombre: options.empresaNombre ?? 'Test Company',
    createdBy: options.createdBy ?? 1,
    createdByName: options.createdByName ?? 'Test User',
    assignedTo: options.assignedTo ?? null,
    telegramTopicId: options.telegramTopicId ?? null,
    telegramGroupId: options.telegramGroupId ?? null,
    source: options.source ?? 'platform',
    resolvedAt: options.resolvedAt ?? null,
    closedAt: options.closedAt ?? null,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
}

/**
 * Build multiple tickets with default values
 */
export function buildTicketList(count: number, options: TicketBuildOptions = {}): TicketWithoutRelations[] {
  return Array.from({ length: count }, (_, index) => 
    buildTicket({
      ...options,
      number: (options.number ?? ticketCounter - count + 1) + index,
      subject: options.subject ? `${options.subject} #${index + 1}` : `Test ticket #${index + 1}`,
    })
  );
}

/**
 * Build a closed ticket
 */
export function buildClosedTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  const closedAt = options.closedAt ?? new Date();
  return buildTicket({
    ...options,
    status: 'CLOSED',
    closedAt,
    resolvedAt: options.resolvedAt ?? closedAt,
  });
}

/**
 * Build a resolved ticket (not yet closed)
 */
export function buildResolvedTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  return buildTicket({
    ...options,
    status: 'RESOLVED',
    resolvedAt: options.resolvedAt ?? new Date(),
  });
}

/**
 * Build an in-progress ticket
 */
export function buildInProgressTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  return buildTicket({
    ...options,
    status: 'IN_PROGRESS',
  });
}

/**
 * Build a high priority ticket
 */
export function buildHighPriorityTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  return buildTicket({
    ...options,
    priority: 'HIGH',
  });
}

/**
 * Build a low priority ticket
 */
export function buildLowPriorityTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  return buildTicket({
    ...options,
    priority: 'LOW',
  });
}

/**
 * Build a technical category ticket
 */
export function buildTechnicalTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  return buildTicket({
    ...options,
    category: 'TECHNICAL',
    subcategory: options.subcategory ?? 'ERROR',
  });
}

/**
 * Build an operational category ticket
 */
export function buildOperationalTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  return buildTicket({
    ...options,
    category: 'OPERATIONAL',
    subcategory: options.subcategory ?? 'DOUBT',
  });
}

/**
 * Build a ticket from Telegram source
 */
export function buildTelegramTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  return buildTicket({
    ...options,
    source: 'telegram',
    telegramTopicId: options.telegramTopicId ?? 12345,
    telegramGroupId: options.telegramGroupId ?? '-1001234567890',
  });
}

/**
 * Build a ticket with assigned resolver
 */
export function buildAssignedTicket(assignedTo: string, options: TicketBuildOptions = {}): TicketWithoutRelations {
  return buildTicket({
    ...options,
    assignedTo,
    status: options.status ?? 'IN_PROGRESS',
  });
}

/**
 * Build a ticket that can be reopened (closed within 72 hours)
 */
export function buildReopenableTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  const closedAt = new Date();
  closedAt.setHours(closedAt.getHours() - 24); // 24 hours ago
  
  return buildClosedTicket({
    ...options,
    closedAt,
    resolvedAt: options.resolvedAt ?? closedAt,
  });
}

/**
 * Build a ticket that cannot be reopened (closed more than 72 hours ago)
 */
export function buildExpiredTicket(options: TicketBuildOptions = {}): TicketWithoutRelations {
  const closedAt = new Date();
  closedAt.setHours(closedAt.getHours() - 100); // 100 hours ago
  
  return buildClosedTicket({
    ...options,
    closedAt,
    resolvedAt: options.resolvedAt ?? closedAt,
  });
}

/**
 * Reset the ticket counter (useful for test isolation)
 */
export function resetTicketCounter(): void {
  ticketCounter = 0;
}
