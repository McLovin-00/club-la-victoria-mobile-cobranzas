/**
 * Unit tests for TransferenciaService
 * Pruebas unitarias para el servicio de gestión de transferencias de entidades
 * @jest-environment node
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mocks necesarios para el servicio
jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/internal-notification.service', () => ({
  InternalNotificationService: {
    create: jest.fn(),
  },
}));

import { TransferenciaService } from '../../src/services/transferencia.service';
import { AppLogger } from '../../src/config/logger';
import { InternalNotificationService } from '../../src/services/internal-notification.service';

describe('TransferenciaService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Tests para crearSolicitud
  // ============================================================================
  describe('crearSolicitud', () => {
    it('debe crear solicitud de transferencia exitosamente para un CHOFER', async () => {
      // Arrange: Preparar datos de entrada
      const input = {
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteUserEmail: 'usuario@example.com',
        solicitanteDadorId: 10,
        dadorActualId: 5,
        entidades: [
          {
            tipo: 'CHOFER' as const,
            id: 50,
            identificador: '12345678',
            nombre: 'Juan Pérez',
          },
        ],
        motivo: 'Cambio de dador de carga',
      };

      // Mock: No hay solicitudes pendientes
      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([]);

      // Mock: Obtener nombres de dadores
      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador Solicitante' })
        .mockResolvedValueOnce({ razonSocial: 'Dador Actual' });

      // Mock: Buscar equipos afectados (hay 1 equipo)
      prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 200 }]);

      // Mock: Crear solicitud
      const solicitudCreada = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteUserEmail: 'usuario@example.com',
        solicitanteDadorId: 10,
        solicitanteDadorNombre: 'Dador Solicitante',
        dadorActualId: 5,
        dadorActualNombre: 'Dador Actual',
        entidades: input.entidades,
        equiposAfectados: [200],
        estado: 'PENDIENTE',
        motivo: input.motivo,
      };

      prismaMock.solicitudTransferencia.create.mockResolvedValueOnce(solicitudCreada as any);

      // Mock: No hay admins para notificar (retorna array vacío)
      // obtenerAdminsParaNotificar hace warn pero no falla

      // Act: Crear solicitud
      const resultado = await TransferenciaService.crearSolicitud(input);

      // Assert: Verificar resultado
      expect(resultado.id).toBe(1);
      expect(resultado.estado).toBe('PENDIENTE');
      expect(resultado.entidades).toHaveLength(1);
      expect(resultado.equiposAfectados).toEqual([200]);

      // Verificar que se buscaron las solicitudes pendientes
      expect(prismaMock.solicitudTransferencia.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          solicitanteDadorId: 10,
          dadorActualId: 5,
          estado: 'PENDIENTE',
        },
      });

      // Verificar que se buscaron equipos afectados
      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          dadorCargaId: 5,
          activo: true,
          driverId: 50,
        },
        select: { id: true },
      });

      // Verificar que se creó la solicitud
      expect(prismaMock.solicitudTransferencia.create).toHaveBeenCalled();

      // Verificar logs
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Creando solicitud de transferencia'),
        expect.any(Object)
      );
    });

    it('debe crear solicitud para múltiples entidades (CHOFER, CAMION, ACOPLADO, EMPRESA_TRANSPORTISTA)', async () => {
      // Arrange: Múltiples entidades
      const input = {
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteUserEmail: 'usuario@example.com',
        solicitanteDadorId: 10,
        dadorActualId: 5,
        entidades: [
          { tipo: 'CHOFER' as const, id: 50, identificador: '12345678' },
          { tipo: 'CAMION' as const, id: 60, identificador: 'ABC123' },
          { tipo: 'ACOPLADO' as const, id: 70, identificador: 'DEF456' },
          { tipo: 'EMPRESA_TRANSPORTISTA' as const, id: 80, identificador: 'EMP001' },
        ],
      };

      // Mock: No hay solicitudes pendientes
      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([]);

      // Mock: Obtener nombres de dadores
      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador Solicitante' })
        .mockResolvedValueOnce({ razonSocial: 'Dador Actual' });

      // Mock: Equipos afectados para cada entidad
      prismaMock.equipo.findMany
        .mockResolvedValueOnce([{ id: 200 }]) // CHOFER
        .mockResolvedValueOnce([{ id: 201 }]) // CAMION
        .mockResolvedValueOnce([{ id: 202 }, { id: 203 }]) // ACOPLADO
        .mockResolvedValueOnce([{ id: 204 }]); // EMPRESA_TRANSPORTISTA

      // Mock: Crear solicitud
      prismaMock.solicitudTransferencia.create.mockResolvedValueOnce({
        id: 2,
        estado: 'PENDIENTE',
        entidades: input.entidades,
        equiposAfectados: [200, 201, 202, 203, 204],
      } as any);

      // Act
      const resultado = await TransferenciaService.crearSolicitud(input);

      // Assert: Debe haber 4 llamadas a equipo.findMany (una por entidad)
      expect(prismaMock.equipo.findMany).toHaveBeenCalledTimes(4);

      // Verificar que se buscó cada tipo de entidad
      expect(prismaMock.equipo.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          tenantEmpresaId: 1,
          dadorCargaId: 5,
          activo: true,
          driverId: 50,
        },
        select: { id: true },
      });

      expect(prismaMock.equipo.findMany).toHaveBeenNthCalledWith(2, {
        where: {
          tenantEmpresaId: 1,
          dadorCargaId: 5,
          activo: true,
          truckId: 60,
        },
        select: { id: true },
      });

      expect(resultado.equiposAfectados).toEqual([200, 201, 202, 203, 204]);
    });

    it('debe rechazar si hay overlap con solicitud pendiente existente', async () => {
      // Arrange: Hay una solicitud pendiente con la misma entidad
      const input = {
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 10,
        dadorActualId: 5,
        entidades: [
          { tipo: 'CHOFER' as const, id: 50, identificador: '12345678' },
        ],
      };

      const solicitudExistente = {
        id: 999,
        entidades: [
          { tipo: 'CHOFER', id: 50, identificador: '12345678' }, // Mismo CHOFER
        ],
      };

      // Mock: Hay una solicitud pendiente
      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([solicitudExistente as any]);

      // Act & Assert: Debe lanzar error
      await expect(TransferenciaService.crearSolicitud(input)).rejects.toThrow(
        /Ya existe una solicitud pendiente para CHOFER/
      );

      // Verificar que NO se intentó crear
      expect(prismaMock.solicitudTransferencia.create).not.toHaveBeenCalled();
    });

    it('debe rechazar si hay overlap parcial con solicitud pendiente', async () => {
      // Arrange: Solicitud con múltiples entidades, overlap en una
      const input = {
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 10,
        dadorActualId: 5,
        entidades: [
          { tipo: 'CHOFER' as const, id: 50, identificador: '12345678' },
          { tipo: 'CAMION' as const, id: 60, identificador: 'ABC123' },
        ],
      };

      const solicitudExistente = {
        id: 999,
        entidades: [
          { tipo: 'CHOFER', id: 50, identificador: '12345678' }, // Overlap aquí
        ],
      };

      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([solicitudExistente as any]);

      // Act & Assert
      await expect(TransferenciaService.crearSolicitud(input)).rejects.toThrow(
        /Ya existe una solicitud pendiente para CHOFER/
      );

      expect(prismaMock.solicitudTransferencia.create).not.toHaveBeenCalled();
    });

    it('debe permitir crear si no hay overlap (entidades diferentes)', async () => {
      // Arrange: Solicitud existente con CHOFER 50, nueva solicitud con CHOFER 51
      const input = {
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 10,
        dadorActualId: 5,
        entidades: [
          { tipo: 'CHOFER' as const, id: 51, identificador: '87654321' }, // ID diferente
        ],
      };

      const solicitudExistente = {
        id: 999,
        entidades: [
          { tipo: 'CHOFER', id: 50, identificador: '12345678' }, // ID diferente
        ],
      };

      // Mock
      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([solicitudExistente as any]);
      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador A' })
        .mockResolvedValueOnce({ razonSocial: 'Dador B' });
      prismaMock.equipo.findMany.mockResolvedValueOnce([]);
      prismaMock.solicitudTransferencia.create.mockResolvedValueOnce({
        id: 1,
        estado: 'PENDIENTE',
        entidades: input.entidades,
        equiposAfectados: [],
      } as any);

      // Act
      const resultado = await TransferenciaService.crearSolicitud(input);

      // Assert: Debe crearse exitosamente
      expect(resultado.id).toBe(1);
      expect(prismaMock.solicitudTransferencia.create).toHaveBeenCalled();
    });

    it('debe crear solicitud sin motivo (opcional)', async () => {
      // Arrange: Sin motivo
      const input = {
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 10,
        dadorActualId: 5,
        entidades: [{ tipo: 'CHOFER' as const, id: 50, identificador: '12345678' }],
        // motivo no incluido
      };

      // Mock
      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([]);
      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador A' })
        .mockResolvedValueOnce({ razonSocial: 'Dador B' });
      prismaMock.equipo.findMany.mockResolvedValueOnce([]);
      prismaMock.solicitudTransferencia.create.mockResolvedValueOnce({
        id: 1,
        estado: 'PENDIENTE',
        entidades: input.entidades,
        equiposAfectados: [],
      } as any);

      // Act
      const resultado = await TransferenciaService.crearSolicitud(input);

      // Assert
      expect(resultado.id).toBe(1);
      expect(prismaMock.solicitudTransferencia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            motivo: undefined,
          }),
        })
      );
    });

    it('debe manear cuando dador no existe (retorna null)', async () => {
      // Arrange: Dador no encontrado
      const input = {
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 999,
        dadorActualId: 5,
        entidades: [{ tipo: 'CHOFER' as const, id: 50, identificador: '12345678' }],
      };

      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([]);
      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce(null) // Dador solicitante no existe
        .mockResolvedValueOnce({ razonSocial: 'Dador B' });

      prismaMock.equipo.findMany.mockResolvedValueOnce([]);
      prismaMock.solicitudTransferencia.create.mockResolvedValueOnce({
        id: 1,
        estado: 'PENDIENTE',
        entidades: input.entidades,
        equiposAfectados: [],
        solicitanteDadorNombre: null,
      } as any);

      // Act
      const resultado = await TransferenciaService.crearSolicitud(input);

      // Assert: Debe crearse con nombre nulo
      expect(resultado.id).toBe(1);
      expect(prismaMock.solicitudTransferencia.create).toHaveBeenCalled();
    });

    it('debe manejar error en prisma.solicitudTransferencia.create', async () => {
      // Arrange: Error en create
      const input = {
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 10,
        dadorActualId: 5,
        entidades: [{ tipo: 'CHOFER' as const, id: 50, identificador: '12345678' }],
      };

      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([]);
      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador A' })
        .mockResolvedValueOnce({ razonSocial: 'Dador B' });
      prismaMock.equipo.findMany.mockResolvedValueOnce([]);
      prismaMock.solicitudTransferencia.create.mockRejectedValueOnce(
        new Error('Database error')
      );

      // Act & Assert
      await expect(TransferenciaService.crearSolicitud(input)).rejects.toThrow('Database error');
    });

    it('debe crear solicitud con array vacío de entidades', async () => {
      // Arrange: Array vacío (caso borde)
      const input = {
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 10,
        dadorActualId: 5,
        entidades: [],
      };

      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([]);
      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador A' })
        .mockResolvedValueOnce({ razonSocial: 'Dador B' });
      // No llamará a equipo.findMany porque no hay entidades
      prismaMock.solicitudTransferencia.create.mockResolvedValueOnce({
        id: 1,
        estado: 'PENDIENTE',
        entidades: [],
        equiposAfectados: [],
      } as any);

      // Act
      const resultado = await TransferenciaService.crearSolicitud(input);

      // Assert
      expect(resultado.equiposAfectados).toEqual([]);
      expect(prismaMock.equipo.findMany).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Tests para listarSolicitudes
  // ============================================================================
  describe('listarSolicitudes', () => {
    it('debe listar todas las solicitudes del tenant sin filtros', async () => {
      // Arrange: Sin filtros
      const mockSolicitudes = [
        {
          id: 1,
          tenantEmpresaId: 1,
          estado: 'PENDIENTE',
          entidades: [{ tipo: 'CHOFER', id: 50 }],
          equiposAfectados: [200],
        },
        {
          id: 2,
          tenantEmpresaId: 1,
          estado: 'APROBADA',
          entidades: [{ tipo: 'CAMION', id: 60 }],
          equiposAfectados: [201],
        },
      ];

      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce(mockSolicitudes as any);
      prismaMock.solicitudTransferencia.count.mockResolvedValueOnce(2);

      // Act
      const resultado = await TransferenciaService.listarSolicitudes({
        tenantEmpresaId: 1,
      });

      // Assert
      expect(resultado.solicitudes).toHaveLength(2);
      expect(resultado.total).toBe(2);
      expect(prismaMock.solicitudTransferencia.findMany).toHaveBeenCalledWith({
        where: { tenantEmpresaId: 1 },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('debe filtrar por estado PENDIENTE', async () => {
      // Arrange: Filtro por estado
      const mockSolicitudes = [
        {
          id: 1,
          tenantEmpresaId: 1,
          estado: 'PENDIENTE',
          entidades: [],
          equiposAfectados: [],
        },
      ];

      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce(mockSolicitudes as any);
      prismaMock.solicitudTransferencia.count.mockResolvedValueOnce(1);

      // Act
      const resultado = await TransferenciaService.listarSolicitudes({
        tenantEmpresaId: 1,
        estado: 'PENDIENTE',
      });

      // Assert
      expect(resultado.total).toBe(1);
      expect(prismaMock.solicitudTransferencia.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          estado: 'PENDIENTE',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('debe filtrar por dadorCargaId (solicitante o actual)', async () => {
      // Arrange: Filtro por dador
      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([] as any);
      prismaMock.solicitudTransferencia.count.mockResolvedValueOnce(0);

      // Act
      await TransferenciaService.listarSolicitudes({
        tenantEmpresaId: 1,
        dadorCargaId: 10,
      });

      // Assert: Debe usar OR para buscar como solicitante O dador actual
      expect(prismaMock.solicitudTransferencia.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          OR: [
            { solicitanteDadorId: 10 },
            { dadorActualId: 10 },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('debe aplicar paginación con limit y offset', async () => {
      // Arrange: Paginación personalizada
      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([] as any);
      prismaMock.solicitudTransferencia.count.mockResolvedValueOnce(100);

      // Act
      const resultado = await TransferenciaService.listarSolicitudes({
        tenantEmpresaId: 1,
        limit: 20,
        offset: 40,
      });

      // Assert
      expect(resultado.total).toBe(100);
      expect(prismaMock.solicitudTransferencia.findMany).toHaveBeenCalledWith({
        where: { tenantEmpresaId: 1 },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 40,
      });
    });

    it('debe combinar filtros de estado, dador y paginación', async () => {
      // Arrange: Todos los filtros combinados
      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([] as any);
      prismaMock.solicitudTransferencia.count.mockResolvedValueOnce(5);

      // Act
      await TransferenciaService.listarSolicitudes({
        tenantEmpresaId: 1,
        estado: 'RECHAZADA',
        dadorCargaId: 10,
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(prismaMock.solicitudTransferencia.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          estado: 'RECHAZADA',
          OR: [
            { solicitanteDadorId: 10 },
            { dadorActualId: 10 },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    it('debe retornar 0 si no hay solicitudes', async () => {
      // Arrange
      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([]);
      prismaMock.solicitudTransferencia.count.mockResolvedValueOnce(0);

      // Act
      const resultado = await TransferenciaService.listarSolicitudes({
        tenantEmpresaId: 1,
      });

      // Assert
      expect(resultado.solicitudes).toEqual([]);
      expect(resultado.total).toBe(0);
    });

    it('debe mapear equiposAfectados correctamente cuando es null o undefined', async () => {
      // Arrange: Solicitud con equiposAfectados null
      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        estado: 'PENDIENTE',
        entidades: [],
        equiposAfectados: null,
      };

      prismaMock.solicitudTransferencia.findMany.mockResolvedValueOnce([mockSolicitud] as any);
      prismaMock.solicitudTransferencia.count.mockResolvedValueOnce(1);

      // Act
      const resultado = await TransferenciaService.listarSolicitudes({
        tenantEmpresaId: 1,
      });

      // Assert: Debe convertir null a array vacío
      expect(resultado.solicitudes[0].equiposAfectados).toEqual([]);
    });
  });

  // ============================================================================
  // Tests para obtenerSolicitud
  // ============================================================================
  describe('obtenerSolicitud', () => {
    it('debe obtener solicitud por ID exitosamente', async () => {
      // Arrange
      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteUserEmail: 'usuario@example.com',
        estado: 'PENDIENTE',
        entidades: [{ tipo: 'CHOFER', id: 50 }],
        equiposAfectados: [200],
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);

      // Act
      const resultado = await TransferenciaService.obtenerSolicitud(1, 1);

      // Assert
      expect(resultado).not.toBeNull();
      expect(resultado?.id).toBe(1);
      expect(resultado?.entidades).toEqual([{ tipo: 'CHOFER', id: 50 }]);
      expect(prismaMock.solicitudTransferencia.findFirst).toHaveBeenCalledWith({
        where: { id: 1, tenantEmpresaId: 1 },
      });
    });

    it('debe retornar null si solicitud no existe', async () => {
      // Arrange
      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(null);

      // Act
      const resultado = await TransferenciaService.obtenerSolicitud(1, 999);

      // Assert
      expect(resultado).toBeNull();
    });

    it('debe retornar null si tenant no coincide', async () => {
      // Arrange: Busca en tenant diferente
      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(null);

      // Act
      const resultado = await TransferenciaService.obtenerSolicitud(2, 1);

      // Assert
      expect(resultado).toBeNull();
      expect(prismaMock.solicitudTransferencia.findFirst).toHaveBeenCalledWith({
        where: { id: 1, tenantEmpresaId: 2 },
      });
    });

    it('debe mapear equiposAfectados cuando es null', async () => {
      // Arrange
      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        estado: 'PENDIENTE',
        entidades: [],
        equiposAfectados: null,
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);

      // Act
      const resultado = await TransferenciaService.obtenerSolicitud(1, 1);

      // Assert
      expect(resultado?.equiposAfectados).toEqual([]);
    });
  });

  // ============================================================================
  // Tests para aprobarSolicitud
  // ============================================================================
  describe('aprobarSolicitud', () => {
    it('debe aprobar solicitud y transferir entidades en transacción', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        aprobadorUserId: 200,
        aprobadorUserEmail: 'admin@example.com',
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteUserEmail: 'usuario@example.com',
        solicitanteDadorId: 10,
        estado: 'PENDIENTE',
        entidades: [
          { tipo: 'CHOFER', id: 50 },
          { tipo: 'CAMION', id: 60 },
        ],
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);

      // Mock transaction: Se invoca con fn que modifica mediante tx
      const txMock = {
        chofer: {
          update: jest.fn().mockResolvedValue({}),
        },
        camion: {
          update: jest.fn().mockResolvedValue({}),
        },
        acoplado: {
          update: jest.fn().mockResolvedValue({}),
        },
        empresaTransportista: {
          update: jest.fn().mockResolvedValue({}),
        },
        solicitudTransferencia: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      prismaMock.$transaction.mockImplementation(async (fn) => {
        return fn(txMock);
      });

      // Mock: Notificación
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      const resultado = await TransferenciaService.aprobarSolicitud(params);

      // Assert
      expect(resultado.success).toBe(true);
      expect(resultado.entidadesTransferidas).toBe(2);
      expect(resultado.message).toContain('Transferencia completada: 2 entidad(es) transferida(s)');

      // Verificar que se buscó la solicitud pendiente
      expect(prismaMock.solicitudTransferencia.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantEmpresaId: 1,
          estado: 'PENDIENTE',
        },
      });

      // Verificar que se ejecutó la transacción
      expect(prismaMock.$transaction).toHaveBeenCalled();

      // Verificar que se actualizó el CHOFER
      expect(txMock.chofer.update).toHaveBeenCalledWith({
        where: { id: 50 },
        data: { dadorCargaId: 10 },
      });

      // Verificar que se actualizó el CAMION
      expect(txMock.camion.update).toHaveBeenCalledWith({
        where: { id: 60 },
        data: { dadorCargaId: 10 },
      });

      // Verificar que se actualizó la solicitud a APROBADA
      expect(txMock.solicitudTransferencia.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          estado: 'APROBADA',
          resueltoPorUserId: 200,
          resueltoPorUserEmail: 'admin@example.com',
        }),
      });

      // Verificar que se notificó al solicitante
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 100,
          type: 'TRANSFERENCIA_APROBADA',
        })
      );
    });

    it('debe transferir ACOPLADO y EMPRESA_TRANSPORTISTA correctamente', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        aprobadorUserId: 200,
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 10,
        estado: 'PENDIENTE',
        entidades: [
          { tipo: 'ACOPLADO', id: 70 },
          { tipo: 'EMPRESA_TRANSPORTISTA', id: 80 },
        ],
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);

      const txMock = {
        chofer: { update: jest.fn() },
        camion: { update: jest.fn() },
        acoplado: { update: jest.fn().mockResolvedValue({}) },
        empresaTransportista: { update: jest.fn().mockResolvedValue({}) },
        solicitudTransferencia: { update: jest.fn().mockResolvedValue({}) },
      };

      prismaMock.$transaction.mockImplementation(async (fn) => fn(txMock));
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      const resultado = await TransferenciaService.aprobarSolicitud(params);

      // Assert
      expect(resultado.entidadesTransferidas).toBe(2);
      expect(txMock.acoplado.update).toHaveBeenCalledWith({
        where: { id: 70 },
        data: { dadorCargaId: 10 },
      });
      expect(txMock.empresaTransportista.update).toHaveBeenCalledWith({
        where: { id: 80 },
        data: { dadorCargaId: 10 },
      });
    });

    it('debe retornar error si solicitud no es encontrada', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 999,
        aprobadorUserId: 200,
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(null);

      // Act
      const resultado = await TransferenciaService.aprobarSolicitud(params);

      // Assert
      expect(resultado.success).toBe(false);
      expect(resultado.message).toContain('Solicitud no encontrada o ya procesada');
      expect(resultado.entidadesTransferidas).toBe(0);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('debe retornar error si solicitud no está en estado PENDIENTE', async () => {
      // Arrange: Solicitud ya aprobada
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        aprobadorUserId: 200,
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(null); // findFirst con estado PENDIENTE retorna null

      // Act
      const resultado = await TransferenciaService.aprobarSolicitud(params);

      // Assert
      expect(resultado.success).toBe(false);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('debe manejar error en transacción', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        aprobadorUserId: 200,
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 10,
        estado: 'PENDIENTE',
        entidades: [{ tipo: 'CHOFER', id: 50 }],
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);
      prismaMock.$transaction.mockRejectedValueOnce(new Error('Transaction failed'));

      // Act & Assert
      await expect(TransferenciaService.aprobarSolicitud(params)).rejects.toThrow('Transaction failed');
    });

    it('debe retornar 0 entidades transferidas si array de entidades está vacío', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        aprobadorUserId: 200,
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteDadorId: 10,
        estado: 'PENDIENTE',
        entidades: [], // Array vacío
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);

      const txMock = {
        chofer: { update: jest.fn() },
        camion: { update: jest.fn() },
        acoplado: { update: jest.fn() },
        empresaTransportista: { update: jest.fn() },
        solicitudTransferencia: { update: jest.fn().mockResolvedValue({}) },
      };

      prismaMock.$transaction.mockImplementation(async (fn) => fn(txMock));
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      const resultado = await TransferenciaService.aprobarSolicitud(params);

      // Assert
      expect(resultado.entidadesTransferidas).toBe(0);
      expect(resultado.success).toBe(true);
    });
  });

  // ============================================================================
  // Tests para rechazarSolicitud
  // ============================================================================
  describe('rechazarSolicitud', () => {
    it('debe rechazar solicitud exitosamente', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        rechazadorUserId: 200,
        rechazadorUserEmail: 'admin@example.com',
        motivoRechazo: 'Documentación incompleta',
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        solicitanteUserEmail: 'usuario@example.com',
        estado: 'PENDIENTE',
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);
      prismaMock.solicitudTransferencia.update.mockResolvedValueOnce({});
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      const resultado = await TransferenciaService.rechazarSolicitud(params);

      // Assert
      expect(resultado.success).toBe(true);
      expect(resultado.message).toBe('Solicitud rechazada');

      // Verificar que se buscó la solicitud
      expect(prismaMock.solicitudTransferencia.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantEmpresaId: 1,
          estado: 'PENDIENTE',
        },
      });

      // Verificar que se actualizó con estado RECHAZADA
      expect(prismaMock.solicitudTransferencia.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          estado: 'RECHAZADA',
          resueltoPorUserId: 200,
          resueltoPorUserEmail: 'admin@example.com',
          motivoRechazo: 'Documentación incompleta',
        }),
      });

      // Verificar que se notificó al solicitante
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 100,
          type: 'TRANSFERENCIA_RECHAZADA',
          message: expect.stringContaining('Documentación incompleta'),
        })
      );
    });

    it('debe retornar error si solicitud no es encontrada', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 999,
        rechazadorUserId: 200,
        motivoRechazo: 'Motivo',
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(null);

      // Act
      const resultado = await TransferenciaService.rechazarSolicitud(params);

      // Assert
      expect(resultado.success).toBe(false);
      expect(resultado.message).toContain('Solicitud no encontrada o ya procesada');
      expect(prismaMock.solicitudTransferencia.update).not.toHaveBeenCalled();
    });

    it('debe manejar motivo vacío en rechazo', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        rechazadorUserId: 200,
        motivoRechazo: '', // Vacío
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        estado: 'PENDIENTE',
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);
      prismaMock.solicitudTransferencia.update.mockResolvedValueOnce({});
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      const resultado = await TransferenciaService.rechazarSolicitud(params);

      // Assert
      expect(resultado.success).toBe(true);
      expect(prismaMock.solicitudTransferencia.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          motivoRechazo: '',
        }),
      });
    });

    it('debe loguear mensaje de rechazo', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        rechazadorUserId: 200,
        motivoRechazo: 'Falta de datos',
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        estado: 'PENDIENTE',
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);
      prismaMock.solicitudTransferencia.update.mockResolvedValueOnce({});
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await TransferenciaService.rechazarSolicitud(params);

      // Assert
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rechazando solicitud de transferencia'),
        expect.any(Object)
      );
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Solicitud rechazada'),
        expect.objectContaining({ motivoRechazo: 'Falta de datos' })
      );
    });
  });

  // ============================================================================
  // Tests para cancelarSolicitud
  // ============================================================================
  describe('cancelarSolicitud', () => {
    it('debe cancelar solicitud propia del usuario', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        usuarioId: 100,
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100, // Usuario es el solicitante
        estado: 'PENDIENTE',
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);
      prismaMock.solicitudTransferencia.update.mockResolvedValueOnce({});

      // Act
      const resultado = await TransferenciaService.cancelarSolicitud(params);

      // Assert
      expect(resultado.success).toBe(true);
      expect(resultado.message).toBe('Solicitud cancelada');

      // Verificar que se buscó la solicitud con el usuario como solicitante
      expect(prismaMock.solicitudTransferencia.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantEmpresaId: 1,
          estado: 'PENDIENTE',
          solicitanteUserId: 100,
        },
      });

      // Verificar que se actualizó a CANCELADA
      expect(prismaMock.solicitudTransferencia.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          estado: 'CANCELADA',
        }),
      });
    });

    it('debe retornar error si usuario intenta cancelar solicitud de otro', async () => {
      // Arrange: Usuario diferente al solicitante
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        usuarioId: 999, // Usuario diferente
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(null); // No encuentra porque solicitanteUserId no coincide

      // Act
      const resultado = await TransferenciaService.cancelarSolicitud(params);

      // Assert
      expect(resultado.success).toBe(false);
      expect(resultado.message).toContain('Solicitud no encontrada o no puedes cancelarla');
      expect(prismaMock.solicitudTransferencia.update).not.toHaveBeenCalled();
    });

    it('debe retornar error si solicitud no está en estado PENDIENTE', async () => {
      // Arrange: Solicitud ya aprobada
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        usuarioId: 100,
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(null); // findFirst con estado PENDIENTE retorna null

      // Act
      const resultado = await TransferenciaService.cancelarSolicitud(params);

      // Assert
      expect(resultado.success).toBe(false);
      expect(prismaMock.solicitudTransferencia.update).not.toHaveBeenCalled();
    });

    it('debe loguear cancelación de solicitud', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        usuarioId: 100,
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        estado: 'PENDIENTE',
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);
      prismaMock.solicitudTransferencia.update.mockResolvedValueOnce({});

      // Act
      await TransferenciaService.cancelarSolicitud(params);

      // Assert
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Solicitud cancelada por solicitante'),
        expect.objectContaining({
          solicitudId: 1,
          usuarioId: 100,
        })
      );
    });

    it('debe establecer resueltoAt cuando se cancela', async () => {
      // Arrange
      const params = {
        tenantEmpresaId: 1,
        solicitudId: 1,
        usuarioId: 100,
      };

      const mockSolicitud = {
        id: 1,
        tenantEmpresaId: 1,
        solicitanteUserId: 100,
        estado: 'PENDIENTE',
      };

      prismaMock.solicitudTransferencia.findFirst.mockResolvedValueOnce(mockSolicitud as any);
      prismaMock.solicitudTransferencia.update.mockResolvedValueOnce({});

      // Act
      await TransferenciaService.cancelarSolicitud(params);

      // Assert: Verifica que se estableció resueltoAt
      const callArgs = prismaMock.solicitudTransferencia.update.mock.calls[0][0];
      expect(callArgs.data.estado).toBe('CANCELADA');
      expect(callArgs.data.resueltoAt).toBeInstanceOf(Date);
    });
  });
});
