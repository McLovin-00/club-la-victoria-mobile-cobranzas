/**
 * Message Factory for Unit Tests
 * Provides factory functions to create test message data
 */

import { TicketMessage, MessageSenderType } from '@helpdesk/prisma-client';
import { buildAttachment, buildImageAttachment, buildDocumentAttachment, AttachmentBuildResult } from './attachment.factory';

type MessageWithoutRelations = Omit<TicketMessage, 'ticket' | 'attachments'>;

let messageCounter = 0;

function generateMessageId(): string {
  messageCounter += 1;
  return `clxMsg${String(messageCounter).padStart(21, 'x')}`;
}

export interface MessageBuildOptions {
  id?: string;
  ticketId?: string;
  senderType?: MessageSenderType;
  senderId?: string | null;
  senderName?: string;
  content?: string;
  telegramMessageId?: number | null;
  createdAt?: Date;
  /** Include attachments (will create mock attachments) */
  withAttachments?: boolean;
  /** Number of attachments to include */
  attachmentCount?: number;
  /** Type of attachments: 'image', 'document', or 'mixed' */
  attachmentType?: 'image' | 'document' | 'mixed';
}

export interface MessageWithAttachments {
  message: MessageWithoutRelations;
  attachments: AttachmentBuildResult[];
}

/**
 * Build a single message with default values
 */
export function buildMessage(options: MessageBuildOptions = {}): MessageWithoutRelations {
  const now = new Date();
  
  return {
    id: options.id ?? generateMessageId(),
    ticketId: options.ticketId ?? 'clxTicket0000000000000000',
    senderType: options.senderType ?? 'USER',
    senderId: options.senderId ?? '1',
    senderName: options.senderName ?? 'Test User',
    content: options.content ?? 'This is a test message',
    telegramMessageId: options.telegramMessageId ?? null,
    createdAt: options.createdAt ?? now,
  };
}

/**
 * Build multiple messages with default values
 */
export function buildMessageList(count: number, options: MessageBuildOptions = {}): MessageWithoutRelations[] {
  return Array.from({ length: count }, (_, index) => 
    buildMessage({
      ...options,
      content: options.content ? `${options.content} #${index + 1}` : `Test message #${index + 1}`,
    })
  );
}

/**
 * Build a message with attachments
 */
export function buildMessageWithAttachments(options: MessageBuildOptions = {}): MessageWithAttachments {
  const message = buildMessage(options);
  const attachmentCount = options.attachmentCount ?? 1;
  const attachments: AttachmentBuildResult[] = [];
  
  for (let i = 0; i < attachmentCount; i++) {
    if (options.attachmentType === 'image') {
      attachments.push(buildImageAttachment({ messageId: message.id }));
    } else if (options.attachmentType === 'document') {
      attachments.push(buildDocumentAttachment({ messageId: message.id }));
    } else {
      // mixed
      attachments.push(i % 2 === 0 
        ? buildImageAttachment({ messageId: message.id })
        : buildDocumentAttachment({ messageId: message.id })
      );
    }
  }
  
  return { message, attachments };
}

/**
 * Build a message from a user
 */
export function buildUserMessage(options: MessageBuildOptions = {}): MessageWithoutRelations {
  return buildMessage({
    ...options,
    senderType: 'USER',
    senderId: options.senderId ?? '1',
    senderName: options.senderName ?? 'Regular User',
  });
}

/**
 * Build a message from a resolver
 */
export function buildResolverMessage(options: MessageBuildOptions = {}): MessageWithoutRelations {
  return buildMessage({
    ...options,
    senderType: 'RESOLVER',
    senderId: options.senderId ?? 'resolver-1',
    senderName: options.senderName ?? 'Resolver Name',
  });
}

/**
 * Build a system message (auto-generated)
 */
export function buildSystemMessage(options: MessageBuildOptions = {}): MessageWithoutRelations {
  return buildMessage({
    ...options,
    senderType: 'SYSTEM',
    senderId: null,
    senderName: 'Sistema',
    content: options.content ?? 'Ticket creado',
  });
}

/**
 * Build a message from Telegram
 */
export function buildTelegramMessage(options: MessageBuildOptions = {}): MessageWithoutRelations {
  return buildMessage({
    ...options,
    telegramMessageId: options.telegramMessageId ?? 12345,
  });
}

/**
 * Build an initial ticket message (first message when ticket is created)
 */
export function buildInitialMessage(ticketId: string, content: string = 'Initial ticket message'): MessageWithoutRelations {
  return buildUserMessage({
    ticketId,
    content,
    senderType: 'USER',
  });
}

/**
 * Build a ticket closed system message
 */
export function buildTicketClosedMessage(ticketId: string): MessageWithoutRelations {
  return buildSystemMessage({
    ticketId,
    content: 'Ticket cerrado',
  });
}

/**
 * Build a ticket reopened system message
 */
export function buildTicketReopenedMessage(ticketId: string): MessageWithoutRelations {
  return buildSystemMessage({
    ticketId,
    content: 'Ticket reabierto',
  });
}

/**
 * Build a message with image attachments
 */
export function buildMessageWithImages(imageCount: number = 1, options: MessageBuildOptions = {}): MessageWithAttachments {
  return buildMessageWithAttachments({
    ...options,
    attachmentCount: imageCount,
    attachmentType: 'image',
  });
}

/**
 * Build a message with document attachments
 */
export function buildMessageWithDocuments(docCount: number = 1, options: MessageBuildOptions = {}): MessageWithAttachments {
  return buildMessageWithAttachments({
    ...options,
    attachmentCount: docCount,
    attachmentType: 'document',
  });
}

/**
 * Reset the message counter (useful for test isolation)
 */
export function resetMessageCounter(): void {
  messageCounter = 0;
}
