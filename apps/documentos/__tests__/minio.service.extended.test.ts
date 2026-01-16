
import { MinIOService } from '../src/services/minio.service';
import { getEnvironment } from '../src/config/environment';

// Mock Dependencies
jest.mock('../src/config/environment');
(getEnvironment as jest.Mock).mockReturnValue({
    MINIO_ENDPOINT: 'play.min.io',
    MINIO_PORT: 9000,
    MINIO_ACCESS_KEY: 'valid',
    MINIO_SECRET_KEY: 'valid',
    MINIO_BUCKET_PREFIX: 'test-bucket',
    MINIO_REGION: 'us-east-1',
    MINIO_USE_SSL: false,
});

jest.mock('../src/config/logger', () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// Mock MinIO Client
const mockPutObject = jest.fn();
const mockBucketExists = jest.fn();
const mockMakeBucket = jest.fn();
const mockStatObject = jest.fn();
const mockPresignedGetObject = jest.fn();
const mockGetObject = jest.fn();
const mockRemoveObject = jest.fn();
const mockCopyObject = jest.fn();
const mockListBuckets = jest.fn();
const mockListObjects = jest.fn();

jest.mock('minio', () => {
    return {
        Client: jest.fn().mockImplementation(() => ({
            putObject: mockPutObject,
            bucketExists: mockBucketExists,
            makeBucket: mockMakeBucket,
            statObject: mockStatObject,
            presignedGetObject: mockPresignedGetObject,
            getObject: mockGetObject,
            removeObject: mockRemoveObject,
            copyObject: mockCopyObject,
            listBuckets: mockListBuckets,
            listObjects: mockListObjects,
        })),
    };
});

// Mock FileNamingService for generateObjectPath
jest.mock('../src/services/file-naming.service', () => ({
    FileNamingService: {
        generateStandardizedName: jest.fn(),
    },
}));

describe('MinIOService Extended Coverage', () => {
    let service: MinIOService;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset singleton instance if possible or just get it (since we can't reset private static easily without access)
        // Actually, accessing private static via prototype or casting to any allows reset
        (MinIOService as any).instance = null;
        service = MinIOService.getInstance();
    });


    describe('withRetry logic (via uploadDocument)', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should retry up to 3 times on retryable errors and succeed', async () => {
            mockBucketExists.mockResolvedValue(true);

            const retryableError = new Error('Connection reset');
            (retryableError as any).code = 'ECONNRESET';

            // Fail twice, succeed third time
            mockPutObject
                .mockRejectedValueOnce(retryableError)
                .mockRejectedValueOnce(retryableError)
                .mockResolvedValueOnce({ etag: 'ok' });

            const promise = service.uploadDocument(1, 'DOC', 1, 'tpl', 'file.pdf', Buffer.from('data'), 'application/pdf');

            await jest.runAllTimersAsync();

            await promise;

            expect(mockPutObject).toHaveBeenCalledTimes(3);
        });

        it('should throw after max retries exhausted (Uncovered: 48-51)', async () => {
            mockBucketExists.mockResolvedValue(true);
            const retryableError = new Error('Connection reset');
            (retryableError as any).code = 'ECONNRESET';
            mockPutObject.mockRejectedValue(retryableError); // Always fails

            const promise = service.uploadDocument(1, 'DOC', 1, 'tpl', 'file.pdf', Buffer.from('data'), 'application/pdf');

            await jest.runAllTimersAsync();

            await expect(promise).rejects.toThrow('Error al almacenar documento');

            expect(mockPutObject).toHaveBeenCalledTimes(3);
        });

        it('should throw immediately on non-retryable error', async () => {
            mockBucketExists.mockResolvedValue(true);
            const fatalError = new Error('Fatal error');
            mockPutObject.mockRejectedValue(fatalError);

            await expect(service.uploadDocument(1, 'DOC', 1, 'tpl', 'file.pdf', Buffer.from('data'), 'application/pdf'))
                .rejects.toThrow('Error al almacenar documento');

            expect(mockPutObject).toHaveBeenCalledTimes(1);
        });
    });

    describe('uploadDocument failures (Uncovered: 187-191)', () => {
        it('should provide hint on signature error', async () => {
            mockBucketExists.mockResolvedValue(true);
            mockPutObject.mockRejectedValue(new Error('The request signature we calculated does not match the signature you provided'));

            try {
                await service.uploadDocument(1, 'A', 1, 'b', 'c', Buffer.from(''), 'mime');
            } catch (e) {
                expect((e as any).message).toBe('Error al almacenar documento');
                expect(require('../src/config/logger').AppLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Error al subir documento'),
                    expect.objectContaining({ hint: expect.anything() })
                );
            }
        });

        it('should handle ensureBucketExists failure', async () => {
            mockBucketExists.mockRejectedValue(new Error('Bucket info access denied'));
            try {
                await service.uploadDocument(1, 'A', 1, 'b', 'c', Buffer.from(''), 'mime');
            } catch (e) {
                expect((e as any).code).toBe('MINIO_BUCKET_ERROR');
            }
        });
    });

    describe('generateObjectPath fallback (Uncovered: 149-151)', () => {
        // We mocked FileNamingService. If we want to test catch block, we make it throw.
        it('should fallback to timestamp naming if FileNamingService fails', async () => {
            const { FileNamingService } = require('../src/services/file-naming.service');
            FileNamingService.generateStandardizedName.mockRejectedValue(new Error('Naming fail'));

            mockBucketExists.mockResolvedValue(true);
            mockPutObject.mockResolvedValue({ etag: 'ok' });

            const res = await service.uploadDocument(1, 'ENTITY', 123, 'Template A', 'file.pdf', Buffer.from('aa'), 'application/pdf');

            // Fallback logic: entity/id/sanitized-template/timestamp.ext
            // "Template A" -> "template-a"
            expect(res.objectPath).toMatch(/entity\/123\/template-a\/\d+\.pdf/);
        });
    });

    describe('getSignedUrl errors (Uncovered: 212-220)', () => {
        it('should throw MINIO_BUCKET_NOT_FOUND if bucket missing', async () => {
            mockStatObject.mockRejectedValue({ code: 'NoSuchBucket' });

            await expect(service.getSignedUrl('bucket', 'path'))
                .rejects.toMatchObject({ code: 'MINIO_BUCKET_NOT_FOUND' });
        });

        it('should throw MINIO_OBJECT_NOT_FOUND if object missing', async () => {
            mockStatObject.mockRejectedValue({ code: 'NotFound' });

            await expect(service.getSignedUrl('bucket', 'path'))
                .rejects.toMatchObject({ code: 'MINIO_OBJECT_NOT_FOUND' });
        });

        it('should wrap other errors in MINIO_SIGNED_URL_ERROR', async () => {
            mockStatObject.mockResolvedValue({});
            mockPresignedGetObject.mockRejectedValue(new Error('Signing fail'));

            await expect(service.getSignedUrl('bucket', 'path'))
                .rejects.toMatchObject({ code: 'MINIO_SIGNED_URL_ERROR' });
        });

        it('should use public signer if available', async () => {
            // Re-init with public url
            (getEnvironment as jest.Mock).mockReturnValue({
                MINIO_ENDPOINT: 'localhost', MINIO_PUBLIC_BASE_URL: 'http://public.minio'
            });
            (MinIOService as any).instance = null;
            const srv = MinIOService.getInstance();

            mockStatObject.mockResolvedValue({});
            mockPresignedGetObject.mockResolvedValue('http://public/signed');

            const url = await srv.getSignedUrl('b', 'o');
            expect(url).toBe('http://public/signed');
        });
    });

    describe('uploadObject arbitrary (Uncovered: 270-278)', () => {
        it('should handle failures', async () => {
            mockBucketExists.mockResolvedValue(true);
            mockPutObject.mockRejectedValue(new Error('Fail'));

            await expect(service.uploadObject(1, 'path', Buffer.from('a'), 'text/plain'))
                .rejects.toMatchObject({ code: 'MINIO_UPLOAD_OBJECT_ERROR' });
        });
    });

    describe('moveObject (Uncovered: 254-256)', () => {
        it('should handle move failure', async () => {
            mockCopyObject.mockRejectedValue(new Error('Copy fail'));
            await expect(service.moveObject('b', 'src', 'dest'))
                .rejects.toMatchObject({ code: 'MINIO_MOVE_ERROR' });
        });
    });

    describe('deleteDocument (Uncovered: 264-266)', () => {
        it('should handle delete failure', async () => {
            mockRemoveObject.mockRejectedValue(new Error('Delete fail'));
            await expect(service.deleteDocument('b', 'path'))
                .rejects.toMatchObject({ code: 'MINIO_DELETE_ERROR' });
        });
    });

    describe('getObject (Uncovered: 239-240)', () => {
        it('should handle get failure', async () => {
            mockGetObject.mockRejectedValue(new Error('Get fail'));
            await expect(service.getObject('b', 'path'))
                .rejects.toMatchObject({ code: 'MINIO_GET_OBJECT_ERROR' });
        });
    });
});
