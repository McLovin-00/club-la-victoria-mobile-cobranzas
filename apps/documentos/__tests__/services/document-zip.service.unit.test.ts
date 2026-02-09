import { PassThrough } from 'stream';
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('archiver', () => {
  const streamModule = jest.requireActual('stream') as typeof import('stream');
  const factory = () => {
    const stream = new streamModule.PassThrough() as PassThrough & {
      append: jest.Mock;
      finalize: () => void;
    };
    stream.append = jest.fn();
    stream.finalize = () => {
      setImmediate(() => stream.end());
    };
    return stream;
  };
  return {
    __esModule: true,
    default: jest.fn(() => factory()),
  };
});

jest.mock('../../src/services/minio.service', () => {
  const streamModule = jest.requireActual('stream') as typeof import('stream');
  return {
    minioService: {
      getObject: jest.fn(async () => new streamModule.PassThrough()),
      uploadObject: jest.fn(async (_tenant: number, objectPath: string) => ({
        bucketName: 'test-bucket',
        objectPath,
      })),
    },
  };
});

import { DocumentZipService } from '../../src/services/document-zip.service';

type DocumentZipServicePrivate = {
  runJob: (jobId: string, tenantEmpresaId: number, equipoIds: number[]) => Promise<void>;
  handleJobError: (jobId: string, tenantEmpresaId: number, equipoIds: number[], err: Error) => void;
};

describe('DocumentZipService unit', () => {
  const oldEnv = process.env;
  const globalStore = globalThis as unknown as { __ZIP_JOBS?: Map<string, unknown> };

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    delete globalStore.__ZIP_JOBS;
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('enqueueZipJob retorna job completado en modo test sync', () => {
    process.env = { ...oldEnv, NODE_ENV: 'test' };

    const jobId = DocumentZipService.enqueueZipJob(5, [1, 2]);
    const job = DocumentZipService.getJob(jobId);

    expect(job?.status).toBe('completed');
    expect(job?.artifact?.bucketName).toBe('docs-t5');
  });

  it('runJob procesa equipos, documentos y actualiza progreso', async () => {
    process.env = { ...oldEnv, NODE_ENV: 'test', ZIP_ENABLE_ASYNC: 'true' };

    const jobId = DocumentZipService.enqueueZipJob(7, [101]);

    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 101,
      tenantEmpresaId: 7,
      dadorCargaId: 9,
      driverId: 0,
      truckId: 0,
      trailerId: null,
      empresaTransportistaId: null,
      driverDniNorm: '201',
      truckPlateNorm: 'AAA111',
      trailerPlateNorm: null,
      empresaTransportista: { cuit: '30', razonSocial: 'Transportes' },
    });
    prismaMock.chofer.findUnique.mockResolvedValueOnce(null);
    prismaMock.camion.findUnique.mockResolvedValueOnce(null);
    prismaMock.acoplado.findUnique.mockResolvedValueOnce(null);

    prismaMock.document.findMany.mockResolvedValueOnce([
      {
        id: 1,
        entityType: 'CHOFER',
        entityId: 201,
        filePath: 'bucket-x/docs/doc1.pdf',
        template: { name: 'Licencia#1' },
      },
      {
        id: 2,
        entityType: 'OTRO',
        entityId: 999,
        filePath: 'doc2.pdf',
        template: { name: 'Otro Doc' },
      },
    ]);

    const service = DocumentZipService as unknown as DocumentZipServicePrivate;
    await service.runJob(jobId, 7, [101]);

    const job = DocumentZipService.getJob(jobId);
    expect(job?.status).toBe('completed');
    expect(job?.processedEquipos).toBe(1);
    expect(job?.artifact?.objectPath).toContain(jobId);
  });

  it('handleJobError reintenta y marca fallo cuando excede maxRetries', () => {
    jest.useFakeTimers();
    process.env = { ...oldEnv, NODE_ENV: 'test', ZIP_ENABLE_ASYNC: 'true', DOCUMENT_ZIP_MAX_RETRIES: '1' };

    const jobId = DocumentZipService.enqueueZipJob(2, []);
    const service = DocumentZipService as unknown as DocumentZipServicePrivate;

    service.handleJobError(jobId, 2, [], new Error('boom'));
    const retryJob = DocumentZipService.getJob(jobId);
    expect(retryJob?.status).toBe('queued');
    expect(retryJob?.retryCount).toBe(1);

    service.handleJobError(jobId, 2, [], new Error('boom2'));
    const failedJob = DocumentZipService.getJob(jobId);
    expect(failedJob?.status).toBe('failed');

    jest.useRealTimers();
  });
});
