/**
 * Unit Tests for Ticket Formatter Utility
 */

import {
  formatTicketNumber,
  formatTicketReference,
  getStatusEmoji,
  getPriorityEmoji,
  getPriorityLabel,
  formatTicketInfo,
  formatTicketSubjectPreview,
  formatTicketListItem,
  formatNewTicketMessage,
} from '../../utils/ticket-formatter';
import type { Ticket, TicketStatus, TicketPriority } from '../../types';

describe('Ticket Formatter', () => {
  describe('formatTicketNumber', () => {
    test('should format single digit with leading zeros', () => {
      expect(formatTicketNumber(1)).toBe('001');
      expect(formatTicketNumber(5)).toBe('005');
    });

    test('should format double digit with leading zero', () => {
      expect(formatTicketNumber(10)).toBe('010');
      expect(formatTicketNumber(99)).toBe('099');
    });

    test('should not add zeros to triple digit', () => {
      expect(formatTicketNumber(100)).toBe('100');
      expect(formatTicketNumber(999)).toBe('999');
    });

    test('should handle larger numbers', () => {
      expect(formatTicketNumber(1234)).toBe('1234');
    });
  });

  describe('formatTicketReference', () => {
    test('should format with hash prefix', () => {
      expect(formatTicketReference(1)).toBe('#001');
      expect(formatTicketReference(42)).toBe('#042');
      expect(formatTicketReference(100)).toBe('#100');
    });
  });

  describe('getStatusEmoji', () => {
    test('should return correct emoji for OPEN', () => {
      expect(getStatusEmoji('OPEN')).toBe('🟢');
    });

    test('should return correct emoji for IN_PROGRESS', () => {
      expect(getStatusEmoji('IN_PROGRESS')).toBe('🟡');
    });

    test('should return correct emoji for RESOLVED', () => {
      expect(getStatusEmoji('RESOLVED')).toBe('🔵');
    });

    test('should return correct emoji for CLOSED', () => {
      expect(getStatusEmoji('CLOSED')).toBe('⚫');
    });

    test('should return question mark for unknown status', () => {
      expect(getStatusEmoji('UNKNOWN' as TicketStatus)).toBe('❓');
    });
  });

  describe('getPriorityEmoji', () => {
    test('should return correct emoji for LOW', () => {
      expect(getPriorityEmoji('LOW')).toBe('🟢');
    });

    test('should return correct emoji for NORMAL', () => {
      expect(getPriorityEmoji('NORMAL')).toBe('🟡');
    });

    test('should return correct emoji for HIGH', () => {
      expect(getPriorityEmoji('HIGH')).toBe('🔴');
    });

    test('should return arrow for unknown priority', () => {
      expect(getPriorityEmoji('UNKNOWN' as TicketPriority)).toBe('➡️');
    });
  });

  describe('getPriorityLabel', () => {
    test('should return Spanish label for LOW', () => {
      expect(getPriorityLabel('LOW')).toBe('Baja');
    });

    test('should return Spanish label for NORMAL', () => {
      expect(getPriorityLabel('NORMAL')).toBe('Normal');
    });

    test('should return Spanish label for HIGH', () => {
      expect(getPriorityLabel('HIGH')).toBe('Alta');
    });

    test('should return original value for unknown priority', () => {
      expect(getPriorityLabel('UNKNOWN' as TicketPriority)).toBe('UNKNOWN');
    });
  });

  describe('formatTicketInfo', () => {
    const createMockTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
      id: 'ticket-1',
      number: 1,
      subject: 'Test Subject',
      category: 'TECHNICAL',
      status: 'OPEN',
      priority: 'NORMAL',
      createdByName: 'John Doe',
      createdAt: new Date('2024-01-15'),
      ...overrides,
    } as Ticket);

    test('should format ticket with all fields', () => {
      const ticket = createMockTicket({
        assignedTo: 'Jane Smith',
      });
      
      const result = formatTicketInfo(ticket);
      
      expect(result).toContain('🟢');
      expect(result).toContain('<b>Ticket #001</b>');
      expect(result).toContain('Test Subject');
      expect(result).toContain('Técnica');
      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Smith');
    });

    test('should format ticket without assignedTo', () => {
      const ticket = createMockTicket();
      
      const result = formatTicketInfo(ticket);
      
      expect(result).not.toContain('Asignado a:');
    });

    test('should use OPERATIVA category label', () => {
      const ticket = createMockTicket({ category: 'OPERATIONAL' });
      
      const result = formatTicketInfo(ticket);
      
      expect(result).toContain('Operativa');
    });

    test('should use confirmedPriority if available', () => {
      const ticket = createMockTicket({ 
        priority: 'LOW',
        confirmedPriority: 'HIGH' 
      });
      
      const result = formatTicketInfo(ticket);
      
      expect(result).toContain('🔴');
      expect(result).toContain('Alta');
    });
  });

  describe('formatTicketSubjectPreview', () => {
    test('should return subject as-is if under max length', () => {
      expect(formatTicketSubjectPreview('Short subject')).toBe('Short subject');
    });

    test('should truncate and add ellipsis if over max length', () => {
      const longSubject = 'This is a very long subject that exceeds the default maximum length';
      const result = formatTicketSubjectPreview(longSubject);
      
      // substring(0, 40) + '...' = 43 total chars
      expect(result).toBe('This is a very long subject that exceeds...');
      expect(result.length).toBe(43); // 40 + 3 for '...'
    });

    test('should use custom max length', () => {
      const subject = 'Hello World';
      expect(formatTicketSubjectPreview(subject, 5)).toBe('Hello...');
    });

    test('should handle exact length', () => {
      const subject = '1234567890'; // exactly 10 chars
      expect(formatTicketSubjectPreview(subject, 10)).toBe('1234567890');
    });
  });

  describe('formatTicketListItem', () => {
    const createMockTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
      id: 'ticket-1',
      number: 42,
      subject: 'Test Subject',
      category: 'TECHNICAL',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      createdAt: new Date('2024-01-15'),
      ...overrides,
    } as Ticket);

    test('should format ticket list item', () => {
      const ticket = createMockTicket();
      
      const result = formatTicketListItem(ticket);
      
      expect(result).toContain('🟡'); // IN_PROGRESS emoji
      expect(result).toContain('#042');
      expect(result).toContain('Test Subject');
      expect(result).toContain('🔴'); // HIGH priority
    });

    test('should truncate long subject', () => {
      const ticket = createMockTicket({
        subject: 'This is a very long subject that should be truncated for the preview',
      });
      
      const result = formatTicketListItem(ticket);
      
      expect(result).toContain('...');
    });
  });

  describe('formatNewTicketMessage', () => {
    test('should format new ticket notification', () => {
      const result = formatNewTicketMessage(
        123,
        'Hardware',
        'Computer not working',
        'HIGH',
        'Please help, my computer is broken',
        'John Doe'
      );
      
      expect(result).toContain('🆕');
      expect(result).toContain('<b>NUEVO TICKET #123</b>');
      expect(result).toContain('Computer not working');
      expect(result).toContain('Hardware');
      expect(result).toContain('🔴'); // HIGH priority
      expect(result).toContain('John Doe');
      expect(result).toContain('Please help, my computer is broken');
      expect(result).toContain('/asignar');
      expect(result).toContain('/prioridad');
      expect(result).toContain('/info');
    });

    test('should format with LOW priority', () => {
      const result = formatNewTicketMessage(
        1,
        'Software',
        'Minor issue',
        'LOW',
        'Small bug',
        'Jane'
      );
      
      expect(result).toContain('🟢'); // LOW priority
    });

    test('should format with NORMAL priority', () => {
      const result = formatNewTicketMessage(
        1,
        'Network',
        'Connection issue',
        'NORMAL',
        'Cannot connect',
        'Bob'
      );
      
      expect(result).toContain('🟡'); // NORMAL priority
    });
  });
});
