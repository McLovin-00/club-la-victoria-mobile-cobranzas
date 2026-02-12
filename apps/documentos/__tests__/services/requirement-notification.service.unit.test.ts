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
    createMany: jest.fn(),
  },
}));

jest.mock('../../src/services/user-notification-resolver.service', () => ({
  UserNotificationResolverService: {
    resolveFromEntity: jest.fn(),
    getAdminInternosForTenant: jest.fn(),
  },
}));

import { RequirementNotificationService } from '../../src/services/requirement-notification.service';
import { AppLogger } from '../../src/config/logger';
import { InternalNotificationService } from '../../src/services/internal-notification.service';
import { UserNotificationResolverService } from '../../src/services/user-notification-resolver.service';

describe('RequirementNotificationService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Tests para onNewRequirementAdded - Flujo principal
  // ============================================================================
  describe('onNewRequirementAdded', () => {
    it('debería notificar a entidades afectadas cuando se agrega nuevo requisito', async () => {
      // Arrange: Preparar datos de cliente, template y equipos
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Cliente ABC',
      };

      const mockTemplate = {
        name: 'Licencia de Conducir',
      };

      const mockEquiposCliente = [
        { equipoId: 100 },
        { equipoId: 101 },
      ];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 1,
        },
        {
          driverId: 51,
          truckId: 76,
          trailerId: null,
          empresaTransportistaId: 1,
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
        { userId: 2, role: 'TRANSPORTISTA', reason: 'transportista_of_chofer' as const },
      ];

      // Act & Assert: Configurar mocks
      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);
      prismaMock.document.findFirst.mockResolvedValueOnce(null); // Sin documento aprobado
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      const result = await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Debe retornar número de notificaciones enviadas
      expect(result).toBeGreaterThanOrEqual(0);
      // Debe haber buscado cliente y template
      expect(prismaMock.cliente.findUnique).toHaveBeenCalledWith({
        where: { id: clienteId },
        select: { razonSocial: true },
      });
      expect(prismaMock.documentTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: templateId },
        select: { name: true },
      });
    });

    it('debería retornar 0 si cliente o template no son encontrados', async () => {
      // Arrange: Cliente no existe
      const tenantEmpresaId = 1;
      const clienteId = 999;
      const templateId = 5;
      const entityType = 'CHOFER';

      prismaMock.cliente.findUnique.mockResolvedValueOnce(null);

      // Act
      const result = await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Debe retornar 0 y loguear warning
      expect(result).toBe(0);
      expect(AppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cliente o template no encontrado'),
        expect.any(Object)
      );
    });

    it('debería retornar 0 si no hay equipos asociados al cliente', async () => {
      // Arrange: Sin equipos
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CAMION';

      const mockCliente = {
        razonSocial: 'Cliente XYZ',
      };

      const mockTemplate = {
        name: 'Verificación Técnica',
      };

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([]); // Sin equipos

      // Act
      const result = await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert
      expect(result).toBe(0);
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('No hay equipos asociados al cliente'),
        expect.any(Object)
      );
    });

    it('debería retornar 0 si no hay equipos activos', async () => {
      // Arrange: Equipos no activos
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'ACOPLADO';

      const mockCliente = {
        razonSocial: 'Cliente PQR',
      };

      const mockTemplate = {
        name: 'Seguro',
      };

      const mockEquiposCliente = [{ equipoId: 100 }];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce([]); // Sin equipos activos

      // Act
      const result = await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert
      expect(result).toBe(0);
    });

    it('debería notificar solo entidades que no tienen documento aprobado', async () => {
      // Arrange: Algunos equipos ya tienen el documento
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Cliente Test',
      };

      const mockTemplate = {
        name: 'Licencia',
      };

      const mockEquiposCliente = [{ equipoId: 100 }];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 1,
        },
        {
          driverId: 51,
          truckId: 76,
          trailerId: null,
          empresaTransportistaId: 1,
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);

      // Primer driver tiene documento, segundo no
      prismaMock.document.findFirst
        .mockResolvedValueOnce({ id: 1 }) // Driver 50: tiene documento
        .mockResolvedValueOnce(null); // Driver 51: no tiene documento

      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      const result = await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Debe notificar solo al driver que no tiene documento
      expect(result).toBeGreaterThan(0);
      // Verificar que se buscó documento aprobado para ambos drivers
      expect(prismaMock.document.findFirst).toHaveBeenCalledTimes(2);
    });

    it('debería manejar errores gracefully', async () => {
      // Arrange: Error en base de datos
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const testError = new Error('Error de base de datos');
      prismaMock.cliente.findUnique.mockRejectedValueOnce(testError);

      // Act
      const result = await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Debe retornar 0 y loguear error
      expect(result).toBe(0);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error notificando nuevo requisito'),
        testError
      );
    });

    it('debería procesar diferentes tipos de entidad correctamente', async () => {
      // Arrange: Entity type EMPRESA_TRANSPORTISTA
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'EMPRESA_TRANSPORTISTA';

      const mockCliente = {
        razonSocial: 'Cliente Corp',
      };

      const mockTemplate = {
        name: 'Registro Mercantil',
      };

      const mockEquiposCliente = [{ equipoId: 100 }];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 25, // Empresa transportista
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'ADMIN', reason: 'admin_interno' as const },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);
      prismaMock.document.findFirst.mockResolvedValueOnce(null);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      const result = await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Debe procesar empresa transportista
      expect(result).toBeGreaterThanOrEqual(0);
      // Verificar que se buscó documento con EMPRESA_TRANSPORTISTA como tipo
      expect(prismaMock.document.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          entityType: 'EMPRESA_TRANSPORTISTA',
        }),
      });
    });

    it('debería procesar múltiples entidades afectadas', async () => {
      // Arrange: Múltiples equipos
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CAMION';

      const mockCliente = {
        razonSocial: 'Cliente Multi',
      };

      const mockTemplate = {
        name: 'Licencia Circulación',
      };

      const mockEquiposCliente = [
        { equipoId: 100 },
        { equipoId: 101 },
        { equipoId: 102 },
      ];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 1,
        },
        {
          driverId: 51,
          truckId: 76,
          trailerId: null,
          empresaTransportistaId: 1,
        },
        {
          driverId: 52,
          truckId: 77,
          trailerId: 91,
          empresaTransportistaId: 2,
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'TRANSPORTISTA', reason: 'direct' as const },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);
      prismaMock.document.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValue(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValue({});

      // Act
      const result = await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Debe procesar todas las entidades
      expect(result).toBeGreaterThanOrEqual(0);
      expect(prismaMock.document.findFirst).toHaveBeenCalledTimes(3);
    });

    it('debería ignorar equipos sin la entidad requerida (acoplado null)', async () => {
      // Arrange: Entity type ACOPLADO con equipo sin acoplado
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'ACOPLADO';

      const mockCliente = {
        razonSocial: 'Cliente Sin Acoplado',
      };

      const mockTemplate = {
        name: 'Seguro Acoplado',
      };

      const mockEquiposCliente = [
        { equipoId: 100 },
        { equipoId: 101 },
      ];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90, // Tiene acoplado
          empresaTransportistaId: 1,
        },
        {
          driverId: 51,
          truckId: 76,
          trailerId: null, // Sin acoplado - debe ignorarse
          empresaTransportistaId: 1,
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'TRANSPORTISTA', reason: 'direct' as const },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);
      prismaMock.document.findFirst.mockResolvedValueOnce(null);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      const result = await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Solo debe buscar documento para el acoplado que existe
      expect(result).toBeGreaterThanOrEqual(0);
      // Solo debe haber una búsqueda de documento (solo para acoplado 90)
      expect(prismaMock.document.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          entityId: 90, // Solo el acoplado que existe
        }),
      });
    });
  });

  // ============================================================================
  // Tests para notifyAdminsNewRequirement
  // ============================================================================
  describe('notifyAdminsNewRequirement', () => {
    it('debería notificar a admins internos cuando se configura nuevo requisito', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Cliente Admin Test',
      };

      const mockTemplate = {
        name: 'Documento Requerido',
      };

      const mockAdmins = [
        { userId: 1, role: 'ADMIN' },
        { userId: 2, role: 'SUPERADMIN' },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      (UserNotificationResolverService.getAdminInternosForTenant as jest.Mock).mockResolvedValueOnce(
        mockAdmins
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.notifyAdminsNewRequirement(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Debe crear notificación para cada admin
      expect(InternalNotificationService.create).toHaveBeenCalledTimes(2);
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantEmpresaId,
          userId: 1,
          type: 'NUEVO_REQUISITO_CLIENTE',
          priority: 'normal',
        })
      );
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantEmpresaId,
          userId: 2,
          type: 'NUEVO_REQUISITO_CLIENTE',
          priority: 'normal',
        })
      );
    });

    it('debería incluir información correcta en metadata de notificación a admins', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CAMION';

      const mockCliente = {
        razonSocial: 'Transportes XYZ',
      };

      const mockTemplate = {
        name: 'Verificación Técnica',
      };

      const mockAdmins = [{ userId: 1, role: 'ADMIN' }];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      (UserNotificationResolverService.getAdminInternosForTenant as jest.Mock).mockResolvedValueOnce(
        mockAdmins
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.notifyAdminsNewRequirement(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Verificar metadata
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            clienteId,
            clienteNombre: 'Transportes XYZ',
            templateId,
            templateName: 'Verificación Técnica',
            entityType: 'CAMION',
          }),
        })
      );
    });

    it('debería retornar temprano si cliente no es encontrado', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 999;
      const templateId = 5;
      const entityType = 'CHOFER';

      prismaMock.cliente.findUnique.mockResolvedValueOnce(null);

      // Act
      await RequirementNotificationService.notifyAdminsNewRequirement(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: No debe buscar admins ni crear notificaciones
      expect(UserNotificationResolverService.getAdminInternosForTenant).not.toHaveBeenCalled();
      expect(InternalNotificationService.create).not.toHaveBeenCalled();
    });

    it('debería retornar temprano si template no es encontrado', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 999;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Cliente Test',
      };

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(null);

      // Act
      await RequirementNotificationService.notifyAdminsNewRequirement(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert
      expect(UserNotificationResolverService.getAdminInternosForTenant).not.toHaveBeenCalled();
      expect(InternalNotificationService.create).not.toHaveBeenCalled();
    });

    it('debería manejar sin admins configurados', async () => {
      // Arrange: Sin admins
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Cliente Sin Admins',
      };

      const mockTemplate = {
        name: 'Documento',
      };

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      (UserNotificationResolverService.getAdminInternosForTenant as jest.Mock).mockResolvedValueOnce(
        []
      );

      // Act: No debe lanzar error
      await expect(
        RequirementNotificationService.notifyAdminsNewRequirement(
          tenantEmpresaId,
          clienteId,
          templateId,
          entityType
        )
      ).resolves.toBeUndefined();

      // Assert
      expect(InternalNotificationService.create).not.toHaveBeenCalled();
    });

    it('debería manejar errores en notificación a admins gracefully', async () => {
      // Arrange: Error en obtención de cliente
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const testError = new Error('Error de base de datos');
      prismaMock.cliente.findUnique.mockRejectedValueOnce(testError);

      // Act: No debe lanzar excepción
      await expect(
        RequirementNotificationService.notifyAdminsNewRequirement(
          tenantEmpresaId,
          clienteId,
          templateId,
          entityType
        )
      ).resolves.toBeUndefined();

      // Assert: Debe registrar error
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error notificando a admins'),
        testError
      );
    });

    it('debería incluir link correcto en notificación admin', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'ACOPLADO';

      const mockCliente = {
        razonSocial: 'Cliente Link Test',
      };

      const mockTemplate = {
        name: 'Seguro',
      };

      const mockAdmins = [{ userId: 1, role: 'ADMIN' }];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      (UserNotificationResolverService.getAdminInternosForTenant as jest.Mock).mockResolvedValueOnce(
        mockAdmins
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.notifyAdminsNewRequirement(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Link debe incluir clienteId
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          link: expect.stringContaining(`/admin/clientes/${clienteId}`),
        })
      );
    });

    it('debería crear notificación con título correcto en formato de mensaje', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'EMPRESA_TRANSPORTISTA';

      const mockCliente = {
        razonSocial: 'Mi Transportista',
      };

      const mockTemplate = {
        name: 'Registro Mercantil',
      };

      const mockAdmins = [{ userId: 1, role: 'ADMIN' }];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      (UserNotificationResolverService.getAdminInternosForTenant as jest.Mock).mockResolvedValueOnce(
        mockAdmins
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.notifyAdminsNewRequirement(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Título debe incluir ícono y texto
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('📋'),
          message: expect.stringContaining('Mi Transportista'),
        })
      );
    });

    it('debería usar label correcto para diferentes tipos de entidad', async () => {
      // Arrange: Test con CHOFER
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;

      const mockCliente = {
        razonSocial: 'Test Cliente',
      };

      const mockTemplate = {
        name: 'Documento',
      };

      const mockAdmins = [{ userId: 1, role: 'ADMIN' }];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      (UserNotificationResolverService.getAdminInternosForTenant as jest.Mock).mockResolvedValueOnce(
        mockAdmins
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.notifyAdminsNewRequirement(
        tenantEmpresaId,
        clienteId,
        templateId,
        'CHOFER'
      );

      // Assert: Debe incluir "choferes" en el mensaje
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('choferes'),
        })
      );
    });
  });

  // ============================================================================
  // Tests de casos edge case
  // ============================================================================
  describe('Edge Cases', () => {
    it('debería manejar entidades afectadas vacías sin lanzar error', async () => {
      // Arrange: Sin entidades afectadas
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Cliente Vacío',
      };

      const mockTemplate = {
        name: 'Documento',
      };

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([]);

      // Act: No debe lanzar error
      await expect(
        RequirementNotificationService.onNewRequirementAdded(
          tenantEmpresaId,
          clienteId,
          templateId,
          entityType
        )
      ).resolves.toBe(0);
    });

    it('debería generar claves de entidad correctamente para cada tipo', async () => {
      // Arrange: Test múltiples tipos
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;

      const mockCliente = {
        razonSocial: 'Cliente Multi-Type',
      };

      const mockTemplate = {
        name: 'Multi Template',
      };

      const mockEquiposCliente = [{ equipoId: 100 }];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 1,
        },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);

      // Act: Test con CHOFER
      await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        'CHOFER'
      );

      // Assert: Debe buscar con driverId
      expect(prismaMock.document.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          entityType: 'CHOFER',
          entityId: 50, // driverId del equipo
        }),
      });
    });

    it('debería construir contexto con información correcta del cliente y template', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Razón Social Completa',
      };

      const mockTemplate = {
        name: 'Template Nombre Largo',
      };

      const mockEquiposCliente = [{ equipoId: 100 }];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 1,
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);
      prismaMock.document.findFirst.mockResolvedValueOnce(null);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Verificar que se usó nombre completo en notificación
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Razón Social Completa'),
        })
      );
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Template Nombre Largo'),
        })
      );
    });

    it('debería enviar notificaciones con metadata completa y correcta', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CAMION';

      const mockCliente = {
        razonSocial: 'Test Client',
      };

      const mockTemplate = {
        name: 'Test Template',
      };

      const mockEquiposCliente = [{ equipoId: 100 }];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 1,
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'TRANSPORTISTA', reason: 'admin_interno' as const },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);
      prismaMock.document.findFirst.mockResolvedValueOnce(null);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Verificar metadata completa
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            clienteId: 10,
            clienteNombre: 'Test Client',
            templateId: 5,
            templateName: 'Test Template',
            entityType: 'CAMION',
            entityId: 75, // truckId
            recipientRole: 'TRANSPORTISTA',
          }),
        })
      );
    });

    it('debería usar tipo de notificación correcto para documentos faltantes', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Cliente',
      };

      const mockTemplate = {
        name: 'Licencia',
      };

      const mockEquiposCliente = [{ equipoId: 100 }];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 1,
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);
      prismaMock.document.findFirst.mockResolvedValueOnce(null);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Tipo debe ser DOCUMENT_MISSING
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_MISSING',
        })
      );
    });

    it('debería usar prioridad alta para notificaciones de documentos faltantes', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Cliente Priority',
      };

      const mockTemplate = {
        name: 'Documento Priority',
      };

      const mockEquiposCliente = [{ equipoId: 100 }];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 1,
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);
      prismaMock.document.findFirst.mockResolvedValueOnce(null);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Prioridad debe ser 'high'
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high',
        })
      );
    });

    it('debería usar link correcto para navegación a equipos', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const templateId = 5;
      const entityType = 'CHOFER';

      const mockCliente = {
        razonSocial: 'Cliente Link',
      };

      const mockTemplate = {
        name: 'Documento',
      };

      const mockEquiposCliente = [{ equipoId: 100 }];

      const mockEquipos = [
        {
          driverId: 50,
          truckId: 75,
          trailerId: 90,
          empresaTransportistaId: 1,
        },
      ];

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      prismaMock.cliente.findUnique.mockResolvedValueOnce(mockCliente as any);
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(mockTemplate as any);
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce(mockEquiposCliente as any);
      prismaMock.equipo.findMany.mockResolvedValueOnce(mockEquipos as any);
      prismaMock.document.findFirst.mockResolvedValueOnce(null);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // Act
      await RequirementNotificationService.onNewRequirementAdded(
        tenantEmpresaId,
        clienteId,
        templateId,
        entityType
      );

      // Assert: Link debe apuntar a /documentos/equipos
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          link: '/documentos/equipos',
        })
      );
    });
  });
});
