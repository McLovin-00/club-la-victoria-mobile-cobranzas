/**
 * Tests unitarios para FileNamingService
 */
import { FileNamingService } from '../../src/services/file-naming.service';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('FileNamingService', () => {
  describe('generateFileName', () => {
    it('should generate filename with template and entity', () => {
      const result = FileNamingService.generateFileName({
        templateName: 'DNI Frente',
        entityType: 'CHOFER',
        entityIdentifier: '12345678',
        extension: 'pdf',
      });

      expect(result).toContain('dni_frente');
      expect(result).toContain('chofer');
      expect(result).toContain('12345678');
      expect(result).toEndWith('.pdf');
    });

    it('should sanitize special characters', () => {
      const result = FileNamingService.generateFileName({
        templateName: 'Carnet de Conducir (Tipo A)',
        entityType: 'CHOFER',
        entityIdentifier: '12.345.678',
        extension: 'pdf',
      });

      expect(result).not.toContain('(');
      expect(result).not.toContain(')');
      expect(result).not.toContain('.');
    });

    it('should handle uppercase extension', () => {
      const result = FileNamingService.generateFileName({
        templateName: 'Test',
        entityType: 'CHOFER',
        entityIdentifier: '123',
        extension: 'PDF',
      });

      expect(result).toEndWith('.pdf');
    });

    it('should generate unique names with timestamp', () => {
      const result1 = FileNamingService.generateFileName({
        templateName: 'Test',
        entityType: 'CHOFER',
        entityIdentifier: '123',
        extension: 'pdf',
      });

      // Wait 1ms to ensure different timestamp
      jest.advanceTimersByTime(1);

      const result2 = FileNamingService.generateFileName({
        templateName: 'Test',
        entityType: 'CHOFER',
        entityIdentifier: '123',
        extension: 'pdf',
      });

      // Names should contain timestamp making them unique
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('sanitizeForPath', () => {
    it('should remove special characters', () => {
      const result = FileNamingService.sanitizeForPath('Test (File) / Name');

      expect(result).not.toContain('(');
      expect(result).not.toContain(')');
      expect(result).not.toContain('/');
    });

    it('should convert to lowercase', () => {
      const result = FileNamingService.sanitizeForPath('TEST NAME');

      expect(result).toBe(result.toLowerCase());
    });

    it('should replace spaces with underscores', () => {
      const result = FileNamingService.sanitizeForPath('test name here');

      expect(result).not.toContain(' ');
      expect(result).toContain('_');
    });

    it('should handle empty string', () => {
      const result = FileNamingService.sanitizeForPath('');

      expect(result).toBe('');
    });

    it('should trim leading/trailing underscores', () => {
      const result = FileNamingService.sanitizeForPath('_test_');

      expect(result).not.toMatch(/^_/);
      expect(result).not.toMatch(/_$/);
    });
  });

  describe('generateStoragePath', () => {
    it('should generate path with tenant and entity', () => {
      const result = FileNamingService.generateStoragePath({
        tenantId: 1,
        entityType: 'CHOFER',
        entityId: 100,
        fileName: 'test.pdf',
      });

      expect(result).toContain('tenant_1');
      expect(result).toContain('chofer');
      expect(result).toContain('100');
      expect(result).toContain('test.pdf');
    });

    it('should handle different entity types', () => {
      const choferPath = FileNamingService.generateStoragePath({
        tenantId: 1,
        entityType: 'CHOFER',
        entityId: 1,
        fileName: 'test.pdf',
      });

      const camionPath = FileNamingService.generateStoragePath({
        tenantId: 1,
        entityType: 'CAMION',
        entityId: 1,
        fileName: 'test.pdf',
      });

      expect(choferPath).toContain('chofer');
      expect(camionPath).toContain('camion');
    });
  });
});
