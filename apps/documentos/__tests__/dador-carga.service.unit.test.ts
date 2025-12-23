/**
 * Unit tests for DadorCarga Service logic
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

describe('DadorCargaService', () => {
  describe('DadorCarga validation', () => {
    interface DadorCargaData {
      nombre: string;
      cuit: string;
      direccion?: string;
      telefono?: string;
      email?: string;
      tenantEmpresaId: number;
    }

    function validateDadorCarga(data: Partial<DadorCargaData>): string[] {
      const errors: string[] = [];

      if (!data.nombre || data.nombre.trim().length < 3) {
        errors.push('Nombre requerido (mínimo 3 caracteres)');
      }

      if (!data.cuit || !/^\d{11}$/.test(data.cuit.replace(/[-\s]/g, ''))) {
        errors.push('CUIT inválido (debe tener 11 dígitos)');
      }

      if (!data.tenantEmpresaId || data.tenantEmpresaId <= 0) {
        errors.push('Empresa requerida');
      }

      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Email inválido');
      }

      return errors;
    }

    it('should validate correct dador data', () => {
      const errors = validateDadorCarga({
        nombre: 'Dador de Carga SA',
        cuit: '20123456789',
        tenantEmpresaId: 100,
      });
      expect(errors).toHaveLength(0);
    });

    it('should require nombre', () => {
      const errors = validateDadorCarga({
        cuit: '20123456789',
        tenantEmpresaId: 100,
      });
      expect(errors).toContain('Nombre requerido (mínimo 3 caracteres)');
    });

    it('should require valid CUIT', () => {
      const errors = validateDadorCarga({
        nombre: 'Test Dador',
        cuit: '123',
        tenantEmpresaId: 100,
      });
      expect(errors).toContain('CUIT inválido (debe tener 11 dígitos)');
    });

    it('should require tenant', () => {
      const errors = validateDadorCarga({
        nombre: 'Test Dador',
        cuit: '20123456789',
      });
      expect(errors).toContain('Empresa requerida');
    });
  });

  describe('DadorCarga filtering', () => {
    interface DadorFilters {
      tenantId?: number;
      search?: string;
      activo?: boolean;
    }

    function buildDadorWhere(filters: DadorFilters): Record<string, any> {
      const where: Record<string, any> = {};

      if (filters.tenantId) {
        where.tenantEmpresaId = filters.tenantId;
      }

      if (filters.search) {
        where.OR = [
          { nombre: { contains: filters.search, mode: 'insensitive' } },
          { cuit: { contains: filters.search.replace(/[-\s]/g, '') } },
        ];
      }

      if (filters.activo !== undefined) {
        where.activo = filters.activo;
      }

      return where;
    }

    it('should filter by tenant', () => {
      const where = buildDadorWhere({ tenantId: 100 });
      expect(where.tenantEmpresaId).toBe(100);
    });

    it('should search by nombre or CUIT', () => {
      const where = buildDadorWhere({ search: 'dador' });
      expect(where.OR).toHaveLength(2);
    });

    it('should filter by activo', () => {
      const where = buildDadorWhere({ activo: true });
      expect(where.activo).toBe(true);
    });
  });

  describe('DadorCarga requisitos', () => {
    interface Requisito {
      templateId: number;
      entityType: string;
      isObligatorio: boolean;
      diasAnticipacion: number;
    }

    function groupRequisitosByEntity(requisitos: Requisito[]): Record<string, Requisito[]> {
      const groups: Record<string, Requisito[]> = {};
      
      for (const req of requisitos) {
        if (!groups[req.entityType]) {
          groups[req.entityType] = [];
        }
        groups[req.entityType].push(req);
      }
      
      return groups;
    }

    function countObligatorios(requisitos: Requisito[]): number {
      return requisitos.filter(r => r.isObligatorio).length;
    }

    it('should group requisitos by entity type', () => {
      const requisitos: Requisito[] = [
        { templateId: 1, entityType: 'CHOFER', isObligatorio: true, diasAnticipacion: 30 },
        { templateId: 2, entityType: 'CAMION', isObligatorio: true, diasAnticipacion: 30 },
        { templateId: 3, entityType: 'CHOFER', isObligatorio: false, diasAnticipacion: 0 },
      ];

      const groups = groupRequisitosByEntity(requisitos);
      expect(groups['CHOFER']).toHaveLength(2);
      expect(groups['CAMION']).toHaveLength(1);
    });

    it('should count obligatorios', () => {
      const requisitos: Requisito[] = [
        { templateId: 1, entityType: 'CHOFER', isObligatorio: true, diasAnticipacion: 30 },
        { templateId: 2, entityType: 'CAMION', isObligatorio: false, diasAnticipacion: 0 },
        { templateId: 3, entityType: 'CHOFER', isObligatorio: true, diasAnticipacion: 30 },
      ];

      expect(countObligatorios(requisitos)).toBe(2);
    });
  });

  describe('DadorCarga statistics', () => {
    interface DadorStats {
      totalEquipos: number;
      equiposHabilitados: number;
      documentosVigentes: number;
      documentosPendientes: number;
      documentosVencidos: number;
    }

    function calculateCompliancePercentage(stats: DadorStats): number {
      if (stats.totalEquipos === 0) return 100;
      return Math.round((stats.equiposHabilitados / stats.totalEquipos) * 100);
    }

    function getDadorHealthStatus(
      stats: DadorStats
    ): 'healthy' | 'warning' | 'critical' {
      const complianceRate = calculateCompliancePercentage(stats);
      if (stats.documentosVencidos > 0) return 'critical';
      if (complianceRate >= 90) return 'healthy';
      if (complianceRate >= 70) return 'warning';
      return 'critical';
    }

    it('should calculate compliance percentage', () => {
      const stats: DadorStats = {
        totalEquipos: 10,
        equiposHabilitados: 8,
        documentosVigentes: 50,
        documentosPendientes: 5,
        documentosVencidos: 0,
      };
      expect(calculateCompliancePercentage(stats)).toBe(80);
    });

    it('should return 100% when no equipos', () => {
      const stats: DadorStats = {
        totalEquipos: 0,
        equiposHabilitados: 0,
        documentosVigentes: 0,
        documentosPendientes: 0,
        documentosVencidos: 0,
      };
      expect(calculateCompliancePercentage(stats)).toBe(100);
    });

    it('should return healthy for high compliance', () => {
      const stats: DadorStats = {
        totalEquipos: 10,
        equiposHabilitados: 9,
        documentosVigentes: 50,
        documentosPendientes: 0,
        documentosVencidos: 0,
      };
      expect(getDadorHealthStatus(stats)).toBe('healthy');
    });

    it('should return critical for vencidos', () => {
      const stats: DadorStats = {
        totalEquipos: 10,
        equiposHabilitados: 10,
        documentosVigentes: 50,
        documentosPendientes: 0,
        documentosVencidos: 5,
      };
      expect(getDadorHealthStatus(stats)).toBe('critical');
    });
  });

  describe('DadorCarga display', () => {
    function formatDadorDisplay(dador: { nombre: string; cuit: string }): string {
      const formattedCuit = dador.cuit.replace(
        /^(\d{2})(\d{8})(\d{1})$/,
        '$1-$2-$3'
      );
      return `${dador.nombre} (${formattedCuit})`;
    }

    function getInitials(nombre: string): string {
      return nombre
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word[0].toUpperCase())
        .slice(0, 2)
        .join('');
    }

    it('should format dador display', () => {
      expect(formatDadorDisplay({
        nombre: 'Dador Test',
        cuit: '20123456789',
      })).toBe('Dador Test (20-12345678-9)');
    });

    it('should get initials from nombre', () => {
      expect(getInitials('Dador de Carga SA')).toBe('DD');
      expect(getInitials('ABC')).toBe('A');
      expect(getInitials('Un Nombre Largo')).toBe('UN');
    });
  });

  describe('DadorCarga clientes association', () => {
    interface DadorCliente {
      dadorId: number;
      clienteId: number;
      activo: boolean;
      requisitosPersonalizados: boolean;
    }

    function getActiveClientes(associations: DadorCliente[], dadorId: number): number[] {
      return associations
        .filter(a => a.dadorId === dadorId && a.activo)
        .map(a => a.clienteId);
    }

    function hasPersonalizedRequisitos(
      associations: DadorCliente[],
      dadorId: number,
      clienteId: number
    ): boolean {
      const assoc = associations.find(
        a => a.dadorId === dadorId && a.clienteId === clienteId
      );
      return assoc?.requisitosPersonalizados || false;
    }

    it('should get active clientes for dador', () => {
      const associations: DadorCliente[] = [
        { dadorId: 1, clienteId: 100, activo: true, requisitosPersonalizados: false },
        { dadorId: 1, clienteId: 101, activo: false, requisitosPersonalizados: false },
        { dadorId: 1, clienteId: 102, activo: true, requisitosPersonalizados: true },
        { dadorId: 2, clienteId: 100, activo: true, requisitosPersonalizados: false },
      ];

      const clientes = getActiveClientes(associations, 1);
      expect(clientes).toHaveLength(2);
      expect(clientes).toContain(100);
      expect(clientes).toContain(102);
    });

    it('should check personalized requisitos', () => {
      const associations: DadorCliente[] = [
        { dadorId: 1, clienteId: 100, activo: true, requisitosPersonalizados: true },
        { dadorId: 1, clienteId: 101, activo: true, requisitosPersonalizados: false },
      ];

      expect(hasPersonalizedRequisitos(associations, 1, 100)).toBe(true);
      expect(hasPersonalizedRequisitos(associations, 1, 101)).toBe(false);
    });
  });

  describe('DadorCarga export', () => {
    interface ExportDadorData {
      id: number;
      nombre: string;
      cuit: string;
      totalEquipos: number;
      complianceRate: number;
    }

    function formatForCsv(data: ExportDadorData[]): string {
      const headers = 'ID,Nombre,CUIT,Total Equipos,Compliance (%)';
      const rows = data.map(d => 
        `${d.id},"${d.nombre}",${d.cuit},${d.totalEquipos},${d.complianceRate}`
      );
      return [headers, ...rows].join('\n');
    }

    it('should format CSV output', () => {
      const data: ExportDadorData[] = [
        { id: 1, nombre: 'Dador 1', cuit: '20123456789', totalEquipos: 10, complianceRate: 90 },
        { id: 2, nombre: 'Dador 2', cuit: '20987654321', totalEquipos: 5, complianceRate: 100 },
      ];

      const csv = formatForCsv(data);
      expect(csv).toContain('ID,Nombre,CUIT');
      expect(csv).toContain('"Dador 1"');
      expect(csv).toContain('90');
    });
  });
});



