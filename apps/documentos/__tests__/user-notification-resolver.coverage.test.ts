/**
 * @jest-environment node
 */

const mockPrisma = {
  $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  chofer: { findUnique: jest.fn(), findMany: jest.fn() },
  camion: { findUnique: jest.fn() },
  acoplado: { findUnique: jest.fn() },
  empresaTransportista: { findUnique: jest.fn(), findMany: jest.fn() },
  equipo: { findUnique: jest.fn() },
};

jest.mock('../src/config/database', () => ({ prisma: mockPrisma }));
jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { UserNotificationResolverService } from '../src/services/user-notification-resolver.service';
import { AppLogger } from '../src/config/logger';

function makePlatformUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    email: 'user@test.com',
    role: 'CHOFER',
    nombre: 'Juan',
    apellido: 'Perez',
    empresa_id: 10,
    dador_carga_id: null,
    empresa_transportista_id: null,
    chofer_id: null,
    activo: true,
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('UserNotificationResolverService', () => {
  // ======================================================================
  // queryPlatformUsers (private, tested indirectly)
  // ======================================================================
  describe('queryPlatformUsers (via getAdminInternosForTenant)', () => {
    it('returns mapped users on success', async () => {
      const user = makePlatformUser({ role: 'ADMIN_INTERNO' });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([user]);

      const result = await UserNotificationResolverService.getAdminInternosForTenant(10);

      expect(result).toEqual([{
        userId: user.id,
        email: user.email,
        role: user.role,
        nombre: user.nombre,
        apellido: user.apellido,
        reason: 'admin_interno',
      }]);
    });

    it('returns empty array when query throws', async () => {
      mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('DB down'));

      const result = await UserNotificationResolverService.getAdminInternosForTenant(10);

      expect(result).toEqual([]);
      expect(AppLogger.error).toHaveBeenCalledWith('Error consultando platform_users:', expect.any(Error));
    });
  });

  // ======================================================================
  // getAdminInternosForTenant
  // ======================================================================
  describe('getAdminInternosForTenant', () => {
    it('maps all users to admin_interno reason', async () => {
      const users = [
        makePlatformUser({ id: 1, role: 'ADMIN_INTERNO' }),
        makePlatformUser({ id: 2, role: 'ADMIN_INTERNO', email: 'admin2@test.com' }),
      ];
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(users);

      const result = await UserNotificationResolverService.getAdminInternosForTenant(10);

      expect(result).toHaveLength(2);
      expect(result.every(r => r.reason === 'admin_interno')).toBe(true);
    });
  });

  // ======================================================================
  // resolveFromChofer
  // ======================================================================
  describe('resolveFromChofer', () => {
    it('returns chofer users with direct reason', async () => {
      const choferUser = makePlatformUser({ id: 5, chofer_id: 100 });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([choferUser]);
      mockPrisma.chofer.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: null,
        dadorCargaId: 200,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await UserNotificationResolverService.resolveFromChofer(10, 100);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ userId: 5, reason: 'direct' });
    });

    it('returns empty recipients when chofer not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrisma.chofer.findUnique.mockResolvedValueOnce(null);

      const result = await UserNotificationResolverService.resolveFromChofer(10, 999);

      expect(result).toEqual([]);
      expect(AppLogger.warn).toHaveBeenCalledWith('Chofer 999 no encontrado en documentos');
    });

    it('adds transportista chain when chofer has empresaTransportistaId', async () => {
      const choferUser = makePlatformUser({ id: 5 });
      const transportistaUser = makePlatformUser({ id: 6, role: 'TRANSPORTISTA' });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([choferUser])
        .mockResolvedValueOnce([transportistaUser])
        .mockResolvedValueOnce([]);

      mockPrisma.chofer.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: 50,
        dadorCargaId: 200,
      });

      const result = await UserNotificationResolverService.resolveFromChofer(10, 100);

      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({ userId: 6, reason: 'transportista_of_chofer' });
    });

    it('adds dador recipients with dador_of_chofer reason', async () => {
      const choferUser = makePlatformUser({ id: 5 });
      const dadorUser = makePlatformUser({ id: 7, role: 'DADOR_DE_CARGA' });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([choferUser])
        .mockResolvedValueOnce([dadorUser]);

      mockPrisma.chofer.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: null,
        dadorCargaId: 200,
      });

      const result = await UserNotificationResolverService.resolveFromChofer(10, 100);

      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({ userId: 7, reason: 'dador_of_chofer' });
    });

    it('deduplicates when transportista user is same as chofer user', async () => {
      const sameUser = makePlatformUser({ id: 5 });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([sameUser])
        .mockResolvedValueOnce([sameUser])
        .mockResolvedValueOnce([]);

      mockPrisma.chofer.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: 50,
        dadorCargaId: 200,
      });

      const result = await UserNotificationResolverService.resolveFromChofer(10, 100);

      expect(result).toHaveLength(1);
    });

    it('deduplicates dador when already added', async () => {
      const user = makePlatformUser({ id: 5 });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([user])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([user]);

      mockPrisma.chofer.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: 50,
        dadorCargaId: 200,
      });

      const result = await UserNotificationResolverService.resolveFromChofer(10, 100);

      expect(result).toHaveLength(1);
    });
  });

  // ======================================================================
  // resolveFromTransportista
  // ======================================================================
  describe('resolveFromTransportista', () => {
    it('returns transportista users with direct reason', async () => {
      const tUser = makePlatformUser({ id: 10, role: 'TRANSPORTISTA' });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([tUser]);

      const result = await UserNotificationResolverService.resolveFromTransportista(10, 50, true);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ userId: 10, reason: 'direct' });
    });

    it('skips dador lookup when skipDador is true', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await UserNotificationResolverService.resolveFromTransportista(10, 50, true);

      expect(result).toEqual([]);
      expect(mockPrisma.empresaTransportista.findUnique).not.toHaveBeenCalled();
    });

    it('adds dador users when skipDador is false and empresa has dadorCargaId', async () => {
      const tUser = makePlatformUser({ id: 10, role: 'TRANSPORTISTA' });
      const dadorUser = makePlatformUser({ id: 20, role: 'DADOR_DE_CARGA' });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([tUser])
        .mockResolvedValueOnce([dadorUser]);

      mockPrisma.empresaTransportista.findUnique.mockResolvedValueOnce({ dadorCargaId: 300 });

      const result = await UserNotificationResolverService.resolveFromTransportista(10, 50);

      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({ userId: 20, reason: 'dador_of_transportista' });
    });

    it('does not add dador when empresa has no dadorCargaId', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrisma.empresaTransportista.findUnique.mockResolvedValueOnce({ dadorCargaId: null });

      const result = await UserNotificationResolverService.resolveFromTransportista(10, 50);

      expect(result).toEqual([]);
    });

    it('does not add dador when empresa not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrisma.empresaTransportista.findUnique.mockResolvedValueOnce(null);

      const result = await UserNotificationResolverService.resolveFromTransportista(10, 50);

      expect(result).toEqual([]);
    });

    it('deduplicates dador already present as transportista', async () => {
      const sameUser = makePlatformUser({ id: 10, role: 'TRANSPORTISTA' });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([sameUser])
        .mockResolvedValueOnce([sameUser]);

      mockPrisma.empresaTransportista.findUnique.mockResolvedValueOnce({ dadorCargaId: 300 });

      const result = await UserNotificationResolverService.resolveFromTransportista(10, 50);

      expect(result).toHaveLength(1);
    });
  });

  // ======================================================================
  // resolveFromDador
  // ======================================================================
  describe('resolveFromDador', () => {
    it('returns dador users with direct reason', async () => {
      const dUser = makePlatformUser({ id: 15, role: 'DADOR_DE_CARGA' });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([dUser]);

      const result = await UserNotificationResolverService.resolveFromDador(10, 200);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ userId: 15, reason: 'direct' });
    });

    it('returns empty when no dador users found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await UserNotificationResolverService.resolveFromDador(10, 200);

      expect(result).toEqual([]);
    });
  });

  // ======================================================================
  // resolveFromEntity
  // ======================================================================
  describe('resolveFromEntity', () => {
    it('delegates CHOFER to resolveFromChofer', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      mockPrisma.chofer.findUnique.mockResolvedValueOnce(null);

      await UserNotificationResolverService.resolveFromEntity(10, 'CHOFER' as any, 100);

      expect(mockPrisma.chofer.findUnique).toHaveBeenCalled();
    });

    it('handles CAMION with empresaTransportistaId', async () => {
      mockPrisma.camion.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: 50,
        dadorCargaId: null,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrisma.empresaTransportista.findUnique.mockResolvedValueOnce(null);

      const result = await UserNotificationResolverService.resolveFromEntity(10, 'CAMION' as any, 1);

      expect(mockPrisma.camion.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { empresaTransportistaId: true, dadorCargaId: true },
      });
      expect(result).toEqual([]);
    });

    it('handles CAMION with dadorCargaId fallback (no empresaTransportistaId)', async () => {
      const dadorUser = makePlatformUser({ id: 20, role: 'DADOR_DE_CARGA' });
      mockPrisma.camion.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: null,
        dadorCargaId: 300,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([dadorUser]);

      const result = await UserNotificationResolverService.resolveFromEntity(10, 'CAMION' as any, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ userId: 20, reason: 'direct' });
    });

    it('handles CAMION not found', async () => {
      mockPrisma.camion.findUnique.mockResolvedValueOnce(null);

      const result = await UserNotificationResolverService.resolveFromEntity(10, 'CAMION' as any, 999);

      expect(result).toEqual([]);
    });

    it('handles ACOPLADO with empresaTransportistaId', async () => {
      mockPrisma.acoplado.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: 60,
        dadorCargaId: null,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrisma.empresaTransportista.findUnique.mockResolvedValueOnce(null);

      const result = await UserNotificationResolverService.resolveFromEntity(10, 'ACOPLADO' as any, 2);

      expect(mockPrisma.acoplado.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
        select: { empresaTransportistaId: true, dadorCargaId: true },
      });
      expect(result).toEqual([]);
    });

    it('handles ACOPLADO with dadorCargaId fallback', async () => {
      const dadorUser = makePlatformUser({ id: 25, role: 'DADOR_DE_CARGA' });
      mockPrisma.acoplado.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: null,
        dadorCargaId: 400,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([dadorUser]);

      const result = await UserNotificationResolverService.resolveFromEntity(10, 'ACOPLADO' as any, 2);

      expect(result).toHaveLength(1);
    });

    it('handles ACOPLADO not found', async () => {
      mockPrisma.acoplado.findUnique.mockResolvedValueOnce(null);

      const result = await UserNotificationResolverService.resolveFromEntity(10, 'ACOPLADO' as any, 999);

      expect(result).toEqual([]);
    });

    it('handles CAMION with neither empresaTransportistaId nor dadorCargaId', async () => {
      mockPrisma.camion.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: null,
        dadorCargaId: null,
      });

      const result = await UserNotificationResolverService.resolveFromEntity(10, 'CAMION' as any, 1);

      expect(result).toEqual([]);
    });

    it('delegates EMPRESA_TRANSPORTISTA to resolveFromTransportista', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrisma.empresaTransportista.findUnique.mockResolvedValueOnce(null);

      const result = await UserNotificationResolverService.resolveFromEntity(10, 'EMPRESA_TRANSPORTISTA' as any, 50);

      expect(result).toEqual([]);
    });

    it('returns empty array and logs warning for unsupported entity type', async () => {
      const result = await UserNotificationResolverService.resolveFromEntity(10, 'UNKNOWN' as any, 1);

      expect(result).toEqual([]);
      expect(AppLogger.warn).toHaveBeenCalledWith('EntityType no soportado para resolución: UNKNOWN');
    });
  });

  // ======================================================================
  // resolveFromEquipo
  // ======================================================================
  describe('resolveFromEquipo', () => {
    it('returns empty array when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValueOnce(null);

      const result = await UserNotificationResolverService.resolveFromEquipo(999);

      expect(result).toEqual([]);
      expect(AppLogger.warn).toHaveBeenCalledWith('Equipo 999 no encontrado');
    });

    it('resolves full chain with dedup', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValueOnce({
        tenantEmpresaId: 10,
        dadorCargaId: 200,
        empresaTransportistaId: 50,
        driverId: 100,
      });

      const choferUser = makePlatformUser({ id: 1, role: 'CHOFER' });
      const transportistaUser = makePlatformUser({ id: 2, role: 'TRANSPORTISTA' });
      const dadorUser = makePlatformUser({ id: 3, role: 'DADOR_DE_CARGA' });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([choferUser])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([transportistaUser])
        .mockResolvedValueOnce([dadorUser]);

      mockPrisma.chofer.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: null,
        dadorCargaId: 200,
      });

      const result = await UserNotificationResolverService.resolveFromEquipo(1);

      expect(result).toHaveLength(3);
    });

    it('deduplicates users across chofer/transportista/dador chains', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValueOnce({
        tenantEmpresaId: 10,
        dadorCargaId: 200,
        empresaTransportistaId: 50,
        driverId: 100,
      });

      const sameUser = makePlatformUser({ id: 1 });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([sameUser])
        .mockResolvedValueOnce([sameUser])
        .mockResolvedValueOnce([sameUser])
        .mockResolvedValueOnce([sameUser]);

      mockPrisma.chofer.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: 50,
        dadorCargaId: 200,
      });

      const result = await UserNotificationResolverService.resolveFromEquipo(1);

      expect(result).toHaveLength(1);
    });

    it('skips transportista chain when equipo has no empresaTransportistaId', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValueOnce({
        tenantEmpresaId: 10,
        dadorCargaId: 200,
        empresaTransportistaId: null,
        driverId: 100,
      });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrisma.chofer.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: null,
        dadorCargaId: 200,
      });

      const result = await UserNotificationResolverService.resolveFromEquipo(1);

      expect(result).toEqual([]);
    });
  });

  // ======================================================================
  // resolveForTransferencia
  // ======================================================================
  describe('resolveForTransferencia', () => {
    it('delegates to getAdminInternosForTenant', async () => {
      const admin = makePlatformUser({ id: 30, role: 'ADMIN_INTERNO' });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([admin]);

      const result = await UserNotificationResolverService.resolveForTransferencia(10);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ reason: 'admin_interno' });
    });
  });

  // ======================================================================
  // resolveAllFromDadorCarga
  // ======================================================================
  describe('resolveAllFromDadorCarga', () => {
    it('resolves dador + transportistas + choferes with dedup', async () => {
      const dadorUser = makePlatformUser({ id: 1, role: 'DADOR_DE_CARGA' });
      const transportistaUser = makePlatformUser({ id: 2, role: 'TRANSPORTISTA' });
      const choferUser = makePlatformUser({ id: 3, role: 'CHOFER' });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([dadorUser])
        .mockResolvedValueOnce([transportistaUser])
        .mockResolvedValueOnce([choferUser]);

      mockPrisma.empresaTransportista.findMany.mockResolvedValueOnce([{ id: 50 }]);
      mockPrisma.chofer.findMany.mockResolvedValueOnce([{ id: 100 }]);

      const result = await UserNotificationResolverService.resolveAllFromDadorCarga(10, 200);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ userId: 1, reason: 'direct' });
      expect(result[1]).toMatchObject({ userId: 2, reason: 'dador_of_transportista' });
      expect(result[2]).toMatchObject({ userId: 3, reason: 'dador_of_chofer' });
    });

    it('deduplicates across all chains', async () => {
      const sameUser = makePlatformUser({ id: 1 });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([sameUser])
        .mockResolvedValueOnce([sameUser])
        .mockResolvedValueOnce([sameUser]);

      mockPrisma.empresaTransportista.findMany.mockResolvedValueOnce([{ id: 50 }]);
      mockPrisma.chofer.findMany.mockResolvedValueOnce([{ id: 100 }]);

      const result = await UserNotificationResolverService.resolveAllFromDadorCarga(10, 200);

      expect(result).toHaveLength(1);
    });

    it('handles no empresas and no choferes', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrisma.empresaTransportista.findMany.mockResolvedValueOnce([]);
      mockPrisma.chofer.findMany.mockResolvedValueOnce([]);

      const result = await UserNotificationResolverService.resolveAllFromDadorCarga(10, 200);

      expect(result).toEqual([]);
    });

    it('handles multiple empresas and multiple choferes', async () => {
      const t1 = makePlatformUser({ id: 10 });
      const t2 = makePlatformUser({ id: 11 });
      const c1 = makePlatformUser({ id: 20 });
      const c2 = makePlatformUser({ id: 21 });

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([t1])
        .mockResolvedValueOnce([t2])
        .mockResolvedValueOnce([c1])
        .mockResolvedValueOnce([c2]);

      mockPrisma.empresaTransportista.findMany.mockResolvedValueOnce([{ id: 50 }, { id: 51 }]);
      mockPrisma.chofer.findMany.mockResolvedValueOnce([{ id: 100 }, { id: 101 }]);

      const result = await UserNotificationResolverService.resolveAllFromDadorCarga(10, 200);

      expect(result).toHaveLength(4);
    });
  });
});
