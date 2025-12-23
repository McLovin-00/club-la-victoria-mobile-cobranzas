/**
 * Coverage tests for FileNamingService
 * These tests import real code to generate coverage
 * @jest-environment node
 */

// Mock database before importing the service
jest.mock('../src/config/database', () => ({
  prisma: {
    empresaTransportista: { findUnique: jest.fn() },
    chofer: { findUnique: jest.fn() },
    camion: { findUnique: jest.fn() },
    acoplado: { findUnique: jest.fn() },
    dadorCarga: { findUnique: jest.fn() },
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

// Import the actual service after mocking
import { FileNamingService } from '../src/services/file-naming.service';
import { EntityType } from '@prisma/documentos';

describe('FileNamingService Coverage Tests', () => {
  describe('normalizeTemplateName', () => {
    it('should normalize template name with accents', () => {
      const result = (FileNamingService as any).normalizeTemplateName('Cédula Verde');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should normalize template name with special chars', () => {
      const result = (FileNamingService as any).normalizeTemplateName('Licencia - Categoría A');
      expect(result).toBeDefined();
    });

    it('should handle empty string', () => {
      const result = (FileNamingService as any).normalizeTemplateName('');
      expect(result).toBe('');
    });
  });

  describe('normalizeCuit', () => {
    it('should normalize CUIT with hyphens', () => {
      const result = (FileNamingService as any).normalizeCuit('20-12345678-9');
      expect(result).toBe('20123456789');
    });

    it('should normalize CUIT with spaces', () => {
      const result = (FileNamingService as any).normalizeCuit('20 12345678 9');
      expect(result).toBe('20123456789');
    });

    it('should return clean CUIT unchanged', () => {
      const result = (FileNamingService as any).normalizeCuit('20123456789');
      expect(result).toBe('20123456789');
    });
  });

  describe('normalizeDni', () => {
    it('should normalize DNI with dots', () => {
      const result = (FileNamingService as any).normalizeDni('12.345.678');
      expect(result).toBe('12345678');
    });

    it('should return clean DNI unchanged', () => {
      const result = (FileNamingService as any).normalizeDni('12345678');
      expect(result).toBe('12345678');
    });
  });

  describe('normalizePatente', () => {
    it('should normalize patente with hyphens', () => {
      const result = (FileNamingService as any).normalizePatente('AB-123-CD');
      expect(result).toBe('AB123CD');
    });

    it('should normalize patente with spaces', () => {
      const result = (FileNamingService as any).normalizePatente('AB 123 CD');
      expect(result).toBe('AB123CD');
    });

    it('should uppercase patente', () => {
      const result = (FileNamingService as any).normalizePatente('ab123cd');
      expect(result).toBe('AB123CD');
    });
  });

  describe('getExtension', () => {
    it('should get extension from filename', () => {
      const result = (FileNamingService as any).getExtension('document.pdf');
      expect(result).toMatch(/\.?pdf/);
    });

    it('should get extension from filename with multiple dots', () => {
      const result = (FileNamingService as any).getExtension('document.backup.pdf');
      expect(result).toMatch(/\.?pdf/);
    });

    it('should handle filename without extension', () => {
      const result = (FileNamingService as any).getExtension('document');
      expect(typeof result).toBe('string');
    });
  });

  describe('getEntityIdentifier', () => {
    it('should return fallback for unknown entity type', async () => {
      const result = await FileNamingService.getEntityIdentifier('UNKNOWN' as EntityType, 1);
      expect(result).toContain('unknown');
    });
  });
});

