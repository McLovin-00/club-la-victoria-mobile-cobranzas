jest.mock('../../services/ticket.service', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    getById: jest.fn(),
    getByUser: jest.fn(),
    getAll: jest.fn(),
    updateStatus: jest.fn(),
    updatePriority: jest.fn(),
    updateTelegramTopic: jest.fn(),
    close: jest.fn(),
    reopen: jest.fn(),
    attachFilesToFirstUserMessage: jest.fn(),
  },
}));

jest.mock('../../services/telegram.service', () => ({
  __esModule: true,
  default: {
    createTopic: jest.fn(),
    sendToTopic: jest.fn(),
    sendToGroup: jest.fn(),
    getResolverConfig: jest.fn(),
    formatTicketInfo: jest.fn().mockReturnValue('Ticket info'),
  },
}));

jest.mock('../../services/ticket-read-state.service', () => ({
  __esModule: true,
  default: {
    markAsRead: jest.fn().mockResolvedValue(undefined),
    getReadState: jest.fn(),
    getUnreadSummaryForViewer: jest.fn().mockResolvedValue({ total: 0, byCategory: {} }),
  },
}));

const mockNotifyNewTicketToStaff = jest.fn().mockResolvedValue(undefined);
const mockNotifyTicketClosed = jest.fn();
const mockNotifyTicketReopened = jest.fn();

jest.mock('../../services/helpdesk-internal-notification.service', () => ({
  __esModule: true,
  default: {
    notifyNewTicketToStaff: (...args: any[]) => mockNotifyNewTicketToStaff(...args),
    notifyTicketClosed: (...args: any[]) => mockNotifyTicketClosed(...args),
    notifyTicketReopened: (...args: any[]) => mockNotifyTicketReopened(...args),
  },
}));

const mockQueueAttachmentsToResolvers = jest.fn().mockResolvedValue(undefined);
const mockQueueSyncJob = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/helpdesk-media-sync.service', () => ({
  __esModule: true,
  default: {
    queueSyncJob: (...args: any[]) => mockQueueSyncJob(...args),
    queueAttachmentsToResolvers: (...args: any[]) => mockQueueAttachmentsToResolvers(...args),
  },
  helpdeskMediaSyncService: {
    queueAttachmentsToResolvers: (...args: any[]) => mockQueueAttachmentsToResolvers(...args),
  },
}));

const mockResolveStaffTenantScope = jest.fn().mockReturnValue({ kind: 'all' });

jest.mock('../../services/tenant-scope', () => ({
  resolveStaffTenantScope: (...args: any[]) => mockResolveStaffTenantScope(...args),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/viewer-context', () => ({
  buildTicketViewerContext: jest.fn().mockReturnValue({}),
}));

const mockPersistUploadedMessageFiles = jest.fn().mockResolvedValue({ ok: true, attachments: [] });

jest.mock('../../utils/message-attachments', () => ({
  persistUploadedMessageFiles: (...args: any[]) => mockPersistUploadedMessageFiles(...args),
}));

jest.mock('../../bot/utils/telegram-html-escape', () => ({
  escapeTelegramHtml: jest.fn().mockImplementation((s) => s),
}));

const mockBuildInitialTicketMessage = jest.fn().mockReturnValue({ ok: true, message: 'Initial message' });
const mockIsMultipartCreateRequest = jest.fn().mockReturnValue(false);
const mockNormalizeMulterFiles = jest.fn().mockReturnValue([]);
const mockParseMultipartTicketBody = jest.fn();
const mockPrevalidateTicketAttachments = jest.fn().mockReturnValue({ ok: true });
const mockToCreateTicketInput = jest.fn().mockReturnValue({
  category: 'TECHNICAL',
  subcategory: 'ERROR',
  subject: 'Test subject',
  priority: 'NORMAL',
  message: 'Test message',
});

jest.mock('../../controllers/ticket-create.helpers', () => ({
  buildInitialTicketMessage: (...args: any[]) => mockBuildInitialTicketMessage(...args),
  isMultipartCreateRequest: (...args: any[]) => mockIsMultipartCreateRequest(...args),
  normalizeMulterFiles: (...args: any[]) => mockNormalizeMulterFiles(...args),
  parseMultipartTicketBody: (...args: any[]) => mockParseMultipartTicketBody(...args),
  prevalidateTicketAttachments: (...args: any[]) => mockPrevalidateTicketAttachments(...args),
  toCreateTicketInput: (...args: any[]) => mockToCreateTicketInput(...args),
}));

import { Response } from 'express';
import {
  createTicket,
  getMyTickets,
  getTicketById,
  closeTicket,
  reopenTicket,
  updatePriority,
  updateStatus,
  getUnreadSummary,
  markAsRead,
} from '../../controllers/ticket.controller';
import ticketService from '../../services/ticket.service';
import telegramService from '../../services/telegram.service';
import ticketReadStateService from '../../services/ticket-read-state.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

describe('Ticket Controller', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const mockTicket = {
    id: 'ticket-1',
    number: 1,
    category: 'TECHNICAL',
    subcategory: 'ERROR',
    subject: 'Test subject',
    priority: 'NORMAL' as const,
    status: 'OPEN' as const,
    confirmedPriority: null,
    createdBy: 1,
    createdByName: 'Test User',
    empresaId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ticketReadStateService.markAsRead as jest.Mock).mockResolvedValue(undefined);
    (ticketReadStateService.getUnreadSummaryForViewer as jest.Mock).mockResolvedValue({ total: 0, byCategory: {} });
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();

    mockReq = {
      user: { id: 1, email: 'test@test.com', nombre: 'Test', apellido: 'User', role: 'USER' } as any,
      params: {},
      body: {
        category: 'TECHNICAL',
        subcategory: 'ERROR',
        subject: 'Test subject',
        priority: 'NORMAL',
        message: 'Test message',
      },
      query: {},
      files: [],
      headers: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockResolveStaffTenantScope.mockReturnValue({ kind: 'all' });

    (ticketService.create as jest.Mock).mockResolvedValue(mockTicket);
    (ticketService.getById as jest.Mock).mockResolvedValue(mockTicket);
    (ticketService.getByUser as jest.Mock).mockResolvedValue({
      data: [mockTicket],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    (ticketService.getAll as jest.Mock).mockResolvedValue({
      data: [mockTicket],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    (ticketService.updateStatus as jest.Mock).mockResolvedValue(mockTicket);
    (ticketService.updatePriority as jest.Mock).mockResolvedValue(mockTicket);
    (ticketService.close as jest.Mock).mockResolvedValue(mockTicket);
    (ticketService.reopen as jest.Mock).mockResolvedValue({ ...mockTicket, status: 'OPEN' });
    (telegramService.createTopic as jest.Mock).mockResolvedValue({
      topicId: 1,
      groupId: 'group-1',
    });
    mockIsMultipartCreateRequest.mockReturnValue(false);
    mockParseMultipartTicketBody.mockReturnValue({ ok: true, data: mockReq.body });
  });

  describe('createTicket', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    test('should create ticket successfully via JSON', async () => {
      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket creado exitosamente',
        data: mockTicket,
      });
    });

    test('should handle service errors', async () => {
      (ticketService.create as jest.Mock).mockRejectedValue(new Error('DB error'));
      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    test('should handle non-Error throws', async () => {
      (ticketService.create as jest.Mock).mockRejectedValue('string error');
      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    test('should create ticket via multipart with files', async () => {
      mockIsMultipartCreateRequest.mockReturnValue(true);
      mockNormalizeMulterFiles.mockReturnValue([
        {
          fieldname: 'attachments',
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from('test'),
        } as any,
      ]);
      mockPersistUploadedMessageFiles.mockResolvedValue({
        ok: true,
        attachments: [{ type: 'IMAGE', filename: 'test.jpg' }],
      });

      await createTicket(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    test('should handle multipart with invalid parsed fields', async () => {
      mockIsMultipartCreateRequest.mockReturnValue(true);
      mockParseMultipartTicketBody.mockReturnValue({ ok: false, errors: { category: ['Required'] } });

      await createTicket(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should handle multipart with invalid attachments', async () => {
      mockIsMultipartCreateRequest.mockReturnValue(true);
      mockNormalizeMulterFiles.mockReturnValue([{} as any]);
      mockPrevalidateTicketAttachments.mockReturnValue({ ok: false, message: 'Invalid file' });

      await createTicket(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should handle multipart with invalid message build', async () => {
      mockIsMultipartCreateRequest.mockReturnValue(true);
      mockNormalizeMulterFiles.mockReturnValue([]);
      mockBuildInitialTicketMessage.mockReturnValue({ ok: false, message: 'Too short' });

      await createTicket(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should handle multipart file upload failure', async () => {
      mockIsMultipartCreateRequest.mockReturnValue(true);
      mockNormalizeMulterFiles.mockReturnValue([
        {
          fieldname: 'attachments',
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from('test'),
        } as any,
      ]);
      mockPrevalidateTicketAttachments.mockReturnValue({ ok: true });
      mockBuildInitialTicketMessage.mockReturnValue({ ok: true, message: 'Test msg' });
      mockPersistUploadedMessageFiles.mockResolvedValue({ ok: false, message: 'Upload failed' });

      await createTicket(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        warning: 'Upload failed',
      }));
    });

    test('should handle invalid JSON body', async () => {
      mockReq.body = {};
      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should build userName with both nombre and apellido', async () => {
      mockReq.user = { id: 1, nombre: 'Juan', apellido: 'Perez', email: 'j@p.com', role: 'USER' } as any;
      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    test('should handle telegram sync error gracefully', async () => {
      (telegramService.createTopic as jest.Mock).mockRejectedValue(new Error('Telegram error'));
      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    test('should fall back to group when topic creation fails', async () => {
      (telegramService.createTopic as jest.Mock).mockResolvedValue(null);
      (telegramService.getResolverConfig as jest.Mock).mockResolvedValue({ telegramGroupId: 'group-1' });
      await createTicket(mockReq as any, mockRes as any);
      expect(telegramService.sendToGroup).toHaveBeenCalled();
    });

    test('should handle readState error gracefully', async () => {
      (ticketReadStateService.markAsRead as jest.Mock).mockRejectedValue(new Error('RS error'));
      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    test('should handle notification error gracefully', async () => {
      mockNotifyNewTicketToStaff.mockRejectedValue(new Error('Notif error'));
      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    test('should handle media sync error gracefully', async () => {
      mockIsMultipartCreateRequest.mockReturnValue(true);
      mockNormalizeMulterFiles.mockReturnValue([
        {
          fieldname: 'attachments',
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from('test'),
        } as any,
      ]);
      mockPrevalidateTicketAttachments.mockReturnValue({ ok: true });
      mockBuildInitialTicketMessage.mockReturnValue({ ok: true, message: 'Test msg' });
      mockPersistUploadedMessageFiles.mockResolvedValue({
        ok: true,
        attachments: [{ type: 'IMAGE', filename: 't.jpg', minioKey: 'k' }],
      });
      mockQueueAttachmentsToResolvers.mockRejectedValue(new Error('Sync error'));

      await createTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('getMyTickets', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      await getMyTickets(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    test('should return tickets for authenticated user', async () => {
      await getMyTickets(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [mockTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    test('should handle service errors', async () => {
      (ticketService.getByUser as jest.Mock).mockRejectedValue(new Error('DB error'));
      await getMyTickets(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    test('should return tickets for staff user', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      await getMyTickets(mockReq as any, mockRes as any);
      expect(ticketService.getAll).toHaveBeenCalled();
    });

    test('should return empty list for staff with none scope', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN_INTERNO', empresaId: null } as any;
      mockResolveStaffTenantScope.mockReturnValue({ kind: 'none' });

      await getMyTickets(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    test('should filter by empresaId for empresa scope', async () => {
      mockReq.user = { id: 1, email: 'user@test.com', nombre: 'User', role: 'ADMIN_INTERNO', empresaId: 5 } as any;
      mockResolveStaffTenantScope.mockReturnValue({ kind: 'empresa', empresaId: 5 });

      await getMyTickets(mockReq as any, mockRes as any);
      expect(ticketService.getAll).toHaveBeenCalled();
    });

    test('should handle RESOLVER with includeEmpresa', async () => {
      mockReq.user = { id: 1, email: 'resolver@test.com', nombre: 'Resolver', role: 'RESOLVER' } as any;
      mockResolveStaffTenantScope.mockReturnValue({ kind: 'all' });

      await getMyTickets(mockReq as any, mockRes as any);
      expect(ticketService.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        true
      );
    });

    test('should reject invalid query params', async () => {
      mockReq.query = { page: 'invalid' };
      await getMyTickets(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('getTicketById', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'ticket-1' };
      await getTicketById(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    test('should return 404 if ticket not found', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.getById as jest.Mock).mockResolvedValue(null);
      await getTicketById(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    test('should return ticket by id', async () => {
      mockReq.params = { id: 'ticket-1' };
      await getTicketById(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockTicket });
    });

    test('should handle array id param', async () => {
      mockReq.params = { id: ['ticket-1'] as any };
      await getTicketById(mockReq as any, mockRes as any);
      expect(ticketService.getById).toHaveBeenCalledWith('ticket-1', expect.any(Object));
    });

    test('should handle service error', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.getById as jest.Mock).mockRejectedValue(new Error('DB error'));
      await getTicketById(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('closeTicket', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'ticket-1' };
      await closeTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    test('should return 404 if ticket not found', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.close as jest.Mock).mockRejectedValue(new Error('TICKET_NOT_FOUND'));
      await closeTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    test('should return 403 if not ticket owner', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.close as jest.Mock).mockRejectedValue(new Error('NOT_TICKET_OWNER'));
      await closeTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('should return 400 if already closed', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.close as jest.Mock).mockRejectedValue(new Error('ALREADY_CLOSED'));
      await closeTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should close ticket successfully', async () => {
      mockReq.params = { id: 'ticket-1' };
      await closeTicket(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket cerrado exitosamente',
        data: mockTicket,
      });
    });

    test('should handle close errors', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.close as jest.Mock).mockRejectedValue(new Error('DB error'));
      await closeTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    test('should handle non-Error throws', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.close as jest.Mock).mockRejectedValue('unknown');
      await closeTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('reopenTicket', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'ticket-1' };
      await reopenTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    test('should reopen ticket successfully', async () => {
      mockReq.params = { id: 'ticket-1' };
      await reopenTicket(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket reabierto exitosamente',
        data: expect.objectContaining({ status: 'OPEN' }),
      });
    });

    test('should return 404 if ticket not found', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.reopen as jest.Mock).mockRejectedValue(new Error('TICKET_NOT_FOUND'));
      await reopenTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    test('should return 403 if not ticket owner', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.reopen as jest.Mock).mockRejectedValue(new Error('NOT_TICKET_OWNER'));
      await reopenTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('should return 400 if ticket not closed', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.reopen as jest.Mock).mockRejectedValue(new Error('TICKET_NOT_CLOSED'));
      await reopenTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should return 400 if reopen window expired', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.reopen as jest.Mock).mockRejectedValue(new Error('REOPEN_WINDOW_EXPIRED'));
      await reopenTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should return 400 if no close date', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.reopen as jest.Mock).mockRejectedValue(new Error('NO_CLOSE_DATE'));
      await reopenTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should handle reopen with message body', async () => {
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { message: 'Reopening reason' };
      await reopenTicket(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    test('should handle reopen error', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.reopen as jest.Mock).mockRejectedValue(new Error('DB error'));
      await reopenTicket(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('updatePriority', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'ticket-1' };
      await updatePriority(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    test('should update priority successfully for admin user', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { priority: 'HIGH' };
      await updatePriority(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Prioridad actualizada exitosamente',
        data: mockTicket,
      });
    });

    test('should return 403 for regular user', async () => {
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { priority: 'HIGH' };
      await updatePriority(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('should return 400 for invalid priority', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { priority: 'INVALID' };
      await updatePriority(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should return 404 if ticket not found', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { priority: 'HIGH' };
      (ticketService.updatePriority as jest.Mock).mockRejectedValue(new Error('TICKET_NOT_FOUND'));
      await updatePriority(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    test('should handle update error', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { priority: 'HIGH' };
      (ticketService.updatePriority as jest.Mock).mockRejectedValue(new Error('DB error'));
      await updatePriority(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('updateStatus', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'ticket-1' };
      await updateStatus(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    test('should update status successfully for admin user', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { status: 'IN_PROGRESS' };
      await updateStatus(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Estado actualizado exitosamente',
        data: mockTicket,
      });
    });

    test('should return 400 for invalid status', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { status: 'INVALID' };
      await updateStatus(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should return 403 for regular user', async () => {
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { status: 'IN_PROGRESS' };
      await updateStatus(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('should return 404 if ticket not found', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { status: 'IN_PROGRESS' };
      (ticketService.updateStatus as jest.Mock).mockRejectedValue(new Error('TICKET_NOT_FOUND'));
      await updateStatus(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    test('should return 400 for invalid status transition', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { status: 'RESOLVED' };
      (ticketService.updateStatus as jest.Mock).mockRejectedValue(new Error('INVALID_STATUS_TRANSITION'));
      await updateStatus(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test('should handle update error', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: 'Admin', role: 'ADMIN' } as any;
      mockReq.params = { id: 'ticket-1' };
      mockReq.body = { status: 'IN_PROGRESS' };
      (ticketService.updateStatus as jest.Mock).mockRejectedValue(new Error('DB error'));
      await updateStatus(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getUnreadSummary', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      await getUnreadSummary(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    test('should return unread summary', async () => {
      await getUnreadSummary(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { total: 0, byCategory: {} },
      });
    });

    test('should handle errors', async () => {
      (ticketReadStateService.getUnreadSummaryForViewer as jest.Mock).mockRejectedValue(new Error('DB error'));
      await getUnreadSummary(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('markAsRead', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'ticket-1' };
      await markAsRead(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    test('should return 404 if ticket not found', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.getById as jest.Mock).mockResolvedValue(null);
      await markAsRead(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    test('should mark ticket as read', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.getById as jest.Mock).mockResolvedValue({ ...mockTicket });
      await markAsRead(mockReq as any, mockRes as any);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    test('should handle service error', async () => {
      mockReq.params = { id: 'ticket-1' };
      (ticketService.getById as jest.Mock).mockRejectedValue(new Error('DB error'));
      await markAsRead(mockReq as any, mockRes as any);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
