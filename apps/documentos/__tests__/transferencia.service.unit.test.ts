/**
 * Tests unitarios para TransferenciaService
 * Cubre: crearSolicitud, listarSolicitudes, obtenerSolicitud,
 *        aprobarSolicitud, rechazarSolicitud, cancelarSolicitud
 * @jest-environment node
 */

jest.mock('../src/config/database', () => {
  const prismaMock: Record<string, any> = {
    dadorCarga: { findUnique: jest.fn() },
    equipo: { findMany: jest.fn() },
    internalNotification: { findMany: jest.fn(), create: jest.fn() },
    solicitudTransferencia: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    chofer: { findUnique: jest.fn(), update: jest.fn() },
    camion: { findUnique: jest.fn(), update: jest.fn() },
    acoplado: { findUnique: jest.fn(), update: jest.fn() },
    empresaTransportista: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  prismaMock.$transaction.mockImplementation((cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock));
  return { prisma: prismaMock };
});

jest.mock('../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../src/services/internal-notification.service', () => ({
  InternalNotificationService: { create: jest.fn() },
}));

import { TransferenciaService, EntidadTransferencia } from '../src/services/transferencia.service';
import { prisma as prismaClient } from '../src/config/database';

// NOSONAR: mock tipado genérico para tests
const prisma = prismaClient as any;

describe('TransferenciaService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('crearSolicitud', () => {
    it('crea solicitud correctamente cuando entidades existen', async () => {
      prisma.chofer.findUnique.mockResolvedValue({ dadorCargaId: 10 });
      prisma.solicitudTransferencia.findMany.mockResolvedValue([]);
      prisma.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador Solicitante' })
        .mockResolvedValueOnce({ razonSocial: 'Dador Actual' });
      prisma.equipo.findMany.mockResolvedValue([{ id: 100 }]);
      prisma.solicitudTransferencia.create.mockResolvedValue({
        id: 1,
        estado: 'PENDIENTE',
      });
      prisma.internalNotification.findMany.mockResolvedValue([{ userId: 5 }]);

      const entidades: EntidadTransferencia[] = [
        { tipo: 'CHOFER', id: 1, identificador: '12345678' },
      ];

      const result = await TransferenciaService.crearSolicitud({
        tenantEmpresaId: 1,
        solicitanteUserId: 2,
        solicitanteDadorId: 3,
        dadorActualId: 10,
        entidades,
        motivo: 'Test',
      });

      expect(result.id).toBe(1);
      expect(result.estado).toBe('PENDIENTE');
      expect(result.equiposAfectados).toEqual([100]);
    });

    it('lanza error cuando entidad no existe', async () => {
      prisma.chofer.findUnique.mockResolvedValue(null);

      const entidades: EntidadTransferencia[] = [
        { tipo: 'CHOFER', id: 999, identificador: '99999999' },
      ];

      await expect(
        TransferenciaService.crearSolicitud({
          tenantEmpresaId: 1,
          solicitanteUserId: 2,
          solicitanteDadorId: 3,
          dadorActualId: 10,
          entidades,
          motivo: 'Test',
        }),
      ).rejects.toThrow('no existe');
    });

    it('lanza error cuando entidad pertenece a otro dador', async () => {
      prisma.chofer.findUnique.mockResolvedValue({ dadorCargaId: 99 });

      const entidades: EntidadTransferencia[] = [
        { tipo: 'CHOFER', id: 1, identificador: '12345678' },
      ];

      await expect(
        TransferenciaService.crearSolicitud({
          tenantEmpresaId: 1,
          solicitanteUserId: 2,
          solicitanteDadorId: 3,
          dadorActualId: 10,
          entidades,
          motivo: 'Test',
        }),
      ).rejects.toThrow('no pertenece al dador indicado');
    });

    it('lanza error cuando hay solicitud pendiente con overlap', async () => {
      prisma.camion.findUnique.mockResolvedValue({ dadorCargaId: 10 });
      prisma.solicitudTransferencia.findMany.mockResolvedValue([
        { entidades: [{ tipo: 'CAMION', id: 5, identificador: 'AAA111' }] },
      ]);

      const entidades: EntidadTransferencia[] = [
        { tipo: 'CAMION', id: 5, identificador: 'AAA111' },
      ];

      await expect(
        TransferenciaService.crearSolicitud({
          tenantEmpresaId: 1,
          solicitanteUserId: 2,
          solicitanteDadorId: 3,
          dadorActualId: 10,
          entidades,
          motivo: 'Test',
        }),
      ).rejects.toThrow('Ya existe una solicitud pendiente');
    });
  });

  describe('listarSolicitudes', () => {
    it('retorna solicitudes paginadas', async () => {
      prisma.solicitudTransferencia.findMany.mockResolvedValue([
        { id: 1, entidades: [{ tipo: 'CHOFER', id: 1, identificador: '1' }], equiposAfectados: [10] },
      ]);
      prisma.solicitudTransferencia.count.mockResolvedValue(1);

      const result = await TransferenciaService.listarSolicitudes({
        tenantEmpresaId: 1,
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(1);
      expect(result.solicitudes).toHaveLength(1);
    });

    it('filtra por estado y dadorCargaId', async () => {
      prisma.solicitudTransferencia.findMany.mockResolvedValue([]);
      prisma.solicitudTransferencia.count.mockResolvedValue(0);

      await TransferenciaService.listarSolicitudes({
        tenantEmpresaId: 1,
        estado: 'PENDIENTE',
        dadorCargaId: 5,
      });

      expect(prisma.solicitudTransferencia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'PENDIENTE',
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('obtenerSolicitud', () => {
    it('retorna solicitud cuando existe', async () => {
      prisma.solicitudTransferencia.findFirst.mockResolvedValue({
        id: 1,
        entidades: [{ tipo: 'CHOFER', id: 1, identificador: '1' }],
        equiposAfectados: [10],
      });

      const result = await TransferenciaService.obtenerSolicitud(1, 1);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
    });

    it('retorna null cuando no existe', async () => {
      prisma.solicitudTransferencia.findFirst.mockResolvedValue(null);
      const result = await TransferenciaService.obtenerSolicitud(1, 999);
      expect(result).toBeNull();
    });
  });

  describe('aprobarSolicitud', () => {
    it('aprueba y transfiere entidades', async () => {
      prisma.solicitudTransferencia.findFirst.mockResolvedValue({
        id: 1,
        solicitanteUserId: 2,
        solicitanteDadorId: 3,
        solicitanteDadorNombre: 'Dador Sol',
        entidades: [{ tipo: 'CHOFER', id: 10, identificador: '12345' }],
      });
      prisma.chofer.update.mockResolvedValue({});
      prisma.solicitudTransferencia.update.mockResolvedValue({});
      prisma.internalNotification.findMany.mockResolvedValue([{ userId: 5 }]);

      const result = await TransferenciaService.aprobarSolicitud({
        tenantEmpresaId: 1,
        solicitudId: 1,
        aprobadorUserId: 9,
      });

      expect(result.success).toBe(true);
      expect(result.entidadesTransferidas).toBe(1);
    });

    it('retorna error cuando solicitud no encontrada', async () => {
      prisma.solicitudTransferencia.findFirst.mockResolvedValue(null);

      const result = await TransferenciaService.aprobarSolicitud({
        tenantEmpresaId: 1,
        solicitudId: 999,
        aprobadorUserId: 9,
      });

      expect(result.success).toBe(false);
    });

    it('transfiere CAMION, ACOPLADO y EMPRESA_TRANSPORTISTA', async () => {
      const entidades: EntidadTransferencia[] = [
        { tipo: 'CAMION', id: 20, identificador: 'ABC123' },
        { tipo: 'ACOPLADO', id: 30, identificador: 'DEF456' },
        { tipo: 'EMPRESA_TRANSPORTISTA', id: 40, identificador: '20123456789' },
      ];
      prisma.solicitudTransferencia.findFirst.mockResolvedValue({
        id: 2,
        solicitanteUserId: 2,
        solicitanteDadorId: 5,
        solicitanteDadorNombre: 'DadorX',
        entidades,
      });
      prisma.camion.update.mockResolvedValue({});
      prisma.acoplado.update.mockResolvedValue({});
      prisma.empresaTransportista.update.mockResolvedValue({});
      prisma.solicitudTransferencia.update.mockResolvedValue({});
      prisma.internalNotification.findMany.mockResolvedValue([]);

      const result = await TransferenciaService.aprobarSolicitud({
        tenantEmpresaId: 1,
        solicitudId: 2,
        aprobadorUserId: 9,
      });

      expect(result.entidadesTransferidas).toBe(3);
      expect(prisma.camion.update).toHaveBeenCalled();
      expect(prisma.acoplado.update).toHaveBeenCalled();
      expect(prisma.empresaTransportista.update).toHaveBeenCalled();
    });
  });

  describe('rechazarSolicitud', () => {
    it('rechaza solicitud pendiente', async () => {
      prisma.solicitudTransferencia.findFirst.mockResolvedValue({
        id: 1,
        solicitanteUserId: 2,
      });
      prisma.solicitudTransferencia.update.mockResolvedValue({});

      const result = await TransferenciaService.rechazarSolicitud({
        tenantEmpresaId: 1,
        solicitudId: 1,
        rechazadorUserId: 9,
        motivoRechazo: 'No procede',
      });

      expect(result.success).toBe(true);
    });

    it('retorna error cuando solicitud no encontrada', async () => {
      prisma.solicitudTransferencia.findFirst.mockResolvedValue(null);

      const result = await TransferenciaService.rechazarSolicitud({
        tenantEmpresaId: 1,
        solicitudId: 999,
        rechazadorUserId: 9,
        motivoRechazo: 'No procede',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('cancelarSolicitud', () => {
    it('cancela solicitud propia', async () => {
      prisma.solicitudTransferencia.findFirst.mockResolvedValue({
        id: 1,
        solicitanteUserId: 2,
      });
      prisma.solicitudTransferencia.update.mockResolvedValue({});

      const result = await TransferenciaService.cancelarSolicitud({
        tenantEmpresaId: 1,
        solicitudId: 1,
        usuarioId: 2,
      });

      expect(result.success).toBe(true);
    });

    it('retorna error cuando no es el solicitante', async () => {
      prisma.solicitudTransferencia.findFirst.mockResolvedValue(null);

      const result = await TransferenciaService.cancelarSolicitud({
        tenantEmpresaId: 1,
        solicitudId: 1,
        usuarioId: 99,
      });

      expect(result.success).toBe(false);
    });
  });
});
