/**
 * Unit Tests for Telegram Attachments Utility
 */

// Mock dependencies
jest.mock('../../../config/minio', () => ({
  uploadFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({
    TELEGRAM_BOT_TOKEN: 'test-token',
    MINIO_ENDPOINT: 'localhost',
    MINIO_PORT: 9000,
    MINIO_ACCESS_KEY: 'minioadmin',
    MINIO_SECRET_KEY: 'minioadmin',
    MINIO_BUCKET_PREFIX: 'test-',
    MINIO_USE_SSL: false,
  }),
}));

jest.mock('../../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../schemas/message.schema', () => ({
  MAX_FILE_SIZES: {
    IMAGE: 10485760,
    AUDIO: 26214400,
    VIDEO: 52428800,
    DOCUMENT: 26214400,
  },
}));

// Mock global fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
} as any);

import {
  extractTelegramAttachment,
  persistTelegramAttachment,
} from '../../../bot/utils/telegram-attachments';
import { uploadFile } from '../../../config/minio';
import { AppLogger } from '../../../config/logger';

describe('Telegram Attachments Utility', () => {
  let mockCtx: any;
  let mockApi: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi = {
      getFile: jest.fn().mockResolvedValue({
        file_path: 'photos/file_123.jpg',
      }),
    };
    mockCtx = {
      message: null,
      api: mockApi,
      reply: jest.fn().mockResolvedValue(undefined),
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
    } as any);
  });

  describe('extractTelegramAttachment', () => {
    test('should return null when message is null', () => {
      mockCtx.message = null;
      expect(extractTelegramAttachment(mockCtx)).toBeNull();
    });

    test('should extract photo from message', () => {
      mockCtx.message = {
        photo: [
          { file_id: 'photo_small', file_unique_id: 'uniq1', file_size: 1000 },
          { file_id: 'photo_large', file_unique_id: 'uniq2', file_size: 5000 }
        ],
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('IMAGE');
      expect(result?.fileId).toBe('photo_large');
      expect(result?.filename).toBe('photo_uniq2.jpg');
      expect(result?.mimeType).toBe('image/jpeg');
      expect(result?.declaredSize).toBe(5000);
    });

    test('should extract audio from message', () => {
      mockCtx.message = {
        audio: {
          file_id: 'audio_123',
          file_unique_id: 'uniq_audio',
          file_name: 'my song.mp3',
          mime_type: 'audio/mpeg',
          file_size: 3000000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('AUDIO');
      expect(result?.fileId).toBe('audio_123');
      expect(result?.filename).toBe('my_song.mp3'); // sanitizeFilename replaces spaces
    });

    test('should extract video from message', () => {
      mockCtx.message = {
        video: {
          file_id: 'video_123',
          file_unique_id: 'uniq_video',
          file_name: 'my video.mp4',
          mime_type: 'video/mp4',
          file_size: 10000000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('VIDEO');
      expect(result?.fileId).toBe('video_123');
      expect(result?.filename).toBe('my_video.mp4'); // sanitizeFilename replaces spaces
    });

    test('should extract document from message', () => {
      mockCtx.message = {
        document: {
          file_id: 'doc_123',
          file_unique_id: 'uniq_doc',
          file_name: 'report.pdf',
          mime_type: 'application/pdf',
          file_size: 500000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('DOCUMENT');
      expect(result?.fileId).toBe('doc_123');
      expect(result?.filename).toBe('report.pdf');
    });

    test('should classify audio document as AUDIO type', () => {
      mockCtx.message = {
        document: {
          file_id: 'audio_doc',
          file_unique_id: 'uniq_ad',
          file_name: 'voice.mp3',
          mime_type: 'audio/mpeg',
          file_size: 1000000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result?.type).toBe('AUDIO');
    });

    test('should classify video document as VIDEO type', () => {
      mockCtx.message = {
        document: {
          file_id: 'video_doc',
          file_unique_id: 'uniq_vd',
          file_name: 'clip.mov',
          mime_type: 'video/quicktime',
          file_size: 5000000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result?.type).toBe('VIDEO');
    });

    test('should classify image document as IMAGE type', () => {
      mockCtx.message = {
        document: {
          file_id: 'image_doc',
          file_unique_id: 'uniq_img',
          file_name: 'picture.png',
          mime_type: 'image/png',
          file_size: 500000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result?.type).toBe('IMAGE');
    });

    test('should return null for message without attachments', () => {
      mockCtx.message = {
        text: 'Just a text message',
      };
      expect(extractTelegramAttachment(mockCtx)).toBeNull();
    });

    test('should handle missing file_name in audio', () => {
      mockCtx.message = {
        audio: {
          file_id: 'audio_123',
          file_unique_id: 'uniq_audio',
          mime_type: 'audio/mpeg',
          file_size: 3000000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result?.filename).toBe('audio_uniq_audio.mp3');
    });

    test('should handle missing mime_type in audio', () => {
      mockCtx.message = {
        audio: {
          file_id: 'audio_123',
          file_unique_id: 'uniq_audio',
          file_name: 'song.mp3',
          file_size: 3000000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result?.mimeType).toBe('audio/mpeg');
    });

    test('should handle missing file_size in photo', () => {
      mockCtx.message = {
        photo: [
          { file_id: 'photo_small', file_unique_id: 'uniq1' },
        ],
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result?.declaredSize).toBe(0);
    });

    test('should handle empty photo array', () => {
      mockCtx.message = {
        photo: [],
      };
      expect(extractTelegramAttachment(mockCtx)).toBeNull();
    });

    test('should handle document with no mime_type', () => {
      mockCtx.message = {
        document: {
          file_id: 'doc_123',
          file_unique_id: 'uniq_doc',
          file_name: 'report.pdf',
          file_size: 500000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result?.mimeType).toBe('application/octet-stream');
    });

    test('should handle document without file_name', () => {
      mockCtx.message = {
        document: {
          file_id: 'doc_123',
          file_unique_id: 'uniq_doc',
          mime_type: 'application/pdf',
          file_size: 500000,
        },
      };
      const result = extractTelegramAttachment(mockCtx);
      expect(result?.filename).toBe('document_uniq_doc');
    });
  });

  describe('persistTelegramAttachment', () => {
    test('should return null when no attachment', async () => {
      mockCtx.message = { text: 'no attachment' };
      const result = await persistTelegramAttachment(mockCtx, 'ticket-123');
      expect(result).toBeNull();
    });

    test('should return null when file size exceeds limit', async () => {
      mockCtx.message = {
        photo: [
          { file_id: 'photo_small', file_unique_id: 'uniq1', file_size: 1000 },
          { file_id: 'photo_large', file_unique_id: 'uniq2', file_size: 50000000 } // Over limit
        ],
      };
      const result = await persistTelegramAttachment(mockCtx, 'ticket-123');
      expect(result).toBeNull();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('excede')
      );
    });

    test('should return null when file_path is missing', async () => {
      mockApi.getFile.mockResolvedValue({ file_path: null });
      mockCtx.message = {
        photo: [
          { file_id: 'photo_small', file_unique_id: 'uniq1', file_size: 1000 },
        ],
      };
      const result = await persistTelegramAttachment(mockCtx, 'ticket-123');
      expect(result).toBeNull();
      expect(AppLogger.warn).toHaveBeenCalled();
    });

    test('should return null when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);
      mockCtx.message = {
        photo: [
          { file_id: 'photo_small', file_unique_id: 'uniq1', file_size: 1000 },
        ],
      };
      const result = await persistTelegramAttachment(mockCtx, 'ticket-123');
      expect(result).toBeNull();
      expect(AppLogger.error).toHaveBeenCalled();
    });

    test('should successfully persist attachment', async () => {
      mockCtx.message = {
        photo: [
          { file_id: 'photo_123', file_unique_id: 'uniq1', file_size: 1000 },
        ],
      };
      const result = await persistTelegramAttachment(mockCtx, 'ticket-123');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('IMAGE');
      expect(result?.mimeType).toBe('image/jpeg');
      expect(uploadFile).toHaveBeenCalled();
    });

    test('should return null when downloaded file exceeds limit', async () => {
      // Create a large buffer
      const largeBuffer = new ArrayBuffer(20000000);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(largeBuffer),
      } as any);
      mockCtx.message = {
        photo: [
          { file_id: 'photo_123', file_unique_id: 'uniq1', file_size: 1000 },
        ],
      };
      const result = await persistTelegramAttachment(mockCtx, 'ticket-123');
      expect(result).toBeNull();
      expect(mockCtx.reply).toHaveBeenCalled();
    });
  });
});
