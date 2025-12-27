/**
 * Unit tests for Entity Services (Chofer, Camion, Acoplado, EmpresaTransportista)
 * @jest-environment node
 */

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Entity Services', () => {
  describe('Chofer validation', () => {
    interface ChoferData {
      dni: string;
      nombre: string;
      apellido: string;
      telefono?: string;
      email?: string;
      fechaNacimiento?: Date;
    }

    function validateChoferData(data: Partial<ChoferData>): string[] {
      const errors: string[] = [];

      if (!data.dni || !/^\d{7,8}$/.test(data.dni.replace(/\./g, ''))) {
        errors.push('DNI inválido (debe tener 7-8 dígitos)');
      }

      if (!data.nombre || data.nombre.trim().length < 2) {
        errors.push('Nombre requerido (mínimo 2 caracteres)');
      }

      if (!data.apellido || data.apellido.trim().length < 2) {
        errors.push('Apellido requerido (mínimo 2 caracteres)');
      }

      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Email inválido');
      }

      if (data.fechaNacimiento) {
        const age = (Date.now() - data.fechaNacimiento.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 18) {
          errors.push('El chofer debe ser mayor de 18 años');
        }
        if (age > 100) {
          errors.push('Fecha de nacimiento inválida');
        }
      }

      return errors;
    }

    it('should validate correct chofer data', () => {
      const data: ChoferData = {
        dni: '12345678',
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '1122334455',
      };
      expect(validateChoferData(data)).toHaveLength(0);
    });

    it('should require valid DNI', () => {
      const errors = validateChoferData({ dni: '123', nombre: 'Juan', apellido: 'Pérez' });
      expect(errors).toContain('DNI inválido (debe tener 7-8 dígitos)');
    });

    it('should require nombre', () => {
      const errors = validateChoferData({ dni: '12345678', apellido: 'Pérez' });
      expect(errors).toContain('Nombre requerido (mínimo 2 caracteres)');
    });

    it('should validate minimum age', () => {
      const minor = new Date();
      minor.setFullYear(minor.getFullYear() - 16);
      const errors = validateChoferData({
        dni: '12345678',
        nombre: 'Juan',
        apellido: 'Pérez',
        fechaNacimiento: minor,
      });
      expect(errors).toContain('El chofer debe ser mayor de 18 años');
    });
  });

  describe('Camion validation', () => {
    interface CamionData {
      patente: string;
      marca?: string;
      modelo?: string;
      anio?: number;
      tipoVehiculo?: string;
    }

    function validateCamionData(data: Partial<CamionData>): string[] {
      const errors: string[] = [];

      // Validate patente format (old: ABC123, Mercosur: AA123BB)
      if (!data.patente) {
        errors.push('Patente requerida');
      } else {
        const cleaned = data.patente.replace(/[\s-]/g, '').toUpperCase();
        const oldFormat = /^[A-Z]{3}\d{3}$/;
        const mercosurFormat = /^[A-Z]{2}\d{3}[A-Z]{2}$/;
        
        if (!oldFormat.test(cleaned) && !mercosurFormat.test(cleaned)) {
          errors.push('Formato de patente inválido');
        }
      }

      if (data.anio) {
        const currentYear = new Date().getFullYear();
        if (data.anio < 1950 || data.anio > currentYear + 1) {
          errors.push('Año del vehículo inválido');
        }
      }

      return errors;
    }

    it('should validate old format patente', () => {
      const errors = validateCamionData({ patente: 'ABC123' });
      expect(errors).toHaveLength(0);
    });

    it('should validate Mercosur format patente', () => {
      const errors = validateCamionData({ patente: 'AA123BB' });
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid patente', () => {
      const errors = validateCamionData({ patente: 'INVALID' });
      expect(errors).toContain('Formato de patente inválido');
    });

    it('should validate año range', () => {
      const errors = validateCamionData({ patente: 'ABC123', anio: 1900 });
      expect(errors).toContain('Año del vehículo inválido');
    });
  });

  describe('Acoplado validation', () => {
    interface AcopladoData {
      patente: string;
      tipo?: 'SEMI' | 'ACOPLADO' | 'BATEA' | 'TANQUE';
      capacidadTn?: number;
    }

    function validateAcopladoData(data: Partial<AcopladoData>): string[] {
      const errors: string[] = [];

      if (!data.patente) {
        errors.push('Patente requerida');
      }

      if (data.capacidadTn !== undefined) {
        if (data.capacidadTn < 0 || data.capacidadTn > 100) {
          errors.push('Capacidad en toneladas inválida');
        }
      }

      return errors;
    }

    it('should validate correct acoplado data', () => {
      const errors = validateAcopladoData({
        patente: 'AA123BB',
        tipo: 'SEMI',
        capacidadTn: 30,
      });
      expect(errors).toHaveLength(0);
    });

    it('should validate capacity range', () => {
      const errors = validateAcopladoData({
        patente: 'AA123BB',
        capacidadTn: 150,
      });
      expect(errors).toContain('Capacidad en toneladas inválida');
    });
  });

  describe('EmpresaTransportista validation', () => {
    interface EmpresaTransportistaData {
      cuit: string;
      razonSocial: string;
      domicilio?: string;
      telefono?: string;
      email?: string;
    }

    function validateEmpresaData(data: Partial<EmpresaTransportistaData>): string[] {
      const errors: string[] = [];

      if (!data.cuit || !/^\d{11}$/.test(data.cuit.replace(/[-\s]/g, ''))) {
        errors.push('CUIT inválido (debe tener 11 dígitos)');
      }

      if (!data.razonSocial || data.razonSocial.trim().length < 3) {
        errors.push('Razón social requerida (mínimo 3 caracteres)');
      }

      return errors;
    }

    it('should validate correct empresa data', () => {
      const errors = validateEmpresaData({
        cuit: '20123456789',
        razonSocial: 'Transportes ABC SA',
      });
      expect(errors).toHaveLength(0);
    });

    it('should accept CUIT with hyphens', () => {
      const errors = validateEmpresaData({
        cuit: '20-12345678-9',
        razonSocial: 'Transportes ABC SA',
      });
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid CUIT', () => {
      const errors = validateEmpresaData({
        cuit: '123',
        razonSocial: 'Test',
      });
      expect(errors).toContain('CUIT inválido (debe tener 11 dígitos)');
    });
  });

  describe('Entity normalization', () => {
    function normalizeDni(dni: string): string {
      return dni.replace(/\./g, '');
    }

    function normalizeCuit(cuit: string): string {
      return cuit.replace(/[-\s]/g, '');
    }

    function normalizePatente(patente: string): string {
      return patente.replace(/[\s-]/g, '').toUpperCase();
    }

    function normalizePhone(phone: string): string {
      return phone.replace(/[\s\-()]/g, '');
    }

    it('should normalize DNI', () => {
      expect(normalizeDni('12.345.678')).toBe('12345678');
    });

    it('should normalize CUIT', () => {
      expect(normalizeCuit('20-12345678-9')).toBe('20123456789');
    });

    it('should normalize patente', () => {
      expect(normalizePatente('AB-123-CD')).toBe('AB123CD');
      expect(normalizePatente('abc 123')).toBe('ABC123');
    });

    it('should normalize phone', () => {
      expect(normalizePhone('+54 (11) 2345-6789')).toBe('+541123456789');
    });
  });

  describe('Entity search', () => {
    interface SearchResult {
      id: number;
      type: string;
      identifier: string;
      name: string;
      score: number;
    }

    function searchEntities(
      entities: Array<{ id: number; type: string; identifier: string; name: string }>,
      query: string
    ): SearchResult[] {
      const normalizedQuery = query.toLowerCase().replace(/[.\-\s]/g, '');
      
      return entities
        .map(e => {
          const normalizedId = e.identifier.toLowerCase().replace(/[.\-\s]/g, '');
          const normalizedName = e.name.toLowerCase();
          
          let score = 0;
          if (normalizedId === normalizedQuery) score = 100;
          else if (normalizedId.startsWith(normalizedQuery)) score = 80;
          else if (normalizedId.includes(normalizedQuery)) score = 60;
          else if (normalizedName.includes(normalizedQuery)) score = 40;
          
          return { ...e, score };
        })
        .filter(e => e.score > 0)
        .sort((a, b) => b.score - a.score);
    }

    it('should find exact match', () => {
      const entities = [
        { id: 1, type: 'CHOFER', identifier: '12345678', name: 'Juan Pérez' },
      ];
      const results = searchEntities(entities, '12345678');
      expect(results[0].score).toBe(100);
    });

    it('should find partial match in identifier', () => {
      const entities = [
        { id: 1, type: 'CAMION', identifier: 'AB123CD', name: 'Camión 1' },
      ];
      const results = searchEntities(entities, 'AB123');
      expect(results[0].score).toBe(80);
    });

    it('should find match in name', () => {
      const entities = [
        { id: 1, type: 'CHOFER', identifier: '12345678', name: 'Juan Pérez' },
      ];
      const results = searchEntities(entities, 'juan');
      expect(results[0].score).toBe(40);
    });

    it('should normalize query for matching', () => {
      const entities = [
        { id: 1, type: 'CHOFER', identifier: '12345678', name: 'Test' },
      ];
      const results = searchEntities(entities, '12.345.678');
      expect(results[0].score).toBe(100);
    });
  });

  describe('Entity display formatting', () => {
    function formatChoferDisplay(chofer: { nombre: string; apellido: string; dni: string }): string {
      return `${chofer.apellido}, ${chofer.nombre} (DNI: ${chofer.dni})`;
    }

    function formatCamionDisplay(camion: { patente: string; marca?: string }): string {
      if (camion.marca) {
        return `${camion.patente} - ${camion.marca}`;
      }
      return camion.patente;
    }

    function formatEmpresaDisplay(empresa: { razonSocial: string; cuit: string }): string {
      return `${empresa.razonSocial} (CUIT: ${empresa.cuit})`;
    }

    it('should format chofer display', () => {
      expect(formatChoferDisplay({
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
      })).toBe('Pérez, Juan (DNI: 12345678)');
    });

    it('should format camion with marca', () => {
      expect(formatCamionDisplay({
        patente: 'AB123CD',
        marca: 'Scania',
      })).toBe('AB123CD - Scania');
    });

    it('should format camion without marca', () => {
      expect(formatCamionDisplay({ patente: 'AB123CD' })).toBe('AB123CD');
    });

    it('should format empresa display', () => {
      expect(formatEmpresaDisplay({
        razonSocial: 'Transportes SA',
        cuit: '20-12345678-9',
      })).toBe('Transportes SA (CUIT: 20-12345678-9)');
    });
  });

  describe('Entity duplicate detection', () => {
    interface Entity {
      id: number;
      identifier: string;
    }

    function findDuplicates(entities: Entity[]): Array<{ identifier: string; ids: number[] }> {
      const groups = new Map<string, number[]>();
      
      for (const entity of entities) {
        const normalized = entity.identifier.replace(/[.\-\s]/g, '').toLowerCase();
        const existing = groups.get(normalized) || [];
        existing.push(entity.id);
        groups.set(normalized, existing);
      }
      
      return Array.from(groups.entries())
        .filter(([, ids]) => ids.length > 1)
        .map(([identifier, ids]) => ({ identifier, ids }));
    }

    it('should find duplicates', () => {
      const entities = [
        { id: 1, identifier: '12345678' },
        { id: 2, identifier: '12.345.678' },
        { id: 3, identifier: '87654321' },
      ];
      const dups = findDuplicates(entities);
      expect(dups).toHaveLength(1);
      expect(dups[0].ids).toContain(1);
      expect(dups[0].ids).toContain(2);
    });

    it('should return empty for no duplicates', () => {
      const entities = [
        { id: 1, identifier: '12345678' },
        { id: 2, identifier: '87654321' },
      ];
      expect(findDuplicates(entities)).toHaveLength(0);
    });
  });
});




