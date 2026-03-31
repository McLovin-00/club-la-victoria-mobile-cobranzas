/**
 * Tests for message.controller.ts
 */

jest.mock('../../services/message.service', () => ({
  __esModule: true,
  default: {
    createUser: jest.fn(),
    getByTicket: jest.fn(),
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
    warn: jest.fn(),
    error: jest.fn(),
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
import { createMessage, getMessages } from '../../controllers/message.controller';
import messageService from '../../services/message.service';
import ticketService from '../../services/ticket.service';
import { persistUploadedMessageFiles } from '../../utils/message-attachments';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

describe('Message Controller', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    
    mockReq = {
      user: { id: 1, email: 'test@test.com', nombre: 'Test', apellido: 'User', role: 'USER' } as any,
      params: { ticketId: 'ticket-1' },
      body: { content: 'Test message' },
      files: [],
      query: {},
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    
    (ticketService.getById as jest.Mock).mockResolvedValue({
      id: 'ticket-1',
      createdBy: 1,
    });
    
    (messageService.createUser as jest.Mock).mockResolvedValue({
      id: 'msg-1',
      content: 'Test message',
    });
    
    (messageService.getByTicket as jest.Mock).mockResolvedValue({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    
    (persistUploadedMessageFiles as jest.Mock).mockResolvedValue({
      ok: true,
      attachments: [],
    });
  });

  describe('createMessage', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      
      await createMessage(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado',
      });
    });

    test('should return 404 if ticket not found', async () => {
      (ticketService.getById as jest.Mock).mockResolvedValue(null);
      
      await createMessage(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Ticket no encontrado',
      });
    });

    test('should return 400 if no content and no files', async () => {
      mockReq.body = { content: '' };
      mockReq.files = [];
      
      await createMessage(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Debes enviar texto o al menos un adjunto',
      });
    });

    test('should return 400 if file upload fails', async () => {
      (persistUploadedMessageFiles as jest.Mock).mockResolvedValue({
        ok: false,
        message: 'File too large',
      });
      
      mockReq.files = [{ fieldname: 'file' } as any];
      mockReq.body = { content: '' };
      
      await createMessage(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'File too large',
      });
    });

    test('should create message successfully with content', async () => {
      await createMessage(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'msg-1' }),
      });
    });

    test('should create message with files only', async () => {
      mockReq.body = { content: '' };
      mockReq.files = [{ fieldname: 'file' } as any];
      
      await createMessage(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(messageService.createUser).toHaveBeenCalledWith(
        'ticket-1',
        1,
        'Test User',
        'Adjunto enviado desde la plataforma.',
        1,
        []
      );
    });

    test('should handle service errors', async () => {
      (messageService.createUser as jest.Mock).mockRejectedValue(new Error('DB error'));
      
      await createMessage(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Error al crear el mensaje',
      });
    });
  });

  describe('getMessages', () => {
    test('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      
      await getMessages(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado',
      });
    });

    test('should return 404 if ticket not found', async () => {
      (ticketService.getById as jest.Mock).mockResolvedValue(null);
      
      await getMessages(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Ticket no encontrado',
      });
    });

    test('should return messages with default pagination', async () => {
      await getMessages(mockReq as any, mockRes as any);
      
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
    });

    test('should handle custom pagination params', async () => {
      mockReq.query = { page: '2', limit: '10' };
      
      await getMessages(mockReq as any, mockRes as any);
      
      expect(messageService.getByTicket).toHaveBeenCalledWith('ticket-1', { page: 2, limit: 10 });
    });

    test('should return 400 for invalid query params', async () => {
      mockReq.query = { page: 'invalid' };
      
      await getMessages(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Parámetros inválidos',
        errors: expect.any(Object),
      });
    });

    test('should handle service errors', async () => {
      (messageService.getByTicket as jest.Mock).mockRejectedValue(new Error('DB error'));
      
      await getMessages(mockReq as any, mockRes as any);
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Error al obtener mensajes',
      });
    });
  });
});
