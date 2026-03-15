/**
 * @jest-environment node
 */

process.env.REMITOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

jest.mock('../src/services/remito.service', () => ({
  RemitoService: {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    updateManual: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    getStats: jest.fn(),
    reprocess: jest.fn(),
    getSuggestions: jest.fn(),
  },
}));

jest.mock('../src/services/export.service', () => ({
  ExportService: { exportToExcel: jest.fn() },
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: { getSignedUrl: jest.fn() },
}));

jest.mock('../src/services/media.service', () => ({
  MediaService: {
    decodeDataUrl: jest.fn(),
    isPdf: jest.fn(),
    isImage: jest.fn(),
    composePdfFromImages: jest.fn(),
  },
}));

jest.mock('../src/middlewares/error.middleware', () => ({
  createError: jest.fn((msg: string, status: number, code: string) => {
    const e: any = new Error(msg);
    e.statusCode = status;
    e.code = code;
    return e;
  }),
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../src/utils/params', () => ({
  parseParamId: jest.fn((params: any, key: string) => parseInt(params[key])),
}));

import { RemitosController } from '../src/controllers/remitos.controller';
import { RemitoService } from '../src/services/remito.service';
import { ExportService } from '../src/services/export.service';
import { minioService } from '../src/services/minio.service';
import { MediaService } from '../src/services/media.service';
import { createError } from '../src/middlewares/error.middleware';

const remitoService = RemitoService as jest.Mocked<typeof RemitoService>;
const exportService = ExportService as jest.Mocked<typeof ExportService>;
const minio = minioService as jest.Mocked<typeof minioService>;
const media = MediaService as jest.Mocked<typeof MediaService>;
const mockCreateError = createError as jest.MockedFunction<typeof createError>;

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    user: { userId: 1, role: 'ADMIN_INTERNO', tenantId: 1, dadorId: 1 },
    body: {},
    query: {},
    params: {},
    tenantId: 1,
    files: undefined,
    file: undefined,
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

// ──────────────────────────────────────────────────────────────────────────────
// create
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.create', () => {
  const pdfBuf = Buffer.from('fake-pdf');

  function setupMediaForImages(): void {
    media.isPdf.mockReturnValue(false);
    media.isImage.mockReturnValue(true);
    media.composePdfFromImages.mockResolvedValue(pdfBuf);
  }

  it('succeeds with multer files (req.files.imagenes)', async () => {
    setupMediaForImages();
    remitoService.create.mockResolvedValue({
      remito: { id: 10, estado: 'PENDIENTE' },
      imagenes: [{ id: 1 }],
    } as any);

    const multerFile = { buffer: Buffer.from('img'), mimetype: 'image/png', originalname: 'a.png' };
    const req = mockReq({ files: { imagenes: [multerFile] } });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { id: 10, estado: 'PENDIENTE', imagenesCount: 1 } }),
    );
  });

  it('succeeds with multer files (req.files as array)', async () => {
    setupMediaForImages();
    remitoService.create.mockResolvedValue({
      remito: { id: 11, estado: 'PENDIENTE' },
      imagenes: [{ id: 2 }],
    } as any);

    const multerFile = { buffer: Buffer.from('img'), mimetype: 'image/png', originalname: 'b.png' };
    const req = mockReq({ files: [multerFile] });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('succeeds with single multer file (req.file)', async () => {
    setupMediaForImages();
    remitoService.create.mockResolvedValue({
      remito: { id: 12, estado: 'PENDIENTE' },
      imagenes: [{ id: 3 }],
    } as any);

    const multerFile = { buffer: Buffer.from('img'), mimetype: 'image/png', originalname: 'c.png' };
    const req = mockReq({ file: multerFile, files: undefined });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('succeeds with base64 input (array)', async () => {
    media.decodeDataUrl.mockReturnValue({ buffer: Buffer.from('img'), mimeType: 'image/png', fileName: 'cap.png' });
    media.isPdf.mockReturnValue(false);
    media.isImage.mockReturnValue(true);
    media.composePdfFromImages.mockResolvedValue(pdfBuf);
    remitoService.create.mockResolvedValue({
      remito: { id: 13, estado: 'PENDIENTE' },
      imagenes: [{ id: 4 }],
    } as any);

    const req = mockReq({ body: { documentsBase64: ['data:image/png;base64,abc'] } });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('succeeds with base64 input (string)', async () => {
    media.decodeDataUrl.mockReturnValue({ buffer: Buffer.from('img'), mimeType: 'image/jpeg', fileName: '' });
    media.isPdf.mockReturnValue(false);
    media.isImage.mockReturnValue(true);
    media.composePdfFromImages.mockResolvedValue(pdfBuf);
    remitoService.create.mockResolvedValue({
      remito: { id: 14, estado: 'PENDIENTE' },
      imagenes: [{ id: 5 }],
    } as any);

    const req = mockReq({ body: { documentsBase64: 'data:image/jpeg;base64,abc' } });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(media.decodeDataUrl).toHaveBeenCalled();
  });

  it('uses fallback fileName when decoded fileName is empty', async () => {
    media.decodeDataUrl.mockReturnValue({ buffer: Buffer.from('x'), mimeType: 'image/png', fileName: '' });
    media.isPdf.mockReturnValue(false);
    media.isImage.mockReturnValue(true);
    media.composePdfFromImages.mockResolvedValue(pdfBuf);
    remitoService.create.mockResolvedValue({
      remito: { id: 15, estado: 'PENDIENTE' },
      imagenes: [],
    } as any);

    const req = mockReq({ body: { documentsBase64: ['data:image/png;base64,x'] } });
    const res = mockRes();

    await RemitosController.create(req, res);

    const callArgs = remitoService.create.mock.calls[0][1];
    expect(callArgs.originalInputs[0].fileName).toBe('capture.jpg');
  });

  it('errors on empty files (no multer, no base64)', async () => {
    const req = mockReq();
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('Se requiere al menos una imagen o PDF', 400, 'FILE_REQUIRED');
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('errors when total size exceeds 50MB', async () => {
    const bigBuf = Buffer.alloc(51 * 1024 * 1024);
    media.isPdf.mockReturnValue(false);
    media.isImage.mockReturnValue(true);

    const multerFile = { buffer: bigBuf, mimetype: 'image/png', originalname: 'big.png' };
    const req = mockReq({ files: { imagenes: [multerFile] } });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(mockCreateError).toHaveBeenCalledWith(
      expect.stringContaining('excede el máximo'),
      400,
      'TOTAL_SIZE_EXCEEDED',
    );
  });

  it('errors when mixing PDF and images', async () => {
    media.isPdf.mockImplementation((m: string) => m === 'application/pdf');
    media.isImage.mockImplementation((m: string) => m.startsWith('image/'));

    const files = [
      { buffer: Buffer.from('pdf'), mimetype: 'application/pdf', originalname: 'doc.pdf' },
      { buffer: Buffer.from('img'), mimetype: 'image/png', originalname: 'pic.png' },
    ];
    const req = mockReq({ files: { imagenes: files } });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('No se puede mezclar PDF con imágenes', 400, 'MIXED_INPUT_ERROR');
  });

  it('errors when sending multiple PDFs', async () => {
    media.isPdf.mockReturnValue(true);
    media.isImage.mockReturnValue(false);

    const files = [
      { buffer: Buffer.from('p1'), mimetype: 'application/pdf', originalname: 'a.pdf' },
      { buffer: Buffer.from('p2'), mimetype: 'application/pdf', originalname: 'b.pdf' },
    ];
    const req = mockReq({ files: { imagenes: files } });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('Solo se permite un PDF por remito', 400, 'MULTIPLE_PDF_ERROR');
  });

  it('returns PDF buffer directly when input is a PDF', async () => {
    const singlePdf = Buffer.from('single-pdf');
    media.isPdf.mockReturnValue(true);
    media.isImage.mockReturnValue(false);

    remitoService.create.mockResolvedValue({
      remito: { id: 20, estado: 'PENDIENTE' },
      imagenes: [{ id: 9 }],
    } as any);

    const files = [{ buffer: singlePdf, mimetype: 'application/pdf', originalname: 'doc.pdf' }];
    const req = mockReq({ files: { imagenes: files } });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(media.composePdfFromImages).not.toHaveBeenCalled();
    expect(remitoService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pdfBuffer: singlePdf }),
    );
  });

  it('handles invalid base64 input', async () => {
    media.decodeDataUrl.mockImplementation(() => { throw new Error('bad base64'); });

    const req = mockReq({ body: { documentsBase64: ['invalid-b64'] } });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('Base64 inválido', 400, 'INVALID_BASE64');
  });

  it('uses choferId from CHOFER role token', async () => {
    setupMediaForImages();
    remitoService.create.mockResolvedValue({
      remito: { id: 30, estado: 'PENDIENTE' },
      imagenes: [],
    } as any);

    const req = mockReq({
      user: { userId: 5, role: 'CHOFER', tenantId: 1, dadorId: 1, choferId: 99, choferDni: '12345', choferNombre: 'Juan', choferApellido: 'Perez' },
      files: { imagenes: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'f.png' }] },
    });
    const res = mockRes();

    await RemitosController.create(req, res);

    const serviceInput = remitoService.create.mock.calls[0][0];
    expect(serviceInput.choferId).toBe(99);
    expect(serviceInput.choferCargadorDni).toBe('12345');
    expect(serviceInput.choferCargadorNombre).toBe('Juan');
    expect(serviceInput.choferCargadorApellido).toBe('Perez');
  });

  it('uses choferId from body when not CHOFER role', async () => {
    setupMediaForImages();
    remitoService.create.mockResolvedValue({
      remito: { id: 31, estado: 'PENDIENTE' },
      imagenes: [],
    } as any);

    const req = mockReq({
      body: { choferId: '77', choferDni: '99999', choferNombre: 'Ana', choferApellido: 'Lopez' },
      files: { imagenes: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'f.png' }] },
    });
    const res = mockRes();

    await RemitosController.create(req, res);

    const serviceInput = remitoService.create.mock.calls[0][0];
    expect(serviceInput.choferId).toBe(77);
    expect(serviceInput.choferCargadorDni).toBe('99999');
    expect(serviceInput.choferCargadorNombre).toBe('Ana');
  });

  it('returns undefined choferId when no CHOFER role and no body.choferId', async () => {
    setupMediaForImages();
    remitoService.create.mockResolvedValue({
      remito: { id: 32, estado: 'PENDIENTE' },
      imagenes: [],
    } as any);

    const req = mockReq({
      files: { imagenes: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'f.png' }] },
    });
    const res = mockRes();

    await RemitosController.create(req, res);

    const serviceInput = remitoService.create.mock.calls[0][0];
    expect(serviceInput.choferId).toBeUndefined();
  });

  it('uses dadorCargaId from body when provided', async () => {
    setupMediaForImages();
    remitoService.create.mockResolvedValue({
      remito: { id: 33, estado: 'PENDIENTE' },
      imagenes: [],
    } as any);

    const req = mockReq({
      body: { dadorCargaId: '5' },
      files: { imagenes: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'f.png' }] },
    });
    const res = mockRes();

    await RemitosController.create(req, res);

    const serviceInput = remitoService.create.mock.calls[0][0];
    expect(serviceInput.dadorCargaId).toBe(5);
  });

  it('handles service error in create', async () => {
    setupMediaForImages();
    const err: any = new Error('DB fail');
    err.statusCode = 500;
    err.code = 'INTERNAL';
    remitoService.create.mockRejectedValue(err);

    const req = mockReq({
      files: { imagenes: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'f.png' }] },
    });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('falls back to status 500 when error has no statusCode', async () => {
    setupMediaForImages();
    remitoService.create.mockRejectedValue(new Error('unexpected'));

    const req = mockReq({
      files: { imagenes: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'f.png' }] },
    });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const sent = JSON.parse(res.send.mock.calls[0][0]);
    expect(sent.error).toBe('ERROR');
  });

  it('returns 403 when user.tenantId is falsy', async () => {
    setupMediaForImages();

    const req = mockReq({
      user: { userId: 1, role: 'ADMIN_INTERNO', tenantId: undefined, dadorId: undefined },
      files: { imagenes: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'f.png' }] },
    });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('Tenant no identificado', 403, 'TENANT_REQUIRED');
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('getChoferCargadorData returns undefined fields when CHOFER has no chofer data', async () => {
    setupMediaForImages();
    remitoService.create.mockResolvedValue({
      remito: { id: 41, estado: 'PENDIENTE' },
      imagenes: [],
    } as any);

    const req = mockReq({
      user: { userId: 5, role: 'CHOFER', tenantId: 1, dadorId: 1, choferId: 10 },
      files: { imagenes: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'f.png' }] },
    });
    const res = mockRes();

    await RemitosController.create(req, res);

    const serviceInput = remitoService.create.mock.calls[0][0];
    expect(serviceInput.choferCargadorDni).toBeUndefined();
  });

  it('getChoferCargadorData returns undefined fields when non-CHOFER has no body data', async () => {
    setupMediaForImages();
    remitoService.create.mockResolvedValue({
      remito: { id: 42, estado: 'PENDIENTE' },
      imagenes: [],
    } as any);

    const req = mockReq({
      files: { imagenes: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'f.png' }] },
    });
    const res = mockRes();

    await RemitosController.create(req, res);

    const serviceInput = remitoService.create.mock.calls[0][0];
    expect(serviceInput.choferCargadorDni).toBeUndefined();
    expect(serviceInput.choferCargadorNombre).toBeUndefined();
    expect(serviceInput.choferCargadorApellido).toBeUndefined();
  });

  it('getBase64Inputs returns empty array when documentsBase64 is empty string', async () => {
    const req = mockReq({ body: { documentsBase64: '' } });
    const res = mockRes();

    await RemitosController.create(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('Se requiere al menos una imagen o PDF', 400, 'FILE_REQUIRED');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// list
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.list', () => {
  it('succeeds with all query params', async () => {
    const data = { items: [], pagination: { page: 1 }, stats: {} };
    remitoService.list.mockResolvedValue(data as any);

    const req = mockReq({
      query: {
        estado: 'APROBADO',
        fechaDesde: '2025-01-01',
        fechaHasta: '2025-12-31',
        numeroRemito: '0001',
        page: '2',
        limit: '10',
      },
    });
    const res = mockRes();

    await RemitosController.list(req, res);

    expect(remitoService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'APROBADO',
        page: 2,
        limit: 10,
        fechaDesde: expect.any(Date),
        fechaHasta: expect.any(Date),
        numeroRemito: '0001',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('uses default pagination when not provided', async () => {
    remitoService.list.mockResolvedValue({ items: [], pagination: {}, stats: {} } as any);

    const req = mockReq();
    const res = mockRes();

    await RemitosController.list(req, res);

    expect(remitoService.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('handles service error', async () => {
    const err: any = new Error('fail');
    err.statusCode = 500;
    err.code = 'ERR';
    remitoService.list.mockRejectedValue(err);

    const req = mockReq();
    const res = mockRes();

    await RemitosController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getById
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.getById', () => {
  it('succeeds and returns signed image URLs', async () => {
    const remito = {
      id: 1,
      imagenes: [
        { id: 10, bucketName: 'b', objectKey: 'k1' },
        { id: 11, bucketName: 'b', objectKey: 'k2' },
      ],
    };
    remitoService.getById.mockResolvedValue(remito as any);
    minio.getSignedUrl.mockResolvedValue('https://signed.url');

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await RemitosController.getById(req, res);

    expect(minio.getSignedUrl).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
    const sent = JSON.parse(res.send.mock.calls[0][0]);
    expect(sent.data.imagenes[0].url).toBe('https://signed.url');
  });

  it('throws 404 when remito not found', async () => {
    remitoService.getById.mockResolvedValue(null as any);

    const req = mockReq({ params: { id: '999' } });
    const res = mockRes();

    await RemitosController.getById(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('Remito no encontrado', 404, 'NOT_FOUND');
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// update
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.update', () => {
  it('succeeds with all fields and parseWeight branches', async () => {
    const updated = { id: 1, numeroRemito: 'R-001' };
    remitoService.updateManual.mockResolvedValue(updated as any);

    const req = mockReq({
      params: { id: '1' },
      body: {
        numeroRemito: 'R-001',
        fechaOperacion: '2025-01-01',
        emisorNombre: 'Emisor',
        emisorDetalle: 'Detalle',
        clienteNombre: 'Cliente',
        producto: 'Arena',
        transportistaNombre: 'Trans SA',
        choferNombre: 'Pedro',
        choferDni: '12345678',
        patenteChasis: 'AB123CD',
        patenteAcoplado: 'EF456GH',
        pesoOrigenBruto: '1000',
        pesoOrigenTara: null,
        pesoOrigenNeto: '',
        pesoDestinoBruto: 2000,
        pesoDestinoTara: undefined,
        pesoDestinoNeto: '500',
      },
    });
    const res = mockRes();

    await RemitosController.update(req, res);

    const callArgs = remitoService.updateManual.mock.calls[0];
    const updateData = callArgs[2];
    expect(updateData.pesoOrigenBruto).toBe(1000);
    expect(updateData.pesoOrigenTara).toBeNull();
    expect(updateData.pesoOrigenNeto).toBeNull();
    expect(updateData.pesoDestinoBruto).toBe(2000);
    expect(updateData.pesoDestinoTara).toBeUndefined();
    expect(updateData.pesoDestinoNeto).toBe(500);
    expect(callArgs[3]).toBe(1);

    expect(res.status).toHaveBeenCalledWith(200);
    const sent = JSON.parse(res.send.mock.calls[0][0]);
    expect(sent.success).toBe(true);
  });

  it('handles service error', async () => {
    const err: any = new Error('not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    remitoService.updateManual.mockRejectedValue(err);

    const req = mockReq({ params: { id: '1' }, body: {} });
    const res = mockRes();

    await RemitosController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// approve
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.approve', () => {
  it('succeeds', async () => {
    remitoService.approve.mockResolvedValue({ id: 1, estado: 'APROBADO' } as any);

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await RemitosController.approve(req, res);

    expect(remitoService.approve).toHaveBeenCalledWith(1, 1, 1);
    expect(res.status).toHaveBeenCalledWith(200);
    const sent = JSON.parse(res.send.mock.calls[0][0]);
    expect(sent.message).toBe('Remito aprobado');
  });

  it('handles error', async () => {
    const err: any = new Error('fail');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    remitoService.approve.mockRejectedValue(err);

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await RemitosController.approve(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// reject
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.reject', () => {
  it('succeeds with valid motivo', async () => {
    remitoService.reject.mockResolvedValue({ id: 1, estado: 'RECHAZADO' } as any);

    const req = mockReq({ params: { id: '1' }, body: { motivo: 'Datos incorrectos en remito' } });
    const res = mockRes();

    await RemitosController.reject(req, res);

    expect(remitoService.reject).toHaveBeenCalledWith(1, 1, 'Datos incorrectos en remito', 1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects when motivo is too short', async () => {
    const req = mockReq({ params: { id: '1' }, body: { motivo: 'abc' } });
    const res = mockRes();

    await RemitosController.reject(req, res);

    expect(mockCreateError).toHaveBeenCalledWith(
      'Motivo de rechazo requerido (mín 5 caracteres)',
      400,
      'VALIDATION_ERROR',
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects when motivo is missing', async () => {
    const req = mockReq({ params: { id: '1' }, body: {} });
    const res = mockRes();

    await RemitosController.reject(req, res);

    expect(mockCreateError).toHaveBeenCalledWith(
      'Motivo de rechazo requerido (mín 5 caracteres)',
      400,
      'VALIDATION_ERROR',
    );
  });

  it('rejects when motivo is empty after trim', async () => {
    const req = mockReq({ params: { id: '1' }, body: { motivo: '    ' } });
    const res = mockRes();

    await RemitosController.reject(req, res);

    expect(mockCreateError).toHaveBeenCalledWith(
      'Motivo de rechazo requerido (mín 5 caracteres)',
      400,
      'VALIDATION_ERROR',
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// stats
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.stats', () => {
  it('succeeds with dadorId', async () => {
    const stats = { total: 100 };
    remitoService.getStats.mockResolvedValue(stats as any);

    const req = mockReq({ user: { userId: 1, role: 'ADMIN_INTERNO', tenantId: 5, dadorId: 3 } });
    const res = mockRes();

    await RemitosController.stats(req, res);

    expect(remitoService.getStats).toHaveBeenCalledWith(5, 3);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 403 when user.tenantId is falsy', async () => {
    const req = mockReq({ user: { userId: 1, role: 'ADMIN_INTERNO', tenantId: undefined, dadorId: undefined } });
    const res = mockRes();

    await RemitosController.stats(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('Tenant no identificado', 403, 'TENANT_REQUIRED');
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('handles error', async () => {
    remitoService.getStats.mockRejectedValue(new Error('fail'));

    const req = mockReq();
    const res = mockRes();

    await RemitosController.stats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getImage
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.getImage', () => {
  it('succeeds', async () => {
    const remito = {
      id: 1,
      imagenes: [{ id: 10, bucketName: 'bucket', objectKey: 'key' }],
    };
    remitoService.getById.mockResolvedValue(remito as any);
    minio.getSignedUrl.mockResolvedValue('https://url');

    const req = mockReq({ params: { id: '1', imagenId: '10' } });
    const res = mockRes();

    await RemitosController.getImage(req, res);

    expect(minio.getSignedUrl).toHaveBeenCalledWith('bucket', 'key', 3600);
    expect(res.status).toHaveBeenCalledWith(200);
    const sent = JSON.parse(res.send.mock.calls[0][0]);
    expect(sent.data.url).toBe('https://url');
  });

  it('throws 404 when remito not found', async () => {
    remitoService.getById.mockResolvedValue(null as any);

    const req = mockReq({ params: { id: '1', imagenId: '10' } });
    const res = mockRes();

    await RemitosController.getImage(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('Remito no encontrado', 404, 'NOT_FOUND');
  });

  it('throws 404 when image not found', async () => {
    const remito = { id: 1, imagenes: [{ id: 10, bucketName: 'b', objectKey: 'k' }] };
    remitoService.getById.mockResolvedValue(remito as any);

    const req = mockReq({ params: { id: '1', imagenId: '99' } });
    const res = mockRes();

    await RemitosController.getImage(req, res);

    expect(mockCreateError).toHaveBeenCalledWith('Imagen no encontrada', 404, 'IMAGE_NOT_FOUND');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// reprocess
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.reprocess', () => {
  it('succeeds', async () => {
    remitoService.reprocess.mockResolvedValue({ id: 1 } as any);

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await RemitosController.reprocess(req, res);

    expect(remitoService.reprocess).toHaveBeenCalledWith(1, 1, 1);
    expect(res.status).toHaveBeenCalledWith(200);
    const sent = JSON.parse(res.send.mock.calls[0][0]);
    expect(sent.message).toBe('Remito encolado para reprocesamiento');
  });

  it('handles error', async () => {
    const err: any = new Error('not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    remitoService.reprocess.mockRejectedValue(err);

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await RemitosController.reprocess(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// exportExcel
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.exportExcel', () => {
  it('succeeds with date filters and adjusts fechaHasta', async () => {
    const xlsBuf = Buffer.from('xlsx-data');
    exportService.exportToExcel.mockResolvedValue(xlsBuf as any);

    const req = mockReq({
      query: {
        fechaDesde: '2025-01-01',
        fechaHasta: '2025-01-31',
        estado: 'APROBADO',
        clienteNombre: 'MiCliente',
        transportistaNombre: 'MiTrans',
        patenteChasis: 'AB123CD',
        numeroRemito: 'R-001',
      },
    });
    const res = mockRes();

    await RemitosController.exportExcel(req, res);

    const filters = exportService.exportToExcel.mock.calls[0][0];
    expect(filters.fechaHasta).toBeDefined();
    expect((filters.fechaHasta as Date).getHours()).toBe(23);
    expect((filters.fechaHasta as Date).getMinutes()).toBe(59);
    expect(filters.estado).toBe('APROBADO');
    expect(filters.clienteNombre).toBe('MiCliente');
    expect(filters.transportistaNombre).toBe('MiTrans');
    expect(filters.patenteChasis).toBe('AB123CD');
    expect(filters.numeroRemito).toBe('R-001');

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', xlsBuf.length);
    expect(res.send).toHaveBeenCalledWith(xlsBuf);
  });

  it('succeeds without date filters', async () => {
    const xlsBuf = Buffer.from('xlsx');
    exportService.exportToExcel.mockResolvedValue(xlsBuf as any);

    const req = mockReq({ query: {} });
    const res = mockRes();

    await RemitosController.exportExcel(req, res);

    const filters = exportService.exportToExcel.mock.calls[0][0];
    expect(filters.fechaDesde).toBeUndefined();
    expect(filters.fechaHasta).toBeUndefined();
  });

  it('does not set dadorCargaId for SUPERADMIN role', async () => {
    exportService.exportToExcel.mockResolvedValue(Buffer.from('x') as any);

    const req = mockReq({
      user: { userId: 1, role: 'SUPERADMIN', tenantId: 1, empresaId: 99 },
      query: {},
    });
    const res = mockRes();

    await RemitosController.exportExcel(req, res);

    const filters = exportService.exportToExcel.mock.calls[0][0];
    expect(filters.dadorCargaId).toBeUndefined();
  });

  it('does not set dadorCargaId for ADMIN_INTERNO role', async () => {
    exportService.exportToExcel.mockResolvedValue(Buffer.from('x') as any);

    const req = mockReq({
      user: { userId: 1, role: 'ADMIN_INTERNO', tenantId: 1, empresaId: 50 },
      query: {},
    });
    const res = mockRes();

    await RemitosController.exportExcel(req, res);

    const filters = exportService.exportToExcel.mock.calls[0][0];
    expect(filters.dadorCargaId).toBeUndefined();
  });

  it('sets dadorCargaId from empresaId for non-SUPERADMIN/ADMIN_INTERNO roles', async () => {
    exportService.exportToExcel.mockResolvedValue(Buffer.from('x') as any);

    const req = mockReq({
      user: { userId: 1, role: 'DADOR_CARGA', tenantId: 1, empresaId: 42 },
      query: {},
    });
    const res = mockRes();

    await RemitosController.exportExcel(req, res);

    const filters = exportService.exportToExcel.mock.calls[0][0];
    expect(filters.dadorCargaId).toBe(42);
  });

  it('handles export error', async () => {
    const err: any = new Error('export fail');
    err.statusCode = 500;
    err.code = 'EXPORT_ERR';
    exportService.exportToExcel.mockRejectedValue(err);

    const req = mockReq({ query: {} });
    const res = mockRes();

    await RemitosController.exportExcel(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// suggestions
// ──────────────────────────────────────────────────────────────────────────────

describe('RemitosController.suggestions', () => {
  it('succeeds with valid field', async () => {
    remitoService.getSuggestions.mockResolvedValue(['Acme', 'Beta'] as any);

    const req = mockReq({ query: { field: 'cliente', q: 'Ac' } });
    const res = mockRes();

    await RemitosController.suggestions(req, res);

    expect(remitoService.getSuggestions).toHaveBeenCalledWith(1, 'cliente', 'Ac', 10);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('succeeds with empty q param (defaults to empty string)', async () => {
    remitoService.getSuggestions.mockResolvedValue([] as any);

    const req = mockReq({ query: { field: 'transportista' } });
    const res = mockRes();

    await RemitosController.suggestions(req, res);

    expect(remitoService.getSuggestions).toHaveBeenCalledWith(1, 'transportista', '', 10);
  });

  it('returns 400 for invalid field', async () => {
    const req = mockReq({ query: { field: 'invalid' } });
    const res = mockRes();

    await RemitosController.suggestions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'BAD_REQUEST' }),
    );
  });

  it('returns 400 when field is missing', async () => {
    const req = mockReq({ query: {} });
    const res = mockRes();

    await RemitosController.suggestions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('handles service error', async () => {
    remitoService.getSuggestions.mockRejectedValue(new Error('db error'));

    const req = mockReq({ query: { field: 'patente', q: 'AB' } });
    const res = mockRes();

    await RemitosController.suggestions(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// sendJson helper (tested indirectly through all sendJson calls)
// ──────────────────────────────────────────────────────────────────────────────

describe('sendJson helper', () => {
  it('sets Content-Type header and sends stringified JSON', async () => {
    remitoService.list.mockResolvedValue({ items: [{ id: 1 }], pagination: {}, stats: {} } as any);

    const req = mockReq();
    const res = mockRes();

    await RemitosController.list(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
    expect(res.send).toHaveBeenCalledWith(expect.any(String));
    const parsed = JSON.parse(res.send.mock.calls[0][0]);
    expect(parsed.success).toBe(true);
  });
});
