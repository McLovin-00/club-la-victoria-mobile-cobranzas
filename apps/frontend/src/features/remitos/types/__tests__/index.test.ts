import { describe, it, expect } from '@jest/globals';
import { RemitoEstado, ESTADO_LABELS, ESTADO_COLORS, RemitoStats, RemitoImagen } from '../index';

describe('remitos types - Constants', () => {
  // ============================================================================
  // TASK 1: ESTADO_LABELS
  // ============================================================================
  describe('ESTADO_LABELS', () => {
    const allEstados: RemitoEstado[] = [
      'PENDIENTE_ANALISIS',
      'EN_ANALISIS',
      'PENDIENTE_APROBACION',
      'APROBADO',
      'RECHAZADO',
      'ERROR_ANALISIS',
    ];

    it('tiene todas las claves de RemitoEstado', () => {
      allEstados.forEach(estado => {
        expect(ESTADO_LABELS).toHaveProperty(estado);
      });
    });

    it('cada valor es un string no vacío', () => {
      Object.values(ESTADO_LABELS).forEach(label => {
        expect(typeof label).toBe('string');
        expect(label.trim().length).toBeGreaterThan(0);
      });
    });

    it('tiene los labels esperados para cada estado', () => {
      expect(ESTADO_LABELS.PENDIENTE_ANALISIS).toBe('Pendiente de Análisis');
      expect(ESTADO_LABELS.EN_ANALISIS).toBe('En Análisis');
      expect(ESTADO_LABELS.PENDIENTE_APROBACION).toBe('Pendiente Aprobación');
      expect(ESTADO_LABELS.APROBADO).toBe('Aprobado');
      expect(ESTADO_LABELS.RECHAZADO).toBe('Rechazado');
      expect(ESTADO_LABELS.ERROR_ANALISIS).toBe('Error en Análisis');
    });

    it('tipo es Record<RemitoEstado, string>', () => {
      const labels: Record<RemitoEstado, string> = ESTADO_LABELS;
      expect(labels).toBeDefined();
    });

    it('no tiene claves extra fuera de RemitoEstado', () => {
      const labelKeys = Object.keys(ESTADO_LABELS) as RemitoEstado[];
      const extras = labelKeys.filter(key => !allEstados.includes(key));
      expect(extras).toHaveLength(0);
    });
  });

  // ============================================================================
  // TASK 2: ESTADO_COLORS
  // ============================================================================
  describe('ESTADO_COLORS', () => {
    const allEstados: RemitoEstado[] = [
      'PENDIENTE_ANALISIS',
      'EN_ANALISIS',
      'PENDIENTE_APROBACION',
      'APROBADO',
      'RECHAZADO',
      'ERROR_ANALISIS',
    ];

    it('tiene todas las claves de RemitoEstado', () => {
      allEstados.forEach(estado => {
        expect(ESTADO_COLORS).toHaveProperty(estado);
      });
    });

    it('cada valor es un string con clases Tailwind', () => {
      Object.values(ESTADO_COLORS).forEach(colorClass => {
        expect(typeof colorClass).toBe('string');
        expect(colorClass.trim().length).toBeGreaterThan(0);
      });
    });

    it('clases de color siguen el patrón bg-{color}-100 text-{color}-700', () => {
      Object.values(ESTADO_COLORS).forEach(colorClass => {
        expect(colorClass).toMatch(/^bg-\w+-100\s+text-\w+-700$/);
      });
    });

    it('tiene colores específicos por estado', () => {
      expect(ESTADO_COLORS.PENDIENTE_ANALISIS).toBe('bg-gray-100 text-gray-700');
      expect(ESTADO_COLORS.EN_ANALISIS).toBe('bg-blue-100 text-blue-700');
      expect(ESTADO_COLORS.PENDIENTE_APROBACION).toBe('bg-yellow-100 text-yellow-700');
      expect(ESTADO_COLORS.APROBADO).toBe('bg-green-100 text-green-700');
      expect(ESTADO_COLORS.RECHAZADO).toBe('bg-red-100 text-red-700');
      expect(ESTADO_COLORS.ERROR_ANALISIS).toBe('bg-red-100 text-red-700');
    });

    it('RECHAZADO y ERROR_ANALISIS comparten el mismo color rojo', () => {
      expect(ESTADO_COLORS.RECHAZADO).toBe(ESTADO_COLORS.ERROR_ANALISIS);
    });

    it('tipo es Record<RemitoEstado, string>', () => {
      const colors: Record<RemitoEstado, string> = ESTADO_COLORS;
      expect(colors).toBeDefined();
    });

    it('no tiene claves extra fuera de RemitoEstado', () => {
      const colorKeys = Object.keys(ESTADO_COLORS) as RemitoEstado[];
      const extras = colorKeys.filter(key => !allEstados.includes(key));
      expect(extras).toHaveLength(0);
    });
  });

  // ============================================================================
  // Tipos e Interfaces - Verificación de estructura
  // ============================================================================
  describe('RemitoEstado type', () => {
    it('es un union type de strings literales', () => {
      const estado1: RemitoEstado = 'PENDIENTE_ANALISIS';
      const estado2: RemitoEstado = 'EN_ANALISIS';
      const estado3: RemitoEstado = 'PENDIENTE_APROBACION';
      const estado4: RemitoEstado = 'APROBADO';
      const estado5: RemitoEstado = 'RECHAZADO';
      const estado6: RemitoEstado = 'ERROR_ANALISIS';

      expect(estado1).toBe('PENDIENTE_ANALISIS');
      expect(estado2).toBe('EN_ANALISIS');
      expect(estado3).toBe('PENDIENTE_APROBACION');
      expect(estado4).toBe('APROBADO');
      expect(estado5).toBe('RECHAZADO');
      expect(estado6).toBe('ERROR_ANALISIS');
    });

    it('no acepta valores arbitrarios', () => {
      // @ts-expect-error - Tipo inválido
      const invalid: RemitoEstado = 'INVALID_STATE';
      expect(invalid).toBe('INVALID_STATE');
    });
  });

  describe('RemitoStats interface', () => {
    it('permite crear objeto con todas las propiedades numéricas', () => {
      const stats: RemitoStats = {
        total: 100,
        pendientes: 20,
        aprobados: 70,
        rechazados: 10,
      };

      expect(typeof stats.total).toBe('number');
      expect(typeof stats.pendientes).toBe('number');
      expect(typeof stats.aprobados).toBe('number');
      expect(typeof stats.rechazados).toBe('number');
    });

    it('total es la suma de pendientes + aprobados + rechazados', () => {
      const stats: RemitoStats = {
        total: 100,
        pendientes: 20,
        aprobados: 70,
        rechazados: 10,
      };

      expect(stats.total).toBe(stats.pendientes + stats.aprobados + stats.rechazados);
    });
  });

  describe('RemitoImagen interface', () => {
    it('permite crear objeto con todas las propiedades', () => {
      const imagen: RemitoImagen = {
        id: 1,
        remitoId: 100,
        bucketName: 'test-bucket',
        objectKey: 'path/to/image.jpg',
        fileName: 'image.jpg',
        mimeType: 'image/jpeg',
        size: 12345,
        tipo: 'REMITO_PRINCIPAL',
        orden: 0,
        procesadoPorIA: true,
        createdAt: '2024-01-01T00:00:00Z',
        url: 'https://example.com/image.jpg',
      };

      expect(imagen.id).toBe(1);
      expect(imagen.tipo).toBe('REMITO_PRINCIPAL');
      expect(imagen.procesadoPorIA).toBe(true);
    });

    it('tipo acepta los cuatro valores válidos', () => {
      const tipos: RemitoImagen['tipo'][] = [
        'REMITO_PRINCIPAL',
        'REMITO_REVERSO',
        'TICKET_DESTINO',
        'ADICIONAL',
      ];

      expect(tipos).toHaveLength(4);
      expect(tipos).toContain('REMITO_PRINCIPAL');
      expect(tipos).toContain('REMITO_REVERSO');
      expect(tipos).toContain('TICKET_DESTINO');
      expect(tipos).toContain('ADICIONAL');
    });

    it('url es opcional', () => {
      const imagen: RemitoImagen = {
        id: 1,
        remitoId: 100,
        bucketName: 'test-bucket',
        objectKey: 'path/to/image.jpg',
        fileName: 'image.jpg',
        mimeType: 'image/jpeg',
        size: 12345,
        tipo: 'REMITO_PRINCIPAL',
        orden: 0,
        procesadoPorIA: true,
        createdAt: '2024-01-01T00:00:00Z',
        // url no incluida
      };

      expect(imagen.url).toBeUndefined();
    });
  });

  // ============================================================================
  // Consistencia entre ESTADO_LABELS y ESTADO_COLORS
  // ============================================================================
  describe('consistencia entre constantes de estado', () => {
    it('ESTADO_LABELS y ESTADO_COLORS tienen las mismas claves', () => {
      const labelKeys = Object.keys(ESTADO_LABELS).sort();
      const colorKeys = Object.keys(ESTADO_COLORS).sort();

      expect(labelKeys).toEqual(colorKeys);
    });

    it('cantidad de estados es 6', () => {
      expect(Object.keys(ESTADO_LABELS)).toHaveLength(6);
      expect(Object.keys(ESTADO_COLORS)).toHaveLength(6);
    });
  });
});
