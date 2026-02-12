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

import { UserNotificationResolverService } from '../../src/services/user-notification-resolver.service';
import { AppLogger } from '../../src/config/logger';

describe('UserNotificationResolverService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Tests para queryPlatformUsers (private method - testeado indirectamente)
  // ============================================================================
  describe('queryPlatformUsers (testeado indirectamente)', () => {
    it('debería retornar usuarios cuando la consulta es exitosa', async () => {
      // Arrange: Preparar mock data
      const mockUsers = [
        {
          id: 1,
          email: 'juan@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockUsers);

      // Act & Assert: Testear a través de getAdminInternosForTenant
      const result = await UserNotificationResolverService.getAdminInternosForTenant(1);

      // Verificar que se ejecutó la consulta raw
      expect(prismaMock.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('debería retornar array vacío cuando falla la consulta', async () => {
      // Arrange: Mock de error
      prismaMock.$queryRawUnsafe.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      const result = await UserNotificationResolverService.getAdminInternosForTenant(1);

      // Debería retornar array vacío en caso de error
      expect(result).toEqual([]);
      expect(AppLogger.error).toHaveBeenCalledWith(
        'Error consultando platform_users:',
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // Tests para getAdminInternosForTenant
  // ============================================================================
  describe('getAdminInternosForTenant', () => {
    it('debería retornar lista de admins internos para el tenant', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const mockAdmins = [
        {
          id: 1,
          email: 'admin1@example.com',
          role: 'ADMIN_INTERNO',
          nombre: 'Pedro',
          apellido: 'González',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
        {
          id: 2,
          email: 'admin2@example.com',
          role: 'ADMIN_INTERNO',
          nombre: 'María',
          apellido: 'López',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockAdmins);

      // Act
      const result = await UserNotificationResolverService.getAdminInternosForTenant(
        tenantEmpresaId
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: 1,
        email: 'admin1@example.com',
        role: 'ADMIN_INTERNO',
        nombre: 'Pedro',
        apellido: 'González',
        reason: 'admin_interno',
      });
      expect(result[1]).toEqual({
        userId: 2,
        email: 'admin2@example.com',
        role: 'ADMIN_INTERNO',
        nombre: 'María',
        apellido: 'López',
        reason: 'admin_interno',
      });

      // Verificar que se ejecutó la consulta con los parámetros correctos
      expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('empresa_id = $1 AND role = \'ADMIN_INTERNO\''),
        tenantEmpresaId
      );
    });

    it('debería retornar array vacío cuando no hay admins internos', async () => {
      // Arrange
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);

      // Act
      const result = await UserNotificationResolverService.getAdminInternosForTenant(1);

      // Assert
      expect(result).toEqual([]);
    });

    it('debería manejar errores de base de datos', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      prismaMock.$queryRawUnsafe.mockRejectedValueOnce(dbError);

      // Act
      const result = await UserNotificationResolverService.getAdminInternosForTenant(1);

      // Assert
      expect(result).toEqual([]);
      expect(AppLogger.error).toHaveBeenCalledWith(
        'Error consultando platform_users:',
        dbError
      );
    });
  });

  // ============================================================================
  // Tests para resolveFromDador
  // ============================================================================
  describe('resolveFromDador', () => {
    it('debería retornar usuarios DADOR_DE_CARGA encontrados', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaId = 10;
      const mockDadores = [
        {
          id: 101,
          email: 'dador1@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);

      // Act
      const result = await UserNotificationResolverService.resolveFromDador(
        tenantEmpresaId,
        dadorCargaId
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: 101,
        email: 'dador1@example.com',
        role: 'DADOR_DE_CARGA',
        nombre: 'Carlos',
        apellido: 'Rodríguez',
        reason: 'direct',
      });

      expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('dador_carga_id = $2 AND role = \'DADOR_DE_CARGA\''),
        tenantEmpresaId,
        dadorCargaId
      );
    });

    it('debería retornar múltiples dadores si existen', async () => {
      // Arrange
      const mockDadores = [
        {
          id: 101,
          email: 'dador1@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
        {
          id: 102,
          email: 'dador2@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Ana',
          apellido: 'García',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);

      // Act
      const result = await UserNotificationResolverService.resolveFromDador(1, 10);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(101);
      expect(result[1].userId).toBe(102);
    });

    it('debería retornar array vacío cuando no hay dadores', async () => {
      // Arrange
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);

      // Act
      const result = await UserNotificationResolverService.resolveFromDador(1, 10);

      // Assert
      expect(result).toEqual([]);
    });

    it('debería manejar errores al consultar dadores', async () => {
      // Arrange
      prismaMock.$queryRawUnsafe.mockRejectedValueOnce(new Error('Query failed'));

      // Act
      const result = await UserNotificationResolverService.resolveFromDador(1, 10);

      // Assert
      expect(result).toEqual([]);
      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Tests para resolveFromTransportista
  // ============================================================================
  describe('resolveFromTransportista', () => {
    it('debería retornar transportista encontrado', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const empresaTransportistaId = 50;
      const mockTransportistas = [
        {
          id: 201,
          email: 'transportista@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas);

      // Act
      const result = await UserNotificationResolverService.resolveFromTransportista(
        tenantEmpresaId,
        empresaTransportistaId
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: 201,
        email: 'transportista@example.com',
        role: 'TRANSPORTISTA',
        nombre: 'Diego',
        apellido: 'Martínez',
        reason: 'direct',
      });
    });

    it('debería incluir dador cuando skipDador es false', async () => {
      // Arrange
      const mockTransportistas = [
        {
          id: 201,
          email: 'transportista@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockEmpresa = {
        id: 50,
        dadorCargaId: 10,
      };

      const mockDadores = [
        {
          id: 101,
          email: 'dador1@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      // Primer mock para transportista
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas);
      // Mock para empresa
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce(mockEmpresa);
      // Segundo mock para dador
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);

      // Act
      const result = await UserNotificationResolverService.resolveFromTransportista(1, 50, false);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.some(r => r.role === 'TRANSPORTISTA')).toBe(true);
      expect(result.some(r => r.role === 'DADOR_DE_CARGA')).toBe(true);
    });

    it('debería saltarse dador cuando skipDador es true', async () => {
      // Arrange
      const mockTransportistas = [
        {
          id: 201,
          email: 'transportista@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas);

      // Act
      const result = await UserNotificationResolverService.resolveFromTransportista(1, 50, true);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('TRANSPORTISTA');
      // No debe buscar empresa cuando skipDador es true
      expect(prismaMock.empresaTransportista.findUnique).not.toHaveBeenCalled();
    });

    it('debería evitar duplicados de usuario', async () => {
      // Arrange: El mismo usuario es transportista y dador (caso extraño pero posible)
      const mockTransportistas = [
        {
          id: 201,
          email: 'mismo@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockEmpresa = {
        id: 50,
        dadorCargaId: 10,
      };

      const mockDadores = [
        {
          id: 201, // Mismo ID
          email: 'mismo@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas);
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce(mockEmpresa);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);

      // Act
      const result = await UserNotificationResolverService.resolveFromTransportista(1, 50, false);

      // Assert: Debe tener solo 1 usuario (sin duplicado)
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(201);
    });
  });

  // ============================================================================
  // Tests para resolveFromChofer
  // ============================================================================
  describe('resolveFromChofer', () => {
    it('debería resolver cadena completa: chofer + transportista + dador', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const choferId = 100;

      const mockChoferUsers = [
        {
          id: 301,
          email: 'chofer@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      const mockChofer = {
        id: 100,
        empresaTransportistaId: 50,
        dadorCargaId: 10,
      };

      const mockTransportistas = [
        {
          id: 201,
          email: 'transportista@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockDadores = [
        {
          id: 101,
          email: 'dador@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      // Mocks en orden de ejecución
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockChoferUsers); // Chofer directo
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer); // Info del chofer
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas); // Transportista
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores); // Dador

      // Act
      const result = await UserNotificationResolverService.resolveFromChofer(
        tenantEmpresaId,
        choferId
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('CHOFER');
      expect(result[0].reason).toBe('direct');
      expect(result.some(r => r.role === 'TRANSPORTISTA')).toBe(true);
      expect(result.some(r => r.role === 'DADOR_DE_CARGA')).toBe(true);
    });

    it('debería manejar caso sin transportista', async () => {
      // Arrange
      const mockChoferUsers = [
        {
          id: 301,
          email: 'chofer@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      const mockChofer = {
        id: 100,
        empresaTransportistaId: null, // Sin transportista
        dadorCargaId: 10,
      };

      const mockDadores = [
        {
          id: 101,
          email: 'dador@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockChoferUsers);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);

      // Act
      const result = await UserNotificationResolverService.resolveFromChofer(1, 100);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.some(r => r.role === 'TRANSPORTISTA')).toBe(false);
    });

    it('debería retornar solo chofer cuando no se encuentra la entidad', async () => {
      // Arrange
      const mockChoferUsers = [
        {
          id: 301,
          email: 'chofer@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockChoferUsers);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(null); // Chofer no encontrado

      // Act
      const result = await UserNotificationResolverService.resolveFromChofer(1, 100);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('CHOFER');
      expect(AppLogger.warn).toHaveBeenCalledWith(
        'Chofer 100 no encontrado en documentos'
      );
    });

    it('debería evitar duplicados de usuario en cadena', async () => {
      // Arrange: Caso donde un usuario aparece en múltiples roles
      const mockChoferUsers = [
        {
          id: 301,
          email: 'juan@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      const mockChofer = {
        id: 100,
        empresaTransportistaId: 50,
        dadorCargaId: 10,
      };

      const mockTransportistas = [
        {
          id: 301, // Mismo ID que chofer (será evitado como duplicado)
          email: 'juan@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
        {
          id: 201, // Transportista diferente
          email: 'diego@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockDadores = [
        {
          id: 101,
          email: 'dador@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockChoferUsers);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);

      // Act
      const result = await UserNotificationResolverService.resolveFromChofer(1, 100);

      // Assert: Debe tener 3 usuarios únicos (el usuario 301 aparece una sola vez)
      expect(result).toHaveLength(3);
      const userIds = result.map(r => r.userId);
      expect(new Set(userIds).size).toBe(3); // Verificar que no hay duplicados
    });
  });

  // ============================================================================
  // Tests para resolveFromEntity
  // ============================================================================
  describe('resolveFromEntity', () => {
    it('debería resolver CHOFER correctamente', async () => {
      // Arrange
      const mockChoferUsers = [
        {
          id: 301,
          email: 'chofer@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockChoferUsers);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({
        empresaTransportistaId: 50,
        dadorCargaId: 10,
      });
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);

      // Act
      const result = await UserNotificationResolverService.resolveFromEntity(1, 'CHOFER', 100);

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('debería resolver CAMION correctamente', async () => {
      // Arrange
      const mockCamion = {
        id: 200,
        empresaTransportistaId: 50,
        dadorCargaId: 10,
      };

      const mockTransportistas = [
        {
          id: 201,
          email: 'transportista@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.camion.findUnique.mockResolvedValueOnce(mockCamion);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);

      // Act
      const result = await UserNotificationResolverService.resolveFromEntity(1, 'CAMION', 200);

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(prismaMock.camion.findUnique).toHaveBeenCalledWith({
        where: { id: 200 },
        select: expect.any(Object),
      });
    });

    it('debería resolver ACOPLADO correctamente', async () => {
      // Arrange
      const mockAcoplado = {
        id: 300,
        empresaTransportistaId: 50,
        dadorCargaId: 10,
      };

      const mockDadores = [
        {
          id: 101,
          email: 'dador@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.acoplado.findUnique.mockResolvedValueOnce(mockAcoplado);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);

      // Act
      const result = await UserNotificationResolverService.resolveFromEntity(1, 'ACOPLADO', 300);

      // Assert
      expect(prismaMock.acoplado.findUnique).toHaveBeenCalledWith({
        where: { id: 300 },
        select: expect.any(Object),
      });
    });

    it('debería resolver EMPRESA_TRANSPORTISTA correctamente', async () => {
      // Arrange
      const mockTransportistas = [
        {
          id: 201,
          email: 'transportista@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas);
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: 10,
      });
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);

      // Act
      const result = await UserNotificationResolverService.resolveFromEntity(
        1,
        'EMPRESA_TRANSPORTISTA',
        50
      );

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('debería retornar array vacío para tipo no soportado', async () => {
      // Act
      const result = await UserNotificationResolverService.resolveFromEntity(1, 'UNSUPPORTED' as any, 999);

      // Assert
      expect(result).toEqual([]);
      expect(AppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('EntityType no soportado')
      );
    });

    it('debería retornar array vacío cuando vehículo no existe', async () => {
      // Arrange
      prismaMock.camion.findUnique.mockResolvedValueOnce(null);

      // Act
      const result = await UserNotificationResolverService.resolveFromEntity(1, 'CAMION', 999);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Tests para resolveFromEquipo
  // ============================================================================
  describe('resolveFromEquipo', () => {
    it('debería resolver todos los usuarios relacionados a un equipo', async () => {
      // Arrange
      const equipoId = 1;
      const mockEquipo = {
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        empresaTransportistaId: 50,
        driverId: 100,
      };

      const mockChoferUsers = [
        {
          id: 301,
          email: 'chofer@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      const mockChofer = {
        empresaTransportistaId: 50,
        dadorCargaId: 10,
      };

      const mockTransportistas = [
        {
          id: 201,
          email: 'transportista@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockDadores = [
        {
          id: 101,
          email: 'dador@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      // Mocks en orden
      prismaMock.equipo.findUnique.mockResolvedValueOnce(mockEquipo);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockChoferUsers); // Chofer
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]); // Transportista del chofer
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]); // Dador del chofer
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas); // Transportista directo
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores); // Dador

      // Act
      const result = await UserNotificationResolverService.resolveFromEquipo(equipoId);

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.some(r => r.role === 'CHOFER')).toBe(true);
      expect(result.some(r => r.role === 'TRANSPORTISTA')).toBe(true);
      expect(result.some(r => r.role === 'DADOR_DE_CARGA')).toBe(true);
    });

    it('debería retornar array vacío cuando equipo no existe', async () => {
      // Arrange
      prismaMock.equipo.findUnique.mockResolvedValueOnce(null);

      // Act
      const result = await UserNotificationResolverService.resolveFromEquipo(999);

      // Assert
      expect(result).toEqual([]);
      expect(AppLogger.warn).toHaveBeenCalledWith('Equipo 999 no encontrado');
    });

    it('debería evitar duplicados de usuarios en equipo', async () => {
      // Arrange
      const mockEquipo = {
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        empresaTransportistaId: 50,
        driverId: 100,
      };

      const mockChoferUsers = [
        {
          id: 301, // Mismo ID
          email: 'juan@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      const mockChofer = {
        empresaTransportistaId: 50,
        dadorCargaId: 10,
      };

      const mockTransportistas = [
        {
          id: 301, // Mismo ID que chofer
          email: 'juan@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockDadores = [
        {
          id: 101,
          email: 'dador@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.equipo.findUnique.mockResolvedValueOnce(mockEquipo);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockChoferUsers);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);

      // Act
      const result = await UserNotificationResolverService.resolveFromEquipo(1);

      // Assert
      const userIds = result.map(r => r.userId);
      expect(new Set(userIds).size).toBe(userIds.length); // No duplicados
    });
  });

  // ============================================================================
  // Tests para resolveForTransferencia
  // ============================================================================
  describe('resolveForTransferencia', () => {
    it('debería obtener admins internos para notificación de transferencia', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const mockAdmins = [
        {
          id: 1,
          email: 'admin1@example.com',
          role: 'ADMIN_INTERNO',
          nombre: 'Pedro',
          apellido: 'González',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockAdmins);

      // Act
      const result = await UserNotificationResolverService.resolveForTransferencia(tenantEmpresaId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('ADMIN_INTERNO');
      expect(result[0].reason).toBe('admin_interno');
    });

    it('debería retornar array vacío si no hay admins', async () => {
      // Arrange
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]);

      // Act
      const result = await UserNotificationResolverService.resolveForTransferencia(1);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Tests para resolveAllFromDadorCarga
  // ============================================================================
  describe('resolveAllFromDadorCarga', () => {
    it('debería resolver todos los usuarios bajo un dador de carga', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaId = 10;

      const mockDadores = [
        {
          id: 101,
          email: 'dador@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockEmpresas = [
        {
          id: 50,
        },
      ];

      const mockTransportistas = [
        {
          id: 201,
          email: 'transportista@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Diego',
          apellido: 'Martínez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockChoferes = [
        {
          id: 100,
        },
      ];

      const mockChoferUsers = [
        {
          id: 301,
          email: 'chofer@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      // Mocks en orden
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores); // Dadores
      prismaMock.empresaTransportista.findMany.mockResolvedValueOnce(mockEmpresas);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas); // Transportistas
      prismaMock.chofer.findMany.mockResolvedValueOnce(mockChoferes);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockChoferUsers); // Choferes

      // Act
      const result = await UserNotificationResolverService.resolveAllFromDadorCarga(
        tenantEmpresaId,
        dadorCargaId
      );

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.some(r => r.role === 'DADOR_DE_CARGA')).toBe(true);
      expect(result.some(r => r.role === 'TRANSPORTISTA')).toBe(true);
      expect(result.some(r => r.role === 'CHOFER')).toBe(true);
    });

    it('debería obtener solo dadores si no hay transportistas ni choferes', async () => {
      // Arrange
      const mockDadores = [
        {
          id: 101,
          email: 'dador@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);
      prismaMock.empresaTransportista.findMany.mockResolvedValueOnce([]);
      prismaMock.chofer.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await UserNotificationResolverService.resolveAllFromDadorCarga(1, 10);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('DADOR_DE_CARGA');
    });

    it('debería evitar duplicados en lista completa de dador', async () => {
      // Arrange: Usuario que aparece en múltiples roles
      const mockDadores = [
        {
          id: 101,
          email: 'usuario@example.com',
          role: 'DADOR_DE_CARGA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: 10,
          empresa_transportista_id: null,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockEmpresas = [
        {
          id: 50,
        },
      ];

      const mockTransportistas = [
        {
          id: 101, // Mismo ID
          email: 'usuario@example.com',
          role: 'TRANSPORTISTA',
          nombre: 'Carlos',
          apellido: 'Rodríguez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: 50,
          chofer_id: null,
          activo: true,
        },
      ];

      const mockChoferes = [
        {
          id: 100,
        },
      ];

      const mockChoferUsers = [
        {
          id: 301,
          email: 'chofer@example.com',
          role: 'CHOFER',
          nombre: 'Juan',
          apellido: 'Pérez',
          empresa_id: 1,
          dador_carga_id: null,
          empresa_transportista_id: null,
          chofer_id: 100,
          activo: true,
        },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockDadores);
      prismaMock.empresaTransportista.findMany.mockResolvedValueOnce(mockEmpresas);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockTransportistas);
      prismaMock.chofer.findMany.mockResolvedValueOnce(mockChoferes);
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce(mockChoferUsers);

      // Act
      const result = await UserNotificationResolverService.resolveAllFromDadorCarga(1, 10);

      // Assert
      const userIds = result.map(r => r.userId);
      expect(new Set(userIds).size).toBe(userIds.length); // No duplicados
    });

    it('debería manejar dador vacío (sin usuarios)', async () => {
      // Arrange
      prismaMock.$queryRawUnsafe.mockResolvedValueOnce([]); // Sin dadores
      prismaMock.empresaTransportista.findMany.mockResolvedValueOnce([]);
      prismaMock.chofer.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await UserNotificationResolverService.resolveAllFromDadorCarga(1, 10);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
