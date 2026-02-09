/**
 * Tests reales para analysis.worker.ts (sin Redis real)
 * @jest-environment node
 */

import { createPrismaMock } from '../helpers/prismaMock';

const prisma = createPrismaMock();

jest.mock('../../src/config/database', () => ({
  db: {
    getClient: () => prisma,
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const minio = {
  getObject: jest.fn(),
};
jest.mock('../../src/services/minio.service', () => ({
  minioService: minio,
}));

const Media = {
  resizeForAnalysis: jest.fn(),
  composeImageGrid: jest.fn(),
};
jest.mock('../../src/services/media.service', () => ({
  MediaService: Media,
  default: Media,
}));

const Flowise = {
  analyzeRemito: jest.fn(),
};
jest.mock('../../src/services/flowise.service', () => ({
  FlowiseService: Flowise,
}));

const RemitoSvc = {
  updateFromAnalysis: jest.fn(),
};
jest.mock('../../src/services/remito.service', () => ({
  RemitoService: RemitoSvc,
}));

const Pdf = {
  pdfToImages: jest.fn(),
};
jest.mock('../../src/services/pdf.service', () => ({
  PdfService: Pdf,
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ REDIS_HOST: 'localhost', REDIS_PORT: 6379 }),
}));

import { __test__ } from '../../src/workers/analysis.worker';

describe('analysis.worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processJob success path (non-pdf)', async () => {
    prisma.remito.update.mockResolvedValue({});
    prisma.remitoHistory.create.mockResolvedValue({});
    prisma.remitoImagen.update.mockResolvedValue({});

    minio.getObject.mockResolvedValue(Buffer.from('img'));
    Media.resizeForAnalysis.mockResolvedValue(Buffer.from('normalized'));
    Flowise.analyzeRemito.mockResolvedValue({
      success: true,
      data: { confianza: 0.5, camposDetectados: [], errores: [] },
    });
    RemitoSvc.updateFromAnalysis.mockResolvedValue(undefined);

    await __test__.processJob({
      id: '1',
      data: {
        remitoId: 1,
        imagenId: 2,
        bucketName: 'b',
        objectKey: 'file.jpg',
        originalInputsCount: 1,
      },
    } as any);

    expect(prisma.remito.update).toHaveBeenCalled();
    expect(Flowise.analyzeRemito).toHaveBeenCalled();
    expect(RemitoSvc.updateFromAnalysis).toHaveBeenCalled();
  });

  it('processJob handles failed analysis response', async () => {
    prisma.remito.update.mockResolvedValue({});
    prisma.remitoHistory.create.mockResolvedValue({});

    minio.getObject.mockResolvedValue(Buffer.from('img'));
    Media.resizeForAnalysis.mockResolvedValue(Buffer.from('normalized'));
    Flowise.analyzeRemito.mockResolvedValue({
      success: false,
      error: 'bad',
    });

    await __test__.processJob({
      id: '2',
      data: {
        remitoId: 2,
        imagenId: 3,
        bucketName: 'b',
        objectKey: 'file.jpg',
        originalInputsCount: 1,
      },
    } as any);

    expect(prisma.remito.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 } })
    );
  });

  it('processJob pdf path uses rasterize fallback when no additional images', async () => {
    prisma.remito.update.mockResolvedValue({});
    prisma.remitoHistory.create.mockResolvedValue({});
    prisma.remitoImagen.findMany.mockResolvedValue([]); // no additional images
    prisma.remitoImagen.update.mockResolvedValue({});

    minio.getObject.mockResolvedValue(Buffer.from('pdf'));
    Pdf.pdfToImages.mockResolvedValue([Buffer.from('p1'), Buffer.from('p2')]);
    Media.resizeForAnalysis.mockResolvedValue(Buffer.from('normalized'));
    Media.composeImageGrid.mockResolvedValue(Buffer.from('grid'));
    Flowise.analyzeRemito.mockResolvedValue({ success: true, data: { confianza: 1, camposDetectados: [], errores: [] } });
    RemitoSvc.updateFromAnalysis.mockResolvedValue(undefined);

    await __test__.processJob({
      id: '3',
      data: { remitoId: 3, imagenId: 9, bucketName: 'b', objectKey: 'file.pdf', originalInputsCount: 1 },
    } as any);

    expect(Pdf.pdfToImages).toHaveBeenCalled();
    expect(Media.composeImageGrid).toHaveBeenCalled();
  });
});


