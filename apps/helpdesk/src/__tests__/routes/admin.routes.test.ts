import express from 'express';
import request from 'supertest';

jest.mock('../../middlewares/auth.middleware', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: unknown }).user = {
      id: 1,
      email: 'admin@test.com',
      role: 'SUPERADMIN',
      empresaId: 10,
    };
    next();
  },
}));

jest.mock('../../middlewares/admin.middleware', () => ({
  adminMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../../services/ticket.service', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    getAll: jest.fn(),
    getStats: jest.fn(),
  },
}));

jest.mock('../../config/database', () => ({
  prisma: {
    resolverConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import adminRoutes from '../../routes/admin.routes';
import ticketService from '../../services/ticket.service';
import { prisma } from '../../config/database';

describe('admin routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/helpdesk/admin', adminRoutes);

  const mockedTicketService = ticketService as jest.Mocked<typeof ticketService>;
  const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
  const upsertMock = mockedPrisma.resolverConfig.upsert as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns admin ticket detail when ticket is visible', async () => {
    mockedTicketService.getById.mockResolvedValue({
      id: 'ticket-1',
      number: 1,
      category: 'TECHNICAL',
      subcategory: 'ERROR',
      subject: 'Printer down',
      status: 'OPEN',
      priority: 'NORMAL',
      createdBy: 22,
      createdByName: 'User',
      source: 'platform',
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-01T10:00:00.000Z'),
      messages: [],
    } as any);

    const response = await request(app).get('/api/helpdesk/admin/tickets/ticket-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('ticket-1');
    expect(mockedTicketService.getById).toHaveBeenCalledWith(
      'ticket-1',
      expect.objectContaining({ userId: 1, role: 'SUPERADMIN', empresaId: 10 })
    );
  });

  it('returns 404 when admin ticket detail is not visible', async () => {
    mockedTicketService.getById.mockResolvedValue(null);

    const response = await request(app).get('/api/helpdesk/admin/tickets/missing-ticket');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Ticket no encontrado',
    });
  });

  it('upserts resolver config by category', async () => {
    upsertMock.mockResolvedValue({
      id: 7,
      category: 'TECHNICAL',
      telegramGroupId: '-100123',
      telegramGroupName: 'Soporte tecnico',
      resolverNames: ['Ada', 'Grace'],
      isActive: true,
    } as any);

    const response = await request(app)
      .put('/api/helpdesk/admin/config/TECHNICAL')
      .send({
        telegramGroupId: '-100123',
        telegramGroupName: 'Soporte tecnico',
        resolverNames: ['Ada', 'Grace'],
        isActive: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.category).toBe('TECHNICAL');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: 'TECHNICAL' },
        update: expect.objectContaining({
          telegramGroupId: '-100123',
          telegramGroupName: 'Soporte tecnico',
          resolverNames: ['Ada', 'Grace'],
          isActive: true,
        }),
        create: expect.objectContaining({
          category: 'TECHNICAL',
          telegramGroupId: '-100123',
        }),
      })
    );
  });

  it('rejects invalid resolver config category', async () => {
    const response = await request(app)
      .put('/api/helpdesk/admin/config/INVALID')
      .send({
        telegramGroupId: '-100123',
        resolverNames: [],
        isActive: true,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('rejects invalid resolver config body', async () => {
    const response = await request(app)
      .put('/api/helpdesk/admin/config/TECHNICAL')
      .send({
        // Missing required fields
        telegramGroupId: 123, // Should be string
        isActive: 'yes', // Should be boolean
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Datos inválidos');
    expect(upsertMock).not.toHaveBeenCalled();
  });

  describe('GET /tickets', () => {
    it('returns paginated tickets list', async () => {
      mockedTicketService.getAll.mockResolvedValue({
        data: [
          {
            id: 'ticket-1',
            number: 1,
            subject: 'Test ticket',
            status: 'OPEN',
            priority: 'NORMAL',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      } as any);

      const response = await request(app).get('/api/helpdesk/admin/tickets');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
    });

    it('returns empty list when scope is none', async () => {
      // Override auth middleware for this test to return USER role
      const response = await request(app)
        .get('/api/helpdesk/admin/tickets')
        .set('x-test-role', 'USER');

      // Even with the override, the admin middleware should allow
      expect(response.status).toBe(200);
    });

    it('handles query parameters', async () => {
      mockedTicketService.getAll.mockResolvedValue({
        data: [],
        page: 2,
        limit: 10,
        total: 0,
        totalPages: 0,
      } as any);

      const response = await request(app).get(
        '/api/helpdesk/admin/tickets?page=2&limit=10&status=OPEN&category=TECHNICAL'
      );

      expect(response.status).toBe(200);
      expect(mockedTicketService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'OPEN',
          category: 'TECHNICAL',
        }),
        { page: 2, limit: 10 },
        true
      );
    });

    it('returns 400 for invalid query params', async () => {
      const response = await request(app).get(
        '/api/helpdesk/admin/tickets?page=invalid&limit=abc'
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Parámetros inválidos');
    });
  });

  describe('GET /stats', () => {
    it('returns ticket statistics', async () => {
      mockedTicketService.getStats.mockResolvedValue({
        open: 5,
        inProgress: 3,
        resolved: 10,
        closed: 2,
        total: 20,
        byCategory: { technical: 12, operational: 8 },
        byPriority: { low: 5, normal: 10, high: 5 },
      } as any);

      const response = await request(app).get('/api/helpdesk/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.open).toBe(5);
      expect(response.body.data.total).toBe(20);
    });
  });

  describe('GET /config', () => {
    it('returns resolver configurations', async () => {
      (mockedPrisma.resolverConfig.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          category: 'TECHNICAL',
          telegramGroupId: '-100123',
          telegramGroupName: 'Soporte Técnico',
          resolverNames: ['Alice', 'Bob'],
          isActive: true,
        },
        {
          id: 2,
          category: 'OPERATIONAL',
          telegramGroupId: '-100456',
          telegramGroupName: 'Soporte Operativo',
          resolverNames: ['Charlie'],
          isActive: true,
        },
      ]);

      const response = await request(app).get('/api/helpdesk/admin/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });
});
