/**
 * Coverage tests for MaestrosService
 * Covers empresas, choferes, camiones, acoplados CRUD operations,
 * normalization helpers, enqueueMissingCheck, and detachFromEquipos.
 * @jest-environment node
 */

const mockPrisma = {
  dadorCarga: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  chofer: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  camion: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  acoplado: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  equipo: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  equipoHistory: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../src/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockAddMissingCheck = jest.fn(async () => undefined);
jest.mock('../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: mockAddMissingCheck },
}));

import { MaestrosService } from '../src/services/maestros.service';

describe('MaestrosService (coverage)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ========================================================================
  // EMPRESAS
  // ========================================================================
  describe('listEmpresas', () => {
    it('lists empresas without filters', async () => {
      mockPrisma.dadorCarga.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.dadorCarga.count.mockResolvedValue(1);

      const result = await MaestrosService.listEmpresas();
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('lists empresas with activo filter', async () => {
      mockPrisma.dadorCarga.findMany.mockResolvedValue([]);
      mockPrisma.dadorCarga.count.mockResolvedValue(0);

      const result = await MaestrosService.listEmpresas(true);
      expect(result.total).toBe(0);
    });

    it('lists empresas with search query', async () => {
      mockPrisma.dadorCarga.findMany.mockResolvedValue([]);
      mockPrisma.dadorCarga.count.mockResolvedValue(0);

      const result = await MaestrosService.listEmpresas(undefined, 'test', 2, 5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });

    it('lists empresas with both activo=false and search', async () => {
      mockPrisma.dadorCarga.findMany.mockResolvedValue([]);
      mockPrisma.dadorCarga.count.mockResolvedValue(0);

      const result = await MaestrosService.listEmpresas(false, 'abc');
      expect(result.total).toBe(0);
    });
  });

  describe('createEmpresa', () => {
    it('creates empresa', async () => {
      mockPrisma.dadorCarga.create.mockResolvedValue({ id: 1, razonSocial: 'Test', cuit: '30-1-0' });

      const result = await MaestrosService.createEmpresa({ razonSocial: 'Test', cuit: '30-1-0' });
      expect(result.id).toBe(1);
    });
  });

  describe('updateEmpresa', () => {
    it('updates empresa', async () => {
      mockPrisma.dadorCarga.update.mockResolvedValue({ id: 1, razonSocial: 'Updated' });

      const result = await MaestrosService.updateEmpresa(1, { razonSocial: 'Updated' });
      expect(result.razonSocial).toBe('Updated');
    });
  });

  describe('deleteEmpresa', () => {
    it('deletes empresa', async () => {
      mockPrisma.dadorCarga.delete.mockResolvedValue({ id: 1 });

      const result = await MaestrosService.deleteEmpresa(1);
      expect(result.id).toBe(1);
    });
  });

  // ========================================================================
  // CHOFERES
  // ========================================================================
  describe('getChoferById', () => {
    it('finds chofer by id', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 10, dni: '12345678' });

      const result = await MaestrosService.getChoferById(1, 10);
      expect(result?.dni).toBe('12345678');
    });

    it('returns null when chofer not found', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);

      const result = await MaestrosService.getChoferById(1, 999);
      expect(result).toBeNull();
    });
  });

  describe('listChoferes', () => {
    it('lists choferes without optional filters', async () => {
      mockPrisma.chofer.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.chofer.count.mockResolvedValue(1);

      const result = await MaestrosService.listChoferes(1, undefined);
      expect(result.data).toHaveLength(1);
    });

    it('lists choferes with dadorCargaId, search, and activo filters', async () => {
      mockPrisma.chofer.findMany.mockResolvedValue([]);
      mockPrisma.chofer.count.mockResolvedValue(0);

      const result = await MaestrosService.listChoferes(1, 5, 'perez', true, 2, 20);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('lists choferes with activo=false', async () => {
      mockPrisma.chofer.findMany.mockResolvedValue([]);
      mockPrisma.chofer.count.mockResolvedValue(0);

      const result = await MaestrosService.listChoferes(1, undefined, undefined, false);
      expect(result.total).toBe(0);
    });
  });

  describe('createChofer', () => {
    it('creates new chofer when no existing', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 10, dni: '12345678' });
      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 1 }]);

      const result = await MaestrosService.createChofer({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        dni: '12.345.678',
        nombre: 'Juan',
        apellido: 'Perez',
      });

      expect(result.id).toBe(10);
      expect(mockPrisma.chofer.create).toHaveBeenCalled();
    });

    it('creates chofer with default activo and empty phones', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 11, dni: '99999' });
      mockPrisma.equipo.findMany.mockResolvedValue([]);

      const result = await MaestrosService.createChofer({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        dni: '99999',
      });

      expect(result.id).toBe(11);
    });

    it('throws when chofer exists with same dador', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue({ id: 10, dadorCargaId: 5, dni: '12345678' });

      await expect(
        MaestrosService.createChofer({
          tenantEmpresaId: 1,
          dadorCargaId: 5,
          dni: '12345678',
        })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('updates chofer when existing with different dador', async () => {
      const existing = { id: 10, dadorCargaId: 3, nombre: 'Old', apellido: 'Name', phones: ['123'], activo: true };
      mockPrisma.chofer.findFirst.mockResolvedValue(existing);
      mockPrisma.chofer.update.mockResolvedValue({ ...existing, dadorCargaId: 5 });

      const result = await MaestrosService.createChofer({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        dni: '12345678',
      });

      expect(mockPrisma.chofer.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: expect.objectContaining({ dadorCargaId: 5 }),
      });
      expect(result.dadorCargaId).toBe(5);
    });

    it('updates chofer with provided optional fields', async () => {
      const existing = { id: 10, dadorCargaId: 3, nombre: 'Old', apellido: 'Name', phones: [], activo: false };
      mockPrisma.chofer.findFirst.mockResolvedValue(existing);
      mockPrisma.chofer.update.mockResolvedValue({ ...existing, dadorCargaId: 5, nombre: 'New' });

      await MaestrosService.createChofer({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        dni: '12345678',
        nombre: 'New',
        apellido: 'Last',
        phones: ['456'],
        activo: true,
      });

      expect(mockPrisma.chofer.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: expect.objectContaining({ nombre: 'New', apellido: 'Last', phones: ['456'], activo: true }),
      });
    });

    it('enqueues missing check when equipo uses this chofer', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 15, dni: '55555' });
      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 100 }, { id: 200 }]);

      await MaestrosService.createChofer({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        dni: '55555',
      });

      expect(mockAddMissingCheck).toHaveBeenCalledTimes(2);
    });

    it('handles enqueueMissingCheck failure silently', async () => {
      mockPrisma.chofer.findFirst.mockResolvedValue(null);
      mockPrisma.chofer.create.mockResolvedValue({ id: 15, dni: '55555' });
      mockPrisma.equipo.findMany.mockRejectedValue(new Error('queue fail'));

      const result = await MaestrosService.createChofer({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        dni: '55555',
      });

      expect(result.id).toBe(15);
    });
  });

  describe('updateChofer', () => {
    it('updates chofer fields', async () => {
      mockPrisma.chofer.update.mockResolvedValue({ id: 10, dni: '99999', dniNorm: '99999' });

      const result = await MaestrosService.updateChofer(1, 10, { dni: '99999', nombre: 'Updated' });
      expect(result.id).toBe(10);
    });

    it('updates chofer without changing dni', async () => {
      mockPrisma.chofer.update.mockResolvedValue({ id: 10, nombre: 'Only Name' });

      const result = await MaestrosService.updateChofer(1, 10, { nombre: 'Only Name' });
      expect(result.nombre).toBe('Only Name');
    });
  });

  describe('deleteChofer', () => {
    it('deletes chofer and detaches from equipos', async () => {
      const txMock = {
        equipo: {
          findMany: jest.fn().mockResolvedValue([{ id: 100 }]),
          update: jest.fn().mockResolvedValue({}),
        },
        equipoHistory: { create: jest.fn().mockResolvedValue({}) },
        chofer: { delete: jest.fn().mockResolvedValue({ id: 10 }) },
      };
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(txMock));

      const result = await MaestrosService.deleteChofer(1, 10);
      expect(result.id).toBe(10);
      expect(txMock.equipo.update).toHaveBeenCalled();
    });

    it('handles equipoHistory.create failure silently', async () => {
      const txMock = {
        equipo: {
          findMany: jest.fn().mockResolvedValue([{ id: 100 }]),
          update: jest.fn().mockResolvedValue({}),
        },
        equipoHistory: { create: jest.fn().mockRejectedValue(new Error('history fail')) },
        chofer: { delete: jest.fn().mockResolvedValue({ id: 10 }) },
      };
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(txMock));

      const result = await MaestrosService.deleteChofer(1, 10);
      expect(result.id).toBe(10);
    });

    it('handles no equipos to detach', async () => {
      const txMock = {
        equipo: { findMany: jest.fn().mockResolvedValue([]) },
        equipoHistory: { create: jest.fn() },
        chofer: { delete: jest.fn().mockResolvedValue({ id: 10 }) },
      };
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(txMock));

      const result = await MaestrosService.deleteChofer(1, 10);
      expect(result.id).toBe(10);
      expect(txMock.equipo.findMany).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // CAMIONES
  // ========================================================================
  describe('listCamiones', () => {
    it('lists camiones without filters', async () => {
      mockPrisma.camion.findMany.mockResolvedValue([]);
      mockPrisma.camion.count.mockResolvedValue(0);

      const result = await MaestrosService.listCamiones(1, undefined);
      expect(result.total).toBe(0);
    });

    it('lists camiones with all filters', async () => {
      mockPrisma.camion.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.camion.count.mockResolvedValue(1);

      const result = await MaestrosService.listCamiones(1, 5, 'AAA', true, 1, 10);
      expect(result.data).toHaveLength(1);
    });

    it('lists camiones with activo=false', async () => {
      mockPrisma.camion.findMany.mockResolvedValue([]);
      mockPrisma.camion.count.mockResolvedValue(0);

      const result = await MaestrosService.listCamiones(1, undefined, undefined, false);
      expect(result.total).toBe(0);
    });
  });

  describe('createCamion', () => {
    it('creates new camion', async () => {
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 20, patente: 'AAA111' });
      mockPrisma.equipo.findMany.mockResolvedValue([]);

      const result = await MaestrosService.createCamion({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        patente: 'AAA-111',
        marca: 'Scania',
      });

      expect(result.patente).toBe('AAA111');
    });

    it('throws when camion exists with same dador', async () => {
      mockPrisma.camion.findFirst.mockResolvedValue({ id: 20, dadorCargaId: 5 });

      await expect(
        MaestrosService.createCamion({
          tenantEmpresaId: 1,
          dadorCargaId: 5,
          patente: 'AAA111',
        })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('updates camion when existing with different dador', async () => {
      mockPrisma.camion.findFirst.mockResolvedValue({ id: 20, dadorCargaId: 3, marca: 'Old', modelo: 'M1', activo: true });
      mockPrisma.camion.update.mockResolvedValue({ id: 20, dadorCargaId: 5 });

      const result = await MaestrosService.createCamion({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        patente: 'AAA111',
      });

      expect(result.dadorCargaId).toBe(5);
    });

    it('updates camion with provided optional fields', async () => {
      mockPrisma.camion.findFirst.mockResolvedValue({ id: 20, dadorCargaId: 3, marca: null, modelo: null, activo: false });
      mockPrisma.camion.update.mockResolvedValue({ id: 20, marca: 'Volvo' });

      await MaestrosService.createCamion({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        patente: 'AAA111',
        marca: 'Volvo',
        modelo: 'FH',
        activo: true,
      });

      expect(mockPrisma.camion.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: expect.objectContaining({ marca: 'Volvo', modelo: 'FH', activo: true }),
      });
    });

    it('enqueues missing check for equipos', async () => {
      mockPrisma.camion.findFirst.mockResolvedValue(null);
      mockPrisma.camion.create.mockResolvedValue({ id: 25, patente: 'BBB222' });
      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 300 }]);

      await MaestrosService.createCamion({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        patente: 'BBB222',
      });

      expect(mockAddMissingCheck).toHaveBeenCalledWith(1, 300, 15 * 60 * 1000);
    });
  });

  describe('updateCamion', () => {
    it('updates camion with patente change', async () => {
      mockPrisma.camion.update.mockResolvedValue({ id: 20, patente: 'ZZZ999' });

      const result = await MaestrosService.updateCamion(1, 20, { patente: 'ZZZ-999' });
      expect(result.id).toBe(20);
    });

    it('updates camion without patente change', async () => {
      mockPrisma.camion.update.mockResolvedValue({ id: 20, marca: 'MAN' });

      const result = await MaestrosService.updateCamion(1, 20, { marca: 'MAN' });
      expect(result.marca).toBe('MAN');
    });
  });

  describe('deleteCamion', () => {
    it('deletes camion and detaches from equipos', async () => {
      const txMock = {
        equipo: {
          findMany: jest.fn().mockResolvedValue([{ id: 200 }]),
          update: jest.fn().mockResolvedValue({}),
        },
        equipoHistory: { create: jest.fn().mockResolvedValue({}) },
        camion: { delete: jest.fn().mockResolvedValue({ id: 20 }) },
      };
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(txMock));

      const result = await MaestrosService.deleteCamion(1, 20);
      expect(result.id).toBe(20);
      expect(txMock.equipo.update).toHaveBeenCalledWith({
        where: { id: 200 },
        data: { truckId: 0, truckPlateNorm: '' },
      });
    });
  });

  // ========================================================================
  // ACOPLADOS
  // ========================================================================
  describe('listAcoplados', () => {
    it('lists acoplados without filters', async () => {
      mockPrisma.acoplado.findMany.mockResolvedValue([]);
      mockPrisma.acoplado.count.mockResolvedValue(0);

      const result = await MaestrosService.listAcoplados(1, undefined);
      expect(result.total).toBe(0);
    });

    it('lists acoplados with all filters', async () => {
      mockPrisma.acoplado.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.acoplado.count.mockResolvedValue(1);

      const result = await MaestrosService.listAcoplados(1, 5, 'semi', true, 1, 10);
      expect(result.data).toHaveLength(1);
    });

    it('lists acoplados with activo=false', async () => {
      mockPrisma.acoplado.findMany.mockResolvedValue([]);
      mockPrisma.acoplado.count.mockResolvedValue(0);

      await MaestrosService.listAcoplados(1, undefined, undefined, false);
      expect(mockPrisma.acoplado.findMany).toHaveBeenCalled();
    });
  });

  describe('createAcoplado', () => {
    it('creates new acoplado', async () => {
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.create.mockResolvedValue({ id: 30, patente: 'CCC333' });
      mockPrisma.equipo.findMany.mockResolvedValue([]);

      const result = await MaestrosService.createAcoplado({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        patente: 'CCC-333',
        tipo: 'Semi',
      });

      expect(result.patente).toBe('CCC333');
    });

    it('throws when acoplado exists with same dador', async () => {
      mockPrisma.acoplado.findFirst.mockResolvedValue({ id: 30, dadorCargaId: 5 });

      await expect(
        MaestrosService.createAcoplado({
          tenantEmpresaId: 1,
          dadorCargaId: 5,
          patente: 'CCC333',
        })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('updates acoplado when existing with different dador', async () => {
      mockPrisma.acoplado.findFirst.mockResolvedValue({ id: 30, dadorCargaId: 3, tipo: 'Old', activo: true });
      mockPrisma.acoplado.update.mockResolvedValue({ id: 30, dadorCargaId: 5 });

      const result = await MaestrosService.createAcoplado({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        patente: 'CCC333',
      });

      expect(result.dadorCargaId).toBe(5);
    });

    it('updates acoplado with provided optional fields', async () => {
      mockPrisma.acoplado.findFirst.mockResolvedValue({ id: 30, dadorCargaId: 3, tipo: null, activo: false });
      mockPrisma.acoplado.update.mockResolvedValue({ id: 30, tipo: 'Baranda' });

      await MaestrosService.createAcoplado({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        patente: 'CCC333',
        tipo: 'Baranda',
        activo: true,
      });

      expect(mockPrisma.acoplado.update).toHaveBeenCalledWith({
        where: { id: 30 },
        data: expect.objectContaining({ tipo: 'Baranda', activo: true }),
      });
    });

    it('enqueues missing check for equipos', async () => {
      mockPrisma.acoplado.findFirst.mockResolvedValue(null);
      mockPrisma.acoplado.create.mockResolvedValue({ id: 35, patente: 'DDD444' });
      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 400 }]);

      await MaestrosService.createAcoplado({
        tenantEmpresaId: 1,
        dadorCargaId: 5,
        patente: 'DDD444',
      });

      expect(mockAddMissingCheck).toHaveBeenCalledWith(1, 400, 15 * 60 * 1000);
    });
  });

  describe('updateAcoplado', () => {
    it('updates acoplado with patente change', async () => {
      mockPrisma.acoplado.update.mockResolvedValue({ id: 30, patente: 'EEE555' });

      const result = await MaestrosService.updateAcoplado(1, 30, { patente: 'EEE-555' });
      expect(result.id).toBe(30);
    });

    it('updates acoplado without patente change', async () => {
      mockPrisma.acoplado.update.mockResolvedValue({ id: 30, tipo: 'Playo' });

      const result = await MaestrosService.updateAcoplado(1, 30, { tipo: 'Playo' });
      expect(result.tipo).toBe('Playo');
    });
  });

  describe('deleteAcoplado', () => {
    it('deletes acoplado and detaches from equipos', async () => {
      const txMock = {
        equipo: {
          findMany: jest.fn().mockResolvedValue([{ id: 300 }]),
          update: jest.fn().mockResolvedValue({}),
        },
        equipoHistory: { create: jest.fn().mockResolvedValue({}) },
        acoplado: { delete: jest.fn().mockResolvedValue({ id: 30 }) },
      };
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(txMock));

      const result = await MaestrosService.deleteAcoplado(1, 30);
      expect(result.id).toBe(30);
      expect(txMock.equipo.update).toHaveBeenCalledWith({
        where: { id: 300 },
        data: { trailerId: null, trailerPlateNorm: null },
      });
    });

    it('handles no equipos to detach on acoplado delete', async () => {
      const txMock = {
        equipo: { findMany: jest.fn().mockResolvedValue([]) },
        equipoHistory: { create: jest.fn() },
        acoplado: { delete: jest.fn().mockResolvedValue({ id: 30 }) },
      };
      mockPrisma.$transaction.mockImplementation((cb: any) => cb(txMock));

      const result = await MaestrosService.deleteAcoplado(1, 30);
      expect(result.id).toBe(30);
    });
  });
});
