/**
 * Tests extendidos para remito.service.ts - cubrir líneas faltantes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockPrismaClient: any = {
  remito: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  remitoImagen: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  remitoHistory: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  db: {
    getClient: () => mockPrismaClient,
  },
}));

const mockMinioService: any = {
  uploadRemitoImage: jest.fn(),
};

jest.mock('../../src/services/minio.service', () => ({
  minioService: mockMinioService,
}));

const mockQueueService: any = {
  addAnalysisJob: jest.fn(),
};

jest.mock('../../src/services/queue.service', () => ({
  QueueService: mockQueueService,
}));

describe('RemitoService extended', () => {
  let RemitoService: any;

  beforeAll(async () => {
    const module = await import('../../src/services/remito.service');
    RemitoService = module.RemitoService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list con filtros de fecha', () => {
    it('filtra por fechaDesde', async () => {
      mockPrismaClient.remito.findMany.mockResolvedValue([]);
      mockPrismaClient.remito.count.mockResolvedValue(0);
      mockPrismaClient.remito.groupBy.mockResolvedValue([]);

      await RemitoService.list({
        fechaDesde: new Date('2025-01-01'),
        page: 1,
        limit: 10,
      });

      expect(mockPrismaClient.remito.findMany).toHaveBeenCalled();
    });

    it('filtra por fechaHasta', async () => {
      mockPrismaClient.remito.findMany.mockResolvedValue([]);
      mockPrismaClient.remito.count.mockResolvedValue(0);
      mockPrismaClient.remito.groupBy.mockResolvedValue([]);

      await RemitoService.list({
        fechaHasta: new Date('2025-12-31'),
        page: 1,
        limit: 10,
      });

      expect(mockPrismaClient.remito.findMany).toHaveBeenCalled();
    });

    it('filtra por ambas fechas', async () => {
      mockPrismaClient.remito.findMany.mockResolvedValue([]);
      mockPrismaClient.remito.count.mockResolvedValue(0);
      mockPrismaClient.remito.groupBy.mockResolvedValue([]);

      await RemitoService.list({
        fechaDesde: new Date('2025-01-01'),
        fechaHasta: new Date('2025-12-31'),
        page: 1,
        limit: 10,
      });

      expect(mockPrismaClient.remito.findMany).toHaveBeenCalled();
    });

    it('filtra por rol no admin', async () => {
      mockPrismaClient.remito.findMany.mockResolvedValue([]);
      mockPrismaClient.remito.count.mockResolvedValue(0);
      mockPrismaClient.remito.groupBy.mockResolvedValue([]);

      await RemitoService.list({
        userRole: 'CHOFER',
        userId: 10,
        page: 1,
        limit: 10,
      });

      expect(mockPrismaClient.remito.findMany).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    beforeEach(() => {
      mockPrismaClient.remito.findUnique.mockReset();
    });

    it('retorna null si remito no existe', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue(null);
      const result = await RemitoService.getById(999, 1, 'ADMIN');
      expect(result).toBeNull();
    });

    it('retorna remito con imágenes', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue({
        id: 1,
        cargadoPorUserId: 1,
        imagenes: [{ id: 1, bucketName: 'b', objectKey: 'k' }],
      });
      const result = await RemitoService.getById(1, 1, 'ADMIN');
      expect(result).toBeDefined();
    });

    it('retorna remito si es SUPERADMIN', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue({
        id: 1,
        cargadoPorUserId: 99,
      });
      const result = await RemitoService.getById(1, 1, 'SUPERADMIN');
      expect(result).toBeDefined();
    });

    it('retorna remito si es ADMIN_INTERNO', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue({
        id: 1,
        cargadoPorUserId: 99,
      });
      const result = await RemitoService.getById(1, 1, 'ADMIN_INTERNO');
      expect(result).toBeDefined();
    });

    it('retorna null si usuario sin permisos intenta ver remito ajeno', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue({
        id: 1,
        cargadoPorUserId: 99,
      });
      const result = await RemitoService.getById(1, 50, 'CHOFER');
      expect(result).toBeNull();
    });

    it('retorna remito si es propio del usuario', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue({
        id: 1,
        cargadoPorUserId: 50,
      });
      const result = await RemitoService.getById(1, 50, 'CHOFER');
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });
  });

  describe('list', () => {
    it('lista remitos con paginación', async () => {
      mockPrismaClient.remito.findMany.mockResolvedValue([]);
      mockPrismaClient.remito.count.mockResolvedValue(0);
      mockPrismaClient.remito.groupBy.mockResolvedValue([]);

      const result = await RemitoService.list({
        page: 1,
        limit: 10,
      });

      expect(result.items).toEqual([]);
      expect(result.pagination).toBeDefined();
    });

    it('filtra por estado', async () => {
      mockPrismaClient.remito.findMany.mockResolvedValue([]);
      mockPrismaClient.remito.count.mockResolvedValue(0);
      mockPrismaClient.remito.groupBy.mockResolvedValue([]);

      await RemitoService.list({
        estado: 'PENDIENTE_APROBACION',
        page: 1,
        limit: 10,
      });

      expect(mockPrismaClient.remito.findMany).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('retorna estadísticas vacías', async () => {
      mockPrismaClient.remito.count.mockResolvedValue(0);

      const result = await RemitoService.getStats(1);
      expect(result).toBeDefined();
      expect(result.total).toBe(0);
    });

    it('cuenta pendientes correctamente', async () => {
      mockPrismaClient.remito.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(5)  // pendientes
        .mockResolvedValueOnce(0)  // aprobados
        .mockResolvedValueOnce(0); // rechazados

      const result = await RemitoService.getStats(1);
      expect(result.pendientes).toBe(5);
      expect(result.total).toBe(5);
    });

    it('cuenta aprobados correctamente', async () => {
      mockPrismaClient.remito.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(0)  // pendientes
        .mockResolvedValueOnce(10) // aprobados
        .mockResolvedValueOnce(0); // rechazados

      const result = await RemitoService.getStats(1);
      expect(result.aprobados).toBe(10);
    });

    it('cuenta rechazados correctamente', async () => {
      mockPrismaClient.remito.count
        .mockResolvedValueOnce(3)  // total
        .mockResolvedValueOnce(0)  // pendientes
        .mockResolvedValueOnce(0)  // aprobados
        .mockResolvedValueOnce(3); // rechazados

      const result = await RemitoService.getStats(1);
      expect(result.rechazados).toBe(3);
    });

    it('cuenta múltiples estados correctamente', async () => {
      mockPrismaClient.remito.count
        .mockResolvedValueOnce(6)  // total
        .mockResolvedValueOnce(2)  // pendientes
        .mockResolvedValueOnce(3)  // aprobados
        .mockResolvedValueOnce(1); // rechazados

      const result = await RemitoService.getStats(1);
      expect(result.total).toBe(6);
      expect(result.pendientes).toBe(2);
      expect(result.aprobados).toBe(3);
      expect(result.rechazados).toBe(1);
    });

    it('usa dadorId si se proporciona', async () => {
      mockPrismaClient.remito.count.mockResolvedValue(0);

      const result = await RemitoService.getStats(1, 5);
      expect(result).toBeDefined();
    });
  });

  describe('updateFromAnalysis', () => {
    it('actualiza remito desde datos de análisis', async () => {
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1 });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      await RemitoService.updateFromAnalysis(1, {
        numeroRemito: '001-001',
        fechaOperacion: '15/05/2025',
        emisor: { nombre: 'Emisor Test' },
        cliente: 'Cliente Test',
        producto: 'Producto Test',
        transportista: 'Transportista Test',
        chofer: { nombre: 'Chofer', dni: '12345678' },
        patentes: { chasis: 'ABC123', acoplado: 'DEF456' },
        pesosOrigen: { bruto: 50000, tara: 15000, neto: 35000 },
        pesosDestino: null,
        confianza: 85,
        camposDetectados: ['numeroRemito'],
      });

      expect(mockPrismaClient.remito.update).toHaveBeenCalled();
    });

    it('maneja fecha en formato ISO', async () => {
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1 });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      await RemitoService.updateFromAnalysis(1, {
        fechaOperacion: '2025-05-15',
        confianza: 80,
        camposDetectados: [],
      });

      expect(mockPrismaClient.remito.update).toHaveBeenCalled();
    });

    it('maneja fecha inválida', async () => {
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1 });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      await RemitoService.updateFromAnalysis(1, {
        fechaOperacion: 'fecha-invalida',
        confianza: 50,
        camposDetectados: [],
      });

      expect(mockPrismaClient.remito.update).toHaveBeenCalled();
    });

    it('maneja fecha null', async () => {
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1 });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      await RemitoService.updateFromAnalysis(1, {
        fechaOperacion: null,
        confianza: 60,
        camposDetectados: [],
      });

      expect(mockPrismaClient.remito.update).toHaveBeenCalled();
    });

    it('extrae string de objeto con descripcion', async () => {
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1 });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      await RemitoService.updateFromAnalysis(1, {
        cliente: { descripcion: 'Cliente desde objeto' },
        confianza: 70,
        camposDetectados: [],
      });

      expect(mockPrismaClient.remito.update).toHaveBeenCalled();
    });

    it('extrae string de objeto con detalle', async () => {
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1 });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      await RemitoService.updateFromAnalysis(1, {
        producto: { detalle: 'Arena lavada' },
        confianza: 75,
        camposDetectados: [],
      });

      expect(mockPrismaClient.remito.update).toHaveBeenCalled();
    });

    it('convierte número a string', async () => {
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1 });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      await RemitoService.updateFromAnalysis(1, {
        transportista: 12345,
        confianza: 65,
        camposDetectados: [],
      });

      expect(mockPrismaClient.remito.update).toHaveBeenCalled();
    });

    it('maneja pesosDestino con valores', async () => {
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1 });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      await RemitoService.updateFromAnalysis(1, {
        pesosDestino: { bruto: 48000, tara: 15000, neto: 33000 },
        confianza: 90,
        camposDetectados: ['pesosDestino'],
      });

      expect(mockPrismaClient.remito.update).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('aprueba remito', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue({ id: 1, estado: 'PENDIENTE_APROBACION' });
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1, estado: 'APROBADO' });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      const result = await RemitoService.approve(1, 1);
      expect(result.estado).toBe('APROBADO');
    });
  });

  describe('reject', () => {
    it('rechaza remito', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue({ id: 1, estado: 'PENDIENTE_APROBACION' });
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1, estado: 'RECHAZADO' });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      const result = await RemitoService.reject(1, 1, 'Imagen ilegible');
      expect(result.estado).toBe('RECHAZADO');
    });
  });

  describe('updateManual', () => {
    it('actualiza remito manualmente', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaClient.remito.update.mockResolvedValue({ id: 1 });
      mockPrismaClient.remitoHistory.create.mockResolvedValue({ id: 1 });

      const _result = await RemitoService.updateManual(1, 1, {
        numeroRemito: '002-002',
      });

      expect(mockPrismaClient.remito.update).toHaveBeenCalled();
    });
  });

  describe('reprocess', () => {
    it('lanza error si no hay imagen principal', async () => {
      mockPrismaClient.remito.findUnique.mockResolvedValue({
        id: 1,
        imagenes: [],
      });

      await expect(RemitoService.reprocess(1, 1)).rejects.toThrow();
    });
  });
});

