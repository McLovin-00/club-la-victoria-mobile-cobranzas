import { PassThrough } from 'stream';
import { EventEmitter } from 'events';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

// Minimal ExcelJS mock to execute generateEquiposExcel code paths without heavy XLSX generation
jest.mock('exceljs', () => {
  class Workbook {
    creator: string | undefined;
    created: Date | undefined;
    xlsx = { writeBuffer: jest.fn(async () => Buffer.from('xlsx')) };
    addWorksheet() {
      const sheet: any = {
        columns: [],
        addRow: jest.fn(),
        getRow: jest.fn(() => ({ font: {}, fill: {}, alignment: {}, height: 0 })),
        eachRow: jest.fn((fn: any) => {
          // run once with a fake row/cell
          fn({ eachCell: (cellFn: any) => cellFn({}) }, 1);
        }),
      };
      return sheet;
    }
  }
  return { __esModule: true, default: { Workbook } };
});

// archiver mock that writes bytes to the piped PassThrough
jest.mock('archiver', () => {
  return {
    __esModule: true,
    default: (_format: string) => {
      const emitter: any = new EventEmitter();
      let dest: PassThrough | null = null;
      emitter.pipe = (d: PassThrough) => { dest = d; return d; };
      emitter.append = (_data: any, _opts: any) => {
        if (dest) dest.write(Buffer.from('x'));
      };
      emitter.finalize = async () => {
        if (dest) dest.end();
      };
      return emitter;
    },
  };
});

const minioMock = {
  getObject: jest.fn(async () => {
    const s = new PassThrough();
    s.end(Buffer.from('pdf'));
    return s;
  }),
  uploadObject: jest.fn(async (_tenant: number, objectPath: string) => ({ bucketName: 'docs-t1', objectPath })),
};
jest.mock('../../src/services/minio.service', () => ({ minioService: minioMock }));

import { DocumentZipService } from '../../src/services/document-zip.service';

describe('DocumentZipService runJob', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (globalThis as any).__ZIP_JOBS = new Map();
    (DocumentZipService as any).forcedFailOnce = new Set();
    process.env.NODE_ENV = 'test';
    process.env.ZIP_ENABLE_ASYNC = 'true';
    process.env.ZIP_USE_WORKER = 'false';
    process.env.ZIP_FORCE_FAIL_FIRST = 'false';
  });

  it('runJob: should process equipos, add docs + excel, and upload zip', async () => {
    const jobId = 'zip_test_1';
    const store = (DocumentZipService as any).getStore();
    store.set(jobId, {
      id: jobId,
      tenantEmpresaId: 1,
      createdAt: Date.now(),
      status: 'queued',
      progress: 0,
      totalEquipos: 1,
      processedEquipos: 0,
      artifact: null,
      retryCount: 0,
      maxRetries: 0,
    });

    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 10,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: 1,
      truckId: 2,
      trailerId: null,
      empresaTransportistaId: null,
      driverDniNorm: null,
      truckPlateNorm: null,
      trailerPlateNorm: null,
      empresaTransportista: null,
    } as any);
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '1', nombre: 'N', apellido: 'A' } as any);
    prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: 'AA' } as any);

    // Two docs: one with slash, one without (parseFilePath fallback)
    prismaMock.document.findMany.mockResolvedValueOnce([
      { id: 1, entityType: 'CHOFER', entityId: 1, filePath: 'bucket/path/doc.pdf', template: { name: 'DNI' } },
      { id: 2, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 9, filePath: 'doc2.pdf', template: { name: 'ARCA Empresa' } },
    ] as any);

    await (DocumentZipService as any).runJob(jobId, 1, [10]);

    const job = DocumentZipService.getJob(jobId);
    expect(job?.status).toBe('completed');
    expect(job?.artifact).toEqual(expect.objectContaining({ objectPath: `exports/zips/${jobId}.zip` }));
    expect(minioMock.getObject).toHaveBeenCalled();
    expect(minioMock.uploadObject).toHaveBeenCalled();
  });

  it('runJob: should honor ZIP_FORCE_FAIL_FIRST and then succeed on retry', async () => {
    process.env.ZIP_FORCE_FAIL_FIRST = 'true';
    const jobId = 'zip_test_2';
    const store = (DocumentZipService as any).getStore();
    store.set(jobId, {
      id: jobId,
      tenantEmpresaId: 1,
      createdAt: Date.now(),
      status: 'queued',
      progress: 0,
      totalEquipos: 1,
      processedEquipos: 0,
      artifact: null,
      retryCount: 0,
      maxRetries: 0,
    });

    // Setup minimal prisma for successful second run
    prismaMock.equipo.findUnique.mockResolvedValue({
      id: 10,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: 1,
      truckId: 2,
      trailerId: null,
      empresaTransportistaId: null,
      driverDniNorm: '1',
      truckPlateNorm: 'AA',
      trailerPlateNorm: null,
      empresaTransportista: null,
    } as any);
    prismaMock.chofer.findUnique.mockResolvedValue({ dni: '1', nombre: 'N', apellido: 'A' } as any);
    prismaMock.camion.findUnique.mockResolvedValue({ patente: 'AA' } as any);
    prismaMock.document.findMany.mockResolvedValue([] as any);

    await expect((DocumentZipService as any).runJob(jobId, 1, [10])).rejects.toThrow('Forced failure');
    await expect((DocumentZipService as any).runJob(jobId, 1, [10])).resolves.toBeUndefined();
  });
});


