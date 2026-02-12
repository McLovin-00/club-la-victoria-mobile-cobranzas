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

jest.mock('../../src/services/equipo-evaluation.service', () => ({
  EquipoEvaluationService: {
    buscarEquiposPorEntidad: jest.fn(),
    evaluarEquipos: jest.fn(),
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
    resolveFromEquipo: jest.fn(),
  },
}));

import { DocumentEventHandlers } from '../../src/services/document-event-handlers.service';
import { AppLogger } from '../../src/config/logger';
import { EquipoEvaluationService } from '../../src/services/equipo-evaluation.service';
import { InternalNotificationService } from '../../src/services/internal-notification.service';
import { UserNotificationResolverService } from '../../src/services/user-notification-resolver.service';

describe('DocumentEventHandlers', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Tests para onDocumentApproved
  // ============================================================================
  describe('onDocumentApproved', () => {
    it('debería notificar a usuarios cuando documento es aprobado', async () => {
      // Arrange: Preparar datos de documento
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia de Conducir' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Juan',
        apellido: 'Pérez',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
        { userId: 2, role: 'TRANSPORTISTA', reason: 'transportista_of_chofer' as const },
      ];

      // Act & Assert: Configurar mocks y ejecutar
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentApproved(documentId);

      // Verificar que se crearon notificaciones para cada recipient
      expect(InternalNotificationService.create).toHaveBeenCalledTimes(2);
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantEmpresaId: 1,
          userId: 1,
          type: 'DOCUMENT_APPROVED',
          priority: 'normal',
          documentId,
        })
      );
    });

    it('debería manejar equipos que se vuelven COMPLETO', async () => {
      // Arrange: Preparar datos para equipos
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Juan',
        apellido: 'Pérez',
      };

      const mockRecipients = [{ userId: 1, role: 'CHOFER', reason: 'direct' as const }];
      const mockEquipos = [{ id: 50 }, { id: 51 }];
      const mockEvaluationResults = [
        { equipoId: 50, estadoNuevo: 'COMPLETO', cambio: true },
        { equipoId: 51, estadoNuevo: 'INCOMPLETO', cambio: false },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce(
        mockEquipos
      );
      (EquipoEvaluationService.evaluarEquipos as jest.Mock).mockResolvedValueOnce(
        mockEvaluationResults
      );
      (UserNotificationResolverService.resolveFromEquipo as jest.Mock).mockResolvedValueOnce([
        { userId: 2, role: 'TRANSPORTISTA', reason: 'admin_interno' as const },
      ]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentApproved(documentId);

      // Verificar que se evaluaron los equipos
      expect(EquipoEvaluationService.evaluarEquipos).toHaveBeenCalledWith([50, 51]);

      // Verificar que se notificó sobre equipo COMPLETO
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EQUIPO_COMPLETE',
          equipoId: 50,
        })
      );
    });

    it('debería retornar temprano si documento no es encontrado', async () => {
      // Arrange: Documento no existe
      const documentId = 999;
      prismaMock.document.findUnique.mockResolvedValueOnce(null);

      // Act
      await DocumentEventHandlers.onDocumentApproved(documentId);

      // Assert: No debe procesar notificaciones ni equipos
      expect(UserNotificationResolverService.resolveFromEntity).not.toHaveBeenCalled();
      expect(EquipoEvaluationService.buscarEquiposPorEntidad).not.toHaveBeenCalled();
      expect(AppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Documento no encontrado'),
        expect.any(Object)
      );
    });

    it('debería manejar errores gracefulmente', async () => {
      // Arrange: Error en obtención de documento
      const documentId = 1;
      const testError = new Error('Error de base de datos');
      prismaMock.document.findUnique.mockRejectedValueOnce(testError);

      // Act: No debe lanzar excepción
      await expect(DocumentEventHandlers.onDocumentApproved(documentId)).resolves.toBeUndefined();

      // Assert: Debe registrar error
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error procesando evento'),
        testError
      );
    });

    it('debería enviar notificaciones a múltiples usuarios con diferentes roles', async () => {
      // Arrange: Múltiples usuarios en cadena de propagación
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Carnet' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Carlos',
        apellido: 'López',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
        { userId: 2, role: 'TRANSPORTISTA', reason: 'transportista_of_chofer' as const },
        { userId: 3, role: 'DADOR_CARGA', reason: 'dador_of_chofer' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentApproved(documentId);

      // Debe crear 3 notificaciones (una por cada usuario)
      expect(InternalNotificationService.create).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // Tests para onDocumentRejected
  // ============================================================================
  describe('onDocumentRejected', () => {
    it('debería notificar rechazo a usuarios', async () => {
      // Arrange
      const documentId = 1;
      const rejectReason = 'Documento ilegible';
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CAMION',
        entityId: 50,
        template: { name: 'Verificación Técnica' },
      };

      const mockCamion = {
        patenteNorm: 'ABC123',
      };

      const mockRecipients = [
        { userId: 1, role: 'TRANSPORTISTA', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce(mockCamion as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentRejected(documentId, rejectReason);

      // Verificar que se notificó con el motivo
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_REJECTED',
          priority: 'high',
          message: expect.stringContaining(rejectReason),
        })
      );
    });

    it('debería notificar equipos que se vuelven DOCUMENTACION_INCOMPLETA', async () => {
      // Arrange
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Maria',
        apellido: 'García',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      const mockEquipos = [{ id: 60 }];
      const mockEvaluationResults = [
        { equipoId: 60, estadoNuevo: 'DOCUMENTACION_INCOMPLETA', cambio: true },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce(
        mockEquipos
      );
      (EquipoEvaluationService.evaluarEquipos as jest.Mock).mockResolvedValueOnce(
        mockEvaluationResults
      );
      (UserNotificationResolverService.resolveFromEquipo as jest.Mock).mockResolvedValueOnce([
        { userId: 2, role: 'ADMIN', reason: 'admin_interno' as const },
      ]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentRejected(documentId);

      // Verificar que se notificó sobre equipo incompleto
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EQUIPO_INCOMPLETE',
          equipoId: 60,
        })
      );
    });

    it('debería manejar rechazo sin razón especificada', async () => {
      // Arrange: Sin parámetro reason
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'ACOPLADO',
        entityId: 75,
        template: { name: 'Seguro' },
      };

      const mockAcoplado = {
        patenteNorm: 'DEF456',
      };

      const mockRecipients = [
        { userId: 1, role: 'TRANSPORTISTA', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.acoplado.findUnique.mockResolvedValueOnce(mockAcoplado as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentRejected(documentId);

      // Debe enviar notificación sin razón específica
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_REJECTED',
          message: expect.not.stringContaining(':'),
        })
      );
    });

    it('debería retornar temprano si documento no es encontrado', async () => {
      // Arrange
      const documentId = 999;
      prismaMock.document.findUnique.mockResolvedValueOnce(null);

      // Act
      await DocumentEventHandlers.onDocumentRejected(documentId, 'Razón');

      // Assert
      expect(UserNotificationResolverService.resolveFromEntity).not.toHaveBeenCalled();
      expect(EquipoEvaluationService.buscarEquiposPorEntidad).not.toHaveBeenCalled();
    });

    it('debería manejar errores gracefulmente', async () => {
      // Arrange
      const documentId = 1;
      const testError = new Error('Error crítico');
      prismaMock.document.findUnique.mockRejectedValueOnce(testError);

      // Act: No debe lanzar excepción
      await expect(DocumentEventHandlers.onDocumentRejected(documentId, 'Razón')).resolves.toBeUndefined();

      // Assert
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error procesando evento'),
        testError
      );
    });

    it('debería no notificar sobre equipos sin cambios de estado', async () => {
      // Arrange: Equipos evaluados pero sin cambios
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Documento' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Test',
        apellido: 'User',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      const mockEquipos = [{ id: 70 }];
      const mockEvaluationResults = [
        { equipoId: 70, estadoNuevo: 'DOCUMENTACION_INCOMPLETA', cambio: false }, // Sin cambio
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce(
        mockEquipos
      );
      (EquipoEvaluationService.evaluarEquipos as jest.Mock).mockResolvedValueOnce(
        mockEvaluationResults
      );
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentRejected(documentId);

      // Debe crear solo notificación del documento, no del equipo
      expect(InternalNotificationService.create).toHaveBeenCalledTimes(1);
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_REJECTED',
        })
      );
    });
  });

  // ============================================================================
  // Tests para onDocumentExpired
  // ============================================================================
  describe('onDocumentExpired', () => {
    it('debería notificar usuarios sobre documento vencido', async () => {
      // Arrange
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'EMPRESA_TRANSPORTISTA',
        entityId: 25,
        template: { name: 'Registro Mercantil' },
      };

      const mockEmpresa = {
        razonSocial: 'Transportes XYZ',
        cuit: '20-12345678-9',
      };

      const mockRecipients = [
        { userId: 1, role: 'ADMIN', reason: 'admin_interno' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce(mockEmpresa as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpired(documentId);

      // Verificar notificación con prioridad urgent
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_EXPIRED',
          priority: 'urgent',
        })
      );
    });

    it('debería notificar equipos que se vuelven DOCUMENTACION_VENCIDA', async () => {
      // Arrange
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Pedro',
        apellido: 'Rodríguez',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      const mockEquipos = [{ id: 80 }];
      const mockEvaluationResults = [
        { equipoId: 80, estadoNuevo: 'DOCUMENTACION_VENCIDA', cambio: true },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce(
        mockEquipos
      );
      (EquipoEvaluationService.evaluarEquipos as jest.Mock).mockResolvedValueOnce(
        mockEvaluationResults
      );
      (UserNotificationResolverService.resolveFromEquipo as jest.Mock).mockResolvedValueOnce([
        { userId: 2, role: 'TRANSPORTISTA', reason: 'admin_interno' as const },
      ]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpired(documentId);

      // Verificar notificación sobre equipo bloqueado
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EQUIPO_BLOQUEADO',
          priority: 'urgent',
        })
      );
    });

    it('debería retornar temprano si documento no es encontrado', async () => {
      // Arrange
      const documentId = 999;
      prismaMock.document.findUnique.mockResolvedValueOnce(null);

      // Act
      await DocumentEventHandlers.onDocumentExpired(documentId);

      // Assert
      expect(UserNotificationResolverService.resolveFromEntity).not.toHaveBeenCalled();
    });

    it('debería manejar errores gracefulmente', async () => {
      // Arrange
      const documentId = 1;
      const testError = new Error('Error en BD');
      prismaMock.document.findUnique.mockRejectedValueOnce(testError);

      // Act: No debe lanzar excepción
      await expect(DocumentEventHandlers.onDocumentExpired(documentId)).resolves.toBeUndefined();

      // Assert
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('debería no procesar equipos si no hay equipos afectados', async () => {
      // Arrange: Sin equipos afectados
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Ana',
        apellido: 'Martínez',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpired(documentId);

      // No debe llamar evaluarEquipos
      expect(EquipoEvaluationService.evaluarEquipos).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Tests para onDocumentExpiringSoon
  // ============================================================================
  describe('onDocumentExpiringSoon', () => {
    it('debería notificar documento próximo a vencer (urgente: 1 día)', async () => {
      // Arrange: Muy urgente
      const documentId = 1;
      const daysUntilExpiry = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Luis',
        apellido: 'Fernández',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpiringSoon(documentId, daysUntilExpiry);

      // Debe ser urgent
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_EXPIRING_URGENT',
          priority: 'urgent',
        })
      );
    });

    it('debería notificar documento próximo a vencer (normal: 7 días)', async () => {
      // Arrange: Prioridad alta
      const documentId = 1;
      const daysUntilExpiry = 7;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CAMION',
        entityId: 50,
        template: { name: 'Verificación' },
      };

      const mockCamion = {
        patenteNorm: 'ABC123',
      };

      const mockRecipients = [
        { userId: 1, role: 'TRANSPORTISTA', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce(mockCamion as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpiringSoon(documentId, daysUntilExpiry);

      // Debe ser high priority (no urgent)
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_EXPIRING',
          priority: 'high',
        })
      );
    });

    it('debería notificar documento próximo a vencer (normal: 15 días)', async () => {
      // Arrange: Prioridad normal
      const documentId = 1;
      const daysUntilExpiry = 15;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'ACOPLADO',
        entityId: 75,
        template: { name: 'Seguro' },
      };

      const mockAcoplado = {
        patenteNorm: 'DEF456',
      };

      const mockRecipients = [
        { userId: 1, role: 'TRANSPORTISTA', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.acoplado.findUnique.mockResolvedValueOnce(mockAcoplado as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpiringSoon(documentId, daysUntilExpiry);

      // Debe ser normal priority
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_EXPIRING',
          priority: 'normal',
        })
      );
    });

    it('debería manejar tipo de entidad CAMION', async () => {
      // Arrange: Entidad CAMION
      const documentId = 1;
      const daysUntilExpiry = 5;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CAMION',
        entityId: 50,
        template: { name: 'Licencia de Circulación' },
      };

      const mockCamion = {
        patenteNorm: 'XYZ789',
      };

      const mockRecipients = [
        { userId: 1, role: 'TRANSPORTISTA', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce(mockCamion as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpiringSoon(documentId, daysUntilExpiry);

      // Debe resolver la entidad como CAMION
      expect(prismaMock.camion.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 50 },
        })
      );
    });

    it('debería retornar temprano si documento no es encontrado', async () => {
      // Arrange
      const documentId = 999;
      const daysUntilExpiry = 5;
      prismaMock.document.findUnique.mockResolvedValueOnce(null);

      // Act
      await DocumentEventHandlers.onDocumentExpiringSoon(documentId, daysUntilExpiry);

      // Assert
      expect(UserNotificationResolverService.resolveFromEntity).not.toHaveBeenCalled();
    });

    it('debería manejar errores gracefulmente', async () => {
      // Arrange
      const documentId = 1;
      const daysUntilExpiry = 5;
      const testError = new Error('Error crítico');
      prismaMock.document.findUnique.mockRejectedValueOnce(testError);

      // Act: No debe lanzar excepción
      await expect(
        DocumentEventHandlers.onDocumentExpiringSoon(documentId, daysUntilExpiry)
      ).resolves.toBeUndefined();

      // Assert
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('debería evaluar equipos afectados incluso sin equipos incompletos', async () => {
      // Arrange: Evaluar equipos pero sin cambios de estado
      const documentId = 1;
      const daysUntilExpiry = 3;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Sofia',
        apellido: 'López',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      const mockEquipos = [{ id: 90 }];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce(
        mockEquipos
      );
      (EquipoEvaluationService.evaluarEquipos as jest.Mock).mockResolvedValueOnce([
        { equipoId: 90, estadoNuevo: 'POR_VENCER', cambio: true },
      ]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpiringSoon(documentId, daysUntilExpiry);

      // Debe evaluar los equipos
      expect(EquipoEvaluationService.evaluarEquipos).toHaveBeenCalledWith([90]);
    });
  });

  // ============================================================================
  // Tests de integración: onDocumentStatusChange
  // ============================================================================
  describe('onDocumentStatusChange', () => {
    it('debería disparar onDocumentApproved cuando estado es APROBADO', async () => {
      // Arrange
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Test',
        apellido: 'User',
      };

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce([
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ]);
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentStatusChange(documentId, 'PENDIENTE_APROBACION', 'APROBADO');

      // Debe crear notificación de aprobación
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_APPROVED',
        })
      );
    });

    it('debería disparar onDocumentRejected cuando estado es RECHAZADO', async () => {
      // Arrange
      const documentId = 1;
      const rejectReason = 'Inválido';
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Test',
        apellido: 'User',
      };

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce([
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ]);
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentStatusChange(
        documentId,
        'PENDIENTE_APROBACION',
        'RECHAZADO',
        rejectReason
      );

      // Debe crear notificación de rechazo
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_REJECTED',
        })
      );
    });

    it('debería disparar onDocumentExpired cuando estado es VENCIDO', async () => {
      // Arrange
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Test',
        apellido: 'User',
      };

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce([
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ]);
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentStatusChange(
        documentId,
        'APROBADO',
        'VENCIDO'
      );

      // Debe crear notificación de vencimiento
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT_EXPIRED',
        })
      );
    });

    it('debería ignorar cambios a estados no manejados', async () => {
      // Arrange: Estado que no dispara handlers específicos
      const documentId = 1;

      // Act
      await DocumentEventHandlers.onDocumentStatusChange(
        documentId,
        'APROBADO',
        'PENDIENTE_APROBACION' // No hay handler para esto
      );

      // Assert: No debe crear notificaciones
      expect(InternalNotificationService.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Tests de casos edge case
  // ============================================================================
  describe('Edge Cases', () => {
    it('debería manejar mensaje de notification message con plural correcto (1 día)', async () => {
      // Arrange
      const documentId = 1;
      const daysUntilExpiry = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Test',
        apellido: 'User',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpiringSoon(documentId, daysUntilExpiry);

      // Debe usar singular "día"
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('vence en 1 día'),
        })
      );
    });

    it('debería manejar mensaje de notification message con plural correcto (múltiples días)', async () => {
      // Arrange
      const documentId = 1;
      const daysUntilExpiry = 5;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Test',
        apellido: 'User',
      };

      const mockRecipients = [
        { userId: 1, role: 'CHOFER', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentExpiringSoon(documentId, daysUntilExpiry);

      // Debe usar plural "días"
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('vence en 5 días'),
        })
      );
    });

    it('debería incluir metadata correcta en notificaciones', async () => {
      // Arrange
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CAMION',
        entityId: 50,
        template: { name: 'Verificación' },
      };

      const mockCamion = {
        patenteNorm: 'ABC123',
      };

      const mockRecipients = [
        { userId: 1, role: 'TRANSPORTISTA', reason: 'admin_interno' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce(mockCamion as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentApproved(documentId);

      // Verificar que la metadata incluye información contextual
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            entityType: 'CAMION',
            entityId: 50,
            recipientRole: 'TRANSPORTISTA',
            reason: 'admin_interno',
          }),
        })
      );
    });

    it('debería manejar recipients vacíos sin lanzar error', async () => {
      // Arrange: Sin recipients
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'CHOFER',
        entityId: 100,
        template: { name: 'Licencia' },
      };

      const mockChofer = {
        dniNorm: '12345678',
        nombre: 'Test',
        apellido: 'User',
      };

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce([]);
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      // No debe lanzar error
      await expect(DocumentEventHandlers.onDocumentApproved(documentId)).resolves.toBeUndefined();

      // No debe crear notificaciones
      expect(InternalNotificationService.create).not.toHaveBeenCalled();
    });

    it('debería obtener identifier para cada tipo de entidad', async () => {
      // Arrange: Probar con EMPRESA_TRANSPORTISTA
      const documentId = 1;
      const mockDocInfo = {
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType: 'EMPRESA_TRANSPORTISTA',
        entityId: 25,
        template: { name: 'Registro' },
      };

      const mockEmpresa = {
        razonSocial: 'Mi Empresa',
        cuit: '20-12345678-9',
      };

      const mockRecipients = [
        { userId: 1, role: 'ADMIN', reason: 'direct' as const },
      ];

      // Act & Assert
      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocInfo as any);
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce(mockEmpresa as any);
      (UserNotificationResolverService.resolveFromEntity as jest.Mock).mockResolvedValueOnce(
        mockRecipients
      );
      (EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock).mockResolvedValueOnce([]);
      (InternalNotificationService.create as jest.Mock).mockResolvedValueOnce({});

      await DocumentEventHandlers.onDocumentApproved(documentId);

      // Debe incluir identifier de empresa
      expect(InternalNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Mi Empresa'),
        })
      );
    });
  });
});
