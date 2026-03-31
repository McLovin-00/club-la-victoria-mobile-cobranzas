/**
 * Tenant Scope - Unit Tests
 * Tests for multi-tenant visibility rules in helpdesk
 */

import { ticketCanBeViewedBy, resolveStaffTenantScope } from '../../services/tenant-scope';
import type { TicketViewerContext } from '../../types';

describe('tenant-scope', () => {
  const superadmin: TicketViewerContext = { userId: 1, role: 'SUPERADMIN', empresaId: null };
  const resolver: TicketViewerContext = { userId: 2, role: 'RESOLVER', empresaId: null };
  const adminEmpresa10: TicketViewerContext = { userId: 30, role: 'ADMIN', empresaId: 10 };
  const adminInternoEmpresa10: TicketViewerContext = { userId: 40, role: 'ADMIN_INTERNO', empresaId: 10 };
  const adminEmpresa20: TicketViewerContext = { userId: 50, role: 'ADMIN', empresaId: 20 };
  const user5: TicketViewerContext = { userId: 5, role: 'USER', empresaId: 10 };
  const user99: TicketViewerContext = { userId: 99, role: 'USER', empresaId: 20 };

  describe('ticketCanBeViewedBy', () => {
    it('SUPERADMIN ve cualquier ticket', () => {
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: 10 }, superadmin)).toBe(true);
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: null }, superadmin)).toBe(true);
      expect(ticketCanBeViewedBy({ createdBy: 5, empresaId: 20 }, superadmin)).toBe(true);
    });

    it('RESOLVER ve cualquier ticket', () => {
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: 10 }, resolver)).toBe(true);
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: null }, resolver)).toBe(true);
    });

    it('el creador ve su propio ticket', () => {
      expect(ticketCanBeViewedBy({ createdBy: 5, empresaId: 10 }, user5)).toBe(true);
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: null }, user99)).toBe(true);
    });

    it('el creador ve su ticket aunque el admin de otro tenant no', () => {
      // User5 creo ticket en empresa 10, Admin de empresa 20 NO lo ve (solo ve propios)
      expect(ticketCanBeViewedBy({ createdBy: 5, empresaId: 10 }, adminEmpresa20)).toBe(false);
      // Pero el propio user5 si lo ve
      expect(ticketCanBeViewedBy({ createdBy: 5, empresaId: 10 }, user5)).toBe(true);
    });

    it('ADMIN solo ve sus propios tickets (no los de otros usuarios de su empresa)', () => {
      // Admin de empresa 10 creo ticket (createdBy = 30)
      expect(ticketCanBeViewedBy({ createdBy: 30, empresaId: 10 }, adminEmpresa10)).toBe(true);
      // Otro usuario de empresa 10 creo ticket - Admin NO lo ve
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: 10 }, adminEmpresa10)).toBe(false);
    });

    it('ADMIN_INTERNO solo ve sus propios tickets', () => {
      expect(ticketCanBeViewedBy({ createdBy: 40, empresaId: 10 }, adminInternoEmpresa10)).toBe(true);
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: 10 }, adminInternoEmpresa10)).toBe(false);
    });

    it('ticket sin empresaId solo lo ve el creador o SUPERADMIN/RESOLVER', () => {
      expect(ticketCanBeViewedBy({ createdBy: 5, empresaId: null }, user5)).toBe(true);
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: null }, user5)).toBe(false);
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: null }, superadmin)).toBe(true);
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: null }, resolver)).toBe(true);
    });

    it('USER no ve tickets de otros usuarios', () => {
      expect(ticketCanBeViewedBy({ createdBy: 5, empresaId: 10 }, user99)).toBe(false);
      expect(ticketCanBeViewedBy({ createdBy: 99, empresaId: 20 }, user5)).toBe(false);
    });
  });

  describe('resolveStaffTenantScope', () => {
    it('SUPERADMIN ve todos los tickets', () => {
      const scope = resolveStaffTenantScope('SUPERADMIN', null);
      expect(scope.kind).toBe('all');
    });

    it('RESOLVER ve todos los tickets', () => {
      const scope = resolveStaffTenantScope('RESOLVER', null);
      expect(scope.kind).toBe('all');
    });

    it('ADMIN sin empresa solo ve sus propios tickets', () => {
      const scope = resolveStaffTenantScope('ADMIN', null);
      expect(scope.kind).toBe('own');
    });

    it('ADMIN con empresa solo ve sus propios tickets', () => {
      const scope = resolveStaffTenantScope('ADMIN', 10);
      expect(scope.kind).toBe('own');
    });

    it('ADMIN_INTERNO solo ve sus propios tickets', () => {
      const scope = resolveStaffTenantScope('ADMIN_INTERNO', 10);
      expect(scope.kind).toBe('own');
    });

    it('USER no tiene acceso staff', () => {
      const scope = resolveStaffTenantScope('USER', 10);
      expect(scope.kind).toBe('none');
    });
  });
});
