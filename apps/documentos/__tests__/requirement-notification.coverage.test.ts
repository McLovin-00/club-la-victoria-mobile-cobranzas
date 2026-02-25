/**
 * @jest-environment node
 */

const mockPrisma = {
  cliente: { findUnique: jest.fn() },
  documentTemplate: { findUnique: jest.fn() },
  equipoCliente: { findMany: jest.fn() },
  equipo: { findMany: jest.fn() },
  document: { findFirst: jest.fn() },
};

jest.mock('../src/config/database', () => ({ prisma: mockPrisma }));
jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../src/services/internal-notification.service', () => ({
  InternalNotificationService: { create: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../src/services/user-notification-resolver.service', () => ({
  UserNotificationResolverService: {
    resolveFromEntity: jest.fn().mockResolvedValue([]),
    getAdminInternosForTenant: jest.fn().mockResolvedValue([]),
  },
}));

import { RequirementNotificationService } from '../src/services/requirement-notification.service';
import { InternalNotificationService } from '../src/services/internal-notification.service';
import { UserNotificationResolverService } from '../src/services/user-notification-resolver.service';
import { AppLogger } from '../src/config/logger';

const mockResolveFromEntity = UserNotificationResolverService.resolveFromEntity as jest.Mock;
const mockGetAdminInternos = UserNotificationResolverService.getAdminInternosForTenant as jest.Mock;
const mockNotifCreate = InternalNotificationService.create as jest.Mock;

function makeRecipient(overrides: Record<string, unknown> = {}) {
  return {
    userId: 10,
    email: 'user@test.com',
    role: 'CHOFER',
    nombre: 'Juan',
    apellido: 'Perez',
    reason: 'direct' as const,
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('RequirementNotificationService', () => {
  // ======================================================================
  // onNewRequirementAdded
  // ======================================================================
  describe('onNewRequirementAdded', () => {
    it('returns 0 when buildContext fails (client not found)', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce(null);
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(0);
    });

    it('returns 0 when no affected entities', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(0);
    });

    it('returns notification count on success', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([makeRecipient()]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(1);
      expect(mockNotifCreate).toHaveBeenCalledTimes(1);
    });

    it('returns 0 and logs error when an exception occurs', async () => {
      mockPrisma.cliente.findUnique.mockRejectedValueOnce(new Error('DB error'));

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(0);
      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  // ======================================================================
  // buildContext (private, tested via onNewRequirementAdded)
  // ======================================================================
  describe('buildContext (via onNewRequirementAdded)', () => {
    it('returns null when template not found', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce(null);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 999, 'CHOFER' as any);

      expect(result).toBe(0);
      expect(AppLogger.warn).toHaveBeenCalledWith('Cliente o template no encontrado', { clienteId: 1, templateId: 999 });
    });

    it('builds context successfully when both client and template exist', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(0);
    });
  });

  // ======================================================================
  // findAffectedEntities (private, tested via onNewRequirementAdded)
  // ======================================================================
  describe('findAffectedEntities (via onNewRequirementAdded)', () => {
    function setupContext() {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
    }

    it('returns empty set when no equipos for client', async () => {
      setupContext();
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(0);
      expect(AppLogger.info).toHaveBeenCalledWith('No hay equipos asociados al cliente', { clienteId: 1 });
    });

    it('extracts CHOFER entities from equipos', async () => {
      setupContext();
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([]);

      await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(mockResolveFromEntity).toHaveBeenCalledWith(10, 'CHOFER', 100);
    });

    it('extracts CAMION entities from equipos', async () => {
      setupContext();
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([]);

      await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CAMION' as any);

      expect(mockResolveFromEntity).toHaveBeenCalledWith(10, 'CAMION', 200);
    });

    it('extracts ACOPLADO entities (null trailerId returns null key)', async () => {
      setupContext();
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'ACOPLADO' as any);

      expect(result).toBe(0);
    });

    it('extracts ACOPLADO entities with valid trailerId', async () => {
      setupContext();
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: 300, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([]);

      await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'ACOPLADO' as any);

      expect(mockResolveFromEntity).toHaveBeenCalledWith(10, 'ACOPLADO', 300);
    });

    it('extracts EMPRESA_TRANSPORTISTA entities (null returns null key)', async () => {
      setupContext();
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'EMPRESA_TRANSPORTISTA' as any);

      expect(result).toBe(0);
    });

    it('extracts EMPRESA_TRANSPORTISTA entities with valid id', async () => {
      setupContext();
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: 50 },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([]);

      await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'EMPRESA_TRANSPORTISTA' as any);

      expect(mockResolveFromEntity).toHaveBeenCalledWith(10, 'EMPRESA_TRANSPORTISTA', 50);
    });

    it('returns null key for unsupported entity type (default case)', async () => {
      setupContext();
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'UNKNOWN' as any);

      expect(result).toBe(0);
    });

    it('deduplicates entities across multiple equipos', async () => {
      setupContext();
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }, { equipoId: 2 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
        { driverId: 100, truckId: 201, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([]);

      await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(mockResolveFromEntity).toHaveBeenCalledTimes(1);
    });
  });

  // ======================================================================
  // notifyAffectedEntities (private, tested via onNewRequirementAdded)
  // ======================================================================
  describe('notifyAffectedEntities', () => {
    function setupFullPipeline() {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
    }

    it('skips entity that has approved document', async () => {
      setupFullPipeline();
      mockPrisma.document.findFirst.mockResolvedValueOnce({ id: 1 });

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(0);
      expect(mockResolveFromEntity).not.toHaveBeenCalled();
    });

    it('notifies entity missing document', async () => {
      setupFullPipeline();
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([makeRecipient(), makeRecipient({ userId: 11 })]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(2);
      expect(mockNotifCreate).toHaveBeenCalledTimes(2);
    });
  });

  // ======================================================================
  // entityHasApprovedDocument (private, tested via notifyAffectedEntities)
  // ======================================================================
  describe('entityHasApprovedDocument', () => {
    it('returns true when document found', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce({ id: 5 });

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(0);
    });

    it('returns false when document not found', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(0);
    });
  });

  // ======================================================================
  // notifyEntityRecipients (private, tested via notifyAffectedEntities)
  // ======================================================================
  describe('notifyEntityRecipients', () => {
    it('creates notifications for each recipient', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      const r1 = makeRecipient({ userId: 10 });
      const r2 = makeRecipient({ userId: 11 });
      mockResolveFromEntity.mockResolvedValueOnce([r1, r2]);

      const result = await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(result).toBe(2);
      expect(mockNotifCreate).toHaveBeenCalledTimes(2);
      expect(mockNotifCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_MISSING',
          userId: 10,
          priority: 'high',
        })
      );
    });
  });

  // ======================================================================
  // notifyAdminsNewRequirement
  // ======================================================================
  describe('notifyAdminsNewRequirement', () => {
    it('returns early when client not found', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce(null);
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });

      await RequirementNotificationService.notifyAdminsNewRequirement(10, 1, 2, 'CHOFER' as any);

      expect(mockGetAdminInternos).not.toHaveBeenCalled();
    });

    it('returns early when template not found', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce(null);

      await RequirementNotificationService.notifyAdminsNewRequirement(10, 1, 2, 'CHOFER' as any);

      expect(mockGetAdminInternos).not.toHaveBeenCalled();
    });

    it('creates notifications for each admin', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      const admin1 = makeRecipient({ userId: 30, role: 'ADMIN_INTERNO', reason: 'admin_interno' });
      const admin2 = makeRecipient({ userId: 31, role: 'ADMIN_INTERNO', reason: 'admin_interno' });
      mockGetAdminInternos.mockResolvedValueOnce([admin1, admin2]);

      await RequirementNotificationService.notifyAdminsNewRequirement(10, 1, 2, 'CHOFER' as any);

      expect(mockNotifCreate).toHaveBeenCalledTimes(2);
      expect(mockNotifCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NUEVO_REQUISITO_CLIENTE',
          userId: 30,
          priority: 'normal',
        })
      );
    });

    it('catches and logs errors', async () => {
      mockPrisma.cliente.findUnique.mockRejectedValueOnce(new Error('DB error'));

      await RequirementNotificationService.notifyAdminsNewRequirement(10, 1, 2, 'CHOFER' as any);

      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  // ======================================================================
  // getEntityTypeLabel (private, tested via notification messages)
  // ======================================================================
  describe('getEntityTypeLabel (via notification messages)', () => {
    function setupNotifPipeline(entityType: string) {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      mockPrisma.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
    }

    it('labels CHOFER correctly', async () => {
      setupNotifPipeline('CHOFER');
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([makeRecipient()]);

      await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CHOFER' as any);

      expect(mockNotifCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('choferes'),
        })
      );
    });

    it('labels CAMION correctly', async () => {
      setupNotifPipeline('CAMION');
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([makeRecipient()]);

      await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'CAMION' as any);

      expect(mockNotifCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('camiones'),
        })
      );
    });

    it('labels ACOPLADO correctly', async () => {
      setupNotifPipeline('ACOPLADO');
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: 300, empresaTransportistaId: null },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([makeRecipient()]);

      await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'ACOPLADO' as any);

      expect(mockNotifCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('acoplados'),
        })
      );
    });

    it('labels EMPRESA_TRANSPORTISTA correctly', async () => {
      setupNotifPipeline('EMPRESA_TRANSPORTISTA');
      mockPrisma.equipo.findMany.mockResolvedValueOnce([
        { driverId: 100, truckId: 200, trailerId: null, empresaTransportistaId: 50 },
      ]);
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);
      mockResolveFromEntity.mockResolvedValueOnce([makeRecipient()]);

      await RequirementNotificationService.onNewRequirementAdded(10, 1, 2, 'EMPRESA_TRANSPORTISTA' as any);

      expect(mockNotifCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('empresas transportistas'),
        })
      );
    });

    it('falls back to lowercase for unknown type (via notifyAdminsNewRequirement)', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Acme' });
      mockPrisma.documentTemplate.findUnique.mockResolvedValueOnce({ name: 'DNI' });
      mockGetAdminInternos.mockResolvedValueOnce([makeRecipient({ userId: 30 })]);

      await RequirementNotificationService.notifyAdminsNewRequirement(10, 1, 2, 'DADOR' as any);

      expect(mockNotifCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('dadores de carga'),
        })
      );
    });
  });
});
