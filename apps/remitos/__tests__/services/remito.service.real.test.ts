/**
 * Tests reales para RemitoService (ejecuta código de src/)
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
  uploadRemitoImage: jest.fn(),
  getSignedUrl: jest.fn(),
  getObject: jest.fn(),
};
jest.mock('../../src/services/minio.service', () => ({
  minioService: minio,
}));

const queue = {
  addAnalysisJob: jest.fn(),
};
jest.mock('../../src/services/queue.service', () => ({
  queueService: queue,
}));

import { RemitoService } from '../../src/services/remito.service';

describe('RemitoService (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates remito, uploads principal, creates images, enqueues job and history', async () => {
      prisma.remito.create.mockResolvedValue({
        id: 10,
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        cargadoPorUserId: 3,
        cargadoPorRol: 'ADMIN_INTERNO',
        choferId: null,
        estado: 'PENDIENTE_ANALISIS',
      });

      minio.uploadRemitoImage.mockResolvedValue({ bucketName: 'b1', objectKey: 'k1' });

      let imgId = 100;
      prisma.remitoImagen.create.mockImplementation(async ({ data }: any) => ({
        id: imgId++,
        ...data,
      }));

      prisma.remitoHistory.create.mockResolvedValue({});
      queue.addAnalysisJob.mockResolvedValue('job-1');

      const res = await RemitoService.create(
        {
          tenantEmpresaId: 1,
          dadorCargaId: 2,
          cargadoPorUserId: 3,
          cargadoPorRol: 'ADMIN_INTERNO',
        },
        {
          pdfBuffer: Buffer.from('pdf'),
          originalInputs: [
            { buffer: Buffer.from('pdf'), mimeType: 'application/pdf', fileName: 'r.pdf' },
            { buffer: Buffer.from('img1'), mimeType: 'image/jpeg', fileName: 'a.jpg' },
          ],
          fileName: 'remito.pdf',
        }
      );

      expect(prisma.remito.create).toHaveBeenCalled();
      expect(minio.uploadRemitoImage).toHaveBeenCalled();
      expect(prisma.remitoImagen.create).toHaveBeenCalled();
      expect(prisma.remitoHistory.create).toHaveBeenCalled();
      expect(queue.addAnalysisJob).toHaveBeenCalled();
      expect(res.remito.id).toBe(10);
      expect(res.imagenes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('list', () => {
    it('lists with pagination and stats', async () => {
      prisma.remito.findMany.mockResolvedValue([{ id: 1, imagenes: [] }]);
      prisma.remito.count.mockResolvedValue(1);
      prisma.remito.groupBy.mockResolvedValue([
        { estado: 'PENDIENTE_APROBACION', _count: { id: 1 } },
      ]);

      const out = await RemitoService.list({
        tenantEmpresaId: 1,
        userId: 99,
        userRole: 'CHOFER',
        page: 1,
        limit: 20,
      });

      expect(out.pagination.total).toBe(1);
      expect(out.stats.pendientes).toBe(1);
      expect(prisma.remito.findMany).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns null when not found', async () => {
      prisma.remito.findUnique.mockResolvedValue(null);
      const out = await RemitoService.getById(1, 1, 'ADMIN_INTERNO');
      expect(out).toBeNull();
    });

    it('returns null when user is not allowed', async () => {
      prisma.remito.findUnique.mockResolvedValue({
        id: 1,
        cargadoPorUserId: 123,
        imagenes: [],
        historial: [],
      });
      const out = await RemitoService.getById(1, 99, 'CHOFER');
      expect(out).toBeNull();
    });
  });

  describe('updateFromAnalysis', () => {
    it('updates remito and sets PENDIENTE_APROBACION', async () => {
      prisma.remito.update.mockResolvedValue({});
      await RemitoService.updateFromAnalysis(1, {
        numeroRemito: 'R1',
        fechaOperacion: '15/06/2024',
        emisor: { nombre: 'E', detalle: null },
        cliente: 'C',
        producto: 'P',
        transportista: 'T',
        chofer: { nombre: 'N', dni: '1' },
        patentes: { chasis: 'AA', acoplado: 'BB' },
        pesosOrigen: { bruto: 1, tara: 2, neto: 3 },
        pesosDestino: null,
        confianza: 0.9,
        camposDetectados: ['numeroRemito'],
        errores: [],
      } as any);

      expect(prisma.remito.update).toHaveBeenCalled();
      const call = prisma.remito.update.mock.calls[0][0];
      expect(call.data.estado).toBe('PENDIENTE_APROBACION');
    });
  });

  describe('updateManual', () => {
    it('throws if remito not found', async () => {
      prisma.remito.findUnique.mockResolvedValue(null);
      await expect(RemitoService.updateManual(1, 1, {})).rejects.toThrow('Remito no encontrado');
    });

    it('throws if remito is approved', async () => {
      prisma.remito.findUnique.mockResolvedValue({ id: 1, estado: 'APROBADO' });
      await expect(RemitoService.updateManual(1, 1, {})).rejects.toThrow('No se puede editar un remito aprobado');
    });

    it('updates fields and logs history', async () => {
      prisma.remito.findUnique.mockResolvedValue({
        id: 1,
        estado: 'PENDIENTE_APROBACION',
        pesoDestinoBruto: null,
        pesoDestinoTara: null,
        pesoDestinoNeto: null,
      });
      prisma.remito.update.mockResolvedValue({ id: 1 });
      prisma.remitoHistory.create.mockResolvedValue({});

      const out = await RemitoService.updateManual(1, 10, {
        numeroRemito: 'R-1',
        fechaOperacion: '15/06/2024',
        pesoDestinoBruto: 100,
      });

      expect(out.id).toBe(1);
      expect(prisma.remito.update).toHaveBeenCalled();
      expect(prisma.remitoHistory.create).toHaveBeenCalled();
    });
  });

  describe('approve/reject/getStats/reprocess', () => {
    it('approve updates state and logs history', async () => {
      prisma.remito.update.mockResolvedValue({ id: 1, estado: 'APROBADO' });
      prisma.remitoHistory.create.mockResolvedValue({});
      const out = await RemitoService.approve(1, 10);
      expect(out.estado).toBe('APROBADO');
      expect(prisma.remitoHistory.create).toHaveBeenCalled();
    });

    it('reject updates state and logs history', async () => {
      prisma.remito.update.mockResolvedValue({ id: 1, estado: 'RECHAZADO' });
      prisma.remitoHistory.create.mockResolvedValue({});
      const out = await RemitoService.reject(1, 10, 'motivo');
      expect(out.estado).toBe('RECHAZADO');
      expect(prisma.remitoHistory.create).toHaveBeenCalled();
    });

    it('getStats counts states', async () => {
      prisma.remito.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5);
      const out = await RemitoService.getStats(1, 2);
      expect(out.total).toBe(10);
      expect(out.pendientes).toBe(2);
    });

    it('reprocess enqueues job', async () => {
      prisma.remito.findUnique.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        estado: 'RECHAZADO',
        imagenes: [{ id: 55, bucketName: 'b', objectKey: 'k.pdf' }],
      });
      prisma.remito.update.mockResolvedValue({});
      prisma.remitoHistory.create.mockResolvedValue({});
      queue.addAnalysisJob.mockResolvedValue('job-99');

      const out = await RemitoService.reprocess(1, 10);
      expect(out.jobId).toBe('job-99');
      expect(queue.addAnalysisJob).toHaveBeenCalled();
    });
  });
});


