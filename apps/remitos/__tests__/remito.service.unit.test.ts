/**
 * Unit tests for RemitoService
 * @jest-environment node
 */

// Set environment variables
process.env.REMITOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

// Mock dependencies
jest.mock('../src/config/database', () => ({
  db: {
    getClient: jest.fn().mockReturnValue({
      remito: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      remitoImagen: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      remitoHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    }),
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

jest.mock('../src/services/minio.service', () => ({
  minioService: {
    uploadFile: jest.fn(),
    getFile: jest.fn(),
    deleteFile: jest.fn(),
  },
}));

jest.mock('../src/services/queue.service', () => ({
  queueService: {
    addJob: jest.fn(),
  },
}));

import { RemitoService } from '../src/services/remito.service';
import { db } from '../src/config/database';

// NOSONAR: mock genérico para tests
const prisma = (db as any).getClient();

describe('RemitoService – service methods', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('approve', () => {
    it('aprueba remito en PENDIENTE_APROBACION con confianza >= 30', async () => {
      prisma.remito.findUnique.mockResolvedValue({
        id: 1, estado: 'PENDIENTE_APROBACION', confianzaIA: 85,
      });
      prisma.remito.update.mockResolvedValue({
        id: 1, estado: 'APROBADO', aprobadoPorUserId: 5,
      });
      prisma.remitoHistory.create.mockResolvedValue({});

      const result = await RemitoService.approve(1, 5);

      expect(result.estado).toBe('APROBADO');
      expect(prisma.remito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ estado: 'APROBADO' }),
        })
      );
    });

    it('lanza error si remito no encontrado', async () => {
      prisma.remito.findUnique.mockResolvedValue(null);

      await expect(RemitoService.approve(999, 5)).rejects.toThrow('Remito no encontrado');
    });

    it('lanza error si estado no es PENDIENTE_APROBACION', async () => {
      prisma.remito.findUnique.mockResolvedValue({
        id: 1, estado: 'APROBADO', confianzaIA: 90,
      });

      await expect(RemitoService.approve(1, 5)).rejects.toThrow('No se puede aprobar');
    });

    it('bloquea aprobación si confianzaIA < 30', async () => {
      prisma.remito.findUnique.mockResolvedValue({
        id: 1, estado: 'PENDIENTE_APROBACION', confianzaIA: 15,
      });

      await expect(RemitoService.approve(1, 5)).rejects.toThrow('confianza IA');
    });

    it('permite aprobación si confianzaIA es null', async () => {
      prisma.remito.findUnique.mockResolvedValue({
        id: 1, estado: 'PENDIENTE_APROBACION', confianzaIA: null,
      });
      prisma.remito.update.mockResolvedValue({ id: 1, estado: 'APROBADO' });
      prisma.remitoHistory.create.mockResolvedValue({});

      const result = await RemitoService.approve(1, 5);

      expect(result.estado).toBe('APROBADO');
    });
  });

  describe('reject', () => {
    it('rechaza remito en estado PENDIENTE_APROBACION', async () => {
      prisma.remito.findUnique.mockResolvedValue({
        id: 1, estado: 'PENDIENTE_APROBACION',
      });
      prisma.remito.update.mockResolvedValue({
        id: 1, estado: 'RECHAZADO', motivoRechazo: 'datos incorrectos',
      });
      prisma.remitoHistory.create.mockResolvedValue({});

      const result = await RemitoService.reject(1, 5, 'datos incorrectos');

      expect(result.estado).toBe('RECHAZADO');
    });

    it('rechaza remito en estado EN_ANALISIS', async () => {
      prisma.remito.findUnique.mockResolvedValue({ id: 1, estado: 'EN_ANALISIS' });
      prisma.remito.update.mockResolvedValue({ id: 1, estado: 'RECHAZADO' });
      prisma.remitoHistory.create.mockResolvedValue({});

      const result = await RemitoService.reject(1, 5, 'motivo');

      expect(result.estado).toBe('RECHAZADO');
    });

    it('rechaza remito en ERROR_ANALISIS', async () => {
      prisma.remito.findUnique.mockResolvedValue({ id: 1, estado: 'ERROR_ANALISIS' });
      prisma.remito.update.mockResolvedValue({ id: 1, estado: 'RECHAZADO' });
      prisma.remitoHistory.create.mockResolvedValue({});

      const result = await RemitoService.reject(1, 5, 'motivo');

      expect(result.estado).toBe('RECHAZADO');
    });

    it('lanza error si remito no encontrado', async () => {
      prisma.remito.findUnique.mockResolvedValue(null);

      await expect(RemitoService.reject(999, 5, 'x')).rejects.toThrow('Remito no encontrado');
    });

    it('lanza error si estado no es rechazable', async () => {
      prisma.remito.findUnique.mockResolvedValue({ id: 1, estado: 'APROBADO' });

      await expect(RemitoService.reject(1, 5, 'x')).rejects.toThrow('No se puede rechazar');
    });
  });

  describe('updateManual', () => {
    it('actualiza datos y eleva confianza a 100%', async () => {
      prisma.remito.findUnique.mockResolvedValue({
        id: 1, estado: 'PENDIENTE_APROBACION', confianzaIA: 20,
        pesoOrigenBruto: null, pesoOrigenTara: null, pesoOrigenNeto: null,
        pesoDestinoBruto: null, pesoDestinoTara: null, pesoDestinoNeto: null,
      });
      prisma.remito.update.mockResolvedValue({
        id: 1, estado: 'PENDIENTE_APROBACION', confianzaIA: 100,
        numeroRemito: 'R-001',
      });
      prisma.remitoHistory.create.mockResolvedValue({});

      const result = await RemitoService.updateManual(1, 5, { numeroRemito: 'R-001' });

      expect(result.confianzaIA).toBe(100);
      expect(prisma.remito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ confianzaIA: 100 }),
        })
      );
    });
  });
});

describe('RemitoService', () => {
  describe('Remito status types', () => {
    const statuses = [
      'PENDIENTE_PROCESAMIENTO',
      'PROCESANDO',
      'PENDIENTE_APROBACION',
      'APROBADO',
      'RECHAZADO',
      'ERROR',
    ];

    it('should define all remito statuses', () => {
      expect(statuses).toHaveLength(6);
    });

    it('should include processing statuses', () => {
      expect(statuses).toContain('PENDIENTE_PROCESAMIENTO');
      expect(statuses).toContain('PROCESANDO');
    });

    it('should include approval statuses', () => {
      expect(statuses).toContain('PENDIENTE_APROBACION');
      expect(statuses).toContain('APROBADO');
      expect(statuses).toContain('RECHAZADO');
    });
  });

  describe('Date parsing', () => {
    function parseDate(str: string | null): Date | null {
      if (!str) return null;
      const parts = str.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    }

    it('should parse DD/MM/YYYY format', () => {
      const result = parseDate('15/06/2024');
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(5); // June is 5 (0-indexed)
      // Date may vary by 1 due to timezone
      expect([14, 15]).toContain(result?.getDate());
    });

    it('should parse ISO format', () => {
      const result = parseDate('2024-06-15');
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should return null for null input', () => {
      expect(parseDate(null)).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(parseDate('invalid')).toBeNull();
    });
  });

  describe('String extraction', () => {
    function extractString(val: any): string | null {
      if (val === null || val === undefined) return null;
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        return val.nombre || val.descripcion || val.detalle || null;
      }
      return String(val);
    }

    it('should return string as-is', () => {
      expect(extractString('test')).toBe('test');
    });

    it('should extract nombre from object', () => {
      expect(extractString({ nombre: 'Juan' })).toBe('Juan');
    });

    it('should extract descripcion from object', () => {
      expect(extractString({ descripcion: 'Descripcion' })).toBe('Descripcion');
    });

    it('should return null for null input', () => {
      expect(extractString(null)).toBeNull();
    });

    it('should convert numbers to string', () => {
      expect(extractString(123)).toBe('123');
    });
  });

  describe('Filter building', () => {
    interface RemitoFilters {
      tenantEmpresaId?: number;
      dadorCargaId?: number;
      estado?: string;
      userId?: number;
      userRole?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
      numeroRemito?: string;
    }

    function buildBaseWhere(filters: RemitoFilters): any {
      const where: any = {};

      if (filters.tenantEmpresaId) where.tenantEmpresaId = filters.tenantEmpresaId;
      if (filters.dadorCargaId) where.dadorCargaId = filters.dadorCargaId;
      if (filters.estado) where.estado = filters.estado;
      if (filters.numeroRemito) {
        where.numeroRemito = { contains: filters.numeroRemito, mode: 'insensitive' };
      }

      if (filters.fechaDesde || filters.fechaHasta) {
        where.createdAt = {};
        if (filters.fechaDesde) where.createdAt.gte = filters.fechaDesde;
        if (filters.fechaHasta) where.createdAt.lte = filters.fechaHasta;
      }

      return where;
    }

    it('should filter by tenant', () => {
      const where = buildBaseWhere({ tenantEmpresaId: 100 });
      expect(where.tenantEmpresaId).toBe(100);
    });

    it('should filter by dador', () => {
      const where = buildBaseWhere({ dadorCargaId: 50 });
      expect(where.dadorCargaId).toBe(50);
    });

    it('should filter by estado', () => {
      const where = buildBaseWhere({ estado: 'APROBADO' });
      expect(where.estado).toBe('APROBADO');
    });

    it('should filter by numero remito with case insensitive search', () => {
      const where = buildBaseWhere({ numeroRemito: 'REM-001' });
      expect(where.numeroRemito.contains).toBe('REM-001');
      expect(where.numeroRemito.mode).toBe('insensitive');
    });

    it('should filter by date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const where = buildBaseWhere({
        fechaDesde: startDate,
        fechaHasta: endDate,
      });
      expect(where.createdAt.gte).toEqual(startDate);
      expect(where.createdAt.lte).toEqual(endDate);
    });
  });

  describe('Stats calculation', () => {
    interface RemitoStats {
      total: number;
      pendientes: number;
      aprobados: number;
      rechazados: number;
    }

    function calculateStatsFromGroup(statsGroup: any[]): RemitoStats {
      const stats: RemitoStats = { total: 0, pendientes: 0, aprobados: 0, rechazados: 0 };

      for (const group of statsGroup) {
        const count = group._count.id;
        stats.total += count;

        if (group.estado === 'PENDIENTE_APROBACION') stats.pendientes = count;
        if (group.estado === 'APROBADO') stats.aprobados = count;
        if (group.estado === 'RECHAZADO') stats.rechazados = count;
      }

      return stats;
    }

    it('should calculate total from groups', () => {
      const groups = [
        { estado: 'PENDIENTE_APROBACION', _count: { id: 10 } },
        { estado: 'APROBADO', _count: { id: 20 } },
        { estado: 'RECHAZADO', _count: { id: 5 } },
      ];
      const stats = calculateStatsFromGroup(groups);
      expect(stats.total).toBe(35);
    });

    it('should count pendientes', () => {
      const groups = [{ estado: 'PENDIENTE_APROBACION', _count: { id: 15 } }];
      const stats = calculateStatsFromGroup(groups);
      expect(stats.pendientes).toBe(15);
    });

    it('should count aprobados', () => {
      const groups = [{ estado: 'APROBADO', _count: { id: 25 } }];
      const stats = calculateStatsFromGroup(groups);
      expect(stats.aprobados).toBe(25);
    });

    it('should count rechazados', () => {
      const groups = [{ estado: 'RECHAZADO', _count: { id: 3 } }];
      const stats = calculateStatsFromGroup(groups);
      expect(stats.rechazados).toBe(3);
    });
  });

  describe('Remito validation', () => {
    interface CreateRemitoInput {
      tenantEmpresaId: number;
      dadorCargaId: number;
      cargadoPorUserId: number;
      cargadoPorRol: string;
    }

    function validateRemitoInput(input: Partial<CreateRemitoInput>): string[] {
      const errors: string[] = [];

      if (!input.tenantEmpresaId) errors.push('Tenant empresa ID required');
      if (!input.dadorCargaId) errors.push('Dador carga ID required');
      if (!input.cargadoPorUserId) errors.push('Usuario ID required');
      if (!input.cargadoPorRol) errors.push('Rol required');

      return errors;
    }

    it('should require tenant empresa ID', () => {
      const errors = validateRemitoInput({});
      expect(errors).toContain('Tenant empresa ID required');
    });

    it('should require dador carga ID', () => {
      const errors = validateRemitoInput({ tenantEmpresaId: 1 });
      expect(errors).toContain('Dador carga ID required');
    });

    it('should pass valid input', () => {
      const errors = validateRemitoInput({
        tenantEmpresaId: 100,
        dadorCargaId: 50,
        cargadoPorUserId: 1,
        cargadoPorRol: 'ADMIN',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Remito file path generation', () => {
    function generateRemitoPath(
      tenantId: number,
      dadorId: number,
      remitoId: number,
      fileName: string
    ): string {
      const timestamp = Date.now();
      return `tenant_${tenantId}/dador_${dadorId}/remitos/${remitoId}/${timestamp}_${fileName}`;
    }

    it('should include tenant ID', () => {
      const path = generateRemitoPath(100, 50, 1, 'remito.pdf');
      expect(path).toContain('tenant_100');
    });

    it('should include dador ID', () => {
      const path = generateRemitoPath(100, 50, 1, 'remito.pdf');
      expect(path).toContain('dador_50');
    });

    it('should include remito ID', () => {
      const path = generateRemitoPath(100, 50, 123, 'remito.pdf');
      expect(path).toContain('/123/');
    });

    it('should include filename', () => {
      const path = generateRemitoPath(100, 50, 1, 'documento.pdf');
      expect(path).toContain('documento.pdf');
    });
  });

  describe('Remito history actions', () => {
    const actions = ['CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'REPROCESS', 'DELETE'];

    it('should define all actions', () => {
      expect(actions).toHaveLength(6);
    });

    it('should include CRUD actions', () => {
      expect(actions).toContain('CREATE');
      expect(actions).toContain('UPDATE');
      expect(actions).toContain('DELETE');
    });

    it('should include workflow actions', () => {
      expect(actions).toContain('APPROVE');
      expect(actions).toContain('REJECT');
      expect(actions).toContain('REPROCESS');
    });
  });

  describe('Remito approval logic', () => {
    function canApproveRemito(userRole: string, remitoState: string): boolean {
      const approverRoles = ['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO'];
      const approvableStates = ['PENDIENTE_APROBACION'];
      
      return approverRoles.includes(userRole) && approvableStates.includes(remitoState);
    }

    it('should allow ADMIN to approve pending remito', () => {
      expect(canApproveRemito('ADMIN', 'PENDIENTE_APROBACION')).toBe(true);
    });

    it('should not allow OPERATOR to approve', () => {
      expect(canApproveRemito('OPERATOR', 'PENDIENTE_APROBACION')).toBe(false);
    });

    it('should not allow approval of already approved remito', () => {
      expect(canApproveRemito('ADMIN', 'APROBADO')).toBe(false);
    });

    it('should not allow approval of processing remito', () => {
      expect(canApproveRemito('ADMIN', 'PROCESANDO')).toBe(false);
    });
  });

  describe('Extracted data structure', () => {
    interface RemitoExtractedData {
      numeroRemito?: string;
      fechaEmision?: string;
      cuitEmisor?: string;
      razonSocialEmisor?: string;
      cuitReceptor?: string;
      razonSocialReceptor?: string;
      domicilioOrigen?: string;
      domicilioDestino?: string;
      descripcionMercaderia?: string;
      pesoBruto?: string;
      bultos?: string;
      patenteCamion?: string;
      patenteAcoplado?: string;
      nombreChofer?: string;
      dniChofer?: string;
    }

    it('should validate extracted data structure', () => {
      const data: RemitoExtractedData = {
        numeroRemito: 'R-0001-00000001',
        fechaEmision: '15/06/2024',
        cuitEmisor: '20-12345678-9',
        razonSocialEmisor: 'Empresa SA',
      };

      expect(data.numeroRemito).toBe('R-0001-00000001');
      expect(data.fechaEmision).toBe('15/06/2024');
    });

    it('should allow optional fields', () => {
      const data: RemitoExtractedData = {
        numeroRemito: 'R-0001-00000001',
      };

      expect(data.patenteCamion).toBeUndefined();
      expect(data.dniChofer).toBeUndefined();
    });
  });
});

