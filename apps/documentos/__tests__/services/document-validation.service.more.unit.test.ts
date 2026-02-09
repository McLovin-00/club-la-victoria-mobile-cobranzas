const axiosPost = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: { post: (...args: any[]) => axiosPost(...args) },
}));

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

const envMock: any = {
  FLOWISE_VALIDATION_ENABLED: false,
  FLOWISE_VALIDATION_BASE_URL: 'http://localhost:3000',
  FLOWISE_VALIDATION_FLOW_ID: 'flow',
  FLOWISE_VALIDATION_TIMEOUT: 1000,
};
jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => envMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { DocumentValidationService } from '../../src/services/document-validation.service';

describe('DocumentValidationService (more)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    envMock.FLOWISE_VALIDATION_ENABLED = false;
    (DocumentValidationService as any).instance = undefined;
  });

  it('validateDocument: should return VALIDATION_DISABLED when not enabled', async () => {
    const svc = DocumentValidationService.getInstance();
    const out = await svc.validateDocument({
      documentId: 1,
      imageBase64: 'abc',
      mimeType: 'image/png',
      fileName: 'x.png',
      tipoDocumento: 'DNI',
      tipoEntidad: 'CHOFER' as any,
      datosEntidad: {},
    });
    expect(out).toEqual({ success: false, error: 'VALIDATION_DISABLED' });
  });

  it('validateDocument: should parse JSON from text, save classification/logs, and update extracted data when valid', async () => {
    envMock.FLOWISE_VALIDATION_ENABLED = true;

    prismaMock.document.findUnique
      // saveExtractionLog doc lookup
      .mockResolvedValueOnce({ tenantEmpresaId: 1, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 10 } as any)
      // updateEntityExtractedData doc lookup
      .mockResolvedValueOnce({ tenantEmpresaId: 1, dadorCargaId: 2, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 10 } as any);

    prismaMock.documentClassification.upsert.mockResolvedValueOnce({} as any);
    prismaMock.entityExtractionLog.create.mockResolvedValueOnce({} as any);
    prismaMock.entityExtractedData.upsert.mockResolvedValueOnce({} as any);

    axiosPost.mockResolvedValueOnce({
      data: {
        text: `prefix { "esDocumentoCorrecto": true, "tipoDocumentoDetectado": "Constancia", "confianza": 0.9, "motivoSiIncorrecto": null,
          "datosExtraidos": { "condicionIva": "RI", "art": { "nombre": "X", "poliza": "Y" } },
          "vencimientoEnDocumento": "2027-01-01T00:00:00.000Z",
          "coincideVencimiento": true,
          "disparidades": [],
          "datosNuevos": {}
        } suffix`,
      },
    });

    const svc = DocumentValidationService.getInstance();
    const out = await svc.validateDocument({
      documentId: 1,
      imageBase64: 'abc',
      mimeType: 'image/png',
      fileName: 'x.png',
      tipoDocumento: 'DNI',
      tipoEntidad: 'EMPRESA_TRANSPORTISTA' as any,
      datosEntidad: { cuit: '20' },
      vencimientoPrecargado: null,
      solicitadoPor: 1,
      esRechequeo: false,
    });

    expect(out.success).toBe(true);
    expect(prismaMock.documentClassification.upsert).toHaveBeenCalled();
    expect(prismaMock.entityExtractionLog.create).toHaveBeenCalled();
    expect(prismaMock.entityExtractedData.upsert).toHaveBeenCalled();
  });

  it('getEntityData: should map fields for each entityType', async () => {
    const svc = DocumentValidationService.getInstance();
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '1', nombre: 'N', apellido: 'A', empresaTransportista: { cuit: '20' } } as any);
    await expect(svc.getEntityData('CHOFER' as any, 1)).resolves.toEqual(expect.objectContaining({ dni: '1', cuit: '20' }));

    prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: 'AA', marca: 'M', modelo: 'X' } as any);
    await expect(svc.getEntityData('CAMION' as any, 1)).resolves.toEqual(expect.objectContaining({ patente: 'AA', marca: 'M', modelo: 'X' }));

    prismaMock.acoplado.findUnique.mockResolvedValueOnce({ patente: 'BB', tipo: 'T' } as any);
    await expect(svc.getEntityData('ACOPLADO' as any, 1)).resolves.toEqual(expect.objectContaining({ patente: 'BB', tipo: 'T' }));

    prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({ cuit: '20', razonSocial: 'RS' } as any);
    await expect(svc.getEntityData('EMPRESA_TRANSPORTISTA' as any, 1)).resolves.toEqual(expect.objectContaining({ cuit: '20', razonSocial: 'RS' }));
  });
});


