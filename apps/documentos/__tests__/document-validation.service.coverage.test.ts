/**
 * Coverage tests for document-validation.service.ts
 * Covers: isEnabled, getEntityData (all entity types), validateDocument, parseResponse,
 *         saveClassificationResult, saveExtractionLog, updateEntityExtractedData,
 *         extractConsolidatedFields, extractChoferFields, extractVehiculoFields,
 *         extractEmpresaFields, parseDate, mergeExtractedData.
 * @jest-environment node
 */

const mockPrisma = {
  chofer: { findUnique: jest.fn() },
  camion: { findUnique: jest.fn() },
  acoplado: { findUnique: jest.fn() },
  empresaTransportista: { findUnique: jest.fn() },
  documentClassification: { upsert: jest.fn() },
  entityExtractionLog: { create: jest.fn() },
  entityExtractedData: { upsert: jest.fn() },
  document: { findUnique: jest.fn() },
};

jest.mock('../src/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockGetEnvironment = jest.fn();
jest.mock('../src/config/environment', () => ({
  getEnvironment: mockGetEnvironment,
}));

const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  default: { post: (...args: any[]) => mockAxiosPost(...args) },
  post: (...args: any[]) => mockAxiosPost(...args),
  __esModule: true,
}));

// Reset singleton before import
import { DocumentValidationService } from '../src/services/document-validation.service';

function getInstance(): DocumentValidationService {
  return DocumentValidationService.getInstance();
}

describe('DocumentValidationService', () => {
  let service: DocumentValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = getInstance();
    mockGetEnvironment.mockReturnValue({
      FLOWISE_VALIDATION_ENABLED: true,
      FLOWISE_VALIDATION_BASE_URL: 'https://flowise.test',
      FLOWISE_VALIDATION_FLOW_ID: 'flow-123',
      FLOWISE_VALIDATION_TIMEOUT: 30000,
    });
  });

  // ====================================================================
  // Singleton
  // ====================================================================
  describe('getInstance', () => {
    it('should return same instance', () => {
      const a = DocumentValidationService.getInstance();
      const b = DocumentValidationService.getInstance();
      expect(a).toBe(b);
    });
  });

  // ====================================================================
  // isEnabled
  // ====================================================================
  describe('isEnabled', () => {
    it('should return true when all env vars set', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when FLOWISE_VALIDATION_ENABLED is false', () => {
      mockGetEnvironment.mockReturnValue({
        FLOWISE_VALIDATION_ENABLED: false,
        FLOWISE_VALIDATION_BASE_URL: 'https://flowise.test',
        FLOWISE_VALIDATION_FLOW_ID: 'flow-123',
      });
      expect(service.isEnabled()).toBe(false);
    });

    it('should return false when BASE_URL is empty', () => {
      mockGetEnvironment.mockReturnValue({
        FLOWISE_VALIDATION_ENABLED: true,
        FLOWISE_VALIDATION_BASE_URL: '',
        FLOWISE_VALIDATION_FLOW_ID: 'flow-123',
      });
      expect(service.isEnabled()).toBe(false);
    });

    it('should return false when FLOW_ID is empty', () => {
      mockGetEnvironment.mockReturnValue({
        FLOWISE_VALIDATION_ENABLED: true,
        FLOWISE_VALIDATION_BASE_URL: 'https://flowise.test',
        FLOWISE_VALIDATION_FLOW_ID: '',
      });
      expect(service.isEnabled()).toBe(false);
    });
  });

  // ====================================================================
  // getEntityData
  // ====================================================================
  describe('getEntityData', () => {
    it('should return chofer data', async () => {
      mockPrisma.chofer.findUnique.mockResolvedValue({
        dni: '12345678',
        nombre: 'Juan',
        apellido: 'Perez',
        empresaTransportista: { cuit: '20-12345678-1' },
      });

      const result = await service.getEntityData('CHOFER' as any, 1);

      expect(result.dni).toBe('12345678');
      expect(result.nombre).toBe('Juan');
      expect(result.cuit).toBe('20-12345678-1');
    });

    it('should handle chofer with null optional fields', async () => {
      mockPrisma.chofer.findUnique.mockResolvedValue({
        dni: '12345678',
        nombre: null,
        apellido: null,
        empresaTransportista: null,
      });

      const result = await service.getEntityData('CHOFER' as any, 1);

      expect(result.nombre).toBeUndefined();
      expect(result.apellido).toBeUndefined();
      expect(result.cuit).toBeUndefined();
    });

    it('should return camion data', async () => {
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'ABC123', marca: 'Scania', modelo: 'R500' });

      const result = await service.getEntityData('CAMION' as any, 1);

      expect(result.patente).toBe('ABC123');
      expect(result.marca).toBe('Scania');
    });

    it('should handle camion with null fields', async () => {
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'ABC123', marca: null, modelo: null });

      const result = await service.getEntityData('CAMION' as any, 1);

      expect(result.marca).toBeUndefined();
      expect(result.modelo).toBeUndefined();
    });

    it('should return acoplado data', async () => {
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'XYZ789', tipo: 'Baranda' });

      const result = await service.getEntityData('ACOPLADO' as any, 1);

      expect(result.patente).toBe('XYZ789');
      expect(result.tipo).toBe('Baranda');
    });

    it('should handle acoplado with null tipo', async () => {
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'XYZ', tipo: null });

      const result = await service.getEntityData('ACOPLADO' as any, 1);

      expect(result.tipo).toBeUndefined();
    });

    it('should return empresa_transportista data', async () => {
      mockPrisma.empresaTransportista.findUnique.mockResolvedValue({ cuit: '30-11111111-1', razonSocial: 'Trans SA' });

      const result = await service.getEntityData('EMPRESA_TRANSPORTISTA' as any, 1);

      expect(result.cuit).toBe('30-11111111-1');
      expect(result.razonSocial).toBe('Trans SA');
    });

    it('should return empty object for unknown entity type', async () => {
      const result = await service.getEntityData('UNKNOWN' as any, 1);

      expect(result).toEqual({});
    });
  });

  // ====================================================================
  // validateDocument
  // ====================================================================
  describe('validateDocument', () => {
    const baseRequest = {
      documentId: 1,
      imageBase64: 'base64data',
      mimeType: 'image/jpeg',
      fileName: 'doc.jpg',
      tipoDocumento: 'DNI',
      tipoEntidad: 'CHOFER' as any,
      datosEntidad: { dni: '12345678' },
    };

    it('should return disabled when not enabled', async () => {
      mockGetEnvironment.mockReturnValue({
        FLOWISE_VALIDATION_ENABLED: false,
        FLOWISE_VALIDATION_BASE_URL: '',
        FLOWISE_VALIDATION_FLOW_ID: '',
      });

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_DISABLED');
    });

    it('should validate document successfully with high confidence', async () => {
      const validResponse = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'DNI',
        confianza: 0.95,
        disparidades: [],
        datosExtraidos: { nombre: 'Juan' },
        coincideVencimiento: true,
        vencimientoEnDocumento: '2026-12-31',
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(validResponse) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({ tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 1 });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});
      mockPrisma.entityExtractedData.upsert.mockResolvedValue({});

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(true);
      expect(result.data?.confianza).toBe(0.95);
    });

    it('should not update entity data when confianza < 0.7', async () => {
      const lowConfResponse = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'DNI',
        confianza: 0.5,
        disparidades: [],
        datosExtraidos: {},
        coincideVencimiento: true,
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(lowConfResponse) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({ tenantEmpresaId: 1, entityType: 'CHOFER', entityId: 1 });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(true);
      expect(mockPrisma.entityExtractedData.upsert).not.toHaveBeenCalled();
    });

    it('should not update entity data when esDocumentoCorrecto=false', async () => {
      const incorrectResponse = {
        esDocumentoCorrecto: false,
        tipoDocumentoDetectado: 'OTHER',
        confianza: 0.9,
        disparidades: [],
        datosExtraidos: {},
        coincideVencimiento: false,
        motivoSiIncorrecto: 'Wrong doc type',
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(incorrectResponse) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({ tenantEmpresaId: 1, entityType: 'CHOFER', entityId: 1 });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(true);
      expect(mockPrisma.entityExtractedData.upsert).not.toHaveBeenCalled();
    });

    it('should handle response as direct object', async () => {
      const objResponse = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'DNI',
        confianza: 0.8,
        disparidades: [{ campo: 'nombre', valorEnSistema: 'A', valorEnDocumento: 'B', severidad: 'advertencia', mensaje: 'Diff' }],
        datosExtraidos: {},
        coincideVencimiento: true,
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: objResponse });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({ tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 1 });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});
      mockPrisma.entityExtractedData.upsert.mockResolvedValue({});

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(true);
    });

    it('should return PARSE_ERROR when response is unparseable', async () => {
      mockAxiosPost.mockResolvedValue({ data: { text: 'not json at all' } });

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PARSE_ERROR');
    });

    it('should return PARSE_ERROR when rawText is non-string, non-object', async () => {
      mockAxiosPost.mockResolvedValue({ data: { text: 42 } });

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PARSE_ERROR');
    });

    it('should handle axios error', async () => {
      mockAxiosPost.mockRejectedValue(new Error('Network error'));

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle non-Error thrown', async () => {
      mockAxiosPost.mockRejectedValue('raw-error');

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle doc not found in saveExtractionLog', async () => {
      const resp = {
        esDocumentoCorrecto: false,
        tipoDocumentoDetectado: 'DNI',
        confianza: 0.5,
        disparidades: [],
        datosExtraidos: {},
        coincideVencimiento: false,
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(resp) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue(null);

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(true);
      expect(mockPrisma.entityExtractionLog.create).not.toHaveBeenCalled();
    });

    it('should handle vencimiento with invalid date in saveClassificationResult', async () => {
      const resp = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'DNI',
        confianza: 0.8,
        disparidades: [],
        datosExtraidos: {},
        coincideVencimiento: true,
        vencimientoEnDocumento: 'invalid-date',
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(resp) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({ tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 1 });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});
      mockPrisma.entityExtractedData.upsert.mockResolvedValue({});

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(true);
    });

    it('should handle null vencimientoEnDocumento', async () => {
      const resp = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'DNI',
        confianza: 0.8,
        disparidades: [],
        datosExtraidos: {},
        coincideVencimiento: false,
        vencimientoEnDocumento: null,
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(resp) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({ tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 1 });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});
      mockPrisma.entityExtractedData.upsert.mockResolvedValue({});

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(true);
    });

    it('should handle disparidades with critica severity', async () => {
      const resp = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'DNI',
        confianza: 0.9,
        disparidades: [{ campo: 'dni', valorEnSistema: '1', valorEnDocumento: '2', severidad: 'critica', mensaje: 'DNI mismatch' }],
        datosExtraidos: {},
        coincideVencimiento: true,
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(resp) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({ tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 1 });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});
      mockPrisma.entityExtractedData.upsert.mockResolvedValue({});

      const result = await service.validateDocument(baseRequest);

      expect(result.success).toBe(true);
    });

    it('should handle solicitadoPor and esRechequeo in extraction log', async () => {
      const resp = {
        esDocumentoCorrecto: false,
        tipoDocumentoDetectado: 'DNI',
        confianza: 0.3,
        disparidades: [],
        datosExtraidos: {},
        coincideVencimiento: false,
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(resp) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({ tenantEmpresaId: 1, entityType: 'CHOFER', entityId: 1 });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});

      const result = await service.validateDocument({
        ...baseRequest,
        solicitadoPor: 5,
        esRechequeo: true,
      });

      expect(result.success).toBe(true);
    });
  });

  // ====================================================================
  // extractConsolidatedFields via updateEntityExtractedData
  // ====================================================================
  describe('extractConsolidatedFields branches', () => {
    const setupSuccessfulValidation = (entityType: string, datosExtraidos: Record<string, unknown>) => {
      const resp = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'DOC',
        confianza: 0.95,
        disparidades: [],
        datosExtraidos,
        coincideVencimiento: true,
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(resp) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        entityType,
        entityId: 1,
      });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});
      mockPrisma.entityExtractedData.upsert.mockResolvedValue({});
    };

    it('should extract chofer fields with all data', async () => {
      setupSuccessfulValidation('CHOFER', {
        cuil: '20-12345678-1',
        nacionalidad: 'Argentina',
        numeroLicencia: 'LIC-001',
        clases: ['B1', 'B2'],
        fechaNacimiento: '1990-01-15',
        vencimiento: '2026-06-30',
      });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'LNH', tipoEntidad: 'CHOFER' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.entityExtractedData.upsert).toHaveBeenCalled();
    });

    it('should extract vehiculo fields with titular as string', async () => {
      setupSuccessfulValidation('CAMION', {
        anio: 2020,
        numeroMotor: 'M-12345',
        numeroChasis: 'C-67890',
        titular: 'Juan Perez',
      });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'TITULO', tipoEntidad: 'CAMION' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
    });

    it('should extract vehiculo fields with titular as object', async () => {
      setupSuccessfulValidation('CAMION', {
        titular: { nombre: 'Juan Perez', dni: '12345678' },
      });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'TITULO', tipoEntidad: 'CAMION' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
    });

    it('should extract ACOPLADO fields', async () => {
      setupSuccessfulValidation('ACOPLADO', {
        anio: 2019,
        titular: null,
      });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'RTO', tipoEntidad: 'ACOPLADO' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
    });

    it('should extract empresa fields with ART data', async () => {
      setupSuccessfulValidation('EMPRESA_TRANSPORTISTA', {
        condicionIva: 'Responsable Inscripto',
        domicilioFiscal: 'Av. Test 123',
        actividadPrincipal: 'Transporte',
        cantidadEmpleados: 50,
        art: { nombre: 'ART SA', poliza: 'P-001' },
      });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'ART', tipoEntidad: 'EMPRESA_TRANSPORTISTA' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
    });

    it('should extract empresa fields without ART', async () => {
      setupSuccessfulValidation('EMPRESA_TRANSPORTISTA', {
        condicionIva: 'Monotributista',
      });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'CONSTANCIA', tipoEntidad: 'EMPRESA_TRANSPORTISTA' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
    });

    it('should handle chofer fields with invalid date', async () => {
      setupSuccessfulValidation('CHOFER', {
        fechaNacimiento: 'invalid',
        vencimiento: 'also-invalid',
      });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'LNH', tipoEntidad: 'CHOFER' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
    });

    it('should return empty fields for unknown entity type', async () => {
      setupSuccessfulValidation('UNKNOWN', {});

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'DOC', tipoEntidad: 'UNKNOWN' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
    });

    it('should handle doc not found in updateEntityExtractedData', async () => {
      const resp = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'DOC',
        confianza: 0.95,
        disparidades: [],
        datosExtraidos: {},
        coincideVencimiento: true,
        datosNuevos: {},
      };
      mockAxiosPost.mockResolvedValue({ data: { text: JSON.stringify(resp) } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      // saveExtractionLog finds doc, but updateEntityExtractedData does not
      mockPrisma.document.findUnique
        .mockResolvedValueOnce({ tenantEmpresaId: 1, entityType: 'CHOFER', entityId: 1 }) // saveExtractionLog
        .mockResolvedValueOnce(null); // updateEntityExtractedData
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'DNI', tipoEntidad: 'CHOFER' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.entityExtractedData.upsert).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // parseResponse edge cases
  // ====================================================================
  describe('parseResponse edge cases via validateDocument', () => {
    it('should handle JSON embedded in text', async () => {
      const validResponse = {
        esDocumentoCorrecto: true,
        tipoDocumentoDetectado: 'DNI',
        confianza: 0.85,
        disparidades: [],
        datosExtraidos: {},
        coincideVencimiento: true,
        datosNuevos: {},
      };
      const textWithJson = `Here is the result: ${JSON.stringify(validResponse)} end of response`;
      mockAxiosPost.mockResolvedValue({ data: { text: textWithJson } });
      mockPrisma.documentClassification.upsert.mockResolvedValue({});
      mockPrisma.document.findUnique.mockResolvedValue({ tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 1 });
      mockPrisma.entityExtractionLog.create.mockResolvedValue({});
      mockPrisma.entityExtractedData.upsert.mockResolvedValue({});

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'DNI', tipoEntidad: 'CHOFER' as any, datosEntidad: {},
      });

      expect(result.success).toBe(true);
    });

    it('should return null for text without braces', async () => {
      mockAxiosPost.mockResolvedValue({ data: { text: 'no json here' } });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'DNI', tipoEntidad: 'CHOFER' as any, datosEntidad: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('PARSE_ERROR');
    });

    it('should return null when end brace before start brace', async () => {
      mockAxiosPost.mockResolvedValue({ data: { text: '} something {' } });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'DNI', tipoEntidad: 'CHOFER' as any, datosEntidad: {},
      });

      expect(result.success).toBe(false);
    });

    it('should handle invalid JSON between braces', async () => {
      mockAxiosPost.mockResolvedValue({ data: { text: '{ not: valid json }' } });

      const result = await service.validateDocument({
        documentId: 1, imageBase64: 'data', mimeType: 'image/jpeg',
        fileName: 'doc.jpg', tipoDocumento: 'DNI', tipoEntidad: 'CHOFER' as any, datosEntidad: {},
      });

      expect(result.success).toBe(false);
    });
  });
});
