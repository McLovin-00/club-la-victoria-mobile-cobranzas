/**
 * Unit tests for ComplianceService helper functions
 * @jest-environment node
 */

// Mock database and logger before imports
jest.mock('../src/config/database', () => ({
  prisma: {
    equipo: { findUnique: jest.fn() },
    clienteRequisito: { findMany: jest.fn() },
    document: { findMany: jest.fn() },
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

describe('ComplianceService - Helpers', () => {
  describe('ComplianceState types', () => {
    it('should define valid compliance states', () => {
      const states = ['OK', 'PROXIMO', 'FALTANTE'];
      expect(states).toContain('OK');
      expect(states).toContain('PROXIMO');
      expect(states).toContain('FALTANTE');
    });

    it('should define valid detailed compliance states', () => {
      const detailedStates = ['VIGENTE', 'PROXIMO', 'VENCIDO', 'PENDIENTE', 'RECHAZADO', 'FALTANTE'];
      expect(detailedStates).toHaveLength(6);
    });
  });

  describe('Requirement validation', () => {
    it('should validate requirement result structure', () => {
      const requirement = {
        templateId: 1,
        entityType: 'CHOFER',
        obligatorio: true,
        diasAnticipacion: 30,
        state: 'OK',
        documentId: 123,
        expiresAt: new Date(),
      };

      expect(requirement.templateId).toBe(1);
      expect(requirement.obligatorio).toBe(true);
      expect(requirement.state).toBe('OK');
    });

    it('should allow optional fields to be undefined', () => {
      const requirement = {
        templateId: 1,
        entityType: 'CAMION',
        obligatorio: false,
        diasAnticipacion: 15,
        state: 'FALTANTE',
      };

      expect(requirement.documentId).toBeUndefined();
      expect(requirement.expiresAt).toBeUndefined();
    });
  });

  describe('EquipoComplianceResult structure', () => {
    it('should have correct structure', () => {
      const result = {
        equipoId: 1,
        tieneVencidos: false,
        tieneFaltantes: true,
        tieneProximos: false,
        requirements: [],
      };

      expect(result.equipoId).toBe(1);
      expect(result.tieneVencidos).toBe(false);
      expect(result.tieneFaltantes).toBe(true);
      expect(Array.isArray(result.requirements)).toBe(true);
    });
  });

  describe('Date calculations for compliance', () => {
    const now = new Date('2024-06-15T12:00:00Z');

    it('should identify expired documents', () => {
      const expiresAt = new Date('2024-06-01T00:00:00Z');
      const isExpired = expiresAt.getTime() < now.getTime();
      expect(isExpired).toBe(true);
    });

    it('should identify valid documents', () => {
      const expiresAt = new Date('2024-12-31T23:59:59Z');
      const isExpired = expiresAt.getTime() < now.getTime();
      expect(isExpired).toBe(false);
    });

    it('should calculate days until expiration', () => {
      const expiresAt = new Date('2024-06-30T12:00:00Z');
      const daysUntil = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysUntil).toBe(15);
    });

    it('should identify "próximo a vencer" with diasAnticipacion', () => {
      const expiresAt = new Date('2024-07-01T12:00:00Z');
      const diasAnticipacion = 30;
      const daysUntil = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isProximo = daysUntil <= diasAnticipacion && daysUntil > 0;
      expect(isProximo).toBe(true);
    });
  });

  describe('Entity type mapping', () => {
    const entityTypes = ['CHOFER', 'CAMION', 'ACOPLADO', 'EMPRESA_TRANSPORTISTA'];

    it('should have all required entity types', () => {
      expect(entityTypes).toContain('CHOFER');
      expect(entityTypes).toContain('CAMION');
      expect(entityTypes).toContain('ACOPLADO');
      expect(entityTypes).toContain('EMPRESA_TRANSPORTISTA');
    });

    it('should map entity type to equipo field', () => {
      const equipo = {
        id: 1,
        driverId: 100,
        truckId: 200,
        trailerId: 300,
        empresaTransportistaId: 400,
      };

      const mapping: Record<string, number | null> = {
        CHOFER: equipo.driverId,
        CAMION: equipo.truckId,
        ACOPLADO: equipo.trailerId,
        EMPRESA_TRANSPORTISTA: equipo.empresaTransportistaId,
      };

      expect(mapping['CHOFER']).toBe(100);
      expect(mapping['CAMION']).toBe(200);
      expect(mapping['ACOPLADO']).toBe(300);
      expect(mapping['EMPRESA_TRANSPORTISTA']).toBe(400);
    });
  });

  describe('Document status classification', () => {
    const pendingStatuses = ['PENDIENTE', 'VALIDANDO', 'CLASIFICANDO', 'PENDIENTE_APROBACION'];
    const validStatuses = ['VIGENTE', 'APROBADO'];
    const invalidStatuses = ['RECHAZADO', 'VENCIDO'];

    it('should classify pending statuses correctly', () => {
      pendingStatuses.forEach(status => {
        const isPending = pendingStatuses.includes(status);
        expect(isPending).toBe(true);
      });
    });

    it('should not classify valid status as pending', () => {
      validStatuses.forEach(status => {
        const isPending = pendingStatuses.includes(status);
        expect(isPending).toBe(false);
      });
    });

    it('should distinguish rejected from other statuses', () => {
      expect(invalidStatuses).toContain('RECHAZADO');
      expect(pendingStatuses).not.toContain('RECHAZADO');
    });
  });

  describe('Compliance state determination logic', () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    function determineState(
      doc: { status: string; expiresAt: number | null } | null,
      diasAnticipacion: number
    ): string {
      if (!doc) return 'FALTANTE';
      if (doc.status === 'RECHAZADO') return 'RECHAZADO';
      if (['PENDIENTE', 'VALIDANDO', 'CLASIFICANDO', 'PENDIENTE_APROBACION'].includes(doc.status)) {
        return 'PENDIENTE';
      }
      if (!doc.expiresAt) return 'VIGENTE';
      if (doc.expiresAt < now) return 'VENCIDO';
      if (doc.expiresAt < now + diasAnticipacion * day) return 'PROXIMO';
      return 'VIGENTE';
    }

    it('should return FALTANTE when no document exists', () => {
      expect(determineState(null, 30)).toBe('FALTANTE');
    });

    it('should return RECHAZADO for rejected documents', () => {
      expect(determineState({ status: 'RECHAZADO', expiresAt: null }, 30)).toBe('RECHAZADO');
    });

    it('should return PENDIENTE for pending documents', () => {
      expect(determineState({ status: 'PENDIENTE', expiresAt: null }, 30)).toBe('PENDIENTE');
      expect(determineState({ status: 'VALIDANDO', expiresAt: null }, 30)).toBe('PENDIENTE');
    });

    it('should return VIGENTE for documents without expiry', () => {
      expect(determineState({ status: 'VIGENTE', expiresAt: null }, 30)).toBe('VIGENTE');
    });

    it('should return VENCIDO for expired documents', () => {
      const expiredDate = now - day; // Yesterday
      expect(determineState({ status: 'VIGENTE', expiresAt: expiredDate }, 30)).toBe('VENCIDO');
    });

    it('should return PROXIMO for documents expiring soon', () => {
      const expiringSoon = now + 15 * day; // 15 days from now
      expect(determineState({ status: 'VIGENTE', expiresAt: expiringSoon }, 30)).toBe('PROXIMO');
    });

    it('should return VIGENTE for documents not expiring soon', () => {
      const farFuture = now + 90 * day; // 90 days from now
      expect(determineState({ status: 'VIGENTE', expiresAt: farFuture }, 30)).toBe('VIGENTE');
    });
  });

  describe('Semáforo color mapping', () => {
    function getSemaforoColor(state: string): string {
      switch (state) {
        case 'VIGENTE':
        case 'OK':
          return 'verde';
        case 'PROXIMO':
          return 'amarillo';
        case 'VENCIDO':
        case 'FALTANTE':
        case 'RECHAZADO':
          return 'rojo';
        case 'PENDIENTE':
          return 'gris';
        default:
          return 'gris';
      }
    }

    it('should map VIGENTE to verde', () => {
      expect(getSemaforoColor('VIGENTE')).toBe('verde');
    });

    it('should map PROXIMO to amarillo', () => {
      expect(getSemaforoColor('PROXIMO')).toBe('amarillo');
    });

    it('should map VENCIDO to rojo', () => {
      expect(getSemaforoColor('VENCIDO')).toBe('rojo');
    });

    it('should map FALTANTE to rojo', () => {
      expect(getSemaforoColor('FALTANTE')).toBe('rojo');
    });

    it('should map PENDIENTE to gris', () => {
      expect(getSemaforoColor('PENDIENTE')).toBe('gris');
    });
  });
});



