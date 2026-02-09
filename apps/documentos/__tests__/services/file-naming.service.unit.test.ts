const prismaMock = {
  empresaTransportista: { findUnique: jest.fn() },
  chofer: { findUnique: jest.fn() },
  camion: { findUnique: jest.fn() },
  acoplado: { findUnique: jest.fn() },
  dadorCarga: { findUnique: jest.fn() },
};

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { warn: jest.fn(), debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { FileNamingService } from '../../src/services/file-naming.service';

describe('FileNamingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeTemplateName', () => {
    it('convierte a minúsculas y reemplaza espacios con guiones bajos', () => {
      const result = FileNamingService.normalizeTemplateName('Licencia de Conducir');
      expect(result).toBe('licencia_de_conducir');
    });

    it('elimina tildes y caracteres especiales', () => {
      const result = FileNamingService.normalizeTemplateName('Seguróó del Camíón');
      expect(result).toBe('seguroo_del_camion');
    });

    it('colapsa múltiples guiones bajos en uno solo', () => {
      const result = FileNamingService.normalizeTemplateName('Seguro---Camión');
      expect(result).toBe('seguro_camion');
    });

    it('elimina guiones al inicio y al final', () => {
      const result = FileNamingService.normalizeTemplateName('__Seguro__');
      expect(result).toBe('seguro');
    });

    it('mantiene caracteres alfanuméricos', () => {
      const result = FileNamingService.normalizeTemplateName('Seguro123ABC');
      expect(result).toBe('seguro123abc');
    });

    it('maneja string vacío', () => {
      const result = FileNamingService.normalizeTemplateName('');
      expect(result).toBe('');
    });

    it('maneja solo caracteres especiales', () => {
      const result = FileNamingService.normalizeTemplateName('!!!@@@###');
      expect(result).toBe('');
    });
  });

  describe('normalizeCuit', () => {
    it('elimina caracteres no numéricos', () => {
      expect(FileNamingService.normalizeCuit('20-30405060-7')).toBe('20304050607');
      expect(FileNamingService.normalizeCuit('20.30405060.7')).toBe('20304050607');
    });

    it('retorna solo dígitos', () => {
      expect(FileNamingService.normalizeCuit('ABC123DEF456')).toBe('123456');
    });

    it('maneja string vacío', () => {
      expect(FileNamingService.normalizeCuit('')).toBe('');
    });
  });

  describe('normalizeDni', () => {
    it('elimina caracteres no numéricos', () => {
      expect(FileNamingService.normalizeDni('12.345.678')).toBe('12345678');
      expect(FileNamingService.normalizeDni('12-345-678')).toBe('12345678');
    });

    it('retorna solo dígitos', () => {
      expect(FileNamingService.normalizeDni('DNI: 12345678')).toBe('12345678');
    });
  });

  describe('normalizePatente', () => {
    it('convierte a mayúsculas y elimina caracteres especiales', () => {
      expect(FileNamingService.normalizePatente('aa-123-bb')).toBe('AA123BB');
      expect(FileNamingService.normalizePatente('abc 123')).toBe('ABC123');
    });

    it('maneja patente con formato mixto', () => {
      expect(FileNamingService.normalizePatente('AA-123-BB')).toBe('AA123BB');
    });
  });

  describe('getExtension', () => {
    it('extrae extensión de archivo', () => {
      expect(FileNamingService.getExtension('documento.pdf')).toBe('.pdf');
      expect(FileNamingService.getExtension('foto.jpg')).toBe('.jpg');
    });

    it('retorna vacío si no hay extensión', () => {
      expect(FileNamingService.getExtension('documento')).toBe('');
      expect(FileNamingService.getExtension('documento.')).toBe('');
    });

    it('retorna extensión en minúsculas', () => {
      expect(FileNamingService.getExtension('documento.PDF')).toBe('.pdf');
      expect(FileNamingService.getExtension('documento.JPG')).toBe('.jpg');
    });

    it('maneja múltiples puntos', () => {
      expect(FileNamingService.getExtension('documento.v2.pdf')).toBe('.pdf');
    });
  });

  describe('getEntityIdentifier', () => {
    it('retorna CUIT normalizado para EMPRESA_TRANSPORTISTA', async () => {
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({ cuit: '20-30405060-7' } as any);
      const result = await FileNamingService.getEntityIdentifier('EMPRESA_TRANSPORTISTA', 1);
      expect(result).toBe('20304050607');
    });

    it('retorna fallback para EMPRESA_TRANSPORTISTA sin CUIT', async () => {
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({ cuit: null } as any);
      const result = await FileNamingService.getEntityIdentifier('EMPRESA_TRANSPORTISTA', 1);
      expect(result).toBe('empresa_1');
    });

    it('retorna DNI normalizado para CHOFER', async () => {
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '12.345.678' } as any);
      const result = await FileNamingService.getEntityIdentifier('CHOFER', 1);
      expect(result).toBe('12345678');
    });

    it('retorna fallback para CHOFER sin DNI', async () => {
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: null } as any);
      const result = await FileNamingService.getEntityIdentifier('CHOFER', 1);
      expect(result).toBe('chofer_1');
    });

    it('retorna patente normalizada para CAMION', async () => {
      prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: 'AA-123-BB' } as any);
      const result = await FileNamingService.getEntityIdentifier('CAMION', 1);
      expect(result).toBe('AA123BB');
    });

    it('retorna fallback para CAMION sin patente', async () => {
      prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: null } as any);
      const result = await FileNamingService.getEntityIdentifier('CAMION', 1);
      expect(result).toBe('camion_1');
    });

    it('retorna patente normalizada para ACOPLADO', async () => {
      prismaMock.acoplado.findUnique.mockResolvedValueOnce({ patente: 'BB-456-CC' } as any);
      const result = await FileNamingService.getEntityIdentifier('ACOPLADO', 1);
      expect(result).toBe('BB456CC');
    });

    it('retorna fallback para ACOPLADO sin patente', async () => {
      prismaMock.acoplado.findUnique.mockResolvedValueOnce({ patente: null } as any);
      const result = await FileNamingService.getEntityIdentifier('ACOPLADO', 1);
      expect(result).toBe('acoplado_1');
    });

    it('retorna CUIT normalizado para DADOR', async () => {
      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({ cuit: '30-10203040-1' } as any);
      const result = await FileNamingService.getEntityIdentifier('DADOR', 1);
      expect(result).toBe('30102030401');
    });

    it('retorna fallback para DADOR sin CUIT', async () => {
      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({ cuit: null } as any);
      const result = await FileNamingService.getEntityIdentifier('DADOR', 1);
      expect(result).toBe('dador_1');
    });

    it('retorna fallback para entidad desconocida', async () => {
      const result = await FileNamingService.getEntityIdentifier('UNKNOWN' as any, 1);
      expect(result).toBe('unknown_1');
    });

    it('maneja errores de base de datos retornando fallback', async () => {
      prismaMock.chofer.findUnique.mockRejectedValueOnce(new Error('DB Error'));
      const result = await FileNamingService.getEntityIdentifier('CHOFER', 1);
      expect(result).toBe('chofer_1');
    });
  });

  describe('generateStandardizedName', () => {
    it('genera nombre completo con identificador y template', async () => {
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '12345678' } as any);
      const result = await FileNamingService.generateStandardizedName('CHOFER', 1, 'Licencia de Conducir', 'pdf');
      expect(result).toBe('12345678_licencia_de_conducir.pdf');
    });

    it('agrega punto si la extensión no tiene uno', async () => {
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '12345678' } as any);
      const result = await FileNamingService.generateStandardizedName('CHOFER', 1, 'Licencia', 'pdf');
      expect(result).toBe('12345678_licencia.pdf');
    });

    it('maneja extensión con punto', async () => {
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '12345678' } as any);
      const result = await FileNamingService.generateStandardizedName('CHOFER', 1, 'Licencia', '.pdf');
      expect(result).toBe('12345678_licencia.pdf');
    });

    it('funciona con CAMION', async () => {
      prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: 'AA123BB' } as any);
      const result = await FileNamingService.generateStandardizedName('CAMION', 1, 'Seguro', '.jpg');
      expect(result).toBe('AA123BB_seguro.jpg');
    });

    it('funciona con ACOPLADO', async () => {
      prismaMock.acoplado.findUnique.mockResolvedValueOnce({ patente: 'CC456DD' } as any);
      const result = await FileNamingService.generateStandardizedName('ACOPLADO', 1, 'Seguro', '.jpg');
      expect(result).toBe('CC456DD_seguro.jpg');
    });

    it('funciona con EMPRESA_TRANSPORTISTA', async () => {
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({ cuit: '20304050607' } as any);
      const result = await FileNamingService.generateStandardizedName('EMPRESA_TRANSPORTISTA', 1, 'Poliza', '.pdf');
      expect(result).toBe('20304050607_poliza.pdf');
    });

    it('funciona con DADOR', async () => {
      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({ cuit: '30102030401' } as any);
      const result = await FileNamingService.generateStandardizedName('DADOR', 1, 'Contrato', '.pdf');
      expect(result).toBe('30102030401_contrato.pdf');
    });
  });
});
