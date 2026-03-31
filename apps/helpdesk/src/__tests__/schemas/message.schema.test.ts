import {
  messageSenderTypeSchema,
  attachmentTypeSchema,
  createMessageSchema,
  listMessagesQuerySchema,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  getAttachmentType,
  validateAttachment,
} from '../../schemas/message.schema';

describe('message.schema', () => {
  describe('messageSenderTypeSchema', () => {
    it('accepts USER', () => {
      expect(messageSenderTypeSchema.safeParse('USER').success).toBe(true);
    });

    it('accepts RESOLVER', () => {
      expect(messageSenderTypeSchema.safeParse('RESOLVER').success).toBe(true);
    });

    it('accepts SYSTEM', () => {
      expect(messageSenderTypeSchema.safeParse('SYSTEM').success).toBe(true);
    });

    it('rejects invalid sender type', () => {
      expect(messageSenderTypeSchema.safeParse('INVALID').success).toBe(false);
    });
  });

  describe('attachmentTypeSchema', () => {
    it('accepts IMAGE', () => {
      expect(attachmentTypeSchema.safeParse('IMAGE').success).toBe(true);
    });

    it('accepts AUDIO', () => {
      expect(attachmentTypeSchema.safeParse('AUDIO').success).toBe(true);
    });

    it('accepts VIDEO', () => {
      expect(attachmentTypeSchema.safeParse('VIDEO').success).toBe(true);
    });

    it('accepts DOCUMENT', () => {
      expect(attachmentTypeSchema.safeParse('DOCUMENT').success).toBe(true);
    });

    it('rejects invalid type', () => {
      expect(attachmentTypeSchema.safeParse('EXE').success).toBe(false);
    });
  });

  describe('createMessageSchema', () => {
    it('accepts valid message', () => {
      expect(createMessageSchema.safeParse({ content: 'Hello world' }).success).toBe(true);
    });

    it('rejects empty message', () => {
      expect(createMessageSchema.safeParse({ content: '' }).success).toBe(false);
    });

    it('rejects whitespace-only message', () => {
      expect(createMessageSchema.safeParse({ content: '   ' }).success).toBe(false);
    });

    it('rejects message exceeding 5000 chars', () => {
      expect(createMessageSchema.safeParse({ content: 'a'.repeat(5001) }).success).toBe(false);
    });

    it('accepts message at exactly 5000 chars', () => {
      expect(createMessageSchema.safeParse({ content: 'a'.repeat(5000) }).success).toBe(true);
    });
  });

  describe('listMessagesQuerySchema', () => {
    it('applies defaults when no input', () => {
      const result = listMessagesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });

    it('parses valid page and limit', () => {
      const result = listMessagesQuerySchema.safeParse({ page: '3', limit: '20' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(20);
      }
    });

    it('rejects limit above 100', () => {
      expect(listMessagesQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });
  });

  describe('getAttachmentType', () => {
    it('returns IMAGE for image/jpeg', () => {
      expect(getAttachmentType('image/jpeg')).toBe('IMAGE');
    });

    it('returns IMAGE for image/png', () => {
      expect(getAttachmentType('image/png')).toBe('IMAGE');
    });

    it('returns IMAGE for image/gif', () => {
      expect(getAttachmentType('image/gif')).toBe('IMAGE');
    });

    it('returns IMAGE for image/webp', () => {
      expect(getAttachmentType('image/webp')).toBe('IMAGE');
    });

    it('returns AUDIO for audio/mpeg', () => {
      expect(getAttachmentType('audio/mpeg')).toBe('AUDIO');
    });

    it('returns VIDEO for video/mp4', () => {
      expect(getAttachmentType('video/mp4')).toBe('VIDEO');
    });

    it('returns DOCUMENT for application/pdf', () => {
      expect(getAttachmentType('application/pdf')).toBe('DOCUMENT');
    });

    it('returns null for unknown mime type', () => {
      expect(getAttachmentType('application/zip')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getAttachmentType('')).toBeNull();
    });

    it('returns DOCUMENT for text/csv', () => {
      expect(getAttachmentType('text/csv')).toBe('DOCUMENT');
    });

    it('returns DOCUMENT for application/vnd.openxmlformats-officedocument.wordprocessingml.document', () => {
      expect(getAttachmentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('DOCUMENT');
    });

    it('returns AUDIO for audio/x-m4a', () => {
      expect(getAttachmentType('audio/x-m4a')).toBe('AUDIO');
    });
  });

  describe('validateAttachment', () => {
    const validImageFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      destination: '/tmp',
      filename: 'test.jpg',
      path: '/tmp/test.jpg',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    it('validates a valid image file', () => {
      const result = validateAttachment(validImageFile);
      expect(result.valid).toBe(true);
      expect(result.type).toBe('IMAGE');
    });

    it('rejects invalid mime type', () => {
      const badFile = { ...validImageFile, mimetype: 'application/zip' };
      const result = validateAttachment(badFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tipo de archivo no permitido');
    });

    it('rejects file exceeding max size for IMAGE', () => {
      const hugeFile = { ...validImageFile, size: 11 * 1024 * 1024 };
      const result = validateAttachment(hugeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('excede el tamaño máximo');
      expect(result.error).toContain('10MB');
    });

    it('validates a valid PDF file', () => {
      const pdfFile = { ...validImageFile, mimetype: 'application/pdf', size: 1024 };
      const result = validateAttachment(pdfFile);
      expect(result.valid).toBe(true);
      expect(result.type).toBe('DOCUMENT');
    });

    it('rejects PDF exceeding max size', () => {
      const hugePdf = { ...validImageFile, mimetype: 'application/pdf', size: 26 * 1024 * 1024 };
      const result = validateAttachment(hugePdf);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('25MB');
    });

    it('validates a valid audio file', () => {
      const audioFile = { ...validImageFile, mimetype: 'audio/mpeg', size: 1024 };
      const result = validateAttachment(audioFile);
      expect(result.valid).toBe(true);
      expect(result.type).toBe('AUDIO');
    });

    it('rejects audio exceeding max size', () => {
      const hugeAudio = { ...validImageFile, mimetype: 'audio/mpeg', size: 26 * 1024 * 1024 };
      const result = validateAttachment(hugeAudio);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('25MB');
    });

    it('validates a valid video file', () => {
      const videoFile = { ...validImageFile, mimetype: 'video/mp4', size: 1024 };
      const result = validateAttachment(videoFile);
      expect(result.valid).toBe(true);
      expect(result.type).toBe('VIDEO');
    });

    it('rejects video exceeding max size', () => {
      const hugeVideo = { ...validImageFile, mimetype: 'video/mp4', size: 51 * 1024 * 1024 };
      const result = validateAttachment(hugeVideo);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('50MB');
    });
  });

  describe('ALLOWED_MIME_TYPES', () => {
    it('has entries for all attachment types', () => {
      expect(ALLOWED_MIME_TYPES.IMAGE).toBeDefined();
      expect(ALLOWED_MIME_TYPES.AUDIO).toBeDefined();
      expect(ALLOWED_MIME_TYPES.VIDEO).toBeDefined();
      expect(ALLOWED_MIME_TYPES.DOCUMENT).toBeDefined();
    });
  });

  describe('MAX_FILE_SIZES', () => {
    it('has entries for all attachment types', () => {
      expect(MAX_FILE_SIZES.IMAGE).toBe(10 * 1024 * 1024);
      expect(MAX_FILE_SIZES.AUDIO).toBe(25 * 1024 * 1024);
      expect(MAX_FILE_SIZES.VIDEO).toBe(50 * 1024 * 1024);
      expect(MAX_FILE_SIZES.DOCUMENT).toBe(25 * 1024 * 1024);
    });
  });
});
