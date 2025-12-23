/**
 * Tests unitarios para ComplianceService
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mock database before importing
jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { ComplianceService } from '../../src/services/compliance.service';

describe('ComplianceService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    
    // Setup default mocks for all prisma models
    prismaMock.equipo.findUnique.mockResolvedValue(null);
    prismaMock.equipoCliente.findMany.mockResolvedValue([]);
    prismaMock.clienteRequisito.findMany.mockResolvedValue([]);
    prismaMock.clienteDocumentRequirement.findMany.mockResolvedValue([]);
    prismaMock.document.findMany.mockResolvedValue([]);
  });

  describe('evaluateEquipoCliente', () => {
    it('should return empty array if equipo not found', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue(null);

      const result = await ComplianceService.evaluateEquipoCliente(999, 1);

      expect(result).toEqual([]);
    });

    it('should return compliance requirements for valid equipo', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({
        id: 1,
        driverId: 1,
        truckId: 1,
        trailerId: null,
        empresaTransportistaId: 1,
        tenantEmpresaId: 1,
      });

      prismaMock.clienteDocumentRequirement.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoCliente(1, 1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('evaluateBatchEquiposCliente', () => {
    it('should handle empty equipos array', async () => {
      const result = await ComplianceService.evaluateBatchEquiposCliente([], 1);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should return compliance map for equipos with mocked data', async () => {
      const mockEquipos = [
        { id: 1, driverId: 1, truckId: 1, trailerId: null, empresaTransportistaId: 1, tenantEmpresaId: 1 },
      ];

      // Mock all necessary prisma calls
      prismaMock.equipoCliente.findMany.mockResolvedValue([
        { equipoId: 1, clienteId: 1 },
      ]);
      prismaMock.clienteDocumentRequirement.findMany.mockResolvedValue([]);
      prismaMock.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateBatchEquiposCliente(mockEquipos as any, 1);

      expect(result).toBeInstanceOf(Map);
    });
  });

  describe('evaluateEquipoClienteDetailed', () => {
    it('should return empty array if equipo not found', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue(null);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(999, 1);

      expect(result).toEqual([]);
    });

    it('should return detailed requirements for valid equipo', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({
        id: 1,
        driverId: 1,
        truckId: 1,
        trailerId: null,
        empresaTransportistaId: 1,
        tenantEmpresaId: 1,
      });

      prismaMock.clienteDocumentRequirement.findMany.mockResolvedValue([]);
      prismaMock.document.findMany.mockResolvedValue([]);

      const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
