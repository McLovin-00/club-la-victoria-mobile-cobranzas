// ============================================
// TICKET TYPES
// ============================================

export type TicketCategory = 'TECHNICAL' | 'OPERATIONAL';
export type TicketSubcategory = 'ERROR' | 'DOUBT' | 'SUGGESTION' | 'BUSINESS_RULE';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface Ticket {
  id: string;
  number: number;
  /** Empresa (tenant) de plataforma; null en registros previos a multi-tenant */
  empresaId?: number | null;
  /** Nombre de la empresa para RESOLVER (campo denormalizado) */
  empresaNombre?: string | null;
  category: TicketCategory;
  subcategory: TicketSubcategory;
  subject: string;
  status: TicketStatus
  priority: TicketPriority;
  confirmedPriority?: TicketPriority
  createdBy: number;
  createdByName: string;
  assignedTo?: string
  telegramTopicId?: number;
  telegramGroupId?: string;
  source: string
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketWithMessages extends Ticket {
  messages: TicketMessage[];
}

// ============================================
// EXTENDED TYPES FOR API RESPONSE
// ============================================

/** Ticket con nombre de empresa para RESOLVER (campo denormalizado) */
export interface TicketWithEmpresa extends Ticket {
  empresaNombre?: string | null;
}

// ============================================
// MESSAGE TYPES
// ============================================

export type MessageSenderType = 'USER' | 'RESOLVER' | 'SYSTEM';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: MessageSenderType;
  senderId?: string;
  senderName: string;
  content: string;
  telegramMessageId?: number;
  createdAt: Date;
  attachments?: MessageAttachment[];
}

// ============================================
// ATTACHMENT TYPES
// ============================================

export type AttachmentType = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';

export interface MessageAttachment {
  id: string;
  messageId: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  size: number;
  minioKey: string;
  minioUrl?: string;
  createdAt: Date;
}

// ============================================
// API TYPES
// ============================================

export interface CreateTicketInput {
  category: TicketCategory;
  subcategory: TicketSubcategory;
  subject: string;
  priority: TicketPriority;
  message: string;
}

export interface CreateMessageInput {
  content: string;
  attachments?: Express.Multer.File[];
}

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  search?: string;
  from?: Date;
  to?: Date;
  /** Filtro por tenant (listados admin / staff) */
  empresaId?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

export interface TicketMessageEvent {
  ticketId: string;
  message: TicketMessage;
}

export interface TicketStatusEvent {
  ticketId: string;
  status: TicketStatus;
  changedBy: string;
  changedAt: Date;
}

export interface TicketPriorityEvent {
  ticketId: string;
  priority: TicketPriority;
  confirmedPriority?: TicketPriority;
}

export type WebSocketEvent = 
  | { type: 'ticketMessage'; payload: TicketMessageEvent }
  | { type: 'ticketStatusChange'; payload: TicketStatusEvent }
  | { type: 'ticketPriorityChange'; payload: TicketPriorityEvent };

// ============================================
// TELEGRAM TYPES
// ============================================

export interface TelegramUserContext {
  telegramId: number;
  telegramUsername?: string;
  userId?: number;
  state?: TelegramConversationState;
  tempTicketData?: Partial<CreateTicketInput>;
}

export interface TelegramConversationState {
  step: 'idle' | 'awaiting_category' | 'awaiting_subcategory' | 'awaiting_subject' | 'awaiting_priority' | 'awaiting_message' | 'ticket_created';
  ticketId?: string;
}

// ============================================
// STATS TYPES
// ============================================

export interface HelpdeskStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  total: number;
  avgResolutionTime?: number; // en horas
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

// ============================================
// AUTH TYPES
// ============================================

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  nombre?: string;
  apellido?: string;
  empresaId?: number;
}

/** Contexto para comprobar visibilidad de ticket (JWT plataforma) */
export interface TicketViewerContext {
  userId: number;
  role: string;
  empresaId?: number | null;
}
