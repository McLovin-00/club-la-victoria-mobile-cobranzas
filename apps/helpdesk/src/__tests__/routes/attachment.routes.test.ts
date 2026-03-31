/**
 * Tests for attachment.routes.ts
 */

jest.mock('../../middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 1, email: 'test@test.com', nombre: 'Test', role: 'USER' };
    next();
  },
}));

jest.mock('../../config/database', () => ({
  prisma: {
    messageAttachment: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../config/minio', () => ({
  getPresignedUrl: jest.fn().mockResolvedValue('https://minio.example.com/presigned-url'),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import request from 'supertest';
import express from 'express';
import attachmentRoutes from '../../routes/attachment.routes';
import { prisma } from '../../config/database';
import { getPresignedUrl } from '../../config/minio';

describe('Attachment Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/helpdesk/attachments', attachmentRoutes);
  });

  describe('GET /:id/download', () => {
    it('should return 404 if attachment not found', async () => {
      (prisma.messageAttachment.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/helpdesk/attachments/att-123/download');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'Adjunto no encontrado',
      });
    });

    it('should redirect to presigned URL if attachment found', async () => {
      const mockAttachment = {
        id: 'att-123',
        minioKey: 'attachments/ticket-1/file.pdf',
      };
      (prisma.messageAttachment.findUnique as jest.Mock).mockResolvedValue(mockAttachment);
      (getPresignedUrl as jest.Mock).mockResolvedValue('https://minio.example.com/presigned-url');

      const response = await request(app).get('/api/helpdesk/attachments/att-123/download');

      expect(getPresignedUrl).toHaveBeenCalledWith('attachments/ticket-1/file.pdf', 3600);
      expect(response.status).toBe(302);
      expect(response.header['location']).toBe('https://minio.example.com/presigned-url');
    });

    it('should handle errors', async () => {
      (prisma.messageAttachment.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/api/helpdesk/attachments/att-123/download');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Error al descargar adjunto',
      });
    });
  });
});
