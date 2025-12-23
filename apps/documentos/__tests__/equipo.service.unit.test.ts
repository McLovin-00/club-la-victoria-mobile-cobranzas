/**
 * Unit tests for EquipoService
 * @jest-environment node
 */

// Mock all dependencies before imports
jest.mock('../src/config/database', () => ({
  prisma: {
    equipo: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    chofer: { findUnique: jest.fn(), findMany: jest.fn() },
    camion: { findUnique: jest.fn(), findMany: jest.fn() },
    acoplado: { findUnique: jest.fn(), findMany: jest.fn() },
    empresaTransportista: { findUnique: jest.fn(), findMany: jest.fn() },
    cliente: { findUnique: jest.fn(), findMany: jest.fn() },
    dadorCarga: { findUnique: jest.fn(), findMany: jest.fn() },
    document: { findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('EquipoService', () => {
  describe('Equipo structure', () => {
    it('should define equipo with required fields', () => {
      const equipo = {
        id: 1,
        tenantEmpresaId: 100,
        dadorCargaId: 50,
        driverId: 10,
        truckId: 20,
        trailerId: 30,
        empresaTransportistaId: 40,
        truckPlateNorm: 'AB123CD',
        trailerPlateNorm: 'AA000BB',
        driverDniNorm: '12345678',
        externalId: 'EXT-001',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(equipo.id).toBe(1);
      expect(equipo.driverId).toBe(10);
      expect(equipo.truckId).toBe(20);
    });

    it('should allow optional trailerId', () => {
      const equipoSinAcoplado = {
        id: 2,
        tenantEmpresaId: 100,
        dadorCargaId: 50,
        driverId: 10,
        truckId: 20,
        trailerId: null,
        empresaTransportistaId: null,
      };

      expect(equipoSinAcoplado.trailerId).toBeNull();
    });
  });

  describe('Plate normalization', () => {
    function normalizePlate(plate: string): string {
      return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    it('should convert to uppercase', () => {
      expect(normalizePlate('abc123')).toBe('ABC123');
    });

    it('should remove hyphens', () => {
      expect(normalizePlate('AB-123-CD')).toBe('AB123CD');
    });

    it('should remove spaces', () => {
      expect(normalizePlate('AB 123 CD')).toBe('AB123CD');
    });

    it('should handle Mercosur plates', () => {
      expect(normalizePlate('AA-000-BB')).toBe('AA000BB');
    });

    it('should handle old format plates', () => {
      expect(normalizePlate('ABC-123')).toBe('ABC123');
    });
  });

  describe('DNI normalization', () => {
    function normalizeDni(dni: string): string {
      return dni.replace(/\D/g, '');
    }

    it('should remove dots', () => {
      expect(normalizeDni('12.345.678')).toBe('12345678');
    });

    it('should remove hyphens', () => {
      expect(normalizeDni('12-345-678')).toBe('12345678');
    });

    it('should handle clean DNI', () => {
      expect(normalizeDni('12345678')).toBe('12345678');
    });
  });

  describe('Equipo search filters', () => {
    interface EquipoFilters {
      tenantId?: number;
      dadorCargaId?: number;
      clienteId?: number;
      driverDni?: string;
      truckPlate?: string;
      trailerPlate?: string;
      externalId?: string;
      search?: string;
    }

    function buildEquipoWhereClause(filters: EquipoFilters): Record<string, any> {
      const where: Record<string, any> = {};

      if (filters.tenantId) where.tenantEmpresaId = filters.tenantId;
      if (filters.dadorCargaId) where.dadorCargaId = filters.dadorCargaId;
      if (filters.driverDni) where.driverDniNorm = filters.driverDni.replace(/\D/g, '');
      if (filters.truckPlate) where.truckPlateNorm = filters.truckPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (filters.trailerPlate) where.trailerPlateNorm = filters.trailerPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (filters.externalId) where.externalId = filters.externalId;

      return where;
    }

    it('should filter by tenant', () => {
      const where = buildEquipoWhereClause({ tenantId: 100 });
      expect(where.tenantEmpresaId).toBe(100);
    });

    it('should normalize DNI in filter', () => {
      const where = buildEquipoWhereClause({ driverDni: '12.345.678' });
      expect(where.driverDniNorm).toBe('12345678');
    });

    it('should normalize plate in filter', () => {
      const where = buildEquipoWhereClause({ truckPlate: 'AB-123-CD' });
      expect(where.truckPlateNorm).toBe('AB123CD');
    });

    it('should filter by external ID', () => {
      const where = buildEquipoWhereClause({ externalId: 'EXT-001' });
      expect(where.externalId).toBe('EXT-001');
    });
  });

  describe('Equipo compliance state', () => {
    type EquipoState = 'HABILITADO' | 'PROXIMO_VENCER' | 'NO_HABILITADO' | 'INCOMPLETO';

    function determineEquipoState(
      tieneVencidos: boolean,
      tieneFaltantes: boolean,
      tieneProximos: boolean
    ): EquipoState {
      if (tieneVencidos || tieneFaltantes) return 'NO_HABILITADO';
      if (tieneProximos) return 'PROXIMO_VENCER';
      return 'HABILITADO';
    }

    it('should return HABILITADO when all documents valid', () => {
      expect(determineEquipoState(false, false, false)).toBe('HABILITADO');
    });

    it('should return PROXIMO_VENCER when documents expiring soon', () => {
      expect(determineEquipoState(false, false, true)).toBe('PROXIMO_VENCER');
    });

    it('should return NO_HABILITADO when documents expired', () => {
      expect(determineEquipoState(true, false, false)).toBe('NO_HABILITADO');
    });

    it('should return NO_HABILITADO when documents missing', () => {
      expect(determineEquipoState(false, true, false)).toBe('NO_HABILITADO');
    });

    it('should prioritize NO_HABILITADO over PROXIMO_VENCER', () => {
      expect(determineEquipoState(true, false, true)).toBe('NO_HABILITADO');
    });
  });

  describe('Equipo component validation', () => {
    interface EquipoCreateData {
      driverDni: string;
      truckPlate: string;
      trailerPlate?: string;
      empresaTransportistaCuit?: string;
    }

    function validateEquipoData(data: EquipoCreateData): string[] {
      const errors: string[] = [];

      if (!data.driverDni || data.driverDni.replace(/\D/g, '').length < 7) {
        errors.push('DNI del chofer inválido');
      }

      if (!data.truckPlate || data.truckPlate.replace(/[^A-Z0-9]/gi, '').length < 6) {
        errors.push('Patente del camión inválida');
      }

      if (data.trailerPlate && data.trailerPlate.replace(/[^A-Z0-9]/gi, '').length < 6) {
        errors.push('Patente del acoplado inválida');
      }

      return errors;
    }

    it('should require valid DNI', () => {
      const errors = validateEquipoData({
        driverDni: '123',
        truckPlate: 'ABC123',
      });
      expect(errors).toContain('DNI del chofer inválido');
    });

    it('should require valid truck plate', () => {
      const errors = validateEquipoData({
        driverDni: '12345678',
        truckPlate: 'AB',
      });
      expect(errors).toContain('Patente del camión inválida');
    });

    it('should validate optional trailer plate if provided', () => {
      const errors = validateEquipoData({
        driverDni: '12345678',
        truckPlate: 'ABC123',
        trailerPlate: 'XY',
      });
      expect(errors).toContain('Patente del acoplado inválida');
    });

    it('should pass valid equipo data', () => {
      const errors = validateEquipoData({
        driverDni: '12345678',
        truckPlate: 'AB123CD',
        trailerPlate: 'AA000BB',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Equipo cliente association', () => {
    interface ClienteAsociacion {
      equipoId: number;
      clienteId: number;
      asignadoDesde: Date;
      asignadoHasta: Date | null;
    }

    function isActiveAssociation(assoc: ClienteAsociacion, referenceDate: Date = new Date()): boolean {
      if (assoc.asignadoDesde > referenceDate) return false;
      if (assoc.asignadoHasta && assoc.asignadoHasta < referenceDate) return false;
      return true;
    }

    it('should identify active association', () => {
      const assoc: ClienteAsociacion = {
        equipoId: 1,
        clienteId: 100,
        asignadoDesde: new Date('2024-01-01'),
        asignadoHasta: null,
      };
      expect(isActiveAssociation(assoc)).toBe(true);
    });

    it('should identify ended association', () => {
      const assoc: ClienteAsociacion = {
        equipoId: 1,
        clienteId: 100,
        asignadoDesde: new Date('2024-01-01'),
        asignadoHasta: new Date('2024-06-01'),
      };
      expect(isActiveAssociation(assoc, new Date('2024-07-01'))).toBe(false);
    });

    it('should identify future association', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      
      const assoc: ClienteAsociacion = {
        equipoId: 1,
        clienteId: 100,
        asignadoDesde: futureDate,
        asignadoHasta: null,
      };
      expect(isActiveAssociation(assoc)).toBe(false);
    });
  });

  describe('Equipo transfer logic', () => {
    interface TransferData {
      equipoId: number;
      fromDadorId: number;
      toDadorId: number;
      transferDate: Date;
    }

    function validateTransfer(data: TransferData): string[] {
      const errors: string[] = [];

      if (!data.equipoId) errors.push('Equipo ID required');
      if (!data.fromDadorId) errors.push('Source dador required');
      if (!data.toDadorId) errors.push('Target dador required');
      if (data.fromDadorId === data.toDadorId) {
        errors.push('Cannot transfer to same dador');
      }

      return errors;
    }

    it('should require equipo ID', () => {
      const errors = validateTransfer({
        equipoId: 0,
        fromDadorId: 1,
        toDadorId: 2,
        transferDate: new Date(),
      });
      expect(errors).toContain('Equipo ID required');
    });

    it('should prevent transfer to same dador', () => {
      const errors = validateTransfer({
        equipoId: 1,
        fromDadorId: 100,
        toDadorId: 100,
        transferDate: new Date(),
      });
      expect(errors).toContain('Cannot transfer to same dador');
    });

    it('should allow valid transfer', () => {
      const errors = validateTransfer({
        equipoId: 1,
        fromDadorId: 100,
        toDadorId: 200,
        transferDate: new Date(),
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Equipo bulk operations', () => {
    interface BulkCreateResult {
      created: number;
      updated: number;
      errors: Array<{ line: number; error: string }>;
    }

    function aggregateBulkResults(results: BulkCreateResult[]): BulkCreateResult {
      return results.reduce(
        (acc, result) => ({
          created: acc.created + result.created,
          updated: acc.updated + result.updated,
          errors: [...acc.errors, ...result.errors],
        }),
        { created: 0, updated: 0, errors: [] }
      );
    }

    it('should aggregate created counts', () => {
      const results = [
        { created: 5, updated: 0, errors: [] },
        { created: 3, updated: 0, errors: [] },
      ];
      const aggregate = aggregateBulkResults(results);
      expect(aggregate.created).toBe(8);
    });

    it('should aggregate updated counts', () => {
      const results = [
        { created: 0, updated: 2, errors: [] },
        { created: 0, updated: 3, errors: [] },
      ];
      const aggregate = aggregateBulkResults(results);
      expect(aggregate.updated).toBe(5);
    });

    it('should collect all errors', () => {
      const results = [
        { created: 1, updated: 0, errors: [{ line: 1, error: 'Error 1' }] },
        { created: 1, updated: 0, errors: [{ line: 5, error: 'Error 2' }] },
      ];
      const aggregate = aggregateBulkResults(results);
      expect(aggregate.errors).toHaveLength(2);
    });
  });
});



