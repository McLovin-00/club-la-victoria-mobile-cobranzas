/**
 * Tests unitarios para EquipoEstadoService
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

import { EquipoEstadoService } from '../../src/services/equipo-estado.service';

describe('EquipoEstadoService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('calculateEquipoEstado', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const soonDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days

    it('should return VIGENTE for all valid documents', async () => {
      const mockDocuments = [
        { id: 1, status: 'APPROVED', expiresAt: futureDate },
        { id: 2, status: 'APPROVED', expiresAt: futureDate },
      ];

      const result = await EquipoEstadoService.calculateEquipoEstado(mockDocuments as any);

      expect(result).toBe('VIGENTE');
    });

    it('should return VENCIDO for expired documents', async () => {
      const mockDocuments = [
        { id: 1, status: 'APPROVED', expiresAt: pastDate },
      ];

      const result = await EquipoEstadoService.calculateEquipoEstado(mockDocuments as any);

      expect(result).toBe('VENCIDO');
    });

    it('should return POR_VENCER for documents expiring soon', async () => {
      const mockDocuments = [
        { id: 1, status: 'APPROVED', expiresAt: soonDate },
      ];

      const result = await EquipoEstadoService.calculateEquipoEstado(mockDocuments as any);

      expect(result).toBe('POR_VENCER');
    });

    it('should return INCOMPLETO for missing required documents', async () => {
      const mockDocuments: any[] = [];

      const result = await EquipoEstadoService.calculateEquipoEstado(mockDocuments, { 
        requiredTemplateIds: [1, 2, 3] 
      });

      expect(result).toBe('INCOMPLETO');
    });

    it('should return PENDIENTE for pending review documents', async () => {
      const mockDocuments = [
        { id: 1, status: 'PENDING', expiresAt: futureDate },
      ];

      const result = await EquipoEstadoService.calculateEquipoEstado(mockDocuments as any);

      expect(result).toBe('PENDIENTE');
    });

    it('should return RECHAZADO for rejected documents', async () => {
      const mockDocuments = [
        { id: 1, status: 'REJECTED', expiresAt: futureDate },
      ];

      const result = await EquipoEstadoService.calculateEquipoEstado(mockDocuments as any);

      expect(result).toBe('RECHAZADO');
    });

    it('should handle empty documents array', async () => {
      const result = await EquipoEstadoService.calculateEquipoEstado([]);

      expect(result).toBe('INCOMPLETO');
    });
  });

  describe('getEstadoColor', () => {
    it('should return green for VIGENTE', () => {
      const result = EquipoEstadoService.getEstadoColor('VIGENTE');
      expect(result).toBe('#22c55e');
    });

    it('should return yellow for POR_VENCER', () => {
      const result = EquipoEstadoService.getEstadoColor('POR_VENCER');
      expect(result).toBe('#eab308');
    });

    it('should return red for VENCIDO', () => {
      const result = EquipoEstadoService.getEstadoColor('VENCIDO');
      expect(result).toBe('#ef4444');
    });

    it('should return orange for PENDIENTE', () => {
      const result = EquipoEstadoService.getEstadoColor('PENDIENTE');
      expect(result).toBe('#f97316');
    });

    it('should return gray for unknown status', () => {
      const result = EquipoEstadoService.getEstadoColor('UNKNOWN' as any);
      expect(result).toBe('#9ca3af');
    });
  });
});



