/**
 * Ticket Formatter Utility
 * Centralizes all ticket-related formatting for consistency
 */

import type { Ticket, TicketStatus, TicketPriority } from '../types';

/**
 * Formats ticket number with leading zeros (e.g., 1 -> "001")
 */
export function formatTicketNumber(number: number): string {
  return number.toString().padStart(3, '0');
}

/**
 * Formats full ticket reference with hash (e.g., "#001")
 */
export function formatTicketReference(number: number): string {
  return `#${formatTicketNumber(number)}`;
}

/**
 * Get emoji for ticket status
 */
export function getStatusEmoji(status: TicketStatus): string {
  const emojis: Record<TicketStatus, string> = {
    OPEN: '🟢',
    IN_PROGRESS: '🟡',
    RESOLVED: '🔵',
    CLOSED: '⚫',
  };
  return emojis[status] || '❓';
}

/**
 * Get emoji for ticket priority
 */
export function getPriorityEmoji(priority: TicketPriority): string {
  const emojis: Record<TicketPriority, string> = {
    LOW: '🟢',
    NORMAL: '🟡',
    HIGH: '🔴',
  };
  return emojis[priority] || '➡️';
}

/**
 * Get label for priority (for display in Spanish)
 */
export function getPriorityLabel(priority: TicketPriority): string {
  const labels: Record<TicketPriority, string> = {
    LOW: 'Baja',
    NORMAL: 'Normal',
    HIGH: 'Alta',
  };
  return labels[priority] || priority;
}

/**
 * Format ticket info for Telegram messages
 * Replaces duplicate implementations across handlers
 */
export function formatTicketInfo(ticket: Ticket): string {
  const statusEmoji = getStatusEmoji(ticket.status as TicketStatus);
  const priorityEmoji = getPriorityEmoji((ticket.confirmedPriority || ticket.priority) as TicketPriority);
  const priorityLabel = getPriorityLabel((ticket.confirmedPriority || ticket.priority) as TicketPriority);

  return `
${statusEmoji} <b>Ticket ${formatTicketReference(ticket.number)}</b>

📝 <b>Asunto:</b> ${ticket.subject}
📂 <b>Categoría:</b> ${ticket.category === 'TECHNICAL' ? 'Técnica' : 'Operativa'}
${priorityEmoji} <b>Prioridad:</b> ${priorityLabel}
👤 <b>Creado por:</b> ${ticket.createdByName}
📅 <b>Fecha:</b> ${ticket.createdAt.toLocaleDateString('es-AR')}
${ticket.assignedTo ? `✅ <b>Asignado a:</b> ${ticket.assignedTo}` : ''}
  `.trim();
}

/**
 * Format ticket subject with truncation for previews
 */
export function formatTicketSubjectPreview(subject: string, maxLength: number = 40): string {
  if (subject.length <= maxLength) return subject;
  return subject.substring(0, maxLength) + '...';
}

/**
 * Format ticket for list display in Telegram
 */
export function formatTicketListItem(ticket: Ticket): string {
  const statusEmoji = getStatusEmoji(ticket.status as TicketStatus);
  const priorityEmoji = getPriorityEmoji((ticket.confirmedPriority || ticket.priority) as TicketPriority);
  const subjectPreview = formatTicketSubjectPreview(ticket.subject);
  const priorityLabel = getPriorityLabel((ticket.confirmedPriority || ticket.priority) as TicketPriority);

  return `${statusEmoji} <b>${formatTicketReference(ticket.number)}</b> - ${subjectPreview}
   ${priorityEmoji} ${priorityLabel} | ${ticket.createdAt.toLocaleDateString('es-AR')}`;
}

/**
 * Format new ticket notification for resolver groups
 */
export function formatNewTicketMessage(
  number: number,
  subcategory: string,
  subject: string,
  priority: TicketPriority,
  message: string,
  userName: string
): string {
  const priorityEmoji = getPriorityEmoji(priority);

  return `
🆕 <b>NUEVO TICKET ${formatTicketReference(number)}</b>

📝 <b>Asunto:</b> ${subject}
📂 <b>Subcategoría:</b> ${subcategory}
${priorityEmoji} <b>Prioridad:</b> ${priority}
👤 <b>Usuario:</b> ${userName}

📄 <b>Mensaje:</b>
${message}

---
<i>/asignar @usuario | /prioridad ALTA|NORMAL|BAJA | /info</i>
  `.trim();
}

export const ticketFormatter = {
  formatTicketNumber,
  formatTicketReference,
  getStatusEmoji,
  getPriorityEmoji,
  getPriorityLabel,
  formatTicketInfo,
  formatTicketSubjectPreview,
  formatTicketListItem,
  formatNewTicketMessage,
};

export default ticketFormatter;
