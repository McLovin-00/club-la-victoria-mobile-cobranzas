/**
 * Tests comprehensivos para mockApiResponses.ts
 * 
 * Verifica la estructura y valores de los datos mock.
 */
import { describe, it, expect } from '@jest/globals';
import { mockDadores, mockChoferes, mockTemplates } from '../mockApiResponses';

describe('mockApiResponses', () => {
  describe('mockDadores', () => {
    it('es un array', () => {
      expect(Array.isArray(mockDadores)).toBe(true);
    });

    it('tiene al menos un elemento', () => {
      expect(mockDadores.length).toBeGreaterThan(0);
    });

    it('cada dador tiene id numérico', () => {
      mockDadores.forEach((dador) => {
        expect(typeof dador.id).toBe('number');
      });
    });

    it('cada dador tiene razonSocial string', () => {
      mockDadores.forEach((dador) => {
        expect(typeof dador.razonSocial).toBe('string');
        expect(dador.razonSocial.length).toBeGreaterThan(0);
      });
    });

    it('cada dador tiene cuit string', () => {
      mockDadores.forEach((dador) => {
        expect(typeof dador.cuit).toBe('string');
        expect(dador.cuit.length).toBeGreaterThan(0);
      });
    });

    it('cada dador tiene activo boolean', () => {
      mockDadores.forEach((dador) => {
        expect(typeof dador.activo).toBe('boolean');
      });
    });

    it('primer dador tiene valores esperados', () => {
      const dador = mockDadores[0];
      expect(dador.id).toBe(1);
      expect(dador.razonSocial).toBe('Dador X');
      expect(dador.cuit).toBe('20-12345678-9');
      expect(dador.activo).toBe(true);
    });
  });

  describe('mockChoferes', () => {
    it('es un array', () => {
      expect(Array.isArray(mockChoferes)).toBe(true);
    });

    it('tiene al menos un elemento', () => {
      expect(mockChoferes.length).toBeGreaterThan(0);
    });

    it('cada chofer tiene id numérico', () => {
      mockChoferes.forEach((chofer) => {
        expect(typeof chofer.id).toBe('number');
      });
    });

    it('cada chofer tiene empresaId numérico', () => {
      mockChoferes.forEach((chofer) => {
        expect(typeof chofer.empresaId).toBe('number');
      });
    });

    it('cada chofer tiene dni string', () => {
      mockChoferes.forEach((chofer) => {
        expect(typeof chofer.dni).toBe('string');
        expect(chofer.dni.length).toBeGreaterThan(0);
      });
    });

    it('cada chofer tiene activo boolean', () => {
      mockChoferes.forEach((chofer) => {
        expect(typeof chofer.activo).toBe('boolean');
      });
    });

    it('primer chofer tiene valores esperados', () => {
      const chofer = mockChoferes[0];
      expect(chofer.id).toBe(1);
      expect(chofer.empresaId).toBe(1);
      expect(chofer.dni).toBe('12345678');
      expect(chofer.activo).toBe(true);
    });
  });

  describe('mockTemplates', () => {
    it('es un array', () => {
      expect(Array.isArray(mockTemplates)).toBe(true);
    });

    it('tiene al menos un elemento', () => {
      expect(mockTemplates.length).toBeGreaterThan(0);
    });

    it('cada template tiene id numérico', () => {
      mockTemplates.forEach((template) => {
        expect(typeof template.id).toBe('number');
      });
    });

    it('cada template tiene nombre string', () => {
      mockTemplates.forEach((template) => {
        expect(typeof template.nombre).toBe('string');
        expect(template.nombre.length).toBeGreaterThan(0);
      });
    });

    it('cada template tiene entityType string', () => {
      mockTemplates.forEach((template) => {
        expect(typeof template.entityType).toBe('string');
        expect(template.entityType.length).toBeGreaterThan(0);
      });
    });

    it('cada template tiene isActive boolean', () => {
      mockTemplates.forEach((template) => {
        expect(typeof template.isActive).toBe('boolean');
      });
    });

    it('primer template tiene valores esperados', () => {
      const template = mockTemplates[0];
      expect(template.id).toBe(1);
      expect(template.nombre).toBe('Licencia');
      expect(template.entityType).toBe('CHOFER');
      expect(template.isActive).toBe(true);
    });

    it('entityType es un tipo válido de entidad', () => {
      const validEntityTypes = ['CHOFER', 'CAMION', 'ACOPLADO', 'EMPRESA_TRANSPORTISTA', 'DADOR'];
      mockTemplates.forEach((template) => {
        expect(validEntityTypes).toContain(template.entityType);
      });
    });
  });

  describe('Uso en tests', () => {
    it('mockDadores puede usarse como respuesta de API', () => {
      // Simular respuesta de API
      const apiResponse = { list: mockDadores };
      
      expect(apiResponse.list).toEqual(mockDadores);
      expect(apiResponse.list[0].razonSocial).toBe('Dador X');
    });

    it('mockChoferes puede filtrarse por empresaId', () => {
      const choferesDeEmpresa1 = mockChoferes.filter((c) => c.empresaId === 1);
      
      expect(choferesDeEmpresa1.length).toBeGreaterThan(0);
    });

    it('mockTemplates puede filtrarse por entityType', () => {
      const templatesDeChofer = mockTemplates.filter((t) => t.entityType === 'CHOFER');
      
      expect(templatesDeChofer.length).toBeGreaterThan(0);
    });

    it('mockDadores puede usarse para testing de forms', () => {
      const formData = {
        dadorId: mockDadores[0].id,
        razonSocial: mockDadores[0].razonSocial,
      };
      
      expect(formData.dadorId).toBe(1);
      expect(formData.razonSocial).toBe('Dador X');
    });
  });
});

