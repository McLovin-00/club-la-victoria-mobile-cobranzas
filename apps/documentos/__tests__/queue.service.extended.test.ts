
import { queueService } from '../src/services/queue.service';

// Mock dependencies
jest.mock('ioredis', () => {
    return {
        Redis: jest.fn().mockImplementation(() => ({
            quit: jest.fn().mockResolvedValue('OK'),
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
            get: jest.fn().mockResolvedValue('10'),
            on: jest.fn(),
        })),
    };
});

jest.mock('bullmq', () => {
    return {
        Queue: jest.fn().mockImplementation(() => ({
            add: jest.fn(),
            getWaiting: jest.fn(),
            getActive: jest.fn(),
            getCompleted: jest.fn(),
            getFailed: jest.fn(),
            getDelayed: jest.fn(),
            clean: jest.fn(),
            close: jest.fn(),
            on: jest.fn(),
        })),
    };
});

jest.mock('../src/config/logger', () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

jest.mock('../src/services/system-config.service', () => ({
    SystemConfigService: {
        getConfig: jest.fn(),
    },
}));

describe('QueueService Extended Coverage', () => {
    let validationQueue: any;
    let aiQueue: any;
    let complianceQueue: any;

    beforeEach(() => {
        jest.clearAllMocks();
        // Access private queues
        validationQueue = (queueService as any).documentValidationQueue;
        aiQueue = (queueService as any).documentAIValidationQueue;
        complianceQueue = (queueService as any).complianceQueue;
    });

    describe('addDocumentValidation', () => {
        it('should handle errors in addDocumentValidation (Uncovered: 124-125)', async () => {
            validationQueue.add.mockRejectedValue(new Error('Redis full'));

            await expect(queueService.addDocumentValidation({
                documentId: 1, filePath: 'p', templateName: 't', entityType: 'DADOR'
            })).rejects.toThrow('Redis full');

            expect(require('../src/config/logger').AppLogger.error).toHaveBeenCalled();
        });
    });

    describe('addDocumentAIValidation', () => {
        it('should handle errors in addDocumentAIValidation (Uncovered: 149-150)', async () => {
            aiQueue.add.mockRejectedValue(new Error('Queue down'));

            await expect(queueService.addDocumentAIValidation({
                documentId: 1, esRechequeo: true
            })).rejects.toThrow('Queue down');
        });
    });

    describe('addMissingCheckForEquipo', () => {
        const { SystemConfigService } = require('../src/services/system-config.service');

        it('should use explicit delay if provided', async () => {
            complianceQueue.add.mockResolvedValue({ id: 1 });
            await queueService.addMissingCheckForEquipo(1, 10, 5000);
            expect(complianceQueue.add).toHaveBeenCalledWith(
                'verify-missing-equipo',
                expect.any(Object),
                expect.objectContaining({ delay: 5000 })
            );
        });

        it('should fetch config if delay not provided (Uncovered logic)', async () => {
            SystemConfigService.getConfig.mockImplementation((key: string) => {
                if (key.includes('tenant')) return null;
                return '20';
            });
            complianceQueue.add.mockResolvedValue({ id: 1 });

            await queueService.addMissingCheckForEquipo(1, 10);

            expect(complianceQueue.add).toHaveBeenCalledWith(
                'verify-missing-equipo',
                expect.any(Object),
                expect.objectContaining({ delay: 1200000 })
            );
        });

        it('should fallback to 15 min if config fetch fails (Uncovered: 176-177)', async () => {
            SystemConfigService.getConfig.mockRejectedValue(new Error('Config DB down'));
            complianceQueue.add.mockResolvedValue({ id: 1 });

            await queueService.addMissingCheckForEquipo(1, 10);

            expect(complianceQueue.add).toHaveBeenCalledWith(
                'verify-missing-equipo',
                expect.any(Object),
                expect.objectContaining({ delay: 900000 })
            );
        });

        it('should handle queue add error (Uncovered: 184)', async () => {
            complianceQueue.add.mockRejectedValue(new Error('Queue Error'));

            await queueService.addMissingCheckForEquipo(1, 10, 100);

            expect(require('../src/config/logger').AppLogger.error).toHaveBeenCalledWith(
                '💥 Error encolando verificación de faltantes:',
                expect.anything()
            );
        });
    });

    describe('getQueueStats', () => {
        it('should return zeros on error (Uncovered: 236-240)', async () => {
            validationQueue.getWaiting.mockRejectedValue(new Error('Redis fail'));

            const stats = await queueService.getQueueStats();
            expect(stats.waiting).toBe(0);
        });
    });

    describe('cancelDocumentValidationJobs', () => {
        it('should handle errors (Uncovered: 275)', async () => {
            validationQueue.getWaiting.mockRejectedValue(new Error('Fail'));

            await queueService.cancelDocumentValidationJobs(123);
            expect(require('../src/config/logger').AppLogger.error).toHaveBeenCalled();
        });

        it('should cancel matching jobs', async () => {
            const mockJobRemove = jest.fn().mockResolvedValue(true);
            const mockJob = { id: 'job1', data: { documentId: 123 }, remove: mockJobRemove };
            validationQueue.getWaiting.mockResolvedValue([mockJob]);
            validationQueue.getActive.mockResolvedValue([]);
            validationQueue.getDelayed.mockResolvedValue([]);

            await queueService.cancelDocumentValidationJobs(123);

            expect(mockJobRemove).toHaveBeenCalled();
        });
    });

    describe('cleanQueue', () => {
        it('should handle error (Uncovered: 289)', async () => {
            validationQueue.clean.mockRejectedValue(new Error('Clean fail'));
            await queueService.cleanQueue();
            expect(require('../src/config/logger').AppLogger.error).toHaveBeenCalled();
        });
    });

    describe('close', () => {
        it('should handle error (Uncovered: 327)', async () => {
            validationQueue.close.mockRejectedValue(new Error('Close fail'));
            await queueService.close();
            expect(require('../src/config/logger').AppLogger.error).toHaveBeenCalled();
        });
    });
});
