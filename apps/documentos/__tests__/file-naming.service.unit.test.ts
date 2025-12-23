/**
 * Unit tests for FileNamingService
 * @jest-environment node
 */

// Mock database and logger before imports
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

import { FileNamingService } from '../src/services/file-naming.service';
import { prisma } from '../src/config/database';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('FileNamingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeTemplateName', () => {
    it('should convert to lowercase', () => {
      expect(FileNamingService.normalizeTemplateName('LICENCIA')).toBe('licencia');
      expect(FileNamingService.normalizeTemplateName('VTV')).toBe('vtv');
    });

    it('should replace spaces with underscores', () => {
      expect(FileNamingService.normalizeTemplateName('Cédula Verde')).toBe('cedula_verde');
      expect(FileNamingService.normalizeTemplateName('Carnet de conducir')).toBe('carnet_de_conducir');
    });

    it('should remove accents and diacritics', () => {
      expect(FileNamingService.normalizeTemplateName('Póliza')).toBe('poliza');
      expect(FileNamingService.normalizeTemplateName('Cédula')).toBe('cedula');
      expect(FileNamingService.normalizeTemplateName('Habilitación')).toBe('habilitacion');
    });

    it('should remove special characters', () => {
      expect(FileNamingService.normalizeTemplateName('Test@#$%')).toBe('test');
      expect(FileNamingService.normalizeTemplateName('Test (1)')).toBe('test_1');
    });

    it('should collapse multiple underscores', () => {
      expect(FileNamingService.normalizeTemplateName('test   multiple   spaces')).toBe('test_multiple_spaces');
      expect(FileNamingService.normalizeTemplateName('test___underscores')).toBe('test_underscores');
    });

    it('should trim leading/trailing underscores', () => {
      expect(FileNamingService.normalizeTemplateName('_test_')).toBe('test');
      expect(FileNamingService.normalizeTemplateName('  test  ')).toBe('test');
    });

    it('should handle complex template names', () => {
      expect(FileNamingService.normalizeTemplateName('Licencia Nacional de Conducir Clase B')).toBe('licencia_nacional_de_conducir_clase_b');
      expect(FileNamingService.normalizeTemplateName('RUTA - Seguro Obligatorio (2024)')).toBe('ruta_seguro_obligatorio_2024');
    });
  });

  describe('normalizeCuit', () => {
    it('should extract only digits from CUIT', () => {
      expect(FileNamingService.normalizeCuit('20-12345678-9')).toBe('20123456789');
      expect(FileNamingService.normalizeCuit('20.12345678.9')).toBe('20123456789');
    });

    it('should handle already clean CUIT', () => {
      expect(FileNamingService.normalizeCuit('20123456789')).toBe('20123456789');
    });

    it('should handle CUIT with spaces', () => {
      expect(FileNamingService.normalizeCuit('20 12345678 9')).toBe('20123456789');
    });
  });

  describe('normalizeDni', () => {
    it('should extract only digits from DNI', () => {
      expect(FileNamingService.normalizeDni('12.345.678')).toBe('12345678');
      expect(FileNamingService.normalizeDni('12-345-678')).toBe('12345678');
    });

    it('should handle already clean DNI', () => {
      expect(FileNamingService.normalizeDni('12345678')).toBe('12345678');
    });

    it('should handle DNI with spaces', () => {
      expect(FileNamingService.normalizeDni('12 345 678')).toBe('12345678');
    });
  });

  describe('normalizePatente', () => {
    it('should convert to uppercase', () => {
      expect(FileNamingService.normalizePatente('abc123')).toBe('ABC123');
      expect(FileNamingService.normalizePatente('aa000bb')).toBe('AA000BB');
    });

    it('should remove non-alphanumeric characters', () => {
      expect(FileNamingService.normalizePatente('AB-123-CD')).toBe('AB123CD');
      expect(FileNamingService.normalizePatente('AB 123 CD')).toBe('AB123CD');
    });

    it('should handle old format plates', () => {
      expect(FileNamingService.normalizePatente('ABC-123')).toBe('ABC123');
      expect(FileNamingService.normalizePatente('abc 123')).toBe('ABC123');
    });

    it('should handle new format (Mercosur) plates', () => {
      expect(FileNamingService.normalizePatente('AA-000-BB')).toBe('AA000BB');
      expect(FileNamingService.normalizePatente('aa 000 bb')).toBe('AA000BB');
    });
  });

  describe('getExtension', () => {
    it('should extract file extension', () => {
      expect(FileNamingService.getExtension('document.pdf')).toBe('.pdf');
      expect(FileNamingService.getExtension('image.jpg')).toBe('.jpg');
      expect(FileNamingService.getExtension('file.png')).toBe('.png');
    });

    it('should convert extension to lowercase', () => {
      expect(FileNamingService.getExtension('DOCUMENT.PDF')).toBe('.pdf');
      expect(FileNamingService.getExtension('Image.JPG')).toBe('.jpg');
    });

    it('should handle multiple dots in filename', () => {
      expect(FileNamingService.getExtension('my.document.v2.pdf')).toBe('.pdf');
      expect(FileNamingService.getExtension('file.backup.tar.gz')).toBe('.gz');
    });

    it('should return empty string for files without extension', () => {
      expect(FileNamingService.getExtension('filename')).toBe('');
      expect(FileNamingService.getExtension('Makefile')).toBe('');
    });

    it('should return empty string for files ending with dot', () => {
      expect(FileNamingService.getExtension('filename.')).toBe('');
    });
  });

  describe('getEntityIdentifier', () => {
    describe('EMPRESA_TRANSPORTISTA', () => {
      it('should return normalized CUIT', async () => {
        (mockPrisma.empresaTransportista.findUnique as jest.Mock).mockResolvedValue({
          cuit: '20-12345678-9',
        });

        const result = await FileNamingService.getEntityIdentifier('EMPRESA_TRANSPORTISTA' as any, 1);

        expect(result).toBe('20123456789');
      });

      it('should return fallback when CUIT not found', async () => {
        (mockPrisma.empresaTransportista.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await FileNamingService.getEntityIdentifier('EMPRESA_TRANSPORTISTA' as any, 123);

        expect(result).toBe('empresa_123');
      });
    });

    describe('CHOFER', () => {
      it('should return normalized DNI', async () => {
        (mockPrisma.chofer.findUnique as jest.Mock).mockResolvedValue({
          dni: '12.345.678',
        });

        const result = await FileNamingService.getEntityIdentifier('CHOFER' as any, 1);

        expect(result).toBe('12345678');
      });

      it('should return fallback when DNI not found', async () => {
        (mockPrisma.chofer.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await FileNamingService.getEntityIdentifier('CHOFER' as any, 456);

        expect(result).toBe('chofer_456');
      });
    });

    describe('CAMION', () => {
      it('should return normalized patente', async () => {
        (mockPrisma.camion.findUnique as jest.Mock).mockResolvedValue({
          patente: 'AB-123-CD',
        });

        const result = await FileNamingService.getEntityIdentifier('CAMION' as any, 1);

        expect(result).toBe('AB123CD');
      });

      it('should return fallback when patente not found', async () => {
        (mockPrisma.camion.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await FileNamingService.getEntityIdentifier('CAMION' as any, 789);

        expect(result).toBe('camion_789');
      });
    });

    describe('ACOPLADO', () => {
      it('should return normalized patente', async () => {
        (mockPrisma.acoplado.findUnique as jest.Mock).mockResolvedValue({
          patente: 'aa-000-bb',
        });

        const result = await FileNamingService.getEntityIdentifier('ACOPLADO' as any, 1);

        expect(result).toBe('AA000BB');
      });
    });

    describe('Error handling', () => {
      it('should return fallback on database error', async () => {
        (mockPrisma.chofer.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const result = await FileNamingService.getEntityIdentifier('CHOFER' as any, 999);

        expect(result).toBe('chofer_999');
      });
    });
  });

  describe('generateStandardizedName', () => {
    it('should generate correct filename', async () => {
      (mockPrisma.chofer.findUnique as jest.Mock).mockResolvedValue({
        dni: '12345678',
      });

      const result = await FileNamingService.generateStandardizedName(
        'CHOFER' as any,
        1,
        'Licencia Nacional',
        '.pdf'
      );

      expect(result).toBe('12345678_licencia_nacional.pdf');
    });

    it('should handle extension without dot', async () => {
      (mockPrisma.camion.findUnique as jest.Mock).mockResolvedValue({
        patente: 'AB123CD',
      });

      const result = await FileNamingService.generateStandardizedName(
        'CAMION' as any,
        1,
        'VTV',
        'pdf'
      );

      expect(result).toBe('AB123CD_vtv.pdf');
    });
  });
});



