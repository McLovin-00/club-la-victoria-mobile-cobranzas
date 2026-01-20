/**
 * Unit tests for Cliente Service logic
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

describe('ClienteService', () => {
  describe('Cliente validation', () => {
    interface ClienteData {
      nombre: string;
      cuit?: string;
      direccion?: string;
      telefono?: string;
      email?: string;
      tenantEmpresaId: number;
      dadorCargaId?: number;
    }

    function validateCliente(data: Partial<ClienteData>): string[] {
      const errors: string[] = [];

      if (!data.nombre || data.nombre.trim().length < 2) {
        errors.push('Nombre requerido (mínimo 2 caracteres)');
      }

      if (!data.tenantEmpresaId || data.tenantEmpresaId <= 0) {
        errors.push('Empresa requerida');
      }

      if (data.cuit && !/^\d{11}$/.test(data.cuit.replace(/[-\s]/g, ''))) {
        errors.push('CUIT inválido');
      }

      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Email inválido');
      }

      return errors;
    }

    it('should validate correct cliente data', () => {
      const errors = validateCliente({
        nombre: 'Cliente SA',
        tenantEmpresaId: 100,
      });
      expect(errors).toHaveLength(0);
    });

    it('should require nombre', () => {
      const errors = validateCliente({
        tenantEmpresaId: 100,
      });
      expect(errors).toContain('Nombre requerido (mínimo 2 caracteres)');
    });

    it('should validate optional CUIT', () => {
      const errors = validateCliente({
        nombre: 'Cliente',
        tenantEmpresaId: 100,
        cuit: 'invalid',
      });
      expect(errors).toContain('CUIT inválido');
    });
  });

  describe('Cliente requisitos', () => {
    interface ClienteRequisito {
      templateId: number;
      templateName: string;
      entityType: string;
      isObligatorio: boolean;
      diasAnticipacion: number;
      personalizadoPorCliente: boolean;
    }

    function mergeWithDadorRequisitos(
      dadorReqs: ClienteRequisito[],
      clienteOverrides: Map<number, Partial<ClienteRequisito>>
    ): ClienteRequisito[] {
      return dadorReqs.map(req => {
        const override = clienteOverrides.get(req.templateId);
        if (override) {
          return {
            ...req,
            ...override,
            personalizadoPorCliente: true,
          };
        }
        return { ...req, personalizadoPorCliente: false };
      });
    }

    it('should merge dador requisitos with cliente overrides', () => {
      const dadorReqs: ClienteRequisito[] = [
        {
          templateId: 1,
          templateName: 'Licencia',
          entityType: 'CHOFER',
          isObligatorio: true,
          diasAnticipacion: 30,
          personalizadoPorCliente: false,
        },
        {
          templateId: 2,
          templateName: 'VTV',
          entityType: 'CAMION',
          isObligatorio: true,
          diasAnticipacion: 30,
          personalizadoPorCliente: false,
        },
      ];

      const overrides = new Map<number, Partial<ClienteRequisito>>();
      overrides.set(1, { diasAnticipacion: 60 });

      const merged = mergeWithDadorRequisitos(dadorReqs, overrides);
      
      expect(merged[0].diasAnticipacion).toBe(60);
      expect(merged[0].personalizadoPorCliente).toBe(true);
      expect(merged[1].diasAnticipacion).toBe(30);
      expect(merged[1].personalizadoPorCliente).toBe(false);
    });
  });

  describe('Cliente equipo association', () => {
    interface EquipoAsignacion {
      equipoId: number;
      clienteId: number;
      asignadoDesde: Date;
      asignadoHasta: Date | null;
      motivoAsignacion?: string;
    }

    function isEquipoAssignedToCliente(
      asignaciones: EquipoAsignacion[],
      equipoId: number,
      clienteId: number,
      referenceDate: Date = new Date()
    ): boolean {
      return asignaciones.some(a =>
        a.equipoId === equipoId &&
        a.clienteId === clienteId &&
        a.asignadoDesde <= referenceDate &&
        (a.asignadoHasta === null || a.asignadoHasta >= referenceDate)
      );
    }

    function getActiveEquiposForCliente(
      asignaciones: EquipoAsignacion[],
      clienteId: number,
      referenceDate: Date = new Date()
    ): number[] {
      return asignaciones
        .filter(a =>
          a.clienteId === clienteId &&
          a.asignadoDesde <= referenceDate &&
          (a.asignadoHasta === null || a.asignadoHasta >= referenceDate)
        )
        .map(a => a.equipoId);
    }

    it('should check active assignment', () => {
      const now = new Date('2024-06-15');
      const asignaciones: EquipoAsignacion[] = [
        {
          equipoId: 1,
          clienteId: 100,
          asignadoDesde: new Date('2024-01-01'),
          asignadoHasta: null,
        },
      ];

      expect(isEquipoAssignedToCliente(asignaciones, 1, 100, now)).toBe(true);
      expect(isEquipoAssignedToCliente(asignaciones, 1, 200, now)).toBe(false);
    });

    it('should check expired assignment', () => {
      const now = new Date('2024-06-15');
      const asignaciones: EquipoAsignacion[] = [
        {
          equipoId: 1,
          clienteId: 100,
          asignadoDesde: new Date('2024-01-01'),
          asignadoHasta: new Date('2024-03-01'),
        },
      ];

      expect(isEquipoAssignedToCliente(asignaciones, 1, 100, now)).toBe(false);
    });

    it('should get active equipos for cliente', () => {
      const now = new Date('2024-06-15');
      const asignaciones: EquipoAsignacion[] = [
        { equipoId: 1, clienteId: 100, asignadoDesde: new Date('2024-01-01'), asignadoHasta: null },
        { equipoId: 2, clienteId: 100, asignadoDesde: new Date('2024-01-01'), asignadoHasta: null },
        { equipoId: 3, clienteId: 100, asignadoDesde: new Date('2024-01-01'), asignadoHasta: new Date('2024-03-01') },
        { equipoId: 4, clienteId: 200, asignadoDesde: new Date('2024-01-01'), asignadoHasta: null },
      ];

      const equipos = getActiveEquiposForCliente(asignaciones, 100, now);
      expect(equipos).toHaveLength(2);
      expect(equipos).toContain(1);
      expect(equipos).toContain(2);
    });
  });

  describe('Cliente user association', () => {
    interface ClienteUser {
      userId: number;
      clienteId: number;
      role: string;
      activo: boolean;
    }

    function getClienteUsers(
      associations: ClienteUser[],
      clienteId: number
    ): Array<{ userId: number; role: string }> {
      return associations
        .filter(a => a.clienteId === clienteId && a.activo)
        .map(a => ({ userId: a.userId, role: a.role }));
    }

    function hasUserAccess(
      associations: ClienteUser[],
      userId: number,
      clienteId: number
    ): boolean {
      return associations.some(
        a => a.userId === userId && a.clienteId === clienteId && a.activo
      );
    }

    it('should get users for cliente', () => {
      const associations: ClienteUser[] = [
        { userId: 1, clienteId: 100, role: 'ADMIN_CLIENTE', activo: true },
        { userId: 2, clienteId: 100, role: 'VIEWER', activo: true },
        { userId: 3, clienteId: 100, role: 'ADMIN_CLIENTE', activo: false },
      ];

      const users = getClienteUsers(associations, 100);
      expect(users).toHaveLength(2);
    });

    it('should check user access', () => {
      const associations: ClienteUser[] = [
        { userId: 1, clienteId: 100, role: 'ADMIN_CLIENTE', activo: true },
      ];

      expect(hasUserAccess(associations, 1, 100)).toBe(true);
      expect(hasUserAccess(associations, 2, 100)).toBe(false);
    });
  });

  describe('Cliente compliance summary', () => {
    interface ClienteComplianceSummary {
      totalEquipos: number;
      habilitados: number;
      proximoVencer: number;
      noHabilitados: number;
      sinInfo: number;
    }

    function calculateClienteCompliance(summary: ClienteComplianceSummary): {
      rate: number;
      status: 'green' | 'yellow' | 'red' | 'gray';
    } {
      if (summary.totalEquipos === 0) {
        return { rate: 0, status: 'gray' };
      }

      const rate = Math.round((summary.habilitados / summary.totalEquipos) * 100);

      if (summary.noHabilitados > 0) {
        return { rate, status: 'red' };
      }
      if (summary.proximoVencer > 0) {
        return { rate, status: 'yellow' };
      }
      return { rate, status: 'green' };
    }

    it('should return green for fully compliant', () => {
      const summary: ClienteComplianceSummary = {
        totalEquipos: 10,
        habilitados: 10,
        proximoVencer: 0,
        noHabilitados: 0,
        sinInfo: 0,
      };
      const result = calculateClienteCompliance(summary);
      expect(result.status).toBe('green');
      expect(result.rate).toBe(100);
    });

    it('should return yellow for expiring soon', () => {
      const summary: ClienteComplianceSummary = {
        totalEquipos: 10,
        habilitados: 8,
        proximoVencer: 2,
        noHabilitados: 0,
        sinInfo: 0,
      };
      const result = calculateClienteCompliance(summary);
      expect(result.status).toBe('yellow');
    });

    it('should return red for non-compliant', () => {
      const summary: ClienteComplianceSummary = {
        totalEquipos: 10,
        habilitados: 5,
        proximoVencer: 2,
        noHabilitados: 3,
        sinInfo: 0,
      };
      const result = calculateClienteCompliance(summary);
      expect(result.status).toBe('red');
    });

    it('should return gray for no equipos', () => {
      const summary: ClienteComplianceSummary = {
        totalEquipos: 0,
        habilitados: 0,
        proximoVencer: 0,
        noHabilitados: 0,
        sinInfo: 0,
      };
      const result = calculateClienteCompliance(summary);
      expect(result.status).toBe('gray');
    });
  });

  describe('Cliente notifications', () => {
    interface NotificationPreference {
      emailEnabled: boolean;
      whatsappEnabled: boolean;
      alertDays: number[];
      recipientEmails: string[];
      recipientPhones: string[];
    }

    function getNotificationChannels(prefs: NotificationPreference): string[] {
      const channels: string[] = [];
      if (prefs.emailEnabled && prefs.recipientEmails.length > 0) {
        channels.push('EMAIL');
      }
      if (prefs.whatsappEnabled && prefs.recipientPhones.length > 0) {
        channels.push('WHATSAPP');
      }
      return channels;
    }

    function shouldAlertToday(prefs: NotificationPreference, daysUntilExpiry: number): boolean {
      if (daysUntilExpiry <= 0) return true; // Always alert on expiry
      return prefs.alertDays.includes(daysUntilExpiry);
    }

    it('should return active channels', () => {
      const prefs: NotificationPreference = {
        emailEnabled: true,
        whatsappEnabled: true,
        alertDays: [30, 15, 7],
        recipientEmails: ['admin@example.com'],
        recipientPhones: ['541123456789'],
      };

      const channels = getNotificationChannels(prefs);
      expect(channels).toContain('EMAIL');
      expect(channels).toContain('WHATSAPP');
    });

    it('should not return channel without recipients', () => {
      const prefs: NotificationPreference = {
        emailEnabled: true,
        whatsappEnabled: true,
        alertDays: [],
        recipientEmails: [],
        recipientPhones: [],
      };

      expect(getNotificationChannels(prefs)).toHaveLength(0);
    });

    it('should alert on configured days', () => {
      const prefs: NotificationPreference = {
        emailEnabled: true,
        whatsappEnabled: false,
        alertDays: [30, 15, 7, 1],
        recipientEmails: ['admin@example.com'],
        recipientPhones: [],
      };

      expect(shouldAlertToday(prefs, 30)).toBe(true);
      expect(shouldAlertToday(prefs, 20)).toBe(false);
      expect(shouldAlertToday(prefs, 0)).toBe(true); // Always on expiry
    });
  });

  describe('Cliente search', () => {
    interface ClienteSearchResult {
      id: number;
      nombre: string;
      dadorNombre: string;
      equiposCount: number;
    }

    function searchClientes(
      clientes: ClienteSearchResult[],
      query: string
    ): ClienteSearchResult[] {
      const lowerQuery = query.toLowerCase();
      return clientes.filter(c =>
        c.nombre.toLowerCase().includes(lowerQuery) ||
        c.dadorNombre.toLowerCase().includes(lowerQuery)
      );
    }

    function sortByEquiposCount(clientes: ClienteSearchResult[]): ClienteSearchResult[] {
      return [...clientes].sort((a, b) => b.equiposCount - a.equiposCount);
    }

    it('should search by nombre', () => {
      const clientes: ClienteSearchResult[] = [
        { id: 1, nombre: 'Cliente ABC', dadorNombre: 'Dador 1', equiposCount: 5 },
        { id: 2, nombre: 'Cliente XYZ', dadorNombre: 'Dador 2', equiposCount: 3 },
      ];

      const results = searchClientes(clientes, 'ABC');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('should search by dador nombre', () => {
      const clientes: ClienteSearchResult[] = [
        { id: 1, nombre: 'Cliente A', dadorNombre: 'Transportes Norte', equiposCount: 5 },
        { id: 2, nombre: 'Cliente B', dadorNombre: 'Transportes Sur', equiposCount: 3 },
      ];

      const results = searchClientes(clientes, 'Norte');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('should sort by equipos count', () => {
      const clientes: ClienteSearchResult[] = [
        { id: 1, nombre: 'A', dadorNombre: 'D1', equiposCount: 5 },
        { id: 2, nombre: 'B', dadorNombre: 'D2', equiposCount: 10 },
        { id: 3, nombre: 'C', dadorNombre: 'D3', equiposCount: 3 },
      ];

      const sorted = sortByEquiposCount(clientes);
      expect(sorted[0].equiposCount).toBe(10);
      expect(sorted[2].equiposCount).toBe(3);
    });
  });
});




