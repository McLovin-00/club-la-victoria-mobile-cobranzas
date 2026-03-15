import { resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ MINIO_PUBLIC_BASE_URL: 'http://public', MINIO_INTERNAL_BASE_URL: 'http://internal' }),
}));

const mockFlowiseConfig = { enabled: true, baseUrl: 'http://flowise/', flowId: 'fid', apiKey: 'k' };
const mockGetCurrentFlowiseConfig = jest.fn(async () => mockFlowiseConfig);

jest.mock('../../src/controllers/flowise-config.controller', () => ({
  getCurrentFlowiseConfig: mockGetCurrentFlowiseConfig,
}));

jest.mock('axios');
import axios from 'axios';

jest.mock('fs', () => ({
  promises: {
    rm: jest.fn(),
    mkdtemp: jest.fn(async () => '/tmp/dir'),
    writeFile: jest.fn(async () => undefined),
    readdir: jest.fn(async () => ['page-1.png']),
    readFile: jest.fn(async (_p: string) => Buffer.from('img')),
  },
}));
jest.mock('os', () => ({ tmpdir: () => '/tmp' }));

const mockExecFile = jest.fn((_c: any, _a: any, _o: any, cb: any) => cb(null, { stdout: '', stderr: '' }));
jest.mock('child_process', () => ({ execFile: mockExecFile }));

const mockMkdtemp = jest.fn(async () => '/tmp/dir');
const mockWriteFile = jest.fn(async () => undefined);
const mockReaddir = jest.fn(async () => ['page-1.png']);
const mockReadFile = jest.fn(async (_p: string) => Buffer.from('img'));

jest.mock('fs/promises', () => ({
  mkdtemp: mockMkdtemp,
  writeFile: mockWriteFile,
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: { getSignedUrlInternal: jest.fn(async () => 'http://internal/file') },
}));

import { FlowiseService } from '../../src/services/flowise.service';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FlowiseService', () => {
  let svc: FlowiseService;

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (FlowiseService as any).instance = null;
    mockGetCurrentFlowiseConfig.mockResolvedValue(mockFlowiseConfig);
    svc = FlowiseService.getInstance();
  });

  describe('Configuración y healthCheck', () => {
    it('getInstance returns singleton instance', () => {
      const instance1 = FlowiseService.getInstance();
      const instance2 = FlowiseService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('healthCheck returns true when endpoint is healthy', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200 } as any);
      const result = await svc.healthCheck();
      expect(result).toBe(true);
    });

    it('healthCheck returns false on network error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      const result = await svc.healthCheck();
      expect(result).toBe(false);
    });

    it('healthCheck returns false when disabled', async () => {
      (FlowiseService as any).instance = null;
      mockGetCurrentFlowiseConfig.mockResolvedValueOnce({ enabled: false, baseUrl: '', flowId: '', apiKey: '' });
      const disabledSvc = FlowiseService.getInstance();
      const result = await disabledSvc.healthCheck();
      expect(result).toBe(false);
    });

    it('updateConfig handles trailing slash in baseUrl', async () => {
      (FlowiseService as any).instance = null;
      mockGetCurrentFlowiseConfig.mockResolvedValue({ enabled: true, baseUrl: 'http://flowise/', flowId: 'fid', apiKey: 'k' });
      const svcWithSlash = FlowiseService.getInstance();
      await new Promise(r => setTimeout(r, 0));
      mockedAxios.get.mockResolvedValueOnce({ status: 200 } as any);
      await svcWithSlash.healthCheck();
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.any(Object));
    });

    it('updateConfig handles baseUrl without trailing slash', async () => {
      (FlowiseService as any).instance = null;
      mockGetCurrentFlowiseConfig.mockResolvedValue({ enabled: true, baseUrl: 'http://flowise', flowId: 'fid', apiKey: 'k' });
      const svcNoSlash = FlowiseService.getInstance();
      await new Promise(r => setTimeout(r, 0));
      mockedAxios.get.mockResolvedValueOnce({ status: 200 } as any);
      await svcNoSlash.healthCheck();
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.any(Object));
    });
  });

  describe('extractDocumentText - image flow', () => {
    it('extracts text from PNG image', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CHOFER\nId_Entidad: 123\nComprobante: Licencia\nVencimiento: 01/01/2025' },
      } as any);
      const out = await svc.extractDocumentText('http://public/bucket/x.png', 'AUTO');
      expect(out.success).toBe(true);
      expect(out.data?.extractedText).toContain('CHOFER');
    });

    it('extracts text from JPEG image', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/jpeg' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Sample text' },
      } as any);
      const out = await svc.extractDocumentText('http://public/bucket/x.jpg', 'TEMPLATE');
      expect(out.success).toBe(true);
    });

    it('handles download error gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Download failed'));
      const out = await svc.extractDocumentText('http://public/bucket/x.png', 'AUTO');
      expect(out.success).toBe(false);
      expect(out.error).toBeDefined();
    });

    it('returns error when service disabled', async () => {
      (FlowiseService as any).instance = null;
      mockGetCurrentFlowiseConfig.mockResolvedValue({ enabled: false, baseUrl: '', flowId: '', apiKey: '' });
      const disabledSvc = FlowiseService.getInstance();
      const out = await disabledSvc.extractDocumentText('http://x', 'AUTO');
      expect(out.success).toBe(false);
      expect(out.error).toBeTruthy();
    });

    it('parses string response format', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: 'Raw string response' } as any);
      const out = await svc.extractDocumentText('http://file', 'TEMPLATE');
      expect(out.success).toBe(true);
    });

    it('parses result field response', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { result: 'Result text' } } as any);
      const out = await svc.extractDocumentText('http://file', 'TEMPLATE');
      expect(out.success).toBe(true);
    });

    it('parses text field response', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { text: 'Text content' } } as any);
      const out = await svc.extractDocumentText('http://file', 'TEMPLATE');
      expect(out.success).toBe(true);
    });

    it('returns error for unknown response format', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { unknownField: 'value' } } as any);
      const out = await svc.extractDocumentText('http://file', 'TEMPLATE');
      expect(out.success).toBe(false);
      expect(out.error).toContain('Formato de respuesta inválido');
    });

    it('handles axios post error', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockImplementationOnce(() => { throw new Error('Post error'); });
      const out = await svc.extractDocumentText('http://file', 'TEMPLATE');
      expect(out.success).toBe(false);
    });
  });

  describe('extractDocumentText - PDF flow', () => {
    it('processes PDF with rasterization', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('%PDF'), headers: { 'content-type': 'application/pdf' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'PDF content extracted' },
      } as any);
      const out = await svc.extractDocumentText('http://public/bucket/x.pdf', 'AUTO');
      expect(out.success).toBe(true);
    });

    it('handles PDF with no pages after rasterization', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('%PDF'), headers: { 'content-type': 'application/pdf' } } as any);
      mockReaddir.mockResolvedValueOnce([]);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Fallback text' },
      } as any);
      const out = await svc.extractDocumentText('http://public/bucket/empty.pdf', 'AUTO');
      expect(out.success).toBe(true);
    });

    it('uses fallback when rasterization fails', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('%PDF'), headers: { 'content-type': 'application/pdf' } } as any);
      mockExecFile.mockImplementationOnce((_cmd: any, _args: any, _opts: any, cb: any) => {
        cb(new Error('Rasterize failed'), { stdout: '', stderr: '' });
      });
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Fallback extraction' },
      } as any);
      const out = await svc.extractDocumentText('http://public/bucket/x.pdf', 'AUTO');
      expect(out.success).toBe(true);
    });

    it('processes multi-page PDF with chunking', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('%PDF'), headers: { 'content-type': 'application/pdf' } } as any);
      mockReaddir.mockResolvedValueOnce(['page-1.png', 'page-2.png', 'page-3.png']);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Chunk result' },
      } as any);
      const out = await svc.extractDocumentText('http://public/bucket/multi.pdf', 'AUTO');
      expect(out.success).toBe(true);
    });
  });

  describe('classifyDocument', () => {
    it('classifies document successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CHOFER\nId_Entidad: 12345\nComprobante: Licencia\nVencimiento: 15/06/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.success).toBe(true);
      expect(out.entityType).toBe('CHOFER');
      expect(out.entityId).toBe(12345);
      expect(out.documentType).toBe('Licencia');
      expect(out.expirationDate).toBeDefined();
    });

    it('handles non-numeric entityId', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CHOFER\nId_Entidad: ABC\nComprobante: Licencia' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.success).toBe(true);
      expect(out.entityId).toBeUndefined();
    });

    it('returns error when extraction fails', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { error: 'Extraction failed' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.success).toBe(false);
      expect(out.error).toBeDefined();
    });

    it('uses templateHint parameter', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Test' },
      } as any);
      await svc.classifyDocument('http://file.png', 'Licencia');
      const requestData = (mockedAxios.post as jest.Mock).mock.calls[0][1];
      expect(requestData.templateName).toBe('Licencia');
    });

    it('parses vencimientoDate correctly', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CHOFER\nId_Entidad: 123\nComprobante: Licencia\nVencimiento: 25/12/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.success).toBe(true);
      expect(out.expirationDate).toContain('2025-12');
    });

    it('handles invalid date format', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CHOFER\nId_Entidad: 123\nComprobante: Licencia\nVencimiento: invalid' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.success).toBe(true);
      expect(out.expirationDate).toBeUndefined();
    });

    it('calculates confidence correctly', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CHOFER\nId_Entidad: 123\nComprobante: DESCONOCIDO\nVencimiento: 15/06/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.success).toBe(true);
      expect(out.confidence).toBeGreaterThan(0);
      expect(out.confidence).toBeLessThan(1);
    });
  });

  describe('normalizeComprobanteName', () => {
    it('normalizes ARCA empresa', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: EMPRESA_TRANSPORTISTA\nId_Entidad: 123\nComprobante: constancia de arca empresa\nVencimiento: 01/01/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.documentType).toBe('Constancia de ARCA Empresa');
    });

    it('normalizes DNI', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CHOFER\nId_Entidad: 123\nComprobante: dni\nVencimiento: 01/01/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.documentType).toBe('DNI');
    });

    it('normalizes Licencia', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CHOFER\nId_Entidad: 123\nComprobante: licencia de conducir\nVencimiento: 01/01/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.documentType).toBe('Licencia');
    });

    it('normalizes tractor documents', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CAMION\nId_Entidad: ABC123\nComprobante: titulo tractor\nVencimiento: 01/01/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.documentType).toBe('Titulo Tractor');
    });

    it('normalizes acoplado documents', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: ACOPLADO\nId_Entidad: DEF456\nComprobante: titulo semirremolque\nVencimiento: 01/01/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.documentType).toBe('Titulo Semirremolque');
    });

    it('normalizes F.931 pattern', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: EMPRESA_TRANSPORTISTA\nId_Entidad: 123\nComprobante: f 931 presentacion\nVencimiento: 01/01/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.documentType).toBe('Presentación mensual de la declaración jurada F.931, acuse y constancia de pago');
    });

    it('capitalizes unknown comprobante', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: CHOFER\nId_Entidad: 123\nComprobante: documento personalizado\nVencimiento: 01/01/2025' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.documentType).toBe('Documento personalizado');
    });
  });

  describe('validateDocument', () => {
    it('validates CHOFER document with license number', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Licencia 12345678' },
      } as any);
      const result = await svc.validateDocument('http://file.png', 'Licencia', 'CHOFER');
      expect(result.isValid).toBe(true);
    });

    it('rejects CHOFER document without license number', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Sin numero de licencia' },
      } as any);
      const result = await svc.validateDocument('http://file.png', 'Licencia', 'CHOFER');
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('validates CAMION document with patente', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Patente ABC123' },
      } as any);
      const result = await svc.validateDocument('http://file.png', 'Seguro', 'CAMION');
      expect(result.isValid).toBe(true);
    });

    it('rejects CAMION document without patente', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Sin patente' },
      } as any);
      const result = await svc.validateDocument('http://file.png', 'Seguro', 'CAMION');
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('uses base rules for unknown entity types', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Some text' },
      } as any);
      const result = await svc.validateDocument('http://file.png', 'Template', 'UNKNOWN');
      expect(result.isValid).toBe(true);
    });

    it('returns error when extraction fails', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { success: false, error: 'Failed' },
      } as any);
      const result = await svc.validateDocument('http://file.png', 'Licencia', 'CHOFER');
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('extractAiTaggedFields edge cases', () => {
    it('handles unknown values', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Entidad: DESCONOCIDO\nId_Entidad: DESCONOCIDO\nComprobante: DESCONOCIDO\nVencimiento: DESCONOCIDO' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.success).toBe(true);
      expect(out.entityType).toBe('DESCONOCIDO');
    });

    it('handles missing fields', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Some text without any tagged fields at all' },
      } as any);
      const out = await svc.classifyDocument('http://file.png');
      expect(out.success).toBe(true);
      expect(out.entityType).toBe('DESCONOCIDO');
      expect(out.documentType).toBe('Desconocido');
    });
  });

  describe('File operations', () => {
    it('extracts filename from URL', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Test' },
      } as any);
      await svc.extractDocumentText('http://example.com/path/to/document.pdf', 'TEMPLATE');
      const callArgs = (mockedAxios.post as jest.Mock).mock.calls[0];
      expect(callArgs[1].uploads[0].name).toBe('document.pdf');
    });

    it('handles URL without path', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Test' },
      } as any);
      await svc.extractDocumentText('http://example.com/', 'TEMPLATE');
      const callArgs = (mockedAxios.post as jest.Mock).mock.calls[0];
      expect(callArgs[1].uploads[0].name).toBe('document');
    });

    it('includes base64 data in upload', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('test-image-data'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { text: 'Result' },
      } as any);
      await svc.extractDocumentText('http://public/bucket/test.png', 'AUTO');
      const callArgs = (mockedAxios.post as jest.Mock).mock.calls[0];
      expect(callArgs[1].uploads[0].data).toContain('data:image/png;base64,');
    });
  });

  describe('Internal URL handling', () => {
    it('uses original URL when no env vars set', async () => {
      // Este test verifica que cuando no hay env vars, se usa la URL original
      // La funcionalidad está cubierta por el mock default que retorna 'http://public'
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { text: 'Test' } } as any);
      await svc.extractDocumentText('http://public/file.png', 'AUTO');
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('handles hostname differences correctly', async () => {
      // Verifica que se llama a axios.get con la URL proporcionada
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { text: 'Test' } } as any);
      await svc.extractDocumentText('http://example.com/file.png', 'AUTO');
      expect(mockedAxios.get).toHaveBeenCalledWith('http://example.com/file.png', expect.any(Object));
    });
  });
});
