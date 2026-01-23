import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/services/document-stakeholders.service', () => ({
  DocumentStakeholdersService: {
    getDocumentStakeholders: jest.fn(),
  },
}));

jest.mock('../../src/services/internal-notification.service', () => ({
  InternalNotificationService: {
    createMany: jest.fn(),
  },
}));

import { RejectionNotificationService } from '../../src/services/rejection-notification.service';
import { DocumentStakeholdersService } from '../../src/services/document-stakeholders.service';
import { InternalNotificationService } from '../../src/services/internal-notification.service';
import { AppLogger } from '../../src/config/logger';

describe('RejectionNotificationService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('notifyDocumentRejection', () => {
    it('should return early when document not found', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);

      await RejectionNotificationService.notifyDocumentRejection(999, 'Test rejection');

      expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Documento 999 no encontrado'));
      expect(InternalNotificationService.createMany).not.toHaveBeenCalled();
    });

    it('should send notifications to all stakeholders', async () => {
      const mockDocument = {
        id: 1,
        entityType: 'CHOFER',
        entityId: 10,
        template: { name: 'Licencia de conducir' },
      };

      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocument as any);

      const mockChofer = {
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
      };

      prismaMock.chofer.findUnique.mockResolvedValueOnce(mockChofer as any);

      const mockStakeholders = [
        { userId: 1, tenantEmpresaId: 1, role: 'SUPERADMIN' },
        { userId: 2, tenantEmpresaId: 1, role: 'DADOR_DE_CARGA' },
      ];

      (DocumentStakeholdersService.getDocumentStakeholders as jest.Mock).mockResolvedValueOnce(mockStakeholders as any);

      (InternalNotificationService.createMany as jest.Mock).mockResolvedValueOnce(undefined);

      await RejectionNotificationService.notifyDocumentRejection(1, 'Documento inválido');

      expect(InternalNotificationService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 1,
            type: 'DOCUMENT_REJECTED',
            priority: 'high',
          }),
          expect.objectContaining({
            userId: 2,
            type: 'DOCUMENT_REJECTED',
            priority: 'high',
          }),
        ])
      );
    });

    it('should return early when no stakeholders found', async () => {
      const mockDocument = {
        id: 1,
        entityType: 'CHOFER',
        entityId: 10,
        template: { name: 'Licencia' },
      };

      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocument as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
      } as any);

      (DocumentStakeholdersService.getDocumentStakeholders as jest.Mock).mockResolvedValueOnce([]);

      await RejectionNotificationService.notifyDocumentRejection(1, 'Test');

      expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No se encontraron stakeholders'));
      expect(InternalNotificationService.createMany).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      prismaMock.document.findUnique.mockRejectedValueOnce(new Error('DB Error'));

      await RejectionNotificationService.notifyDocumentRejection(1, 'Test');

      expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error enviando notificaciones'), expect.any(Error));
    });
  });

  describe('getEntityName', () => {
    const getEntityName = (RejectionNotificationService as any).getEntityName;

    it('should return CHOFER name with DNI', async () => {
      prismaMock.chofer.findUnique.mockResolvedValueOnce({
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
      } as any);

      const result = await getEntityName('CHOFER', 10);

      expect(result).toBe('Juan Pérez (DNI: 12345678)');
    });

    it('should return fallback when CHOFER not found', async () => {
      prismaMock.chofer.findUnique.mockResolvedValueOnce(null);

      const result = await getEntityName('CHOFER', 10);

      expect(result).toBe('Chofer #10');
    });

    it('should return CAMION with patente', async () => {
      prismaMock.camion.findUnique.mockResolvedValueOnce({
        patente: 'ABC123',
      } as any);

      const result = await getEntityName('CAMION', 20);

      expect(result).toBe('Camión ABC123');
    });

    it('should return fallback when CAMION not found', async () => {
      prismaMock.camion.findUnique.mockResolvedValueOnce(null);

      const result = await getEntityName('CAMION', 20);

      expect(result).toBe('Camión #20');
    });

    it('should return ACOPLADO with patente', async () => {
      prismaMock.acoplado.findUnique.mockResolvedValueOnce({
        patente: 'DEF456',
      } as any);

      const result = await getEntityName('ACOPLADO', 30);

      expect(result).toBe('Acoplado DEF456');
    });

    it('should return fallback when ACOPLADO not found', async () => {
      prismaMock.acoplado.findUnique.mockResolvedValueOnce(null);

      const result = await getEntityName('ACOPLADO', 30);

      expect(result).toBe('Acoplado #30');
    });

    it('should return EMPRESA_TRANSPORTISTA razonSocial', async () => {
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({
        razonSocial: 'Transportes S.A.',
      } as any);

      const result = await getEntityName('EMPRESA_TRANSPORTISTA', 40);

      expect(result).toBe('Transportes S.A.');
    });

    it('should return fallback when EMPRESA_TRANSPORTISTA not found', async () => {
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce(null);

      const result = await getEntityName('EMPRESA_TRANSPORTISTA', 40);

      expect(result).toBe('Empresa #40');
    });

    it('should return DADOR razonSocial', async () => {
      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Dador S.A.',
      } as any);

      const result = await getEntityName('DADOR', 50);

      expect(result).toBe('Dador S.A.');
    });

    it('should return fallback for unknown entity type', async () => {
      const result = await getEntityName('UNKNOWN', 99);

      expect(result).toBe('Entidad #99');
    });

    it('should return fallback on error', async () => {
      prismaMock.chofer.findUnique.mockRejectedValueOnce(new Error('DB Error'));

      const result = await getEntityName('CHOFER', 10);

      expect(result).toBe('Entidad #10');
    });
  });

  describe('translateEntityType', () => {
    const translateEntityType = (RejectionNotificationService as any).translateEntityType;

    it('should translate all entity types', () => {
      expect(translateEntityType('CHOFER')).toBe('Chofer');
      expect(translateEntityType('CAMION')).toBe('Camión');
      expect(translateEntityType('ACOPLADO')).toBe('Acoplado');
      expect(translateEntityType('EMPRESA_TRANSPORTISTA')).toBe('Empresa Transportista');
      expect(translateEntityType('DADOR')).toBe('Dador de Carga');
    });

    it('should return original type for unknown', () => {
      expect(translateEntityType('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('buildNotificationContent', () => {
    const buildNotificationContent = (RejectionNotificationService as any).buildNotificationContent.bind(RejectionNotificationService);

    it('should build title and message correctly', () => {
      const result = buildNotificationContent({
        documentType: 'Licencia',
        entityType: 'CHOFER',
        entityName: 'Juan Pérez',
        rejectionReason: 'Foto borrosa',
      });

      expect(result.title).toBe('Documento Rechazado: Licencia');
      expect(result.message).toContain('Licencia');
      expect(result.message).toContain('Juan Pérez');
      expect(result.message).toContain('Foto borrosa');
    });
  });

  describe('sendInternalNotifications', () => {
    const sendInternalNotifications = (RejectionNotificationService as any).sendInternalNotifications.bind(RejectionNotificationService);

    it('should return early when no stakeholders', async () => {
      const mockDocument = {
        id: 1,
        template: { name: 'Licencia' },
        entityType: 'CHOFER',
      };

      (InternalNotificationService.createMany as jest.Mock).mockResolvedValueOnce(undefined);

      await sendInternalNotifications(mockDocument, 'Test', [], 'Entity Name');

      expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No hay stakeholders'));
      expect(InternalNotificationService.createMany).not.toHaveBeenCalled();
    });

    it('should create notifications with correct data', async () => {
      const mockDocument = {
        id: 1,
        template: { name: 'Licencia' },
        entityType: 'CHOFER',
      };

      const stakeholders = [
        { userId: 1, tenantEmpresaId: 1, role: 'ADMIN' },
        { userId: 2, tenantEmpresaId: 1, role: 'DADOR_DE_CARGA' },
      ];

      (InternalNotificationService.createMany as jest.Mock).mockResolvedValueOnce(undefined);

      await sendInternalNotifications(mockDocument, 'Test rejection', stakeholders, 'Entity Name');

      expect(InternalNotificationService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 1,
            type: 'DOCUMENT_REJECTED',
            priority: 'high',
            link: '/documentos/document/1',
            documentId: 1,
          }),
        ])
      );
    });
  });
});
