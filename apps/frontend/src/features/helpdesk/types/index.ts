// Types for helpdesk feature

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type TicketCategory = 'TECHNICAL' | 'OPERATIONAL';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH';
/** Origen del ticket: Web o Telegram */
export type TicketSource = 'platform' | 'telegram';

/** Subcategorías alineadas con el schema Zod del microservicio helpdesk. */
export type TicketSubcategory = 'ERROR' | 'DOUBT' | 'SUGGESTION' | 'BUSINESS_RULE';

/** Cuerpo para POST /api/helpdesk/tickets (crear ticket). */
export interface CreateTicketPayload {
  category: TicketCategory;
  subcategory: TicketSubcategory;
  subject: string;
  priority: TicketPriority;
  message: string;
}

export interface Ticket {
  id: string;
  number: number;
  empresaId?: number | null;
  empresaNombre?: string | null;
  category: TicketCategory;
  subcategory: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  confirmedPriority?: TicketPriority;
  source: 'platform' | 'telegram';
  createdBy: number;
  createdByName: string;
  assignedTo?: string;
  telegramTopicId?: number;
  telegramGroupId?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  content: string;
  senderType: 'USER' | 'RESOLVER' | 'SYSTEM';
  senderId: string;
  senderName: string;
  createdAt: Date;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface ResolverConfig {
  id?: number;
  category: TicketCategory;
  telegramGroupId: string;
  telegramGroupName?: string | null;
  resolverNames: string[];
  isActive: boolean;
}

export interface UpdateResolverConfigPayload {
  telegramGroupId: string;
  telegramGroupName?: string;
  resolverNames: string[];
  isActive: boolean;
}

export interface HelpdeskUnreadSummary {
  unreadTickets: number;
  unreadMessages: number;
}

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  search?: string;
  from?: Date;
  to?: Date;
}

export interface PaginatedTicketsResponse {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HelpdeskStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  total: number;
  avgResolutionTime?: number;
  byCategory: {
    technical: number;
    operational: number;
  };
  byPriority: {
    low: number;
    normal: number;
    high: number;
  };
}
