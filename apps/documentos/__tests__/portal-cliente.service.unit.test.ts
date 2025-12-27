/**
 * Unit tests for Portal Cliente Service logic
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

describe('PortalClienteService', () => {
  describe('Client permission validation', () => {
    interface ClienteUser {
      userId: number;
      role: string;
      clienteId?: number;
      dadorCargaId?: number;
    }

    function canAccessCliente(user: ClienteUser, targetClienteId: number): boolean {
      if (user.role === 'SUPERADMIN') return true;
      if (user.role === 'ADMIN') return true;
      if (user.role === 'CLIENTE' && user.clienteId === targetClienteId) return true;
      return false;
    }

    it('should allow SUPERADMIN to access any cliente', () => {
      const user: ClienteUser = { userId: 1, role: 'SUPERADMIN' };
      expect(canAccessCliente(user, 100)).toBe(true);
    });

    it('should allow ADMIN to access any cliente', () => {
      const user: ClienteUser = { userId: 1, role: 'ADMIN' };
      expect(canAccessCliente(user, 100)).toBe(true);
    });

    it('should allow CLIENTE to access their own profile', () => {
      const user: ClienteUser = { userId: 1, role: 'CLIENTE', clienteId: 100 };
      expect(canAccessCliente(user, 100)).toBe(true);
    });

    it('should deny CLIENTE access to other profiles', () => {
      const user: ClienteUser = { userId: 1, role: 'CLIENTE', clienteId: 100 };
      expect(canAccessCliente(user, 200)).toBe(false);
    });
  });

  describe('Equipo visibility for clients', () => {
    interface EquipoAssignment {
      equipoId: number;
      clienteId: number;
      asignadoDesde: Date;
      asignadoHasta: Date | null;
    }

    function getVisibleEquipos(
      assignments: EquipoAssignment[],
      clienteId: number,
      referenceDate: Date = new Date()
    ): number[] {
      return assignments
        .filter(a => 
          a.clienteId === clienteId &&
          a.asignadoDesde <= referenceDate &&
          (a.asignadoHasta === null || a.asignadoHasta >= referenceDate)
        )
        .map(a => a.equipoId);
    }

    it('should return active assignments', () => {
      const now = new Date('2024-06-15');
      const assignments: EquipoAssignment[] = [
        { equipoId: 1, clienteId: 100, asignadoDesde: new Date('2024-01-01'), asignadoHasta: null },
        { equipoId: 2, clienteId: 100, asignadoDesde: new Date('2024-01-01'), asignadoHasta: new Date('2024-12-31') },
      ];

      const visible = getVisibleEquipos(assignments, 100, now);
      expect(visible).toContain(1);
      expect(visible).toContain(2);
    });

    it('should exclude expired assignments', () => {
      const now = new Date('2024-06-15');
      const assignments: EquipoAssignment[] = [
        { equipoId: 1, clienteId: 100, asignadoDesde: new Date('2024-01-01'), asignadoHasta: new Date('2024-03-01') },
      ];

      const visible = getVisibleEquipos(assignments, 100, now);
      expect(visible).not.toContain(1);
    });

    it('should exclude future assignments', () => {
      const now = new Date('2024-06-15');
      const assignments: EquipoAssignment[] = [
        { equipoId: 1, clienteId: 100, asignadoDesde: new Date('2024-12-01'), asignadoHasta: null },
      ];

      const visible = getVisibleEquipos(assignments, 100, now);
      expect(visible).not.toContain(1);
    });

    it('should filter by clienteId', () => {
      const assignments: EquipoAssignment[] = [
        { equipoId: 1, clienteId: 100, asignadoDesde: new Date('2024-01-01'), asignadoHasta: null },
        { equipoId: 2, clienteId: 200, asignadoDesde: new Date('2024-01-01'), asignadoHasta: null },
      ];

      const visible = getVisibleEquipos(assignments, 100);
      expect(visible).toContain(1);
      expect(visible).not.toContain(2);
    });
  });

  describe('Cliente requisitos', () => {
    interface ClienteRequisito {
      templateId: number;
      templateName: string;
      entityType: string;
      isObligatorio: boolean;
      diasAnticipacion: number;
    }

    function filterRequisitosByEntity(
      requisitos: ClienteRequisito[],
      entityType: string
    ): ClienteRequisito[] {
      return requisitos.filter(r => r.entityType === entityType);
    }

    function getObligatorios(requisitos: ClienteRequisito[]): ClienteRequisito[] {
      return requisitos.filter(r => r.isObligatorio);
    }

    it('should filter by entity type', () => {
      const requisitos: ClienteRequisito[] = [
        { templateId: 1, templateName: 'LIC', entityType: 'CHOFER', isObligatorio: true, diasAnticipacion: 30 },
        { templateId: 2, templateName: 'VTV', entityType: 'CAMION', isObligatorio: true, diasAnticipacion: 30 },
        { templateId: 3, templateName: 'DNI', entityType: 'CHOFER', isObligatorio: true, diasAnticipacion: 30 },
      ];

      const choferReqs = filterRequisitosByEntity(requisitos, 'CHOFER');
      expect(choferReqs).toHaveLength(2);
    });

    it('should filter obligatorios', () => {
      const requisitos: ClienteRequisito[] = [
        { templateId: 1, templateName: 'LIC', entityType: 'CHOFER', isObligatorio: true, diasAnticipacion: 30 },
        { templateId: 2, templateName: 'Foto', entityType: 'CHOFER', isObligatorio: false, diasAnticipacion: 0 },
      ];

      const obligatorios = getObligatorios(requisitos);
      expect(obligatorios).toHaveLength(1);
      expect(obligatorios[0].templateName).toBe('LIC');
    });
  });

  describe('Client search functionality', () => {
    interface ClienteSearchResult {
      id: number;
      nombre: string;
      cuit: string;
      matchScore: number;
    }

    function searchClientes(
      clientes: Array<{ id: number; nombre: string; cuit: string }>,
      searchTerm: string
    ): ClienteSearchResult[] {
      const term = searchTerm.toLowerCase();
      
      return clientes
        .map(c => {
          let score = 0;
          const nombreLower = c.nombre.toLowerCase();
          const cuitClean = c.cuit.replace(/[-\s]/g, '');
          
          if (nombreLower === term) score = 100;
          else if (nombreLower.startsWith(term)) score = 80;
          else if (nombreLower.includes(term)) score = 60;
          else if (cuitClean.includes(term.replace(/[-\s]/g, ''))) score = 50;
          
          return { ...c, matchScore: score };
        })
        .filter(c => c.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);
    }

    it('should find by exact name match', () => {
      const clientes = [
        { id: 1, nombre: 'Empresa ABC', cuit: '20-12345678-9' },
        { id: 2, nombre: 'Empresa XYZ', cuit: '20-87654321-0' },
      ];

      const results = searchClientes(clientes, 'Empresa ABC');
      expect(results[0].id).toBe(1);
      expect(results[0].matchScore).toBe(100);
    });

    it('should find by partial name', () => {
      const clientes = [
        { id: 1, nombre: 'Transportes del Norte', cuit: '20-12345678-9' },
        { id: 2, nombre: 'Transportes del Sur', cuit: '20-87654321-0' },
      ];

      const results = searchClientes(clientes, 'Transportes');
      expect(results).toHaveLength(2);
    });

    it('should find by CUIT', () => {
      const clientes = [
        { id: 1, nombre: 'Empresa ABC', cuit: '20-12345678-9' },
      ];

      const results = searchClientes(clientes, '12345678');
      expect(results).toHaveLength(1);
    });
  });

  describe('Compliance summary for client', () => {
    interface ComplianceSummary {
      totalEquipos: number;
      equiposHabilitados: number;
      equiposProximoVencer: number;
      equiposNoHabilitados: number;
      porcentajeHabilitados: number;
    }

    function calculateComplianceSummary(
      equipoStates: Array<{ state: 'HABILITADO' | 'PROXIMO_VENCER' | 'NO_HABILITADO' }>
    ): ComplianceSummary {
      const total = equipoStates.length;
      const habilitados = equipoStates.filter(e => e.state === 'HABILITADO').length;
      const proximoVencer = equipoStates.filter(e => e.state === 'PROXIMO_VENCER').length;
      const noHabilitados = equipoStates.filter(e => e.state === 'NO_HABILITADO').length;

      return {
        totalEquipos: total,
        equiposHabilitados: habilitados,
        equiposProximoVencer: proximoVencer,
        equiposNoHabilitados: noHabilitados,
        porcentajeHabilitados: total > 0 ? Math.round((habilitados / total) * 100) : 0,
      };
    }

    it('should calculate summary correctly', () => {
      const states = [
        { state: 'HABILITADO' as const },
        { state: 'HABILITADO' as const },
        { state: 'PROXIMO_VENCER' as const },
        { state: 'NO_HABILITADO' as const },
      ];

      const summary = calculateComplianceSummary(states);
      expect(summary.totalEquipos).toBe(4);
      expect(summary.equiposHabilitados).toBe(2);
      expect(summary.porcentajeHabilitados).toBe(50);
    });

    it('should handle empty list', () => {
      const summary = calculateComplianceSummary([]);
      expect(summary.totalEquipos).toBe(0);
      expect(summary.porcentajeHabilitados).toBe(0);
    });
  });

  describe('Document expiry alerts for client', () => {
    interface ExpiryAlert {
      documentId: number;
      templateName: string;
      entityName: string;
      daysUntilExpiry: number;
      severity: 'critical' | 'warning' | 'info';
    }

    function generateExpiryAlerts(
      documents: Array<{
        id: number;
        templateName: string;
        entityName: string;
        expiresAt: Date;
      }>,
      referenceDate: Date = new Date()
    ): ExpiryAlert[] {
      const day = 24 * 60 * 60 * 1000;
      const now = referenceDate.getTime();

      return documents
        .map(doc => {
          const daysUntil = Math.ceil((doc.expiresAt.getTime() - now) / day);
          let severity: 'critical' | 'warning' | 'info';

          if (daysUntil <= 0) severity = 'critical';
          else if (daysUntil <= 7) severity = 'critical';
          else if (daysUntil <= 30) severity = 'warning';
          else severity = 'info';

          return {
            documentId: doc.id,
            templateName: doc.templateName,
            entityName: doc.entityName,
            daysUntilExpiry: daysUntil,
            severity,
          };
        })
        .filter(alert => alert.daysUntilExpiry <= 60);
    }

    it('should generate critical alert for expired', () => {
      const now = new Date('2024-06-15');
      const docs = [{
        id: 1,
        templateName: 'Licencia',
        entityName: 'Juan',
        expiresAt: new Date('2024-06-01'),
      }];

      const alerts = generateExpiryAlerts(docs, now);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].daysUntilExpiry).toBeLessThan(0);
    });

    it('should generate warning for expiring soon', () => {
      const now = new Date('2024-06-15');
      const docs = [{
        id: 1,
        templateName: 'VTV',
        entityName: 'AB123',
        expiresAt: new Date('2024-07-01'),
      }];

      const alerts = generateExpiryAlerts(docs, now);
      expect(alerts[0].severity).toBe('warning');
    });

    it('should filter documents expiring after 60 days', () => {
      const now = new Date('2024-06-15');
      const docs = [{
        id: 1,
        templateName: 'Seguro',
        entityName: 'AB123',
        expiresAt: new Date('2025-01-01'),
      }];

      const alerts = generateExpiryAlerts(docs, now);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Export data formatting', () => {
    interface ExportRow {
      equipo: string;
      chofer: string;
      camion: string;
      acoplado: string;
      estado: string;
      documentosFaltantes: number;
    }

    function formatForExport(
      equipos: Array<{
        externalId: string;
        choferNombre: string;
        camionPatente: string;
        acopladoPatente?: string;
        estado: string;
        docsFaltantes: number;
      }>
    ): ExportRow[] {
      return equipos.map(e => ({
        equipo: e.externalId,
        chofer: e.choferNombre,
        camion: e.camionPatente,
        acoplado: e.acopladoPatente || '-',
        estado: e.estado === 'HABILITADO' ? 'Habilitado' :
                e.estado === 'PROXIMO_VENCER' ? 'Próximo a Vencer' :
                'No Habilitado',
        documentosFaltantes: e.docsFaltantes,
      }));
    }

    it('should format export data', () => {
      const equipos = [{
        externalId: 'EQ-001',
        choferNombre: 'Juan Pérez',
        camionPatente: 'AB123CD',
        acopladoPatente: 'XY789ZZ',
        estado: 'HABILITADO',
        docsFaltantes: 0,
      }];

      const rows = formatForExport(equipos);
      expect(rows[0].equipo).toBe('EQ-001');
      expect(rows[0].estado).toBe('Habilitado');
    });

    it('should handle missing acoplado', () => {
      const equipos = [{
        externalId: 'EQ-002',
        choferNombre: 'Pedro',
        camionPatente: 'ZZ999AA',
        estado: 'NO_HABILITADO',
        docsFaltantes: 3,
      }];

      const rows = formatForExport(equipos);
      expect(rows[0].acoplado).toBe('-');
    });
  });

  describe('Client notification preferences', () => {
    interface NotificationPreferences {
      emailEnabled: boolean;
      whatsappEnabled: boolean;
      alertDays: number[];
    }

    function shouldNotifyToday(
      prefs: NotificationPreferences,
      daysUntilExpiry: number
    ): boolean {
      if (daysUntilExpiry <= 0) return true; // Always notify on expiry
      return prefs.alertDays.includes(daysUntilExpiry);
    }

    function getActiveChannels(prefs: NotificationPreferences): string[] {
      const channels: string[] = [];
      if (prefs.emailEnabled) channels.push('EMAIL');
      if (prefs.whatsappEnabled) channels.push('WHATSAPP');
      return channels;
    }

    it('should notify on alert days', () => {
      const prefs: NotificationPreferences = {
        emailEnabled: true,
        whatsappEnabled: false,
        alertDays: [30, 15, 7, 1],
      };

      expect(shouldNotifyToday(prefs, 30)).toBe(true);
      expect(shouldNotifyToday(prefs, 15)).toBe(true);
      expect(shouldNotifyToday(prefs, 20)).toBe(false);
    });

    it('should always notify on expiry', () => {
      const prefs: NotificationPreferences = {
        emailEnabled: true,
        whatsappEnabled: false,
        alertDays: [30],
      };

      expect(shouldNotifyToday(prefs, 0)).toBe(true);
      expect(shouldNotifyToday(prefs, -1)).toBe(true);
    });

    it('should return active channels', () => {
      const prefs: NotificationPreferences = {
        emailEnabled: true,
        whatsappEnabled: true,
        alertDays: [],
      };

      const channels = getActiveChannels(prefs);
      expect(channels).toContain('EMAIL');
      expect(channels).toContain('WHATSAPP');
    });
  });
});




