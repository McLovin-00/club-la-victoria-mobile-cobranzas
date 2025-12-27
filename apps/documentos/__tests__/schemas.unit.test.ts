/**
 * Unit tests for Validation Schemas
 * @jest-environment node
 */

import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('Document Upload Schema', () => {
    const DocumentUploadSchema = z.object({
      templateId: z.number().int().positive(),
      entityType: z.enum(['CHOFER', 'CAMION', 'ACOPLADO', 'EMPRESA_TRANSPORTISTA', 'DADOR']),
      entityId: z.number().int().positive(),
      expiresAt: z.string().datetime().optional().nullable(),
      comments: z.string().max(500).optional(),
    });

    it('should validate correct upload data', () => {
      const data = {
        templateId: 1,
        entityType: 'CHOFER',
        entityId: 100,
      };
      const result = DocumentUploadSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require templateId', () => {
      const data = {
        entityType: 'CHOFER',
        entityId: 100,
      };
      const result = DocumentUploadSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require valid entityType', () => {
      const data = {
        templateId: 1,
        entityType: 'INVALID',
        entityId: 100,
      };
      const result = DocumentUploadSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject negative entityId', () => {
      const data = {
        templateId: 1,
        entityType: 'CHOFER',
        entityId: -1,
      };
      const result = DocumentUploadSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept optional expiresAt', () => {
      const data = {
        templateId: 1,
        entityType: 'CAMION',
        entityId: 100,
        expiresAt: '2025-12-31T23:59:59.999Z',
      };
      const result = DocumentUploadSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should limit comments length', () => {
      const data = {
        templateId: 1,
        entityType: 'CHOFER',
        entityId: 100,
        comments: 'a'.repeat(501),
      };
      const result = DocumentUploadSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Template Create Schema', () => {
    const TemplateCreateSchema = z.object({
      name: z.string().min(3).max(100),
      entityType: z.enum(['CHOFER', 'CAMION', 'ACOPLADO', 'EMPRESA_TRANSPORTISTA', 'DADOR']),
      expirationDays: z.number().int().min(1).max(3650).optional().nullable(),
      isObligatorio: z.boolean().default(false),
      diasAnticipacion: z.number().int().min(0).max(365).default(30),
      description: z.string().max(500).optional(),
    });

    it('should validate correct template data', () => {
      const data = {
        name: 'Licencia de Conducir',
        entityType: 'CHOFER',
        expirationDays: 365,
        isObligatorio: true,
      };
      const result = TemplateCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require minimum name length', () => {
      const data = {
        name: 'AB',
        entityType: 'CHOFER',
      };
      const result = TemplateCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should limit expirationDays', () => {
      const data = {
        name: 'Test Template',
        entityType: 'CHOFER',
        expirationDays: 5000,
      };
      const result = TemplateCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should set defaults', () => {
      const data = {
        name: 'Test Template',
        entityType: 'CAMION',
      };
      const result = TemplateCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isObligatorio).toBe(false);
        expect(result.data.diasAnticipacion).toBe(30);
      }
    });
  });

  describe('Equipo Create Schema', () => {
    const EquipoCreateSchema = z.object({
      dadorCargaId: z.number().int().positive(),
      choferDni: z.string().regex(/^\d{7,8}$/, 'DNI debe tener 7-8 dígitos'),
      camionPatente: z.string().regex(/^[A-Z]{2,3}\d{3}[A-Z]{0,2}$/i, 'Patente inválida'),
      acopladoPatente: z.string().regex(/^[A-Z]{2,3}\d{3}[A-Z]{0,2}$/i, 'Patente inválida').optional(),
      empresaTransportistaCuit: z.string().regex(/^\d{11}$/, 'CUIT debe tener 11 dígitos').optional(),
      externalId: z.string().max(50).optional(),
    });

    it('should validate correct equipo data', () => {
      const data = {
        dadorCargaId: 1,
        choferDni: '12345678',
        camionPatente: 'AB123CD',
      };
      const result = EquipoCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate DNI format', () => {
      const invalidData = {
        dadorCargaId: 1,
        choferDni: '123',
        camionPatente: 'AB123CD',
      };
      const result = EquipoCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate old plate format', () => {
      const data = {
        dadorCargaId: 1,
        choferDni: '12345678',
        camionPatente: 'ABC123',
      };
      const result = EquipoCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate Mercosur plate format', () => {
      const data = {
        dadorCargaId: 1,
        choferDni: '12345678',
        camionPatente: 'AA123BB',
      };
      const result = EquipoCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow optional acoplado', () => {
      const data = {
        dadorCargaId: 1,
        choferDni: '12345678',
        camionPatente: 'AB123CD',
        acopladoPatente: 'XY789ZZ',
      };
      const result = EquipoCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Pagination Schema', () => {
    const PaginationSchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    });

    it('should set defaults', () => {
      const result = PaginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should coerce string numbers', () => {
      const result = PaginationSchema.safeParse({ page: '5', limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject page < 1', () => {
      const result = PaginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit > 100', () => {
      const result = PaginationSchema.safeParse({ limit: 200 });
      expect(result.success).toBe(false);
    });
  });

  describe('Date Range Schema', () => {
    const DateRangeSchema = z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
    }).refine(
      (data) => data.endDate >= data.startDate,
      { message: 'End date must be after start date' }
    );

    it('should validate correct date range', () => {
      const data = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      const result = DateRangeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid range', () => {
      const data = {
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      };
      const result = DateRangeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept same date', () => {
      const data = {
        startDate: '2024-06-15',
        endDate: '2024-06-15',
      };
      const result = DateRangeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Email Schema', () => {
    const EmailSchema = z.string().email().toLowerCase();

    it('should validate correct email', () => {
      expect(EmailSchema.safeParse('test@example.com').success).toBe(true);
    });

    it('should lowercase email', () => {
      const result = EmailSchema.safeParse('TEST@EXAMPLE.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should reject invalid email', () => {
      expect(EmailSchema.safeParse('not-an-email').success).toBe(false);
      expect(EmailSchema.safeParse('missing@domain').success).toBe(false);
    });
  });

  describe('Phone Schema', () => {
    const PhoneSchema = z.string()
      .regex(/^[\d\s\-+()]+$/, 'Invalid phone format')
      .min(8)
      .max(20)
      .transform(val => val.replace(/[\s\-()]/g, ''));

    it('should validate and clean phone', () => {
      const result = PhoneSchema.safeParse('+54 11 2345-6789');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('+541123456789');
      }
    });

    it('should reject too short', () => {
      expect(PhoneSchema.safeParse('12345').success).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(PhoneSchema.safeParse('abc123').success).toBe(false);
    });
  });

  describe('Approval Decision Schema', () => {
    const ApprovalDecisionSchema = z.object({
      documentId: z.number().int().positive(),
      decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
      comments: z.string().min(1).max(1000).optional(),
      expiresAt: z.string().datetime().optional(),
    }).refine(
      (data) => data.decision !== 'REJECT' || (data.comments && data.comments.length > 0),
      { message: 'Comments are required when rejecting' }
    );

    it('should validate approval without comments', () => {
      const data = {
        documentId: 1,
        decision: 'APPROVE',
      };
      const result = ApprovalDecisionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require comments for rejection', () => {
      const data = {
        documentId: 1,
        decision: 'REJECT',
      };
      const result = ApprovalDecisionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept rejection with comments', () => {
      const data = {
        documentId: 1,
        decision: 'REJECT',
        comments: 'Document is not legible',
      };
      const result = ApprovalDecisionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow optional expiry date', () => {
      const data = {
        documentId: 1,
        decision: 'APPROVE',
        expiresAt: '2025-12-31T23:59:59.999Z',
      };
      const result = ApprovalDecisionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Bulk Upload Schema', () => {
    const BulkUploadItemSchema = z.object({
      templateId: z.number().int().positive(),
      entityType: z.enum(['CHOFER', 'CAMION', 'ACOPLADO', 'EMPRESA_TRANSPORTISTA', 'DADOR']),
      entityIdentifier: z.string().min(1), // DNI, Patente, or CUIT
    });

    const BulkUploadSchema = z.object({
      items: z.array(BulkUploadItemSchema).min(1).max(100),
    });

    it('should validate bulk upload', () => {
      const data = {
        items: [
          { templateId: 1, entityType: 'CHOFER', entityIdentifier: '12345678' },
          { templateId: 2, entityType: 'CAMION', entityIdentifier: 'AB123CD' },
        ],
      };
      const result = BulkUploadSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require at least one item', () => {
      const data = { items: [] };
      const result = BulkUploadSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should limit to 100 items', () => {
      const items = Array(101).fill({
        templateId: 1,
        entityType: 'CHOFER',
        entityIdentifier: '12345678',
      });
      const result = BulkUploadSchema.safeParse({ items });
      expect(result.success).toBe(false);
    });
  });
});




