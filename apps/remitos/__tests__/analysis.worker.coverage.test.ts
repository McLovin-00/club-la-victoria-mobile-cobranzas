/**
 * @jest-environment node
 */

process.env.REMITOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    status: 'ready',
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation((_name: string, _processor: unknown, _opts: unknown) => ({
    on: jest.fn().mockReturnThis(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Job: jest.fn(),
}));

const mockDbClient = {
  remito: { update: jest.fn() },
  remitoImagen: { update: jest.fn(), findMany: jest.fn() },
  remitoHistory: { create: jest.fn() },
};

jest.mock('../src/config/database', () => ({
  db: { getClient: jest.fn().mockReturnValue(mockDbClient) },
}));
jest.mock('../src/config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({ REDIS_HOST: 'localhost', REDIS_PORT: 6379 }),
}));
jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../src/services/minio.service', () => ({
  minioService: { getObject: jest.fn().mockResolvedValue(Buffer.from('test')) },
}));
jest.mock('../src/services/media.service', () => ({
  MediaService: {
    resizeForAnalysis: jest.fn().mockImplementation((buf: Buffer) => Promise.resolve(buf)),
    composeImageGrid: jest.fn().mockImplementation((bufs: Buffer[]) => Promise.resolve(bufs[0])),
  },
}));
jest.mock('../src/services/flowise.service', () => ({
  FlowiseService: { analyzeRemito: jest.fn() },
}));
jest.mock('../src/services/remito.service', () => ({
  RemitoService: { updateFromAnalysis: jest.fn() },
}));
jest.mock('../src/services/pdf.service', () => ({
  PdfService: { pdfToImages: jest.fn() },
}));

import { __test__, startAnalysisWorker, stopAnalysisWorker } from '../src/workers/analysis.worker';
import { minioService } from '../src/services/minio.service';
import { MediaService } from '../src/services/media.service';
import { FlowiseService } from '../src/services/flowise.service';
import { RemitoService } from '../src/services/remito.service';
import { PdfService } from '../src/services/pdf.service';
import { Worker } from 'bullmq';

const {
  processJob,
  prepareImageForAnalysis,
  rasterizePdf,
  composeOrSingle,
  getAdditionalImages,
  handleSuccessfulAnalysis,
  handleFailedAnalysis,
  updateRemitoStatus,
  logHistory,
} = __test__;

const mockGetObject = minioService.getObject as jest.Mock;
const mockResize = MediaService.resizeForAnalysis as jest.Mock;
const mockCompose = MediaService.composeImageGrid as jest.Mock;
const mockAnalyze = (FlowiseService.analyzeRemito as jest.Mock);
const mockUpdateFromAnalysis = RemitoService.updateFromAnalysis as jest.Mock;
const mockPdfToImages = (PdfService.pdfToImages as jest.Mock);
const MockWorker = Worker as unknown as jest.Mock;

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    data: {
      remitoId: 1,
      imagenId: 10,
      tenantEmpresaId: 100,
      bucketName: 'remitos',
      objectKey: 'file.jpg',
      originalInputsCount: 1,
      ...overrides,
    },
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('analysis.worker', () => {
  // ======================================================================
  // updateRemitoStatus
  // ======================================================================
  describe('updateRemitoStatus', () => {
    it('updates remito estado', async () => {
      await updateRemitoStatus(1, 'EN_ANALISIS' as any);

      expect(mockDbClient.remito.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estado: 'EN_ANALISIS' },
      });
    });
  });

  // ======================================================================
  // logHistory
  // ======================================================================
  describe('logHistory', () => {
    it('creates history entry', async () => {
      await logHistory(1, 'ANALISIS_INICIADO' as any, { jobId: 'j-1' });

      expect(mockDbClient.remitoHistory.create).toHaveBeenCalledWith({
        data: {
          remitoId: 1,
          action: 'ANALISIS_INICIADO',
          userId: 0,
          userRole: 'SYSTEM',
          payload: { jobId: 'j-1' },
        },
      });
    });
  });

  // ======================================================================
  // getAdditionalImages
  // ======================================================================
  describe('getAdditionalImages', () => {
    it('returns empty array when no additional images', async () => {
      mockDbClient.remitoImagen.findMany.mockResolvedValueOnce([]);

      const result = await getAdditionalImages(1);

      expect(result).toEqual([]);
    });

    it('fetches and resizes additional images', async () => {
      mockDbClient.remitoImagen.findMany.mockResolvedValueOnce([
        { bucketName: 'b1', objectKey: 'k1', tipo: 'ADICIONAL', orden: 1 },
        { bucketName: 'b2', objectKey: 'k2', tipo: 'ADICIONAL', orden: 2 },
      ]);
      const buf1 = Buffer.from('img1');
      const buf2 = Buffer.from('img2');
      mockGetObject.mockResolvedValueOnce(buf1).mockResolvedValueOnce(buf2);

      const result = await getAdditionalImages(1);

      expect(result).toHaveLength(2);
      expect(mockResize).toHaveBeenCalledTimes(2);
    });
  });

  // ======================================================================
  // rasterizePdf
  // ======================================================================
  describe('rasterizePdf', () => {
    it('returns normalized images on success', async () => {
      const page1 = Buffer.from('page1');
      const page2 = Buffer.from('page2');
      mockPdfToImages.mockResolvedValueOnce([page1, page2]);

      const result = await rasterizePdf(Buffer.from('pdf'));

      expect(result).toHaveLength(2);
      expect(mockResize).toHaveBeenCalledTimes(2);
    });

    it('throws when pdfToImages returns empty array', async () => {
      mockPdfToImages.mockResolvedValueOnce([]);

      await expect(rasterizePdf(Buffer.from('pdf'))).rejects.toThrow(
        'No se pudieron extraer imágenes del PDF'
      );
    });
  });

  // ======================================================================
  // composeOrSingle
  // ======================================================================
  describe('composeOrSingle', () => {
    it('returns single buffer directly', async () => {
      const buf = Buffer.from('single');

      const result = await composeOrSingle([buf]);

      expect(result).toBe(buf);
      expect(mockCompose).not.toHaveBeenCalled();
    });

    it('composes multiple buffers into grid', async () => {
      const bufs = [Buffer.from('a'), Buffer.from('b')];

      await composeOrSingle(bufs);

      expect(mockCompose).toHaveBeenCalledWith(bufs);
    });
  });

  // ======================================================================
  // prepareImageForAnalysis
  // ======================================================================
  describe('prepareImageForAnalysis', () => {
    it('resizes directly when not PDF', async () => {
      const buf = Buffer.from('img');

      const result = await prepareImageForAnalysis(1, buf, false);

      expect(result).toEqual(buf);
      expect(mockResize).toHaveBeenCalledWith(buf);
    });

    it('uses additional images when PDF and images exist', async () => {
      mockDbClient.remitoImagen.findMany.mockResolvedValueOnce([
        { bucketName: 'b', objectKey: 'k', tipo: 'ADICIONAL', orden: 1 },
      ]);
      mockGetObject.mockResolvedValueOnce(Buffer.from('additional'));

      const result = await prepareImageForAnalysis(1, Buffer.from('pdf'), true);

      expect(result).toEqual(Buffer.from('additional'));
      expect(mockPdfToImages).not.toHaveBeenCalled();
    });

    it('rasterizes PDF when no additional images', async () => {
      mockDbClient.remitoImagen.findMany.mockResolvedValueOnce([]);
      const page = Buffer.from('page');
      mockPdfToImages.mockResolvedValueOnce([page]);

      const result = await prepareImageForAnalysis(1, Buffer.from('pdf'), true);

      expect(result).toEqual(page);
      expect(mockPdfToImages).toHaveBeenCalled();
    });

    it('throws when PDF rasterization fails', async () => {
      mockDbClient.remitoImagen.findMany.mockResolvedValueOnce([]);
      mockPdfToImages.mockRejectedValueOnce(new Error('corrupted'));

      await expect(
        prepareImageForAnalysis(1, Buffer.from('pdf'), true)
      ).rejects.toThrow('No se pudo procesar el PDF: corrupted');
    });
  });

  // ======================================================================
  // handleSuccessfulAnalysis
  // ======================================================================
  describe('handleSuccessfulAnalysis', () => {
    it('updates remito, marks image processed, and logs history', async () => {
      const data = { confianza: 0.95, camposDetectados: ['campo1'] };

      await handleSuccessfulAnalysis(1, 10, data);

      expect(mockUpdateFromAnalysis).toHaveBeenCalledWith(1, data);
      expect(mockDbClient.remitoImagen.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { procesadoPorIA: true },
      });
      expect(mockDbClient.remitoHistory.create).toHaveBeenCalled();
    });
  });

  // ======================================================================
  // handleFailedAnalysis
  // ======================================================================
  describe('handleFailedAnalysis', () => {
    it('updates remito with error state and logs history', async () => {
      await handleFailedAnalysis(1, 'parse error');

      expect(mockDbClient.remito.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estado: 'ERROR_ANALISIS', erroresAnalisis: ['parse error'] },
      });
      expect(mockDbClient.remitoHistory.create).toHaveBeenCalled();
    });
  });

  // ======================================================================
  // processJob
  // ======================================================================
  describe('processJob', () => {
    it('processes successfully when analysis returns data', async () => {
      const analysisData = { confianza: 0.9, camposDetectados: ['f1'] };
      mockGetObject.mockResolvedValueOnce(Buffer.from('img'));
      mockAnalyze.mockResolvedValueOnce({ success: true, data: analysisData });

      await processJob(makeJob());

      expect(mockDbClient.remito.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'EN_ANALISIS' } })
      );
      expect(mockUpdateFromAnalysis).toHaveBeenCalledWith(1, analysisData);
    });

    it('handles failed analysis result (success false)', async () => {
      mockGetObject.mockResolvedValueOnce(Buffer.from('img'));
      mockAnalyze.mockResolvedValueOnce({ success: false, error: 'bad format' });

      await processJob(makeJob());

      expect(mockDbClient.remito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'ERROR_ANALISIS' }),
        })
      );
    });

    it('handles analysis with success=true but no data', async () => {
      mockGetObject.mockResolvedValueOnce(Buffer.from('img'));
      mockAnalyze.mockResolvedValueOnce({ success: true, data: null });

      await processJob(makeJob());

      expect(mockDbClient.remito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'ERROR_ANALISIS',
            erroresAnalisis: ['Error desconocido'],
          }),
        })
      );
    });

    it('handles MinIO timeout error path', async () => {
      mockGetObject.mockImplementationOnce(
        () => new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error('MinIO getObject timeout (60s)')), 50);
        })
      );

      await expect(processJob(makeJob())).rejects.toThrow('MinIO getObject timeout (60s)');

      expect(mockDbClient.remito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'ERROR_ANALISIS',
            erroresAnalisis: ['MinIO getObject timeout (60s)'],
          }),
        })
      );
    });

    it('handles general error and rethrows', async () => {
      mockGetObject.mockRejectedValueOnce(new Error('network down'));

      await expect(processJob(makeJob())).rejects.toThrow('network down');

      expect(mockDbClient.remito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'ERROR_ANALISIS',
            erroresAnalisis: ['network down'],
          }),
        })
      );
    });

    it('processes PDF files correctly', async () => {
      const job = makeJob({ objectKey: 'file.pdf' });
      mockGetObject.mockResolvedValueOnce(Buffer.from('pdf-content'));
      mockDbClient.remitoImagen.findMany.mockResolvedValueOnce([]);
      mockPdfToImages.mockResolvedValueOnce([Buffer.from('page1')]);
      mockAnalyze.mockResolvedValueOnce({ success: true, data: { confianza: 0.8, camposDetectados: [] } });

      await processJob(job);

      expect(mockPdfToImages).toHaveBeenCalled();
      expect(mockUpdateFromAnalysis).toHaveBeenCalled();
    });

    it('uses fallback error message when error.message is empty', async () => {
      mockGetObject.mockRejectedValueOnce(new Error(''));

      await expect(processJob(makeJob())).rejects.toThrow();

      expect(mockDbClient.remito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            erroresAnalisis: ['Error interno'],
          }),
        })
      );
    });
  });

  // ======================================================================
  // startAnalysisWorker / stopAnalysisWorker
  // ======================================================================
  describe('startAnalysisWorker', () => {
    it('creates a new worker', () => {
      const w = startAnalysisWorker();

      expect(MockWorker).toHaveBeenCalled();
      expect(w).toBeDefined();
    });

    it('returns existing worker on second call (idempotent)', () => {
      const w1 = startAnalysisWorker();
      const w2 = startAnalysisWorker();

      expect(w1).toBe(w2);
    });
  });

  describe('stopAnalysisWorker', () => {
    it('closes worker and quits connection', async () => {
      startAnalysisWorker();

      await stopAnalysisWorker();
    });

    it('quits connection even when no worker exists', async () => {
      await stopAnalysisWorker();
    });
  });
});
