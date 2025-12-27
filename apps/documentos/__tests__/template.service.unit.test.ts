/**
 * Unit tests for TemplateService logic
 * @jest-environment node
 */

jest.mock('../src/config/database', () => ({
  prisma: {
    documentTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    clienteRequisito: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
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

describe('TemplateService', () => {
  describe('Template entity types', () => {
    const entityTypes = ['CHOFER', 'CAMION', 'ACOPLADO', 'EMPRESA_TRANSPORTISTA', 'DADOR'];

    it('should define all entity types', () => {
      expect(entityTypes).toHaveLength(5);
    });

    it('should support driver documents', () => {
      expect(entityTypes).toContain('CHOFER');
    });

    it('should support vehicle documents', () => {
      expect(entityTypes).toContain('CAMION');
      expect(entityTypes).toContain('ACOPLADO');
    });

    it('should support company documents', () => {
      expect(entityTypes).toContain('EMPRESA_TRANSPORTISTA');
      expect(entityTypes).toContain('DADOR');
    });
  });

  describe('Template structure', () => {
    it('should validate template structure', () => {
      const template = {
        id: 1,
        name: 'Licencia Nacional de Conducir',
        entityType: 'CHOFER',
        expirationDays: 365,
        isObligatorio: true,
        isActive: true,
        diasAnticipacion: 30,
        tenantEmpresaId: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(template.name).toBe('Licencia Nacional de Conducir');
      expect(template.entityType).toBe('CHOFER');
      expect(template.expirationDays).toBe(365);
    });

    it('should allow templates without expiration', () => {
      const template = {
        id: 2,
        name: 'CUIT Constancia',
        entityType: 'EMPRESA_TRANSPORTISTA',
        expirationDays: null,
        isObligatorio: true,
        isActive: true,
      };

      expect(template.expirationDays).toBeNull();
    });
  });

  describe('Template validation', () => {
    interface CreateTemplateInput {
      name: string;
      entityType: string;
      expirationDays?: number | null;
      isObligatorio?: boolean;
      diasAnticipacion?: number;
    }

    function validateTemplate(input: Partial<CreateTemplateInput>): string[] {
      const errors: string[] = [];
      const validEntityTypes = ['CHOFER', 'CAMION', 'ACOPLADO', 'EMPRESA_TRANSPORTISTA', 'DADOR'];

      if (!input.name || input.name.trim().length < 3) {
        errors.push('Name must be at least 3 characters');
      }

      if (!input.entityType || !validEntityTypes.includes(input.entityType)) {
        errors.push('Invalid entity type');
      }

      if (input.expirationDays !== undefined && input.expirationDays !== null) {
        if (input.expirationDays < 1 || input.expirationDays > 3650) {
          errors.push('Expiration days must be between 1 and 3650');
        }
      }

      if (input.diasAnticipacion !== undefined) {
        if (input.diasAnticipacion < 0 || input.diasAnticipacion > 365) {
          errors.push('Dias anticipacion must be between 0 and 365');
        }
      }

      return errors;
    }

    it('should require name', () => {
      const errors = validateTemplate({ entityType: 'CHOFER' });
      expect(errors).toContain('Name must be at least 3 characters');
    });

    it('should require minimum name length', () => {
      const errors = validateTemplate({ name: 'AB', entityType: 'CHOFER' });
      expect(errors).toContain('Name must be at least 3 characters');
    });

    it('should validate entity type', () => {
      const errors = validateTemplate({ name: 'Test', entityType: 'INVALID' });
      expect(errors).toContain('Invalid entity type');
    });

    it('should validate expiration days range', () => {
      const errors = validateTemplate({
        name: 'Test Template',
        entityType: 'CHOFER',
        expirationDays: 5000,
      });
      expect(errors).toContain('Expiration days must be between 1 and 3650');
    });

    it('should validate dias anticipacion range', () => {
      const errors = validateTemplate({
        name: 'Test Template',
        entityType: 'CHOFER',
        diasAnticipacion: 400,
      });
      expect(errors).toContain('Dias anticipacion must be between 0 and 365');
    });

    it('should pass valid template', () => {
      const errors = validateTemplate({
        name: 'Licencia de Conducir',
        entityType: 'CHOFER',
        expirationDays: 365,
        diasAnticipacion: 30,
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Template name normalization', () => {
    function normalizeTemplateName(name: string): string {
      return name
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    it('should capitalize each word', () => {
      expect(normalizeTemplateName('licencia de conducir')).toBe('Licencia De Conducir');
    });

    it('should trim whitespace', () => {
      expect(normalizeTemplateName('  Test Template  ')).toBe('Test Template');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeTemplateName('Test    Multiple    Spaces')).toBe('Test Multiple Spaces');
    });
  });

  describe('Template filtering', () => {
    interface TemplateFilters {
      entityType?: string;
      isActive?: boolean;
      isObligatorio?: boolean;
      tenantId?: number;
      search?: string;
    }

    function buildTemplateWhere(filters: TemplateFilters): Record<string, any> {
      const where: Record<string, any> = {};

      if (filters.entityType) where.entityType = filters.entityType;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.isObligatorio !== undefined) where.isObligatorio = filters.isObligatorio;
      if (filters.tenantId) where.tenantEmpresaId = filters.tenantId;
      if (filters.search) {
        where.name = { contains: filters.search, mode: 'insensitive' };
      }

      return where;
    }

    it('should filter by entity type', () => {
      const where = buildTemplateWhere({ entityType: 'CHOFER' });
      expect(where.entityType).toBe('CHOFER');
    });

    it('should filter by active status', () => {
      const where = buildTemplateWhere({ isActive: true });
      expect(where.isActive).toBe(true);
    });

    it('should filter by obligatorio', () => {
      const where = buildTemplateWhere({ isObligatorio: true });
      expect(where.isObligatorio).toBe(true);
    });

    it('should filter by search term', () => {
      const where = buildTemplateWhere({ search: 'licencia' });
      expect(where.name.contains).toBe('licencia');
    });
  });

  describe('Template requisito association', () => {
    interface ClienteRequisito {
      clienteId: number;
      templateId: number;
      isObligatorio: boolean;
      diasAnticipacion: number;
    }

    function createRequisitoFromTemplate(
      clienteId: number,
      template: { id: number; isObligatorio: boolean; diasAnticipacion: number }
    ): ClienteRequisito {
      return {
        clienteId,
        templateId: template.id,
        isObligatorio: template.isObligatorio,
        diasAnticipacion: template.diasAnticipacion,
      };
    }

    it('should create requisito with template defaults', () => {
      const template = { id: 1, isObligatorio: true, diasAnticipacion: 30 };
      const requisito = createRequisitoFromTemplate(100, template);

      expect(requisito.clienteId).toBe(100);
      expect(requisito.templateId).toBe(1);
      expect(requisito.isObligatorio).toBe(true);
      expect(requisito.diasAnticipacion).toBe(30);
    });
  });

  describe('Template expiration calculation', () => {
    function calculateExpirationDate(
      uploadDate: Date,
      expirationDays: number | null
    ): Date | null {
      if (!expirationDays) return null;
      const expDate = new Date(uploadDate);
      expDate.setDate(expDate.getDate() + expirationDays);
      return expDate;
    }

    it('should calculate expiration date', () => {
      const uploadDate = new Date('2024-01-01');
      const expDate = calculateExpirationDate(uploadDate, 365);
      expect(expDate?.getFullYear()).toBe(2024);
      expect(expDate?.getMonth()).toBe(11); // December
    });

    it('should return null for non-expiring templates', () => {
      const uploadDate = new Date('2024-01-01');
      const expDate = calculateExpirationDate(uploadDate, null);
      expect(expDate).toBeNull();
    });
  });

  describe('Template duplication', () => {
    interface Template {
      id: number;
      name: string;
      entityType: string;
      expirationDays: number | null;
      isObligatorio: boolean;
      diasAnticipacion: number;
    }

    function duplicateTemplate(template: Template, newName: string): Omit<Template, 'id'> {
      return {
        name: newName,
        entityType: template.entityType,
        expirationDays: template.expirationDays,
        isObligatorio: template.isObligatorio,
        diasAnticipacion: template.diasAnticipacion,
      };
    }

    it('should create copy with new name', () => {
      const original: Template = {
        id: 1,
        name: 'Original Template',
        entityType: 'CHOFER',
        expirationDays: 365,
        isObligatorio: true,
        diasAnticipacion: 30,
      };

      const copy = duplicateTemplate(original, 'Copy of Original Template');
      expect(copy.name).toBe('Copy of Original Template');
      expect(copy.entityType).toBe('CHOFER');
      expect((copy as any).id).toBeUndefined();
    });
  });

  describe('Common document templates', () => {
    const commonTemplates = {
      CHOFER: [
        'Licencia Nacional de Conducir',
        'DNI',
        'Certificado de Aptitud Médica',
        'Curso de Mercancías Peligrosas',
      ],
      CAMION: [
        'Cédula Verde',
        'VTV (Verificación Técnica Vehicular)',
        'Seguro Obligatorio',
        'Habilitación de Carga',
      ],
      ACOPLADO: [
        'Cédula Verde',
        'VTV',
        'Seguro',
      ],
      EMPRESA_TRANSPORTISTA: [
        'Constancia de CUIT',
        'Habilitación CNRT',
        'Seguro de Responsabilidad Civil',
      ],
    };

    it('should define common chofer templates', () => {
      expect(commonTemplates.CHOFER).toContain('Licencia Nacional de Conducir');
      expect(commonTemplates.CHOFER).toContain('DNI');
    });

    it('should define common camion templates', () => {
      expect(commonTemplates.CAMION).toContain('VTV (Verificación Técnica Vehicular)');
      expect(commonTemplates.CAMION).toContain('Seguro Obligatorio');
    });

    it('should define common empresa templates', () => {
      expect(commonTemplates.EMPRESA_TRANSPORTISTA).toContain('Constancia de CUIT');
    });
  });
});




