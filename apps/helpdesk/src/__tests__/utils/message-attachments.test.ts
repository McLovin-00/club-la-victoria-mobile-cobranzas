/**
 * Tests de utilidades para adjuntos en mensajes de tickets.
 */

jest.mock('../../schemas/message.schema', () => ({
  validateAttachment: jest.fn(),
}));

jest.mock('../../config/minio', () => ({
  uploadFile: jest.fn().mockResolvedValue(undefined),
}));

import { 
  sanitizeFilename, 
  buildAttachmentObjectName, 
  persistUploadedMessageFiles 
} from '../../utils/message-attachments';
import { validateAttachment } from '../../schemas/message.schema';
import { uploadFile } from '../../config/minio';

describe('message-attachments', () => {
  describe('sanitizeFilename', () => {
    it('should limit length to 120 characters', () => {
      const long = 'f' + 'a'.repeat(110) + '.pdf';
      const out = sanitizeFilename(long);
      expect(out.length).toBeLessThanOrEqual(120);
      expect(out).toMatch(/\.pdf$/);
    });

    it('should replace special characters with underscore', () => {
      expect(sanitizeFilename('a b#c.txt')).toBe('a_b_c.txt');
      expect(sanitizeFilename('file@name.pdf')).toBe('file_name.pdf');
    });
  });

  describe('buildAttachmentObjectName', () => {
    it('should include sanitized ticketId and unique suffix', () => {
      const name = buildAttachmentObjectName('tid-1', 'doc.pdf');
      expect(name.startsWith('tickets/tid-1/')).toBe(true);
      expect(name).toContain('_doc.pdf');
    });

    it('should sanitize ticketId with special characters', () => {
      const name = buildAttachmentObjectName('tid with spaces', 'doc.pdf');
      expect(name).not.toContain(' ');
    });
  });

  describe('persistUploadedMessageFiles', () => {
    const mockFile = {
      fieldname: 'attachment',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test content'),
      destination: '',
      filename: 'test.pdf',
      path: '/tmp/test.pdf',
      stream: process.stdout,
    } as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return error when validation fails', async () => {
      (validateAttachment as jest.Mock).mockReturnValue({
        valid: false,
        error: 'File too large',
        type: undefined,
      });

      const result = await persistUploadedMessageFiles([mockFile], 'ticket-1');

      expect(result).toEqual({
        ok: false,
        message: 'File too large',
      });
    });

    it('should return error when validation has no type', async () => {
      (validateAttachment as jest.Mock).mockReturnValue({
        valid: false,
        error: undefined,
        type: undefined,
      });

      const result = await persistUploadedMessageFiles([mockFile], 'ticket-1');

      expect(result).toEqual({
        ok: false,
        message: 'Adjunto inválido',
      });
    });

    it('should successfully persist files', async () => {
      (validateAttachment as jest.Mock).mockReturnValue({
        valid: true,
        type: 'DOCUMENT',
      });

      const result = await persistUploadedMessageFiles([mockFile], 'ticket-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].type).toBe('DOCUMENT');
        expect(result.attachments[0].filename).toBe('test.pdf');
        expect(result.attachments[0].mimeType).toBe('application/pdf');
        expect(result.attachments[0].size).toBe(1024);
        expect(uploadFile).toHaveBeenCalled();
      }
    });

    it('should handle multiple files', async () => {
      (validateAttachment as jest.Mock).mockReturnValue({
        valid: true,
        type: 'DOCUMENT',
      });

      const result = await persistUploadedMessageFiles([mockFile, mockFile], 'ticket-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.attachments).toHaveLength(2);
        expect(uploadFile).toHaveBeenCalledTimes(2);
      }
    });

    it('should handle empty files array', async () => {
      const result = await persistUploadedMessageFiles([], 'ticket-1');

      expect(result).toEqual({
        ok: true,
        attachments: [],
      });
    });
  });
});
