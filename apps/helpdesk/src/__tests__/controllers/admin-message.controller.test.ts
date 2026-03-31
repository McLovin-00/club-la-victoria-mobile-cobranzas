/**
 * Tests for admin-message.controller.ts
 */

jest.mock('../../services/message.service', () => ({
  __esModule: true,
  default: {
    createResolver: jest.fn(),
  },
}));

jest.mock('../../services/ticket.service', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/viewer-context', () => ({
  buildTicketViewerContext: jest.fn().mockReturnValue({}),
}));

jest.mock('../../utils/message-attachments', () => ({
  persistUploadedMessageFiles: jest.fn().mockResolvedValue({ ok: true, attachments: [] }),
}));

import { Response } from 'express';
import { postAdminTicketMessage } from '../../controllers/admin-message.controller';
import messageService from '../../services/message.service';
import ticketService from '../../services/ticket.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { persistUploadedMessageFiles } from '../../utils/message-attachments';

describe('Admin Message Controller', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const mockTicket = {
    id: 'ticket-1',
    number: 1,
    createdBy: 100, // Different from the admin user
    status: 'OPEN' as const,
  };

  const mockMessage = {
    id: 'msg-1',
    ticketId: 'ticket-1',
    senderType: 'RESOLVER',
    content: 'Test message',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();

    mockReq = {
      user: { id: 1, email: 'admin@test.com', nombre: 'Admin', apellido: 'User', role: 'ADMIN' } as any,
      params: { ticketId: 'ticket-1' },
      body: { content: 'Test message' },
      files: [],
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    (ticketService.getById as jest.Mock).mockResolvedValue(mockTicket);
    (messageService.createResolver as jest.Mock).mockResolvedValue(mockMessage);
    (persistUploadedMessageFiles as jest.Mock).mockResolvedValue({ ok: true, attachments: [] });
  });

  describe('postAdminTicketMessage', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado',
      });
    });

    test('should return 404 if ticket not found', async () => {
      (ticketService.getById as jest.Mock).mockResolvedValue(null);

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Ticket no encontrado',
      });
    });

    test('should return 400 if user is the ticket creator', async () => {
      mockReq.user = { id: 100, email: 'user@test.com', nombre: 'User', role: 'USER' } as any;
      // Ticket createdBy is also 100

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Para mensajes como usuario del ticket usá el endpoint estándar de mensajes',
      });
    });

    test('should return 400 if ticket is closed', async () => {
      (ticketService.getById as jest.Mock).mockResolvedValue({ ...mockTicket, status: 'CLOSED' });

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'El ticket está cerrado',
      });
    });

    test('should return 400 if no content and no files', async () => {
      mockReq.body = {};
      mockReq.files = [];

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Debes enviar texto o al menos un adjunto',
      });
    });

    test('should return 400 if file upload fails', async () => {
      mockReq.files = [{ fieldname: 'file', originalname: 'test.pdf' }] as any;
      (persistUploadedMessageFiles as jest.Mock).mockResolvedValue({
        ok: false,
        message: 'File too large',
      });

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'File too large',
      });
    });

    test('should create message successfully with content', async () => {
      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(messageService.createResolver).toHaveBeenCalledWith(
        'ticket-1',
        'Admin User',
        'Test message',
        100,
        undefined,
        undefined,
        1
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
      });
    });

    test('should create message successfully with files only', async () => {
      mockReq.body = {};
      mockReq.files = [{ fieldname: 'file', originalname: 'test.pdf' }] as any;
      const mockAttachments = [{ id: 'att-1', type: 'DOCUMENT' }];
      (persistUploadedMessageFiles as jest.Mock).mockResolvedValue({
        ok: true,
        attachments: mockAttachments,
      });

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(messageService.createResolver).toHaveBeenCalledWith(
        'ticket-1',
        'Admin User',
        'Adjunto enviado desde la plataforma (soporte).',
        100,
        undefined,
        mockAttachments,
        1
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    test('should handle array ticketId param', async () => {
      mockReq.params = { ticketId: ['ticket-1'] as any };

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(ticketService.getById).toHaveBeenCalledWith('ticket-1', expect.any(Object));
    });

    test('should truncate content to 5000 characters', async () => {
      const longContent = 'a'.repeat(6000);
      mockReq.body = { content: longContent };

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(messageService.createResolver).toHaveBeenCalledWith(
        'ticket-1',
        'Admin User',
        'a'.repeat(5000),
        100,
        undefined,
        undefined,
        1
      );
    });

    test('should use email as resolver name if nombre/apellido missing', async () => {
      mockReq.user = { id: 1, email: 'admin@test.com', nombre: '', apellido: '', role: 'ADMIN' } as any;

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(messageService.createResolver).toHaveBeenCalledWith(
        'ticket-1',
        'admin@test.com',
        'Test message',
        100,
        undefined,
        undefined,
        1
      );
    });

    test('should handle service errors', async () => {
      (messageService.createResolver as jest.Mock).mockRejectedValue(new Error('DB error'));

      await postAdminTicketMessage(mockReq as any, mockRes as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Error al crear el mensaje',
      });
    });
  });
});
