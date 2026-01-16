/**
 * Tests unitarios para FileNamingService
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

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
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('normalizeTemplateName', () => {
    it('normaliza nombre de plantilla (tildes, espacios y símbolos)', () => {
      const result = FileNamingService.normalizeTemplateName('Carnet de Conducir (Tipo A)');
      expect(result).toBe('carnet_de_conducir_tipo_a');
    });
  });

  describe('getExtension', () => {
    it('extrae extensión en minúsculas', () => {
      expect(FileNamingService.getExtension('Documento.PDF')).toBe('.pdf');
    });

    it('retorna vacío si no hay extensión', () => {
      expect(FileNamingService.getExtension('archivo')).toBe('');
    });
  });

  describe('generateStandardizedName', () => {
    it('genera nombre estandarizado para CHOFER usando DNI y plantilla normalizada', async () => {
      prismaMock.chofer.findUnique.mockResolvedValue({ dni: '12.345.678' });

      const result = await FileNamingService.generateStandardizedName('CHOFER' as any, 1, 'DNI Frente', 'pdf');

      expect(result).toBe('12345678_dni_frente.pdf');
    });

    it('fallback a prefijo por entidad si no encuentra identificador', async () => {
      prismaMock.camion.findUnique.mockResolvedValue(null);

      const result = await FileNamingService.generateStandardizedName('CAMION' as any, 99, 'RTO', '.pdf');

      expect(result).toBe('camion_99_rto.pdf');
    });
  });
});
