/**
 * Tests unitarios para DocumentValidationService
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mock dependencies before importing service
jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: jest.fn(() => ({
    FLOWISE_VALIDATION_ENABLED: true,
    FLOWISE_VALIDATION_BASE_URL: 'http://localhost:3000',
    FLOWISE_VALIDATION_FLOW_ID: 'test-flow-id',
    FLOWISE_VALIDATION_TIMEOUT: 30000,
  })),
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('axios');

import axios from 'axios';
import { DocumentValidationService } from '../../src/services/document-validation.service';
import { getEnvironment } from '../../src/config/environment';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DocumentValidationService', () => {
  let service: DocumentValidationService;

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    service = DocumentValidationService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DocumentValidationService.getInstance();
      const instance2 = DocumentValidationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('isEnabled', () => {
    it('should return true when validation is enabled', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when validation is disabled', () => {
      (getEnvironment as jest.Mock).mockReturnValueOnce({
        FLOWISE_VALIDATION_ENABLED: false,
        FLOWISE_VALIDATION_BASE_URL: '',
        FLOWISE_VALIDATION_FLOW_ID: '',
      });
      
      expect(service.isEnabled()).toBe(false);
    });

    it('should return false when base URL is missing', () => {
      (getEnvironment as jest.Mock).mockReturnValueOnce({
        FLOWISE_VALIDATION_ENABLED: true,
        FLOWISE_VALIDATION_BASE_URL: '',
        FLOWISE_VALIDATION_FLOW_ID: 'test',
      });
      
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('getEntityData', () => {
    it('should get chofer data', async () => {
      prismaMock.chofer.findUnique.mockResolvedValue({
        id: 1,
        dni: '12345678',
        nombre: 'Juan',
        apellido: 'Perez',
        empresaTransportista: { cuit: '20-12345678-9' },
      });

      const result = await service.getEntityData('CHOFER', 1);

      expect(result).toEqual({
        dni: '12345678',
        nombre: 'Juan',
        apellido: 'Perez',
        cuit: '20-12345678-9',
      });
    });

    it('should get camion data', async () => {
      prismaMock.camion.findUnique.mockResolvedValue({
        id: 1,
        patente: 'ABC123',
        marca: 'Scania',
        modelo: 'R450',
      });

      const result = await service.getEntityData('CAMION', 1);

      expect(result).toEqual({
        patente: 'ABC123',
        marca: 'Scania',
        modelo: 'R450',
      });
    });

    it('should get acoplado data', async () => {
      prismaMock.acoplado.findUnique.mockResolvedValue({
        id: 1,
        patente: 'XYZ789',
        tipo: 'Semirremolque',
      });

      const result = await service.getEntityData('ACOPLADO', 1);

      expect(result).toEqual({
        patente: 'XYZ789',
        tipo: 'Semirremolque',
      });
    });

    it('should get empresa transportista data', async () => {
      prismaMock.empresaTransportista.findUnique.mockResolvedValue({
        id: 1,
        cuit: '30-12345678-9',
        razonSocial: 'Transporte SA',
      });

      const result = await service.getEntityData('EMPRESA_TRANSPORTISTA', 1);

      expect(result).toEqual({
        cuit: '30-12345678-9',
        razonSocial: 'Transporte SA',
      });
    });

    it('should return empty object for unknown entity type', async () => {
      const result = await service.getEntityData('UNKNOWN' as any, 1);
      expect(result).toEqual({});
    });
  });

  describe('validateDocument', () => {
    const mockRequest = {
      documentId: 1,
      imageBase64: 'base64data',
      mimeType: 'image/png',
      fileName: 'test.png',
      tipoDocumento: 'Licencia de Conducir',
      tipoEntidad: 'CHOFER' as const,
      datosEntidad: { dni: '12345678' },
    };

    it('should return disabled error when validation is disabled', async () => {
      (getEnvironment as jest.Mock).mockReturnValue({
        FLOWISE_VALIDATION_ENABLED: false,
      });

      const result = await service.validateDocument(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_DISABLED');
    });

    it('should validate document successfully', async () => {
      (getEnvironment as jest.Mock).mockReturnValue({
        FLOWISE_VALIDATION_ENABLED: true,
        FLOWISE_VALIDATION_BASE_URL: 'http://localhost:3000',
        FLOWISE_VALIDATION_FLOW_ID: 'test-flow',
        FLOWISE_VALIDATION_TIMEOUT: 30000,
      });

      const mockResponse = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'Licencia de Conducir',
        confianza: 0.95,
        datosExtraidos: { dni: '12345678' },
        disparidades: [],
        datosNuevos: {},
        coincideVencimiento: true,
      };

      mockedAxios.post.mockResolvedValue({ data: { text: JSON.stringify(mockResponse) } });

      prismaMock.documentClassification.upsert.mockResolvedValue({});
      prismaMock.document.findUnique.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        entityType: 'CHOFER',
        entityId: 1,
        dadorCargaId: 1,
      });
      prismaMock.entityExtractionLog.create.mockResolvedValue({});
      prismaMock.entityExtractedData.upsert.mockResolvedValue({});

      const result = await service.validateDocument(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data?.esDocumentoCorrecto).toBe(true);
      expect(result.data?.confianza).toBe(0.95);
    });

    it('should handle axios error', async () => {
      (getEnvironment as jest.Mock).mockReturnValue({
        FLOWISE_VALIDATION_ENABLED: true,
        FLOWISE_VALIDATION_BASE_URL: 'http://localhost:3000',
        FLOWISE_VALIDATION_FLOW_ID: 'test-flow',
        FLOWISE_VALIDATION_TIMEOUT: 30000,
      });

      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.validateDocument(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle parse error', async () => {
      (getEnvironment as jest.Mock).mockReturnValue({
        FLOWISE_VALIDATION_ENABLED: true,
        FLOWISE_VALIDATION_BASE_URL: 'http://localhost:3000',
        FLOWISE_VALIDATION_FLOW_ID: 'test-flow',
        FLOWISE_VALIDATION_TIMEOUT: 30000,
      });

      mockedAxios.post.mockResolvedValue({ data: { text: 'invalid json' } });

      const result = await service.validateDocument(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PARSE_ERROR');
    });
  });
});




