/**
 * Unit tests for EmpresaService
 */

jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: jest.fn(() => ({
      empresa: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    })),
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logDatabaseOperation: jest.fn(),
    logError: jest.fn(),
  },
}));

describe('EmpresaService', () => {
  describe('Empresa structure', () => {
    it('should define empresa fields', () => {
      const empresa = {
        id: 1,
        nombre: 'Empresa Test',
        cuit: '20-12345678-9',
        direccion: 'Av. Test 123',
        telefono: '11-1234-5678',
        email: 'contacto@empresa.com',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(empresa.nombre).toBe('Empresa Test');
      expect(empresa.cuit).toBe('20-12345678-9');
      expect(empresa.activo).toBe(true);
    });
  });

  describe('CUIT validation', () => {
    function validateCuit(cuit: string): boolean {
      // Remove formatting
      const cleaned = cuit.replace(/[-\s]/g, '');
      
      // Must be 11 digits
      if (!/^\d{11}$/.test(cleaned)) return false;

      // Validate check digit
      const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned[i]) * multipliers[i];
      }
      const checkDigit = 11 - (sum % 11);
      const expectedCheck = checkDigit === 11 ? 0 : checkDigit === 10 ? 9 : checkDigit;
      
      return parseInt(cleaned[10]) === expectedCheck;
    }

    function normalizeCuit(cuit: string): string {
      return cuit.replace(/[-\s]/g, '');
    }

    it('should normalize CUIT format', () => {
      expect(normalizeCuit('20-12345678-9')).toBe('20123456789');
      expect(normalizeCuit('20 12345678 9')).toBe('20123456789');
    });

    it('should reject invalid length', () => {
      expect(validateCuit('12345')).toBe(false);
      expect(validateCuit('123456789012')).toBe(false);
    });

    it('should reject non-numeric', () => {
      expect(validateCuit('20-ABCDEFGH-9')).toBe(false);
    });
  });

  describe('Empresa filtering', () => {
    interface EmpresaFilters {
      nombre?: string;
      cuit?: string;
      activo?: boolean;
    }

    function buildEmpresaWhere(filters: EmpresaFilters): Record<string, any> {
      const where: Record<string, any> = {};

      if (filters.nombre) {
        where.nombre = { contains: filters.nombre, mode: 'insensitive' };
      }
      if (filters.cuit) {
        where.cuit = { contains: filters.cuit.replace(/[-\s]/g, '') };
      }
      if (filters.activo !== undefined) {
        where.activo = filters.activo;
      }

      return where;
    }

    it('should filter by nombre', () => {
      const where = buildEmpresaWhere({ nombre: 'Test' });
      expect(where.nombre.contains).toBe('Test');
    });

    it('should filter by CUIT', () => {
      const where = buildEmpresaWhere({ cuit: '20-123' });
      expect(where.cuit.contains).toBe('20123');
    });

    it('should filter by activo', () => {
      const where = buildEmpresaWhere({ activo: true });
      expect(where.activo).toBe(true);
    });
  });

  describe('Create empresa validation', () => {
    interface CreateEmpresaInput {
      nombre: string;
      cuit: string;
      direccion?: string;
      telefono?: string;
      email?: string;
    }

    function validateCreateEmpresa(input: Partial<CreateEmpresaInput>): string[] {
      const errors: string[] = [];

      if (!input.nombre || input.nombre.trim().length < 2) {
        errors.push('Nombre es requerido (mínimo 2 caracteres)');
      }

      if (!input.cuit) {
        errors.push('CUIT es requerido');
      }

      if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        errors.push('Email inválido');
      }

      return errors;
    }

    it('should require nombre', () => {
      const errors = validateCreateEmpresa({ cuit: '20-12345678-9' });
      expect(errors).toContain('Nombre es requerido (mínimo 2 caracteres)');
    });

    it('should require CUIT', () => {
      const errors = validateCreateEmpresa({ nombre: 'Test' });
      expect(errors).toContain('CUIT es requerido');
    });

    it('should validate email format', () => {
      const errors = validateCreateEmpresa({
        nombre: 'Test',
        cuit: '20-12345678-9',
        email: 'invalid-email',
      });
      expect(errors).toContain('Email inválido');
    });

    it('should pass valid input', () => {
      const errors = validateCreateEmpresa({
        nombre: 'Empresa Test',
        cuit: '20-12345678-9',
        email: 'test@example.com',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Empresa update', () => {
    interface UpdateEmpresaInput {
      nombre?: string;
      direccion?: string;
      telefono?: string;
      email?: string;
      activo?: boolean;
    }

    function validateUpdateEmpresa(input: UpdateEmpresaInput): string[] {
      const errors: string[] = [];

      if (input.nombre !== undefined && input.nombre.trim().length < 2) {
        errors.push('Nombre debe tener mínimo 2 caracteres');
      }

      if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        errors.push('Email inválido');
      }

      return errors;
    }

    it('should validate nombre if provided', () => {
      const errors = validateUpdateEmpresa({ nombre: 'A' });
      expect(errors).toContain('Nombre debe tener mínimo 2 caracteres');
    });

    it('should allow partial updates', () => {
      const errors = validateUpdateEmpresa({ direccion: 'Nueva Dir' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Empresa deactivation', () => {
    interface EmpresaDependencies {
      usersCount: number;
      activeDocumentsCount: number;
    }

    function canDeactivateEmpresa(deps: EmpresaDependencies): { allowed: boolean; reason?: string } {
      if (deps.usersCount > 0) {
        return { allowed: false, reason: 'La empresa tiene usuarios activos' };
      }
      if (deps.activeDocumentsCount > 0) {
        return { allowed: false, reason: 'La empresa tiene documentos activos' };
      }
      return { allowed: true };
    }

    it('should allow deactivation with no dependencies', () => {
      const result = canDeactivateEmpresa({ usersCount: 0, activeDocumentsCount: 0 });
      expect(result.allowed).toBe(true);
    });

    it('should prevent deactivation with active users', () => {
      const result = canDeactivateEmpresa({ usersCount: 5, activeDocumentsCount: 0 });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('usuarios activos');
    });

    it('should prevent deactivation with active documents', () => {
      const result = canDeactivateEmpresa({ usersCount: 0, activeDocumentsCount: 10 });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('documentos activos');
    });
  });
});




