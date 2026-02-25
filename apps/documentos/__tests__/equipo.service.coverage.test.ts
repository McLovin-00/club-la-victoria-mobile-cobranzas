/**
 * @jest-environment node
 */

const mockPrisma: any = {
  equipo: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
  equipoHistory: { create: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  equipoCliente: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  chofer: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  camion: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  acoplado: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  empresaTransportista: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), count: jest.fn() },
  dadorCarga: { findUnique: jest.fn() },
  cliente: { findUnique: jest.fn() },
  plantillaRequisito: { findMany: jest.fn() },
  plantillaRequisitoTemplate: { findMany: jest.fn() },
  document: { findFirst: jest.fn(), deleteMany: jest.fn() },
  equipoPlantillaRequisito: { updateMany: jest.fn() },
  $transaction: jest.fn((cb: any) => {
    if (typeof cb === 'function') return cb(mockPrisma);
    return Promise.all(cb);
  }),
  $queryRawUnsafe: jest.fn(),
};

jest.mock('../src/config/database', () => ({ prisma: mockPrisma }));
jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../src/middlewares/error.middleware', () => ({
  createError: jest.fn((msg: string, status: number, code: string) => {
    const e: any = new Error(msg);
    e.statusCode = status;
    e.code = code;
    return e;
  }),
}));
jest.mock('../src/services/audit.service', () => ({
  AuditService: { logEquipoChange: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../src/services/document-archive.service', () => ({
  DocumentArchiveService: {
    findDocumentsExclusiveToClient: jest.fn().mockResolvedValue([]),
    archiveDocuments: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../src/services/compliance.service', () => ({
  ComplianceService: { evaluateBatchEquiposCliente: jest.fn().mockResolvedValue(new Map()) },
}));
jest.mock('../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn().mockResolvedValue(null) },
}));

import { EquipoService } from '../src/services/equipo.service';
import { DocumentArchiveService } from '../src/services/document-archive.service';
import { ComplianceService } from '../src/services/compliance.service';
import { AuditService } from '../src/services/audit.service';

const sampleEquipo = {
  id: 1,
  tenantEmpresaId: 10,
  dadorCargaId: 20,
  driverId: 100,
  truckId: 200,
  trailerId: 300,
  empresaTransportistaId: 400,
  driverDniNorm: '12345678',
  truckPlateNorm: 'ABC123',
  trailerPlateNorm: 'XYZ789',
  validFrom: new Date('2025-01-01'),
  validTo: null,
  activo: true,
  estado: 'activa',
  version: 1,
  clientes: [{ clienteId: 50, equipoId: 1, asignadoDesde: new Date(), asignadoHasta: null }],
  createdAt: new Date(),
};

describe('EquipoService', () => {
  beforeEach(() => jest.clearAllMocks());

  // =========================================================================
  // list
  // =========================================================================
  describe('list', () => {
    it('returns paginated equipos for tenant', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([sampleEquipo]);
      const result = await EquipoService.list(10, 20);
      expect(mockPrisma.equipo.findMany).toHaveBeenCalled();
      expect(result).toEqual([sampleEquipo]);
    });

    it('applies choferId filter', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.list(10, 20, 1, 20, { choferId: 5 });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.driverId).toBe(5);
    });

    it('applies activo filter when not "all"', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.list(10, 20, 1, 20, { activo: true });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.activo).toBe(true);
    });

    it('skips activo filter when "all"', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.list(10, 20, 1, 20, { activo: 'all' });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.activo).toBeUndefined();
    });

    it('allows undefined dadorCargaId for admin', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.list(10, undefined);
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.dadorCargaId).toBeUndefined();
    });
  });

  // =========================================================================
  // searchPaginated
  // =========================================================================
  describe('searchPaginated', () => {
    it('returns paginated results with filters', async () => {
      mockPrisma.equipo.count.mockResolvedValue(1);
      mockPrisma.equipo.findMany.mockResolvedValue([sampleEquipo]);
      const result = await EquipoService.searchPaginated(10, { dadorCargaId: 20 });
      expect(result.total).toBe(1);
      expect(result.equipos).toHaveLength(1);
    });

    it('handles search with pipe separator', async () => {
      mockPrisma.equipo.count.mockResolvedValue(0);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.searchPaginated(10, { search: 'ABC|DEF' });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeDefined();
    });

    it('handles dni filter', async () => {
      mockPrisma.equipo.count.mockResolvedValue(0);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.searchPaginated(10, { dni: '12.345.678' });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.OR).toContainEqual({ driverDniNorm: { contains: '12345678' } });
    });

    it('handles truckPlate filter', async () => {
      mockPrisma.equipo.count.mockResolvedValue(0);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.searchPaginated(10, { truckPlate: 'ab-123' });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.OR).toContainEqual({ truckPlateNorm: { contains: 'AB123' } });
    });

    it('handles trailerPlate filter', async () => {
      mockPrisma.equipo.count.mockResolvedValue(0);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.searchPaginated(10, { trailerPlate: 'zz-999' });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.OR).toContainEqual({ trailerPlateNorm: { contains: 'ZZ999' } });
    });

    it('returns empty when clienteId has no equipos', async () => {
      mockPrisma.equipoCliente.findMany.mockResolvedValue([]);
      const result = await EquipoService.searchPaginated(10, { clienteId: 99 });
      expect(result.equipos).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('filters by clienteId when equipos exist', async () => {
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1 }]);
      mockPrisma.equipo.count.mockResolvedValue(1);
      mockPrisma.equipo.findMany.mockResolvedValue([sampleEquipo]);
      const result = await EquipoService.searchPaginated(10, { clienteId: 50 });
      expect(result.total).toBe(1);
    });

    it('applies activo and empresaTransportistaId filters', async () => {
      mockPrisma.equipo.count.mockResolvedValue(0);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.searchPaginated(10, { empresaTransportistaId: 5, activo: false });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.empresaTransportistaId).toBe(5);
      expect(where.activo).toBe(false);
    });
  });

  // =========================================================================
  // getComplianceStats
  // =========================================================================
  describe('getComplianceStats', () => {
    it('returns zeros when no equipos match', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      const result = await EquipoService.getComplianceStats(10, {});
      expect(result.total).toBe(0);
      expect(result.conFaltantes).toBe(0);
    });

    it('returns zeros when clienteId has no equipos', async () => {
      mockPrisma.equipoCliente.findMany.mockResolvedValue([]);
      const result = await EquipoService.getComplianceStats(10, { clienteId: 99 });
      expect(result.total).toBe(0);
    });

    it('computes stats from compliance map', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([
        { id: 1, driverId: 10, truckId: 20, trailerId: null, tenantEmpresaId: 10, dadorCargaId: 20, empresaTransportistaId: null },
        { id: 2, driverId: 11, truckId: 21, trailerId: null, tenantEmpresaId: 10, dadorCargaId: 20, empresaTransportistaId: null },
      ]);
      const batchMap = new Map<number, any>();
      batchMap.set(1, { tieneVencidos: true, tieneFaltantes: true, tieneProximos: false });
      batchMap.set(2, { tieneVencidos: false, tieneFaltantes: false, tieneProximos: true });
      (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(batchMap);

      const result = await EquipoService.getComplianceStats(10, {});
      expect(result.total).toBe(2);
      expect(result.conVencidos).toBe(1);
      expect(result.conFaltantes).toBe(1);
      expect(result.conPorVencer).toBe(1);
    });

    it('filters by clienteId and passes to batch compliance', async () => {
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValue([
        { id: 1, driverId: 10, truckId: 20, trailerId: null, tenantEmpresaId: 10, dadorCargaId: 20, empresaTransportistaId: null },
      ]);
      (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

      await EquipoService.getComplianceStats(10, { clienteId: 50 });
      expect(ComplianceService.evaluateBatchEquiposCliente).toHaveBeenCalledWith(
        expect.any(Array),
        50,
      );
    });
  });

  // =========================================================================
  // searchPaginatedWithCompliance
  // =========================================================================
  describe('searchPaginatedWithCompliance', () => {
    it('returns with compliance filter applied', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([
        { id: 1, driverId: 10, truckId: 20, trailerId: null, tenantEmpresaId: 10, dadorCargaId: 20, empresaTransportistaId: null },
      ]);
      const batchMap = new Map<number, any>();
      batchMap.set(1, { tieneVencidos: true, tieneFaltantes: false, tieneProximos: false });
      (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(batchMap);

      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { id: 1, driverId: 10, truckId: 20, trailerId: null, tenantEmpresaId: 10, dadorCargaId: 20, empresaTransportistaId: null },
      ]);

      const result = await EquipoService.searchPaginatedWithCompliance(10, { complianceFilter: 'vencidos' });
      expect(result.stats).toBeDefined();
    });

    it('returns normal search when no compliance filter', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());
      mockPrisma.equipo.count.mockResolvedValue(0);

      const result = await EquipoService.searchPaginatedWithCompliance(10, {});
      expect(result.stats).toBeDefined();
    });
  });

  // =========================================================================
  // getById
  // =========================================================================
  describe('getById', () => {
    it('returns equipo with chofer/camion/acoplado', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.chofer.findUnique.mockResolvedValue({ id: 100, dni: '12345678' });
      mockPrisma.camion.findUnique.mockResolvedValue({ id: 200, patente: 'ABC123' });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ id: 300, patente: 'XYZ789' });

      const result = await EquipoService.getById(1);
      expect(result.chofer).toBeDefined();
      expect(result.camion).toBeDefined();
      expect(result.acoplado).toBeDefined();
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.getById(999)).rejects.toThrow('Equipo no encontrado');
    });

    it('returns null acoplado when trailerId is null', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, trailerId: null });
      mockPrisma.chofer.findUnique.mockResolvedValue({ id: 100 });
      mockPrisma.camion.findUnique.mockResolvedValue({ id: 200 });

      const result = await EquipoService.getById(1);
      expect(result.acoplado).toBeNull();
    });
  });

  // =========================================================================
  // create
  // =========================================================================
  describe('create', () => {
    const createInput = {
      tenantEmpresaId: 10, dadorCargaId: 20, driverId: 100, truckId: 200,
      trailerId: 300, empresaTransportistaId: 400, driverDni: '12345678',
      truckPlate: 'ABC-123', trailerPlate: 'XYZ-789', validFrom: new Date(),
    };

    it('creates equipo successfully', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.create.mockResolvedValue({ ...sampleEquipo });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.create(createInput);
      expect(result.id).toBe(1);
    });

    it('throws EQUIPO_DUPLICATE when matching equipo exists', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(sampleEquipo);

      await expect(EquipoService.create(createInput)).rejects.toThrow('Equipo ya existe');
    });

    it('throws COMPONENT_IN_USE when conflicts and no forceMove', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 5 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(EquipoService.create(createInput)).rejects.toThrow('Componentes ya en uso');
    });

    it('resolves conflicts with forceMove', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 5 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ id: 5 }]);
      mockPrisma.equipo.update.mockResolvedValue({});
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipo.create.mockResolvedValue({ ...sampleEquipo });

      const result = await EquipoService.create({ ...createInput, forceMove: true });
      expect(result.id).toBe(1);
    });

    it('validates empresa transportista mismatch', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, dadorCargaId: 999 });
      await expect(EquipoService.create(createInput)).rejects.toThrow('empresa transportista no pertenece');
    });

    it('skips empresa validation when null', async () => {
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.create.mockResolvedValue({ ...sampleEquipo });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      await EquipoService.create({ ...createInput, empresaTransportistaId: null });
      expect(mockPrisma.empresaTransportista.findFirst).not.toHaveBeenCalled();
    });

    it('creates without trailerPlate', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.create.mockResolvedValue({ ...sampleEquipo });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      await EquipoService.create({ ...createInput, trailerPlate: null });
      expect(mockPrisma.equipo.create).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe('update', () => {
    it('updates equipo with trailerPlate normalization', async () => {
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo });
      const result = await EquipoService.update(1, { trailerPlate: 'ab-123' });
      const data = mockPrisma.equipo.update.mock.calls[0][0].data;
      expect(data.trailerPlateNorm).toBe('AB123');
      expect(result).toBeDefined();
    });

    it('sets trailerPlateNorm to null when trailerPlate is empty', async () => {
      mockPrisma.equipo.update.mockResolvedValue({});
      await EquipoService.update(1, { trailerPlate: '' });
      const data = mockPrisma.equipo.update.mock.calls[0][0].data;
      expect(data.trailerPlateNorm).toBeNull();
    });

    it('sets empresaTransportistaId to null when 0', async () => {
      mockPrisma.equipo.update.mockResolvedValue({});
      await EquipoService.update(1, { empresaTransportistaId: 0 });
      const data = mockPrisma.equipo.update.mock.calls[0][0].data;
      expect(data.empresaTransportistaId).toBeNull();
    });

    it('validates empresa transportista for equipo', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ dadorCargaId: 20, tenantEmpresaId: 10 });
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 5, dadorCargaId: 999 });
      await expect(EquipoService.update(1, { empresaTransportistaId: 5 })).rejects.toThrow('empresa transportista no pertenece');
    });
  });

  // =========================================================================
  // delete
  // =========================================================================
  describe('delete', () => {
    it('deletes equipo with history and associations', async () => {
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.equipoHistory.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.equipo.delete.mockResolvedValue(sampleEquipo);

      const result = await EquipoService.delete(1);
      expect(result).toEqual(sampleEquipo);
    });

    it('continues even if history create fails', async () => {
      mockPrisma.equipoHistory.create.mockRejectedValue(new Error('history fail'));
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipoHistory.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipo.delete.mockResolvedValue(sampleEquipo);

      const result = await EquipoService.delete(1);
      expect(result).toEqual(sampleEquipo);
    });
  });

  // =========================================================================
  // attachComponents
  // =========================================================================
  describe('attachComponents', () => {
    it('attaches driver by id', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.attachComponents(10, 1, { driverId: 100 });
      expect(result).toBeDefined();
    });

    it('attaches truck by plate', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.camion.findFirst.mockResolvedValue({ id: 200 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.attachComponents(10, 1, { truckPlate: 'ABC-123' });
      expect(result).toBeDefined();
    });

    it('attaches trailer by plate', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.acoplado.findFirst.mockResolvedValue({ id: 300 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.attachComponents(10, 1, { trailerPlate: 'XYZ-789' });
      expect(result).toBeDefined();
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.attachComponents(10, 999, { driverId: 1 })).rejects.toThrow('Equipo no encontrado');
    });

    it('throws when tenant mismatch', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 99, dadorCargaId: 20 });
      await expect(EquipoService.attachComponents(10, 1, { driverId: 1 })).rejects.toThrow('Equipo no encontrado');
    });

    it('throws when no changes provided', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      await expect(EquipoService.attachComponents(10, 1, {})).rejects.toThrow('Sin cambios');
    });

    it('throws when driver not found by DNI', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      await expect(EquipoService.attachComponents(10, 1, { driverDni: '99999999' })).rejects.toThrow('Chofer no encontrado');
    });

    it('throws when truck not found by plate', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      await expect(EquipoService.attachComponents(10, 1, { truckPlate: 'ZZZ999' })).rejects.toThrow('Camión no encontrado');
    });

    it('throws when trailer not found by plate', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      await expect(EquipoService.attachComponents(10, 1, { trailerPlate: 'ZZZ999' })).rejects.toThrow('Acoplado no encontrado');
    });
  });

  // =========================================================================
  // detachComponents
  // =========================================================================
  describe('detachComponents', () => {
    it('throws when detaching driver', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10 });
      await expect(EquipoService.detachComponents(10, 1, { driver: true })).rejects.toThrow('No es posible desasociar el chofer');
    });

    it('throws when detaching truck', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10 });
      await expect(EquipoService.detachComponents(10, 1, { truck: true })).rejects.toThrow('No es posible desasociar el camión');
    });

    it('detaches trailer successfully', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10 });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, trailerId: null });
      const result = await EquipoService.detachComponents(10, 1, { trailer: true });
      expect(result.trailerId).toBeNull();
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.detachComponents(10, 999, { trailer: true })).rejects.toThrow('Equipo no encontrado');
    });

    it('throws when no changes', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10 });
      await expect(EquipoService.detachComponents(10, 1, {})).rejects.toThrow('Sin cambios');
    });
  });

  // =========================================================================
  // ensure* methods
  // =========================================================================
  describe('ensureChofer', () => {
    it('returns existing chofer id', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 100 });
      const id = await EquipoService.ensureChofer(10, 20, '12345678');
      expect(id).toBe(100);
    });

    it('updates phones when existing chofer and phones provided', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 100 });
      mockPrisma.chofer.update.mockResolvedValue({ id: 100 });
      await EquipoService.ensureChofer(10, 20, '12345678', ['+5491112345678']);
      expect(mockPrisma.chofer.update).toHaveBeenCalled();
    });

    it('creates new chofer when not found', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 101 });
      const id = await EquipoService.ensureChofer(10, 20, '99999999');
      expect(id).toBe(101);
    });
  });

  describe('ensureCamion', () => {
    it('returns existing camion id', async () => {
      mockPrisma.camion.findFirst.mockResolvedValue({ id: 200 });
      const id = await EquipoService.ensureCamion(10, 20, 'ABC-123');
      expect(id).toBe(200);
    });

    it('creates new camion when not found', async () => {
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 201 });
      const id = await EquipoService.ensureCamion(10, 20, 'NEW-123');
      expect(id).toBe(201);
    });
  });

  describe('ensureAcoplado', () => {
    it('returns null when no patente', async () => {
      const id = await EquipoService.ensureAcoplado(10, 20, null);
      expect(id).toBeNull();
    });

    it('returns existing acoplado id', async () => {
      mockPrisma.acoplado.findFirst.mockResolvedValue({ id: 300 });
      const id = await EquipoService.ensureAcoplado(10, 20, 'XYZ-789');
      expect(id).toBe(300);
    });

    it('creates new acoplado when not found', async () => {
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.create.mockResolvedValue({ id: 301 });
      const id = await EquipoService.ensureAcoplado(10, 20, 'NEW-789');
      expect(id).toBe(301);
    });
  });

  describe('ensureEmpresaTransportista', () => {
    it('returns null when no cuit', async () => {
      const id = await EquipoService.ensureEmpresaTransportista(10, 20, null);
      expect(id).toBeNull();
    });

    it('returns null when cuit is only non-digits', async () => {
      const id = await EquipoService.ensureEmpresaTransportista(10, 20, '---');
      expect(id).toBeNull();
    });

    it('returns existing empresa id', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400 });
      const id = await EquipoService.ensureEmpresaTransportista(10, 20, '20-12345678-9');
      expect(id).toBe(400);
    });

    it('creates new empresa when not found', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 401 });
      const id = await EquipoService.ensureEmpresaTransportista(10, 20, '20123456789', 'Test SA');
      expect(id).toBe(401);
    });

    it('creates empresa with fallback name when razonSocial empty', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 402 });
      await EquipoService.ensureEmpresaTransportista(10, 20, '20123456789', '');
      const data = mockPrisma.empresaTransportista.create.mock.calls[0][0].data;
      expect(data.razonSocial).toContain('Empresa');
    });
  });

  // =========================================================================
  // createFromIdentifiers
  // =========================================================================
  describe('createFromIdentifiers', () => {
    it('creates equipo from raw identifiers', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100 });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200 });
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.create.mockResolvedValue({ id: 300 });
      mockPrisma.empresaTransportista.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 400, dadorCargaId: 20 });
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 400 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.create.mockResolvedValue({ id: 1 });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.createFromIdentifiers({
        tenantEmpresaId: 10, dadorCargaId: 20,
        dniChofer: '12345678', patenteTractor: 'ABC123',
        patenteAcoplado: 'XYZ789',
        empresaTransportistaCuit: '20123456789',
        empresaTransportistaNombre: 'Test',
      });
      expect(result.id).toBe(1);
    });
  });

  // =========================================================================
  // listByCliente
  // =========================================================================
  describe('listByCliente', () => {
    it('returns equipos for client', async () => {
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipo: sampleEquipo }]);
      const result = await EquipoService.listByCliente(10, 50);
      expect(result).toHaveLength(1);
    });

    it('includes inactive when specified', async () => {
      mockPrisma.equipoCliente.findMany.mockResolvedValue([]);
      await EquipoService.listByCliente(10, 50, true);
      const where = mockPrisma.equipoCliente.findMany.mock.calls[0][0].where;
      expect(where.equipo).toEqual({ tenantEmpresaId: 10 });
    });
  });

  // =========================================================================
  // associateCliente
  // =========================================================================
  describe('associateCliente', () => {
    it('creates association successfully', async () => {
      mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);
      mockPrisma.equipoCliente.create.mockResolvedValue({ equipoId: 1, clienteId: 50 });
      const result = await EquipoService.associateCliente(10, 1, 50, new Date());
      expect(result.equipoId).toBe(1);
    });

    it('throws when association already exists', async () => {
      mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 1, clienteId: 50 });
      await expect(EquipoService.associateCliente(10, 1, 50, new Date())).rejects.toThrow('ya existe');
    });
  });

  // =========================================================================
  // removeCliente
  // =========================================================================
  describe('removeCliente', () => {
    it('throws when only 1 client left', async () => {
      mockPrisma.equipoCliente.count.mockResolvedValue(1);
      await expect(EquipoService.removeCliente(10, 1, 50)).rejects.toThrow('último cliente');
    });

    it('removes client when multiple exist', async () => {
      mockPrisma.equipoCliente.count.mockResolvedValue(2);
      mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 1, clienteId: 50, asignadoDesde: new Date() });
      mockPrisma.equipoCliente.update.mockResolvedValue({ equipoId: 1, clienteId: 50, asignadoHasta: new Date() });
      const result = await EquipoService.removeCliente(10, 1, 50);
      expect(result).toBeDefined();
    });

    it('returns null when association not found', async () => {
      mockPrisma.equipoCliente.count.mockResolvedValue(2);
      mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);
      const result = await EquipoService.removeCliente(10, 1, 50);
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // createEquipoCompleto
  // =========================================================================
  describe('createEquipoCompleto', () => {
    const completoInput = {
      tenantEmpresaId: 10,
      dadorCargaId: 20,
      empresaTransportistaCuit: '20123456789',
      empresaTransportistaNombre: 'Test SA',
      choferDni: '12345678',
      choferNombre: 'Juan',
      choferApellido: 'Pérez',
      camionPatente: 'ABC123',
      acopladoPatente: 'XYZ789',
      clienteIds: [50, 51],
    };

    it('creates equipo with all components in transaction', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.create.mockResolvedValue({ id: 300, patente: 'XYZ789', tipo: null });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.create.mockResolvedValue({
        id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date(),
      });
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipoCliente.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto(completoInput);
      expect(result.id).toBe(1);
      expect(result.chofer.id).toBe(100);
      expect(result.camion.id).toBe(200);
      expect(result.acoplado.id).toBe(300);
      expect(mockPrisma.equipoCliente.create).toHaveBeenCalledTimes(2);
    });

    it('creates equipo without acoplado', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.equipo.create.mockResolvedValue({
        id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date(),
      });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto({ ...completoInput, acopladoPatente: null, clienteIds: [] });
      expect(result.acoplado).toBeNull();
    });

    it('reuses existing orphan chofer', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 100, nombre: 'Old', apellido: 'Name', phones: [] });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.update.mockResolvedValue({ id: 100, nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.create.mockResolvedValue({ id: 300, patente: 'XYZ789', tipo: null });
      mockPrisma.equipo.create.mockResolvedValue({
        id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date(),
      });
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipoCliente.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto(completoInput);
      expect(result.id).toBe(1);
    });

    it('throws when chofer is in use by another equipo', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 100 });
      mockPrisma.equipo.findFirst.mockResolvedValue({ id: 99 });

      await expect(EquipoService.createEquipoCompleto(completoInput)).rejects.toThrow('ya está asignado');
    });

    it('throws when CUIT is invalid', async () => {
      await expect(EquipoService.createEquipoCompleto({ ...completoInput, empresaTransportistaCuit: '123' }))
        .rejects.toThrow('CUIT inválido');
    });

    it('throws when DNI is too short', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      await expect(EquipoService.createEquipoCompleto({ ...completoInput, choferDni: '12' }))
        .rejects.toThrow('DNI inválido');
    });
  });

  // =========================================================================
  // rollbackAltaCompleta
  // =========================================================================
  describe('rollbackAltaCompleta', () => {
    it('rolls back equipo and all components', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo });
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.equipoHistory.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipo.delete.mockResolvedValue(sampleEquipo);
      mockPrisma.chofer.delete.mockResolvedValue({});
      mockPrisma.camion.delete.mockResolvedValue({});
      mockPrisma.acoplado.delete.mockResolvedValue({});
      mockPrisma.equipo.count.mockResolvedValue(0);
      mockPrisma.empresaTransportista.delete.mockResolvedValue({});

      const result = await EquipoService.rollbackAltaCompleta({
        tenantEmpresaId: 10, equipoId: 1,
        deleteChofer: true, deleteCamion: true, deleteAcoplado: true, deleteEmpresa: true,
      });
      expect(result.success).toBe(true);
      expect(mockPrisma.chofer.delete).toHaveBeenCalled();
      expect(mockPrisma.camion.delete).toHaveBeenCalled();
      expect(mockPrisma.acoplado.delete).toHaveBeenCalled();
      expect(mockPrisma.empresaTransportista.delete).toHaveBeenCalled();
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.rollbackAltaCompleta({ tenantEmpresaId: 10, equipoId: 999 }))
        .rejects.toThrow('Equipo no encontrado');
    });

    it('throws when tenant mismatch', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, tenantEmpresaId: 99 });
      await expect(EquipoService.rollbackAltaCompleta({ tenantEmpresaId: 10, equipoId: 1 }))
        .rejects.toThrow('Equipo no encontrado');
    });

    it('skips component deletion when flags are false', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo });
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipoHistory.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipo.delete.mockResolvedValue(sampleEquipo);

      await EquipoService.rollbackAltaCompleta({ tenantEmpresaId: 10, equipoId: 1 });
      expect(mockPrisma.chofer.delete).not.toHaveBeenCalled();
      expect(mockPrisma.camion.delete).not.toHaveBeenCalled();
      expect(mockPrisma.acoplado.delete).not.toHaveBeenCalled();
      expect(mockPrisma.empresaTransportista.delete).not.toHaveBeenCalled();
    });

    it('skips empresa delete when other equipos use it', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo });
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipoHistory.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipo.delete.mockResolvedValue(sampleEquipo);
      mockPrisma.equipo.count.mockResolvedValue(3);

      await EquipoService.rollbackAltaCompleta({ tenantEmpresaId: 10, equipoId: 1, deleteEmpresa: true });
      expect(mockPrisma.empresaTransportista.delete).not.toHaveBeenCalled();
    });

    it('skips acoplado delete when trailerId is null', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, trailerId: null });
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipoHistory.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipo.delete.mockResolvedValue(sampleEquipo);

      await EquipoService.rollbackAltaCompleta({ tenantEmpresaId: 10, equipoId: 1, deleteAcoplado: true });
      expect(mockPrisma.acoplado.delete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateEquipo
  // =========================================================================
  describe('updateEquipo', () => {
    it('updates equipo with entity changes', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo,
        clientes: [{ clienteId: 50, asignadoHasta: null }],
      });
      mockPrisma.chofer.findUnique.mockResolvedValue({ id: 101, dadorCargaId: 20, dniNorm: '87654321' });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, driverId: 101 });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, choferId: 101,
      });
      expect(result).toBeDefined();
      expect(AuditService.logEquipoChange).toHaveBeenCalled();
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.updateEquipo({
        equipoId: 999, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Equipo no encontrado');
    });

    it('throws on version conflict', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, version: 2 });
      await expect(EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, expectedVersion: 1,
      })).rejects.toThrow('fue modificado por otro usuario');
    });

    it('returns equipo unchanged when no entity changes', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo,
        clientes: [],
      });
      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10,
      });
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
      expect(mockPrisma.equipo.update).not.toHaveBeenCalled();
    });

    it('validates camion change with wrong dador', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo,
        clientes: [],
      });
      mockPrisma.camion.findUnique.mockResolvedValue({ id: 201, dadorCargaId: 999 });
      await expect(EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, camionId: 201,
      })).rejects.toThrow('Camión no válido');
    });

    it('validates acoplado change to null', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo,
        trailerId: 300,
        clientes: [],
      });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, trailerId: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, acopladoId: null,
      });
      expect(result).toBeDefined();
    });

    it('validates empresa change', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo,
        clientes: [],
      });
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 401, dadorCargaId: 20 });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, empresaTransportistaId: 401 });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, empresaTransportistaId: 401,
      });
      expect(result).toBeDefined();
    });

    it('skips chofer change when same id', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo,
        clientes: [],
      });
      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, choferId: 100,
      });
      expect(mockPrisma.equipo.update).not.toHaveBeenCalled();
      expect(result.id).toBe(1);
    });
  });

  // =========================================================================
  // addClienteToEquipo
  // =========================================================================
  describe('addClienteToEquipo', () => {
    it('adds cliente to equipo', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.cliente.findUnique.mockResolvedValue({ id: 51, razonSocial: 'Cliente B' });
      mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);
      mockPrisma.equipoCliente.create.mockResolvedValue({ equipoId: 1, clienteId: 51 });

      const result = await EquipoService.addClienteToEquipo({
        equipoId: 1, clienteId: 51, usuarioId: 5, tenantEmpresaId: 10,
      });
      expect(result.clienteId).toBe(51);
      expect(AuditService.logEquipoChange).toHaveBeenCalled();
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.addClienteToEquipo({
        equipoId: 999, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Equipo no encontrado');
    });

    it('throws when cliente not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.cliente.findUnique.mockResolvedValue(null);
      await expect(EquipoService.addClienteToEquipo({
        equipoId: 1, clienteId: 999, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Cliente no encontrado');
    });

    it('throws when cliente already associated', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.cliente.findUnique.mockResolvedValue({ id: 50, razonSocial: 'Cliente A' });
      mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 1, clienteId: 50 });
      await expect(EquipoService.addClienteToEquipo({
        equipoId: 1, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('ya está asociado');
    });
  });

  // =========================================================================
  // removeClienteFromEquipo
  // =========================================================================
  describe('removeClienteFromEquipo', () => {
    it('removes cliente and archives exclusive docs', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.equipoCliente.count.mockResolvedValue(2);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 51 }]);
      (DocumentArchiveService.findDocumentsExclusiveToClient as jest.Mock).mockResolvedValue([10, 11]);
      mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 1, clienteId: 50, asignadoDesde: new Date() });
      mockPrisma.equipoCliente.update.mockResolvedValue({});
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.equipoPlantillaRequisito.updateMany.mockResolvedValue({ count: 1 });

      const result = await EquipoService.removeClienteFromEquipo({
        equipoId: 1, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      });
      expect(result.removed).toBe(true);
      expect(result.archivedDocuments).toBe(2);
      expect(DocumentArchiveService.archiveDocuments).toHaveBeenCalled();
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.removeClienteFromEquipo({
        equipoId: 999, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Equipo no encontrado');
    });

    it('throws when last client', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.equipoCliente.count.mockResolvedValue(1);
      await expect(EquipoService.removeClienteFromEquipo({
        equipoId: 1, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('último cliente');
    });

    it('throws when association not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.equipoCliente.count.mockResolvedValue(2);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 51 }]);
      (DocumentArchiveService.findDocumentsExclusiveToClient as jest.Mock).mockResolvedValue([]);
      mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([]);

      await expect(EquipoService.removeClienteFromEquipo({
        equipoId: 1, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('no está asociado');
    });

    it('handles no exclusive docs and no plantillas', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.equipoCliente.count.mockResolvedValue(2);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 51 }]);
      (DocumentArchiveService.findDocumentsExclusiveToClient as jest.Mock).mockResolvedValue([]);
      mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 1, clienteId: 50, asignadoDesde: new Date() });
      mockPrisma.equipoCliente.update.mockResolvedValue({});
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([]);

      const result = await EquipoService.removeClienteFromEquipo({
        equipoId: 1, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      });
      expect(result.archivedDocuments).toBe(0);
      expect(result.plantillasRemovidas).toBe(0);
    });
  });

  // =========================================================================
  // transferirEquipo
  // =========================================================================
  describe('transferirEquipo', () => {
    it('transfers equipo to new dador', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({ id: 30, tenantEmpresaId: 10 });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, dadorCargaId: 30 });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.transferirEquipo({
        equipoId: 1, nuevoDadorCargaId: 30, usuarioId: 5, tenantEmpresaId: 10, motivo: 'test',
      });
      expect(result.dadorCargaId).toBe(30);
      expect(AuditService.logEquipoChange).toHaveBeenCalled();
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.transferirEquipo({
        equipoId: 999, nuevoDadorCargaId: 30, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Equipo no encontrado');
    });

    it('throws when same dador', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      await expect(EquipoService.transferirEquipo({
        equipoId: 1, nuevoDadorCargaId: 20, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('ya pertenece');
    });

    it('throws when new dador not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue(null);
      await expect(EquipoService.transferirEquipo({
        equipoId: 1, nuevoDadorCargaId: 999, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Dador de carga no válido');
    });

    it('throws when new dador belongs to different tenant', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({ id: 30, tenantEmpresaId: 99 });
      await expect(EquipoService.transferirEquipo({
        equipoId: 1, nuevoDadorCargaId: 30, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Dador de carga no válido');
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: list edge cases
  // =========================================================================
  describe('list - edge cases', () => {
    it('clamps limit below 1 to 1', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.list(10, 20, 1, 0);
      const call = mockPrisma.equipo.findMany.mock.calls[0][0];
      expect(call.take).toBe(1);
    });

    it('clamps limit above 100 to 100', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.list(10, 20, 1, 500);
      const call = mockPrisma.equipo.findMany.mock.calls[0][0];
      expect(call.take).toBe(100);
    });

    it('clamps skip to 0 for page <= 0', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.list(10, 20, -1, 10);
      const call = mockPrisma.equipo.findMany.mock.calls[0][0];
      expect(call.skip).toBe(0);
    });

    it('uses default page=1 and limit=20 when omitted', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.list(10, 20);
      const call = mockPrisma.equipo.findMany.mock.calls[0][0];
      expect(call.take).toBe(20);
      expect(call.skip).toBe(0);
    });

    it('does not set activo when opts is undefined', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.list(10, 20, 1, 20);
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.activo).toBeUndefined();
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: searchPaginated edge cases
  // =========================================================================
  describe('searchPaginated - edge cases', () => {
    it('does not add OR conditions when search splits to empty strings', async () => {
      mockPrisma.equipo.count.mockResolvedValue(0);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.searchPaginated(10, { search: '   |   ' });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });

    it('handles activo=all filter (no activo in where)', async () => {
      mockPrisma.equipo.count.mockResolvedValue(0);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.searchPaginated(10, { activo: 'all' });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.activo).toBeUndefined();
    });

    it('applies choferId filter in searchPaginated', async () => {
      mockPrisma.equipo.count.mockResolvedValue(0);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      await EquipoService.searchPaginated(10, { choferId: 42 });
      const where = mockPrisma.equipo.findMany.mock.calls[0][0].where;
      expect(where.driverId).toBe(42);
    });

    it('computes totalPages and pagination flags correctly', async () => {
      mockPrisma.equipo.count.mockResolvedValue(25);
      mockPrisma.equipo.findMany.mockResolvedValue([sampleEquipo]);
      const result = await EquipoService.searchPaginated(10, {}, 2, 10);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('hasPrev is false on first page', async () => {
      mockPrisma.equipo.count.mockResolvedValue(25);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      const result = await EquipoService.searchPaginated(10, {}, 1, 10);
      expect(result.hasPrev).toBe(false);
      expect(result.hasNext).toBe(true);
    });

    it('hasNext is false on last page', async () => {
      mockPrisma.equipo.count.mockResolvedValue(10);
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      const result = await EquipoService.searchPaginated(10, {}, 1, 10);
      expect(result.hasNext).toBe(false);
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: searchPaginatedWithCompliance filter branches
  // =========================================================================
  describe('searchPaginatedWithCompliance - compliance filter branches', () => {
    it('filters by faltantes', async () => {
      mockPrisma.equipo.findMany
        .mockResolvedValueOnce([
          { id: 1, driverId: 10, truckId: 20, trailerId: null, tenantEmpresaId: 10, dadorCargaId: 20, empresaTransportistaId: null },
          { id: 2, driverId: 11, truckId: 21, trailerId: null, tenantEmpresaId: 10, dadorCargaId: 20, empresaTransportistaId: null },
        ])
        .mockResolvedValueOnce([sampleEquipo]);
      const batchMap = new Map<number, any>();
      batchMap.set(1, { tieneVencidos: false, tieneFaltantes: true, tieneProximos: false });
      batchMap.set(2, { tieneVencidos: false, tieneFaltantes: false, tieneProximos: false });
      (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(batchMap);

      const result = await EquipoService.searchPaginatedWithCompliance(10, { complianceFilter: 'faltantes' });
      expect(result.total).toBe(1);
    });

    it('filters by por_vencer', async () => {
      mockPrisma.equipo.findMany
        .mockResolvedValueOnce([
          { id: 1, driverId: 10, truckId: 20, trailerId: null, tenantEmpresaId: 10, dadorCargaId: 20, empresaTransportistaId: null },
        ])
        .mockResolvedValueOnce([sampleEquipo]);
      const batchMap = new Map<number, any>();
      batchMap.set(1, { tieneVencidos: false, tieneFaltantes: false, tieneProximos: true });
      (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(batchMap);

      const result = await EquipoService.searchPaginatedWithCompliance(10, { complianceFilter: 'por_vencer' });
      expect(result.total).toBe(1);
    });

    it('returns empty paginated result when filteredIds is empty', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([
        { id: 1, driverId: 10, truckId: 20, trailerId: null, tenantEmpresaId: 10, dadorCargaId: 20, empresaTransportistaId: null },
      ]);
      const batchMap = new Map<number, any>();
      batchMap.set(1, { tieneVencidos: false, tieneFaltantes: false, tieneProximos: false });
      (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(batchMap);

      const result = await EquipoService.searchPaginatedWithCompliance(10, { complianceFilter: 'vencidos' });
      expect(result.total).toBe(0);
      expect(result.equipos).toEqual([]);
      expect(result.totalPages).toBe(0);
    });

    it('no complianceMap branch (stats without _complianceMap)', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());
      mockPrisma.equipo.count.mockResolvedValue(0);

      const result = await EquipoService.searchPaginatedWithCompliance(10, { complianceFilter: 'vencidos' });
      expect(result.stats).toBeDefined();
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: getComplianceStats with all filters
  // =========================================================================
  describe('getComplianceStats - additional filter branches', () => {
    it('passes dadorCargaId, empresaTransportistaId, search, dni, truckPlate, trailerPlate filters', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      const result = await EquipoService.getComplianceStats(10, {
        dadorCargaId: 20,
        empresaTransportistaId: 5,
        search: 'ABC',
        dni: '123',
        truckPlate: 'DEF',
        trailerPlate: 'GHI',
        choferId: 7,
        activo: true,
      });
      expect(result.total).toBe(0);
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: create - forceMove with trailerNorm
  // =========================================================================
  describe('create - forceMove trailer conflict resolution', () => {
    it('resolves trailer conflicts when forceMove with trailerNorm', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce(null) // no driver conflict
        .mockResolvedValueOnce(null) // no truck conflict
        .mockResolvedValueOnce({ id: 8 }); // trailer conflict

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // driver rows
        .mockResolvedValueOnce([]) // truck rows
        .mockResolvedValueOnce([{ id: 8 }]); // trailer rows
      mockPrisma.equipo.update.mockResolvedValue({});
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipo.create.mockResolvedValue({ ...sampleEquipo });

      const result = await EquipoService.create({
        tenantEmpresaId: 10, dadorCargaId: 20, driverId: 100, truckId: 200,
        trailerId: 300, empresaTransportistaId: 400, driverDni: '12345678',
        truckPlate: 'ABC-123', trailerPlate: 'XYZ-789', validFrom: new Date(),
        forceMove: true,
      });
      expect(result.id).toBe(1);
    });

    it('resolves all three conflicts when forceMove', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce({ id: 5 }) // driver conflict
        .mockResolvedValueOnce({ id: 6 }) // truck conflict
        .mockResolvedValueOnce({ id: 7 }); // trailer conflict

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ id: 5 }])
        .mockResolvedValueOnce([{ id: 6 }])
        .mockResolvedValueOnce([{ id: 7 }]);
      mockPrisma.equipo.update.mockResolvedValue({});
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipo.create.mockResolvedValue({ ...sampleEquipo });

      const result = await EquipoService.create({
        tenantEmpresaId: 10, dadorCargaId: 20, driverId: 100, truckId: 200,
        trailerId: 300, empresaTransportistaId: 400, driverDni: '12345678',
        truckPlate: 'ABC-123', trailerPlate: 'XYZ-789', validFrom: new Date(),
        forceMove: true,
      });
      expect(result.id).toBe(1);
    });

    it('skips trailer resolution when trailerNorm is null', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce({ id: 5 }) // driver conflict
        .mockResolvedValueOnce(null); // no truck conflict (no trailer to check)

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ id: 5 }])
        .mockResolvedValueOnce([]);
      mockPrisma.equipo.update.mockResolvedValue({});
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipo.create.mockResolvedValue({ ...sampleEquipo });

      const result = await EquipoService.create({
        tenantEmpresaId: 10, dadorCargaId: 20, driverId: 100, truckId: 200,
        empresaTransportistaId: 400, driverDni: '12345678',
        truckPlate: 'ABC-123', trailerPlate: null, validFrom: new Date(),
        forceMove: true,
      });
      expect(result.id).toBe(1);
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: update edge cases
  // =========================================================================
  describe('update - additional branches', () => {
    it('does not validate empresa when empresaTransportistaId is 0', async () => {
      mockPrisma.equipo.update.mockResolvedValue({});
      await EquipoService.update(1, { empresaTransportistaId: 0 });
      expect(mockPrisma.equipo.findUnique).not.toHaveBeenCalled();
    });

    it('skips trailerPlateNorm normalization when trailerPlate is undefined', async () => {
      mockPrisma.equipo.update.mockResolvedValue({});
      await EquipoService.update(1, { estado: 'finalizada' });
      const data = mockPrisma.equipo.update.mock.calls[0][0].data;
      expect(data.trailerPlateNorm).toBeUndefined();
    });

    it('validates empresa for equipo - equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.update(1, { empresaTransportistaId: 5 })).rejects.toThrow('Equipo no encontrado');
    });

    it('validates empresa for equipo - empresa not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ dadorCargaId: 20, tenantEmpresaId: 10 });
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      await expect(EquipoService.update(1, { empresaTransportistaId: 5 })).rejects.toThrow('empresa transportista no pertenece');
    });

    it('does not normalize empresaTransportistaId when undefined', async () => {
      mockPrisma.equipo.update.mockResolvedValue({});
      await EquipoService.update(1, { validTo: new Date() });
      const data = mockPrisma.equipo.update.mock.calls[0][0].data;
      expect(data.empresaTransportistaId).toBeUndefined();
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: attachComponents - reopen + swap + history
  // =========================================================================
  describe('attachComponents - reopen and swap branches', () => {
    it('reopens equipo when estado is not activa and driver+truck present', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update
        .mockResolvedValueOnce({ ...sampleEquipo, estado: 'finalizada', driverId: 100, truckId: 200, validTo: null })
        .mockResolvedValueOnce({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.attachComponents(10, 1, { driverId: 100 });
      expect(result.estado).toBe('activa');
    });

    it('clears validTo when equipo has validTo set but is complete', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      const equipoWithValidTo = { ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: new Date() };
      mockPrisma.equipo.update
        .mockResolvedValueOnce(equipoWithValidTo)
        .mockResolvedValueOnce({ ...equipoWithValidTo, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.attachComponents(10, 1, { driverId: 100 });
      expect(result.validTo).toBeNull();
    });

    it('records swap history when driver originEquipoId exists', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      // closeOriginEquipo returns origin
      mockPrisma.equipo.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.$transaction.mockImplementation((cb: any) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return Promise.all(cb);
      });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      await EquipoService.attachComponents(10, 1, { driverId: 100 });
      const historyCalls = mockPrisma.equipoHistory.create.mock.calls;
      const swapCall = historyCalls.find((c: any) => c[0]?.data?.action === 'swap' && c[0]?.data?.component === 'driver');
      expect(swapCall).toBeDefined();
    });

    it('records swap history for truck originEquipoId', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue({ id: 6 });
      mockPrisma.$transaction.mockImplementation((cb: any) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return Promise.all(cb);
      });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      await EquipoService.attachComponents(10, 1, { truckId: 200 });
      const historyCalls = mockPrisma.equipoHistory.create.mock.calls;
      const swapCall = historyCalls.find((c: any) => c[0]?.data?.action === 'swap' && c[0]?.data?.component === 'truck');
      expect(swapCall).toBeDefined();
    });

    it('records swap history for trailer originEquipoId', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      // detachTrailerFromOrigin finds origin
      mockPrisma.equipo.findFirst.mockResolvedValue({ id: 7 });
      mockPrisma.$transaction.mockImplementation((cb: any) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return Promise.all(cb);
      });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      await EquipoService.attachComponents(10, 1, { trailerId: 300 });
      const historyCalls = mockPrisma.equipoHistory.create.mock.calls;
      const swapCall = historyCalls.find((c: any) => c[0]?.data?.action === 'swap' && c[0]?.data?.component === 'trailer');
      expect(swapCall).toBeDefined();
    });

    it('handles recordAttachHistory failure gracefully', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockRejectedValue(new Error('history fail'));

      const result = await EquipoService.attachComponents(10, 1, { driverId: 100 });
      expect(result).toBeDefined();
    });

    it('handles reopenEquipoIfComplete failure gracefully', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update
        .mockResolvedValueOnce({ ...sampleEquipo, estado: 'finalizada', driverId: 100, truckId: 200, validTo: null })
        .mockRejectedValueOnce(new Error('reopen fail'));
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.attachComponents(10, 1, { driverId: 100 });
      expect(result).toBeDefined();
    });

    it('handles enqueueComplianceCheck failure gracefully', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const { queueService } = await import('../src/services/queue.service');
      (queueService.addMissingCheckForEquipo as jest.Mock).mockRejectedValueOnce(new Error('queue fail'));

      const result = await EquipoService.attachComponents(10, 1, { driverId: 100 });
      expect(result).toBeDefined();
    });

    it('resolves driver by DNI and attaches', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 105 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 105, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.attachComponents(10, 1, { driverDni: '55555555' });
      expect(result).toBeDefined();
      const updateData = mockPrisma.equipo.update.mock.calls[0][0].data;
      expect(updateData.driverDniNorm).toBe('55555555');
    });

    it('resolves truck by plate and attaches', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.camion.findFirst.mockResolvedValue({ id: 205 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 205, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.attachComponents(10, 1, { truckPlate: 'DEF-456' });
      expect(result).toBeDefined();
      const updateData = mockPrisma.equipo.update.mock.calls[0][0].data;
      expect(updateData.truckPlateNorm).toBe('DEF456');
    });

    it('resolves trailer by plate with no normValue sets null', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.attachComponents(10, 1, { trailerId: 300 });
      expect(result).toBeDefined();
      const updateData = mockPrisma.equipo.update.mock.calls[0][0].data;
      expect(updateData.trailerPlateNorm).toBeNull();
    });

    it('component identification returns "trailer" when only trailerId in updates', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10, dadorCargaId: 20 });
      mockPrisma.acoplado.findFirst.mockResolvedValue({ id: 305 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, estado: 'activa', driverId: 100, truckId: 200, validTo: null });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      await EquipoService.attachComponents(10, 1, { trailerPlate: 'ZZZ-999' });
      const historyCall = mockPrisma.equipoHistory.create.mock.calls[0][0];
      expect(historyCall.data.component).toBe('trailer');
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: detachComponents queue failure
  // =========================================================================
  describe('detachComponents - queue failure', () => {
    it('continues even when queue service fails', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 10 });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, trailerId: null });
      const { queueService } = await import('../src/services/queue.service');
      (queueService.addMissingCheckForEquipo as jest.Mock).mockRejectedValueOnce(new Error('queue fail'));

      const result = await EquipoService.detachComponents(10, 1, { trailer: true });
      expect(result.trailerId).toBeNull();
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: associateCliente queue failure
  // =========================================================================
  describe('associateCliente - queue failure', () => {
    it('continues even when queue service fails', async () => {
      mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);
      mockPrisma.equipoCliente.create.mockResolvedValue({ equipoId: 1, clienteId: 50 });
      const { queueService } = await import('../src/services/queue.service');
      (queueService.addMissingCheckForEquipo as jest.Mock).mockRejectedValueOnce(new Error('queue fail'));

      const result = await EquipoService.associateCliente(10, 1, 50, new Date());
      expect(result.equipoId).toBe(1);
    });

    it('creates association with asignadoHasta when provided', async () => {
      mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);
      mockPrisma.equipoCliente.create.mockResolvedValue({ equipoId: 1, clienteId: 50 });
      const hasta = new Date('2026-12-31');

      await EquipoService.associateCliente(10, 1, 50, new Date(), hasta);
      const createData = mockPrisma.equipoCliente.create.mock.calls[0][0].data;
      expect(createData.asignadoHasta).toEqual(hasta);
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: createFromIdentifiers - failure paths
  // =========================================================================
  describe('createFromIdentifiers - fire-and-forget failures', () => {
    it('handles queue service failure after creation', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100 });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200 });
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.create.mockResolvedValue({ id: 1 });
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);

      const { queueService } = await import('../src/services/queue.service');
      (queueService.addMissingCheckForEquipo as jest.Mock).mockRejectedValueOnce(new Error('queue fail'));

      const result = await EquipoService.createFromIdentifiers({
        tenantEmpresaId: 10, dadorCargaId: 20,
        dniChofer: '12345678', patenteTractor: 'ABC123',
      });
      expect(result.id).toBe(1);
    });

    it('handles SystemConfigService failure and valid default client', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100 });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.create.mockResolvedValue({ id: 1 });
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);

      const { SystemConfigService } = await import('../src/services/system-config.service');
      (SystemConfigService.getConfig as jest.Mock).mockResolvedValueOnce('55');
      mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);
      mockPrisma.equipoCliente.create.mockResolvedValue({ equipoId: 1, clienteId: 55 });

      const result = await EquipoService.createFromIdentifiers({
        tenantEmpresaId: 10, dadorCargaId: 20,
        dniChofer: '12345678', patenteTractor: 'ABC123',
      });
      expect(result.id).toBe(1);
    });

    it('handles NaN default client id gracefully', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100 });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.create.mockResolvedValue({ id: 1 });
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);

      const { SystemConfigService } = await import('../src/services/system-config.service');
      (SystemConfigService.getConfig as jest.Mock).mockResolvedValueOnce('not-a-number');

      const result = await EquipoService.createFromIdentifiers({
        tenantEmpresaId: 10, dadorCargaId: 20,
        dniChofer: '12345678', patenteTractor: 'ABC123',
      });
      expect(result.id).toBe(1);
    });

    it('includes patenteAcoplado and empresaTransportista identifiers', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 100 });
      mockPrisma.camion.findFirst.mockResolvedValue({ id: 200 });
      mockPrisma.acoplado.findFirst.mockResolvedValue({ id: 300 });
      mockPrisma.empresaTransportista.findFirst
        .mockResolvedValueOnce({ id: 400 })
        .mockResolvedValueOnce({ id: 400, dadorCargaId: 20 });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.equipo.create.mockResolvedValue({ id: 1 });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.createFromIdentifiers({
        tenantEmpresaId: 10, dadorCargaId: 20,
        dniChofer: '12345678', patenteTractor: 'ABC123',
        patenteAcoplado: 'XYZ789',
        choferPhones: ['+5491100000000'],
        empresaTransportistaCuit: '20123456789',
        empresaTransportistaNombre: 'Empresa SA',
      });
      expect(result.id).toBe(1);
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: createEquipoCompleto - more branches
  // =========================================================================
  describe('createEquipoCompleto - additional branches', () => {
    const completoInput = {
      tenantEmpresaId: 10, dadorCargaId: 20,
      empresaTransportistaCuit: '20123456789', empresaTransportistaNombre: 'Test SA',
      choferDni: '12345678', choferNombre: 'Juan', choferApellido: 'Pérez',
      camionPatente: 'ABC123', acopladoPatente: 'XYZ789', clienteIds: [50],
    };

    it('throws when camion patente is too short', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      await expect(EquipoService.createEquipoCompleto({ ...completoInput, camionPatente: 'AB' }))
        .rejects.toThrow('Patente de camión inválida');
    });

    it('throws when camion is in use by another equipo', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue({ id: 200 });
      mockPrisma.equipo.findFirst.mockResolvedValue({ id: 99 });
      await expect(EquipoService.createEquipoCompleto(completoInput))
        .rejects.toThrow('ya está asignado');
    });

    it('reuses existing orphan camion', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue({ id: 200, marca: 'OldMarca', modelo: 'OldModelo' });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.camion.update.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.create.mockResolvedValue({ id: 300, patente: 'XYZ789', tipo: null });
      mockPrisma.equipo.create.mockResolvedValue({ id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() });
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipoCliente.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto({
        ...completoInput, camionMarca: 'NewMarca', camionModelo: 'NewModelo',
      });
      expect(result.id).toBe(1);
      expect(mockPrisma.camion.update).toHaveBeenCalled();
    });

    it('throws when acoplado patente is too short', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      await expect(EquipoService.createEquipoCompleto({ ...completoInput, acopladoPatente: 'AB' }))
        .rejects.toThrow('Patente de acoplado inválida');
    });

    it('throws when acoplado is in use by another equipo', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.acoplado.findFirst.mockResolvedValue({ id: 300 });
      mockPrisma.equipo.findFirst.mockResolvedValue({ id: 99 });
      await expect(EquipoService.createEquipoCompleto(completoInput))
        .rejects.toThrow('ya está asignado');
    });

    it('reuses existing orphan acoplado', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.acoplado.findFirst.mockResolvedValue({ id: 300, tipo: 'OldTipo' });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.update.mockResolvedValue({ id: 300, patente: 'XYZ789', tipo: 'Semi' });
      mockPrisma.equipo.create.mockResolvedValue({ id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() });
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipoCliente.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto({
        ...completoInput, acopladoTipo: 'Semi',
      });
      expect(result.id).toBe(1);
      expect(mockPrisma.acoplado.update).toHaveBeenCalled();
    });

    it('reuses existing empresa transportista', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Existing SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.create.mockResolvedValue({ id: 300, patente: 'XYZ789', tipo: null });
      mockPrisma.equipo.create.mockResolvedValue({ id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() });
      mockPrisma.equipoHistory.create.mockResolvedValue({});
      mockPrisma.equipoCliente.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto(completoInput);
      expect(result.empresaTransportistaId).toBe(400);
      expect(mockPrisma.empresaTransportista.create).not.toHaveBeenCalled();
    });

    it('creates without clienteIds', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.create.mockResolvedValue({ id: 300, patente: 'XYZ789', tipo: null });
      mockPrisma.equipo.create.mockResolvedValue({ id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto({ ...completoInput, clienteIds: undefined });
      expect(result.id).toBe(1);
      expect(mockPrisma.equipoCliente.create).not.toHaveBeenCalled();
    });

    it('creates chofer without optional nombre/apellido/phones', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: undefined, apellido: undefined });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.equipo.create.mockResolvedValue({ id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto({
        ...completoInput, choferNombre: undefined, choferApellido: undefined, choferPhones: undefined,
        acopladoPatente: null, clienteIds: [],
      });
      expect(result.id).toBe(1);
    });

    it('creates camion without marca/modelo', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: undefined, modelo: undefined });
      mockPrisma.equipo.create.mockResolvedValue({ id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto({
        ...completoInput, acopladoPatente: null, clienteIds: [],
      });
      expect(result.id).toBe(1);
    });

    it('creates empresa with fallback name when nombre is empty', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Empresa 20123456789' });
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 100, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.equipo.create.mockResolvedValue({ id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.createEquipoCompleto({
        ...completoInput, empresaTransportistaNombre: '', acopladoPatente: null, clienteIds: [],
      });
      expect(result.id).toBe(1);
    });

    it('reuses orphan chofer updating phones when provided', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue({ id: 400, cuit: '20123456789', razonSocial: 'Test SA' });
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 100, nombre: 'Old', apellido: 'Name', phones: [] });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.update.mockResolvedValue({ id: 100, nombre: 'Juan', apellido: 'Pérez' });
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 200, patente: 'ABC123', marca: null, modelo: null });
      mockPrisma.equipo.create.mockResolvedValue({ id: 1, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      await EquipoService.createEquipoCompleto({
        ...completoInput, choferPhones: ['+5491100000000'],
        acopladoPatente: null, clienteIds: [],
      });
      const updateData = mockPrisma.chofer.update.mock.calls[0][0].data;
      expect(updateData.phones).toEqual(['+5491100000000']);
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: updateEquipo - entity validation branches
  // =========================================================================
  describe('updateEquipo - additional entity validation', () => {
    it('validates chofer not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      mockPrisma.chofer.findUnique.mockResolvedValue(null);
      await expect(EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, choferId: 999,
      })).rejects.toThrow('Chofer no válido');
    });

    it('validates camion not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      mockPrisma.camion.findUnique.mockResolvedValue(null);
      await expect(EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, camionId: 999,
      })).rejects.toThrow('Camión no válido');
    });

    it('validates acoplado not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      mockPrisma.acoplado.findUnique.mockResolvedValue(null);
      await expect(EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, acopladoId: 999,
      })).rejects.toThrow('Acoplado no válido');
    });

    it('validates acoplado wrong dador', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ id: 999, dadorCargaId: 777 });
      await expect(EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, acopladoId: 999,
      })).rejects.toThrow('Acoplado no válido');
    });

    it('validates empresa not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      await expect(EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, empresaTransportistaId: 999,
      })).rejects.toThrow('Empresa transportista no válida');
    });

    it('skips camion change when same id', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, camionId: 200,
      });
      expect(mockPrisma.equipo.update).not.toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('skips acoplado change when same id', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, acopladoId: 300,
      });
      expect(mockPrisma.equipo.update).not.toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('skips empresa change when same id', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, empresaTransportistaId: 400,
      });
      expect(mockPrisma.equipo.update).not.toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('applies multiple entity changes at once', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      mockPrisma.chofer.findUnique.mockResolvedValue({ id: 101, dadorCargaId: 20, dniNorm: '87654321' });
      mockPrisma.camion.findUnique.mockResolvedValue({ id: 201, dadorCargaId: 20, patenteNorm: 'DEF456' });
      mockPrisma.equipo.update.mockResolvedValue({ ...sampleEquipo, driverId: 101, truckId: 201 });
      mockPrisma.equipoHistory.create.mockResolvedValue({});

      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10,
        choferId: 101, camionId: 201,
      });
      expect(result).toBeDefined();
      expect(AuditService.logEquipoChange).toHaveBeenCalledTimes(2);
    });

    it('tenant mismatch on updateEquipo throws', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, tenantEmpresaId: 99 });
      await expect(EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Equipo no encontrado');
    });

    it('expectedVersion matches allows update', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, clientes: [] });
      const result = await EquipoService.updateEquipo({
        equipoId: 1, usuarioId: 5, tenantEmpresaId: 10, expectedVersion: 1,
      });
      expect(result.id).toBe(1);
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: addClienteToEquipo - tenant mismatch
  // =========================================================================
  describe('addClienteToEquipo - tenant mismatch', () => {
    it('throws when tenant mismatch', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, tenantEmpresaId: 99 });
      await expect(EquipoService.addClienteToEquipo({
        equipoId: 1, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Equipo no encontrado');
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: removeClienteFromEquipo - tenant mismatch
  // =========================================================================
  describe('removeClienteFromEquipo - tenant mismatch + motivo branch', () => {
    it('throws when tenant mismatch', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, tenantEmpresaId: 99 });
      await expect(EquipoService.removeClienteFromEquipo({
        equipoId: 1, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Equipo no encontrado');
    });

    it('includes motivo in audit when docs archived or plantillas closed', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.equipoCliente.count.mockResolvedValue(3);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 51 }, { clienteId: 52 }]);
      (DocumentArchiveService.findDocumentsExclusiveToClient as jest.Mock).mockResolvedValue([10]);
      (DocumentArchiveService.archiveDocuments as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 1, clienteId: 50, asignadoDesde: new Date() });
      mockPrisma.equipoCliente.update.mockResolvedValue({});
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPrisma.equipoPlantillaRequisito.updateMany.mockResolvedValue({ count: 2 });

      const result = await EquipoService.removeClienteFromEquipo({
        equipoId: 1, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      });
      expect(result.archivedDocuments).toBe(1);
      expect(result.plantillasRemovidas).toBe(2);
      const auditCall = (AuditService.logEquipoChange as jest.Mock).mock.calls[0][0];
      expect(auditCall.motivo).toContain('1 documentos archivados');
      expect(auditCall.motivo).toContain('2 plantillas desasociadas');
    });

    it('motivo is undefined when no docs archived and no plantillas closed', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(sampleEquipo);
      mockPrisma.equipoCliente.count.mockResolvedValue(2);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 51 }]);
      (DocumentArchiveService.findDocumentsExclusiveToClient as jest.Mock).mockResolvedValue([]);
      mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 1, clienteId: 50, asignadoDesde: new Date() });
      mockPrisma.equipoCliente.update.mockResolvedValue({});
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([]);

      await EquipoService.removeClienteFromEquipo({
        equipoId: 1, clienteId: 50, usuarioId: 5, tenantEmpresaId: 10,
      });
      const auditCall = (AuditService.logEquipoChange as jest.Mock).mock.calls[0][0];
      expect(auditCall.motivo).toBeUndefined();
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: rollbackAltaCompleta - empresaTransportistaId null
  // =========================================================================
  describe('rollbackAltaCompleta - null empresaTransportistaId', () => {
    it('skips empresa delete when empresaTransportistaId is null', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, empresaTransportistaId: null });
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipoHistory.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipo.delete.mockResolvedValue(sampleEquipo);

      await EquipoService.rollbackAltaCompleta({
        tenantEmpresaId: 10, equipoId: 1, deleteEmpresa: true,
      });
      expect(mockPrisma.empresaTransportista.delete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: getRequisitosEquipo
  // =========================================================================
  describe('getRequisitosEquipo', () => {
    it('returns consolidated requisitos with documents', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 30,
          template: { name: 'Licencia' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
        {
          templateId: 1, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 15,
          template: { name: 'Licencia' },
          plantillaRequisito: { cliente: { id: 51, razonSocial: 'Cliente B' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 10, status: 'APROBADO', expiresAt: new Date('2027-01-01'),
      });

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result).toHaveLength(1);
      expect(result[0].obligatorio).toBe(true);
      expect(result[0].diasAnticipacion).toBe(30);
      expect(result[0].requeridoPor).toHaveLength(2);
      expect(result[0].documentoActual).toBeDefined();
      expect(result[0].estado).toBe('VIGENTE');
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);
      await expect(EquipoService.getRequisitosEquipo(999, 10)).rejects.toThrow('Equipo no encontrado');
    });

    it('throws when tenant mismatch', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, tenantEmpresaId: 99 });
      await expect(EquipoService.getRequisitosEquipo(1, 10)).rejects.toThrow('Equipo no encontrado');
    });

    it('returns FALTANTE when no document found for entity', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 2, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 10,
          template: { name: 'VTV' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue(null);

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].estado).toBe('FALTANTE');
      expect(result[0].documentoActual).toBeNull();
    });

    it('returns VENCIDO when document status is VENCIDO', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 3, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 30,
          template: { name: 'Psicofísico' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 11, status: 'VENCIDO', expiresAt: new Date('2024-01-01'),
      });

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].estado).toBe('VENCIDO');
    });

    it('returns VENCIDO when document has expired date even if status is APROBADO', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 4, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 30,
          template: { name: 'Seguro' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 12, status: 'APROBADO', expiresAt: new Date('2020-01-01'),
      });

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].estado).toBe('VENCIDO');
    });

    it('returns RECHAZADO when document status is RECHAZADO', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 5, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 30,
          template: { name: 'RUTA' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 13, status: 'RECHAZADO', expiresAt: null,
      });

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].estado).toBe('RECHAZADO');
    });

    it('returns PENDIENTE when document status is not APROBADO/VENCIDO/RECHAZADO', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 6, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 30,
          template: { name: 'Cedula' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 14, status: 'PENDIENTE', expiresAt: null,
      });

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].estado).toBe('PENDIENTE');
    });

    it('returns PROXIMO_VENCER when approved and within anticipation days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 7, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 30,
          template: { name: 'Carnet' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 15, status: 'APROBADO', expiresAt: futureDate,
      });

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].estado).toBe('PROXIMO_VENCER');
    });

    it('returns VIGENTE when approved and no expiresAt', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 8, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 30,
          template: { name: 'DDJJ' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 16, status: 'APROBADO', expiresAt: null,
      });

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].estado).toBe('VIGENTE');
    });

    it('returns null entityId for unknown entityType', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 9, entityType: 'UNKNOWN_TYPE', obligatorio: false, diasAnticipacion: 0,
          template: { name: 'Custom' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].entityId).toBeNull();
      expect(result[0].documentoActual).toBeNull();
      expect(result[0].estado).toBe('FALTANTE');
    });

    it('returns EMPRESA_TRANSPORTISTA entityId correctly', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, diasAnticipacion: 0,
          template: { name: 'Habilitación' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue({
        id: 17, status: 'APROBADO', expiresAt: null,
      });

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].entityId).toBe(400);
      expect(result[0].estado).toBe('VIGENTE');
    });

    it('returns ACOPLADO entityId correctly', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 11, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 0,
          template: { name: 'VTV Acoplado' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue(null);

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].entityId).toBe(300);
    });

    it('consolidates higher diasAnticipacion', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({
        ...sampleEquipo, tenantEmpresaId: 10,
        clientes: [{ clienteId: 50 }],
      });
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 12, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 10,
          template: { name: 'ART' },
          plantillaRequisito: { cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
        {
          templateId: 12, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 45,
          template: { name: 'ART' },
          plantillaRequisito: { cliente: { id: 51, razonSocial: 'Cliente B' } },
        },
      ]);
      mockPrisma.document.findFirst.mockResolvedValue(null);

      const result = await EquipoService.getRequisitosEquipo(1, 10);
      expect(result[0].diasAnticipacion).toBe(45);
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: ensureChofer - empty phones
  // =========================================================================
  describe('ensureChofer - phones edge cases', () => {
    it('does not update phones when array is empty', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 100 });
      const id = await EquipoService.ensureChofer(10, 20, '12345678', []);
      expect(id).toBe(100);
      expect(mockPrisma.chofer.update).not.toHaveBeenCalled();
    });

    it('creates with default empty phones when undefined', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 101 });
      await EquipoService.ensureChofer(10, 20, '12345678');
      const createData = mockPrisma.chofer.create.mock.calls[0][0].data;
      expect(createData.phones).toEqual([]);
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: ensureEmpresaTransportista - null razonSocial
  // =========================================================================
  describe('ensureEmpresaTransportista - edge cases', () => {
    it('creates empresa with null razonSocial uses fallback', async () => {
      mockPrisma.empresaTransportista.findFirst.mockResolvedValue(null);
      mockPrisma.empresaTransportista.create.mockResolvedValue({ id: 403 });
      await EquipoService.ensureEmpresaTransportista(10, 20, '20123456789', null);
      const data = mockPrisma.empresaTransportista.create.mock.calls[0][0].data;
      expect(data.razonSocial).toContain('Empresa');
    });

    it('returns null when cuit is empty string', async () => {
      const id = await EquipoService.ensureEmpresaTransportista(10, 20, '');
      expect(id).toBeNull();
    });
  });

  // =========================================================================
  // ADDITIONAL COVERAGE: transferirEquipo - tenant mismatch on equipo
  // =========================================================================
  describe('transferirEquipo - tenant mismatch', () => {
    it('throws when equipo tenant does not match', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ ...sampleEquipo, tenantEmpresaId: 99 });
      await expect(EquipoService.transferirEquipo({
        equipoId: 1, nuevoDadorCargaId: 30, usuarioId: 5, tenantEmpresaId: 10,
      })).rejects.toThrow('Equipo no encontrado');
    });
  });
});
