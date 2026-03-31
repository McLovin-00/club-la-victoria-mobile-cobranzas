/**
 * Unit Tests for Media Sync Worker
 */

import { Job } from 'bullmq';

// Mock dependencies - must be before imports
const mockSendPhoto = jest.fn().mockResolvedValue({ message_id: 1 });
const mockSendVideo = jest.fn().mockResolvedValue({ message_id: 2 });
const mockSendAudio = jest.fn().mockResolvedValue({ message_id: 3 });
const mockSendDocument = jest.fn().mockResolvedValue({ message_id: 4 });

jest.mock('grammy', () => ({
  InputFile: jest.fn().mockImplementation((buffer, filename) => ({ buffer, filename })),
}));

jest.mock('../../config/minio', () => ({
  downloadFile: jest.fn().mockResolvedValue(Buffer.from('test-file-content')),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../services/telegram.service', () => {
  return {
    __esModule: true,
    default: {
      getBot: jest.fn(() => ({
        api: {
          sendPhoto: mockSendPhoto,
          sendVideo: mockSendVideo,
          sendAudio: mockSendAudio,
          sendDocument: mockSendDocument,
        },
      })),
    },
  };
});

import { processMediaSyncJob, MediaSyncJobPayload } from '../../workers/media-sync.worker';
import { downloadFile } from '../../config/minio';
import { InputFile } from 'grammy';

describe('Media Sync Worker', () => {
  let mockJob: Partial<Job<MediaSyncJobPayload>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = {
      id: 'job-123',
      data: {
        attachment: {
          type: 'IMAGE',
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          minioKey: 'attachments/test.jpg',
        },
        destination: { type: 'dm', telegramUserId: 123456789 },
      },
    };
  });

  describe('processMediaSyncJob', () => {
    test('should process IMAGE attachment', async () => {
      await processMediaSyncJob(mockJob as Job<MediaSyncJobPayload>);

      expect(downloadFile).toHaveBeenCalledWith('attachments/test.jpg');
      expect(InputFile).toHaveBeenCalled();
      expect(mockSendPhoto).toHaveBeenCalled();
    });

    test('should process VIDEO attachment', async () => {
      mockJob.data!.attachment.type = 'VIDEO';
      mockJob.data!.attachment.filename = 'test.mp4';

      await processMediaSyncJob(mockJob as Job<MediaSyncJobPayload>);

      expect(mockSendVideo).toHaveBeenCalled();
    });

    test('should process AUDIO attachment', async () => {
      mockJob.data!.attachment.type = 'AUDIO';
      mockJob.data!.attachment.filename = 'test.mp3';

      await processMediaSyncJob(mockJob as Job<MediaSyncJobPayload>);

      expect(mockSendAudio).toHaveBeenCalled();
    });

    test('should process DOCUMENT attachment', async () => {
      mockJob.data!.attachment.type = 'DOCUMENT';
      mockJob.data!.attachment.filename = 'test.pdf';

      await processMediaSyncJob(mockJob as Job<MediaSyncJobPayload>);

      expect(mockSendDocument).toHaveBeenCalled();
    });

    test('should send to topic destination', async () => {
      mockJob.data!.destination = { type: 'topic', groupId: '-1001234567890', topicId: 42 };

      await processMediaSyncJob(mockJob as Job<MediaSyncJobPayload>);

      expect(mockSendPhoto).toHaveBeenCalledWith(
        '-1001234567890',
        expect.any(Object),
        expect.objectContaining({
          message_thread_id: 42,
        })
      );
    });

    test('should send to group destination', async () => {
      mockJob.data!.destination = { type: 'group', groupId: '-1001234567890' };

      await processMediaSyncJob(mockJob as Job<MediaSyncJobPayload>);

      expect(mockSendPhoto).toHaveBeenCalledWith(
        '-1001234567890',
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should include caption if provided', async () => {
      mockJob.data!.caption = 'Test caption';

      await processMediaSyncJob(mockJob as Job<MediaSyncJobPayload>);

      expect(mockSendPhoto).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Object),
        expect.objectContaining({
          caption: 'Test caption',
          parse_mode: 'HTML',
        })
      );
    });

    test('should truncate long caption to 1000 chars', async () => {
      mockJob.data!.caption = 'A'.repeat(1500);

      await processMediaSyncJob(mockJob as Job<MediaSyncJobPayload>);

      expect(mockSendPhoto).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Object),
        expect.objectContaining({
          caption: 'A'.repeat(1000),
        })
      );
    });
  });
});
