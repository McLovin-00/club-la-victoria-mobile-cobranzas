import type { EntityType } from '.prisma/documentos';
import axios from 'axios';
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: jest.fn(),
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import { getEnvironment } from '../../src/config/environment';
import { DocumentValidationService } from '../../src/services/document-validation.service';

const mockedAxios = axios as unknown as { post: jest.Mock };
const mockedGetEnvironment = getEnvironment as jest.MockedFunction<typeof getEnvironment>;

type ValidationRequest = Parameters<DocumentValidationService['validateDocument']>[0];
type ValidationResponse = NonNullable<Awaited<ReturnType<DocumentValidationService['validateDocument']>>['data']>;

type DocumentValidationServicePrivate = {
  parseResponse: (rawText: unknown) => ValidationResponse | null;
  saveClassificationResult: (documentId: number, result: ValidationResponse) => Promise<void>;
  saveExtractionLog: (request: ValidationRequest, result: ValidationResponse) => Promise<void>;
  updateEntityExtractedData: (request: ValidationRequest, result: ValidationResponse) => Promise<void>;
  extractConsolidatedFields: (entityType: EntityType, data: Record<string, unknown>) => Record<string, unknown>;
  parseDate: (value: unknown) => Date | null;
};

describe('DocumentValidationService', () => {
  const baseEnv = {
    FLOWISE_VALIDATION_ENABLED: true,
    FLOWISE_VALIDATION_BASE_URL: 'http://flowise.test',
    FLOWISE_VALIDATION_FLOW_ID: 'flow-1',
    FLOWISE_VALIDATION_TIMEOUT: 1500,
  } as ReturnType<typeof getEnvironment>;

  const baseRequest: ValidationRequest = {
    documentId: 10,
    imageBase64: 'abcd',
    mimeType: 'image/png',
    fileName: 'doc.png',
    tipoDocumento: 'LICENCIA',
    tipoEntidad: 'CHOFER' as EntityType,
    datosEntidad: { cuil: '20' },
    vencimientoPrecargado: '2026-01-01',
    solicitadoPor: 4,
    esRechequeo: true,
  };

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('isEnabled retorna false si faltan datos de entorno', () => {
    mockedGetEnvironment.mockReturnValue({
      FLOWISE_VALIDATION_ENABLED: true,
      FLOWISE_VALIDATION_BASE_URL: '',
      FLOWISE_VALIDATION_FLOW_ID: '',
    } as ReturnType<typeof getEnvironment>);

    const service = DocumentValidationService.getInstance();
    expect(service.isEnabled()).toBe(false);
  });

  it('parseResponse maneja object, string válido y casos inválidos', () => {
    const service = DocumentValidationService.getInstance() as unknown as DocumentValidationServicePrivate;

    const objectResponse = {
      esDocumentoCorrecto: true,
      tipoDocumentoDetectado: 'LICENCIA',
      confianza: 0.9,
      datosExtraidos: {},
      coincideVencimiento: true,
      disparidades: [],
      datosNuevos: {},
    } satisfies ValidationResponse;

    expect(service.parseResponse(objectResponse)).toEqual(objectResponse);
    expect(service.parseResponse(123)).toBeNull();
    expect(service.parseResponse('sin json')).toBeNull();
    expect(service.parseResponse('{"esDocumentoCorrecto":true}')).toEqual({ esDocumentoCorrecto: true });
    expect(service.parseResponse('{invalid}')).toBeNull();
  });

  it('validateDocument retorna error cuando está deshabilitado', async () => {
    mockedGetEnvironment.mockReturnValue({
      FLOWISE_VALIDATION_ENABLED: false,
      FLOWISE_VALIDATION_BASE_URL: 'http://flowise.test',
      FLOWISE_VALIDATION_FLOW_ID: 'flow-1',
    } as ReturnType<typeof getEnvironment>);

    const service = DocumentValidationService.getInstance();
    const result = await service.validateDocument(baseRequest);

    expect(result).toEqual({ success: false, error: 'VALIDATION_DISABLED' });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('validateDocument retorna PARSE_ERROR cuando la respuesta no es válida', async () => {
    mockedGetEnvironment.mockReturnValue(baseEnv);
    mockedAxios.post.mockResolvedValueOnce({ data: { text: 'respuesta inválida' } });

    const service = DocumentValidationService.getInstance();
    const result = await service.validateDocument(baseRequest);

    expect(result).toEqual({ success: false, error: 'PARSE_ERROR' });
  });

  it('validateDocument guarda resultado y actualiza datos cuando es válido', async () => {
    mockedGetEnvironment.mockReturnValue(baseEnv);

    const response: ValidationResponse = {
      esDocumentoCorrecto: true,
      tipoDocumentoDetectado: 'LICENCIA',
      confianza: 0.9,
      motivoSiIncorrecto: null,
      datosExtraidos: {
        cuil: '20',
        fechaNacimiento: '2020-01-01',
        vencimiento: '2030-01-01',
        clases: ['A'],
      },
      vencimientoEnDocumento: '2030-01-01',
      coincideVencimiento: true,
      disparidades: [],
      datosNuevos: {},
    };

    mockedAxios.post.mockResolvedValueOnce({
      data: { text: JSON.stringify(response) },
    });

    prismaMock.documentClassification.upsert.mockResolvedValueOnce({ id: 1 });
    prismaMock.document.findUnique
      .mockResolvedValueOnce({ tenantEmpresaId: 1, entityType: 'CHOFER', entityId: 9 })
      .mockResolvedValueOnce({ tenantEmpresaId: 1, dadorCargaId: 2, entityType: 'CHOFER', entityId: 9 });
    prismaMock.entityExtractionLog.create.mockResolvedValueOnce({ id: 2 });
    prismaMock.entityExtractedData.upsert.mockResolvedValueOnce({ id: 3 });

    const service = DocumentValidationService.getInstance();
    const result = await service.validateDocument(baseRequest);

    expect(result.success).toBe(true);
    expect(prismaMock.documentClassification.upsert).toHaveBeenCalled();
    expect(prismaMock.entityExtractionLog.create).toHaveBeenCalled();
    expect(prismaMock.entityExtractedData.upsert).toHaveBeenCalled();
  });

  it('saveClassificationResult marca disparidades y vencimiento inválido', async () => {
    const service = DocumentValidationService.getInstance() as unknown as DocumentValidationServicePrivate;

    const response: ValidationResponse = {
      esDocumentoCorrecto: false,
      tipoDocumentoDetectado: 'OTRO',
      confianza: 0.4,
      motivoSiIncorrecto: 'fallo',
      datosExtraidos: {},
      coincideVencimiento: false,
      disparidades: [
        {
          campo: 'numero',
          valorEnSistema: '1',
          valorEnDocumento: '2',
          severidad: 'critica',
          mensaje: 'no coincide',
        },
      ],
      datosNuevos: {},
      vencimientoEnDocumento: 'invalid-date',
    };

    prismaMock.documentClassification.upsert.mockResolvedValueOnce({ id: 2 });

    await service.saveClassificationResult(99, response);

    expect(prismaMock.documentClassification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { documentId: 99 },
        update: expect.objectContaining({
          tieneDisparidades: true,
          vencimientoDetectado: null,
        }),
      })
    );
  });

  it('updateEntityExtractedData omite cuando no hay documento', async () => {
    const service = DocumentValidationService.getInstance() as unknown as DocumentValidationServicePrivate;
    prismaMock.document.findUnique.mockResolvedValueOnce(null);

    await service.updateEntityExtractedData(baseRequest, {
      esDocumentoCorrecto: true,
      tipoDocumentoDetectado: 'LICENCIA',
      confianza: 0.8,
      datosExtraidos: {},
      coincideVencimiento: true,
      disparidades: [],
      datosNuevos: {},
    });

    expect(prismaMock.entityExtractedData.upsert).not.toHaveBeenCalled();
  });

  it('extractConsolidatedFields cubre todas las entidades y parseDate', () => {
    const service = DocumentValidationService.getInstance() as unknown as DocumentValidationServicePrivate;

    const chofer = service.extractConsolidatedFields('CHOFER' as EntityType, {
      cuil: '20',
      nacionalidad: 'AR',
      numeroLicencia: 'X',
      clases: ['A', 'B'],
      fechaNacimiento: '2020-01-01',
      vencimiento: '2030-01-01',
    });
    expect(chofer.cuil).toBe('20');

    const vehiculo = service.extractConsolidatedFields('CAMION' as EntityType, {
      anio: 2020,
      numeroMotor: 'M1',
      numeroChasis: 'C1',
      titular: { nombre: 'Titular', dni: '123' },
    });
    expect(vehiculo.titular).toBe('Titular');

    const acoplado = service.extractConsolidatedFields('ACOPLADO' as EntityType, {
      titular: 'Empresa',
    });
    expect(acoplado.titular).toBe('Empresa');

    const empresa = service.extractConsolidatedFields('EMPRESA_TRANSPORTISTA' as EntityType, {
      condicionIva: 'RI',
      art: { nombre: 'ART', poliza: '123' },
    });
    expect(empresa.artNombre).toBe('ART');

    const defaultFields = service.extractConsolidatedFields('OTRO' as unknown as EntityType, {});
    expect(defaultFields).toEqual({});

    expect(service.parseDate(undefined)).toBeNull();
    expect(service.parseDate('not-a-date')).toBeNull();
    expect(service.parseDate('2024-02-01')).toBeInstanceOf(Date);
  });
});
