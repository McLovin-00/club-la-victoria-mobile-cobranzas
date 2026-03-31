jest.mock('../../config/database', () => ({
  prisma: {
    $executeRawUnsafe: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  },
}));

import { prisma } from '../../config/database';
import {
  getUnreadSummaryForViewer,
  markTicketAsRead,
} from '../../services/ticket-read-state.service';

describe('ticket-read-state.service', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upserts read state for a ticket and user', async () => {
    (mockPrisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(1);
    const readAt = new Date('2026-03-24T12:00:00.000Z');

    await markTicketAsRead('ticket-123', 55, readAt);

    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "ticket_read_states"'),
      'ticket-123',
      55,
      readAt
    );
  });

  it('returns unread summary for regular users', async () => {
    (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
      { unread_tickets: BigInt(2), unread_messages: BigInt(5) },
    ]);

    const result = await getUnreadSummaryForViewer({
      userId: 10,
      role: 'DADOR_DE_CARGA',
      empresaId: 77,
    });

    expect(result).toEqual({ unreadTickets: 2, unreadMessages: 5 });
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('t."createdBy" = 10'),
      '10',
      10
    );
  });

  it('returns unread summary scoped by tenant for admins', async () => {
    (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
      { unread_tickets: 1, unread_messages: 3 },
    ]);

    const result = await getUnreadSummaryForViewer({
      userId: 99,
      role: 'ADMIN',
      empresaId: 22,
    });

    expect(result).toEqual({ unreadTickets: 1, unreadMessages: 3 });
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('t.empresa_id = 22'),
      '99',
      99
    );
  });
});
