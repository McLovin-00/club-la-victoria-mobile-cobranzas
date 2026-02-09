/**
 * Tests extendidos para analysis.worker.ts - cubrir líneas faltantes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock todas las dependencias con tipado correcto
const mockPrismaClient: any = {
  remito: {
    update: jest.fn().mockResolvedValue({ id: 1 } as never),
  },
  remitoHistory: {
    create: jest.fn().mockResolvedValue({ id: 1 } as never),
  },
  remitoImagen: {
    findMany: jest.fn().mockResolvedValue([] as never),
    update: jest.fn().mockResolvedValue({ id: 1 } as never),
  },
};

jest.mock('../../src/config/database', () => ({
  db: {
    getClient: () => mockPrismaClient,
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: {
    getObject: jest.fn().mockResolvedValue(Buffer.from('test') as never),
  },
}));

jest.mock('../../src/services/media.service', () => ({
  MediaService: {
    resizeForAnalysis: jest.fn().mockResolvedValue(Buffer.from('resized') as never),
    composeImageGrid: jest.fn().mockResolvedValue(Buffer.from('composed') as never),
  },
}));

jest.mock('../../src/services/pdf.service', () => ({
  PdfService: {
    pdfToImages: jest.fn().mockResolvedValue([Buffer.from('page1')] as never),
  },
}));

jest.mock('../../src/services/flowise.service', () => ({
  FlowiseService: {
    analyzeRemito: jest.fn().mockResolvedValue({
      success: true,
      data: { confianza: 0.9, camposDetectados: ['test'] },
    } as never),
  },
}));

jest.mock('../../src/services/remito.service', () => ({
  RemitoService: {
    updateFromAnalysis: jest.fn().mockResolvedValue(undefined as never),
  },
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    quit: jest.fn().mockResolvedValue(undefined as never),
  }));
});

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation((_name: any, _processor: any, _options: any) => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined as never),
  })),
  Job: jest.fn(),
}));

describe('analysis.worker __test__ helpers', () => {
  let workerModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    workerModule = await import('../../src/workers/analysis.worker');
  });

  describe('composeOrSingle', () => {
    it('retorna el único buffer cuando hay solo uno', async () => {
      const buf = Buffer.from('single');
      const result = await workerModule.__test__.composeOrSingle([buf]);
      expect(result).toBe(buf);
    });

    it('compone múltiples buffers usando composeImageGrid', async () => {
      const { MediaService } = await import('../../src/services/media.service');
      const bufs = [Buffer.from('a'), Buffer.from('b')];
      await workerModule.__test__.composeOrSingle(bufs);
      expect(MediaService.composeImageGrid).toHaveBeenCalledWith(bufs);
    });
  });

  describe('getAdditionalImages', () => {
    it('retorna array vacío si no hay imágenes adicionales', async () => {
      mockPrismaClient.remitoImagen.findMany.mockResolvedValue([] as never);
      const result = await workerModule.__test__.getAdditionalImages(1);
      expect(result).toEqual([]);
    });

    it('obtiene y redimensiona imágenes adicionales', async () => {
      mockPrismaClient.remitoImagen.findMany.mockResolvedValue([
        { bucketName: 'test', objectKey: 'img1.jpg' },
      ] as never);
      const result = await workerModule.__test__.getAdditionalImages(1);
      expect(result.length).toBe(1);
    });
  });

  describe('rasterizePdf', () => {
    it('rasteriza PDF a imágenes', async () => {
      const pdfBuffer = Buffer.from('pdf');
      const result = await workerModule.__test__.rasterizePdf(pdfBuffer);
      expect(result.length).toBe(1);
    });

    it('lanza error si no hay páginas', async () => {
      const { PdfService } = await import('../../src/services/pdf.service');
      (PdfService.pdfToImages as jest.Mock<any>).mockResolvedValueOnce([] as never);

      await expect(workerModule.__test__.rasterizePdf(Buffer.from('pdf')))
        .rejects.toThrow('No se pudieron extraer imágenes del PDF');
    });
  });

  describe('prepareImageForAnalysis', () => {
    it('redimensiona imagen directamente si no es PDF', async () => {
      const buf = Buffer.from('img');
      await workerModule.__test__.prepareImageForAnalysis(1, buf, false);
      const { MediaService } = await import('../../src/services/media.service');
      expect(MediaService.resizeForAnalysis).toHaveBeenCalledWith(buf);
    });

    it('usa imágenes originales si existen para PDF', async () => {
      mockPrismaClient.remitoImagen.findMany.mockResolvedValue([
        { bucketName: 'b', objectKey: 'k' },
      ] as never);
      await workerModule.__test__.prepareImageForAnalysis(1, Buffer.from('pdf'), true);
    });

    it('rasteriza PDF si no hay imágenes originales', async () => {
      mockPrismaClient.remitoImagen.findMany.mockResolvedValue([] as never);
      const { PdfService } = await import('../../src/services/pdf.service');
      (PdfService.pdfToImages as jest.Mock<any>).mockResolvedValue([Buffer.from('p1')] as never);

      await workerModule.__test__.prepareImageForAnalysis(1, Buffer.from('pdf'), true);
      expect(PdfService.pdfToImages).toHaveBeenCalled();
    });

    it('lanza error si falla rasterización', async () => {
      mockPrismaClient.remitoImagen.findMany.mockResolvedValue([] as never);
      const { PdfService } = await import('../../src/services/pdf.service');
      (PdfService.pdfToImages as jest.Mock<any>).mockRejectedValueOnce(new Error('PDF error') as never);

      await expect(workerModule.__test__.prepareImageForAnalysis(1, Buffer.from('pdf'), true))
        .rejects.toThrow('No se pudo procesar el PDF: PDF error');
    });
  });

  describe('updateRemitoStatus', () => {
    it('actualiza estado del remito', async () => {
      await workerModule.__test__.updateRemitoStatus(1, 'EN_ANALISIS');
      expect(mockPrismaClient.remito.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estado: 'EN_ANALISIS' },
      });
    });
  });

  describe('logHistory', () => {
    it('crea registro de historial', async () => {
      await workerModule.__test__.logHistory(1, 'ANALISIS_INICIADO', { test: true });
      expect(mockPrismaClient.remitoHistory.create).toHaveBeenCalledWith({
        data: {
          remitoId: 1,
          action: 'ANALISIS_INICIADO',
          userId: 0,
          userRole: 'SYSTEM',
          payload: { test: true },
        },
      });
    });
  });

  describe('handleSuccessfulAnalysis', () => {
    it('actualiza remito e imagen tras análisis exitoso', async () => {
      await workerModule.__test__.handleSuccessfulAnalysis(1, 10, {
        confianza: 0.9,
        camposDetectados: ['a', 'b'],
      });
      expect(mockPrismaClient.remitoImagen.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { procesadoPorIA: true },
      });
    });
  });

  describe('handleFailedAnalysis', () => {
    it('marca remito con error y registra historial', async () => {
      await workerModule.__test__.handleFailedAnalysis(1, 'Error de prueba');
      expect(mockPrismaClient.remito.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estado: 'ERROR_ANALISIS', erroresAnalisis: ['Error de prueba'] },
      });
    });
  });
});

describe('analysis.worker lifecycle', () => {
  let workerModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    workerModule = await import('../../src/workers/analysis.worker');
  });

  describe('startAnalysisWorker', () => {
    it('inicia el worker y retorna instancia', () => {
      const worker = workerModule.startAnalysisWorker();
      expect(worker).toBeDefined();
    });

    it('retorna mismo worker si ya está iniciado', () => {
      const w1 = workerModule.startAnalysisWorker();
      const w2 = workerModule.startAnalysisWorker();
      expect(w1).toBe(w2);
    });
  });

  describe('stopAnalysisWorker', () => {
    it('detiene el worker sin errores', async () => {
      workerModule.startAnalysisWorker();
      await expect(workerModule.stopAnalysisWorker()).resolves.not.toThrow();
    });
  });
});
