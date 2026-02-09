/**
 * Tests reales para RemitosController (ejecuta branches internas)
 * @jest-environment node
 */

import { createMockRes } from '../helpers/testUtils';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const RemitoServiceMock = {
  create: jest.fn(),
  list: jest.fn(),
  getById: jest.fn(),
  updateManual: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  getStats: jest.fn(),
  reprocess: jest.fn(),
};
jest.mock('../../src/services/remito.service', () => ({
  RemitoService: RemitoServiceMock,
}));

const minio = {
  getSignedUrl: jest.fn(),
};
jest.mock('../../src/services/minio.service', () => ({
  minioService: minio,
}));

const Media = {
  isPdf: jest.fn((m: string) => m === 'application/pdf'),
  isImage: jest.fn((m: string) => m.startsWith('image/')),
  decodeDataUrl: jest.fn(),
  composePdfFromImages: jest.fn(),
};
jest.mock('../../src/services/media.service', () => ({
  MediaService: Media,
  default: Media,
}));

import { RemitosController } from '../../src/controllers/remitos.controller';

describe('RemitosController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create: returns 400 when no inputs', async () => {
    const req: any = { body: {}, user: { userId: 1, role: 'ADMIN_INTERNO' } };
    const res = createMockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'FILE_REQUIRED' }));
  });

  it('create: rejects mixed pdf + images', async () => {
    const req: any = {
      files: [{ buffer: Buffer.from('a'), mimetype: 'application/pdf', originalname: 'a.pdf' }, { buffer: Buffer.from('b'), mimetype: 'image/jpeg', originalname: 'b.jpg' }],
      body: {},
      user: { userId: 1, role: 'ADMIN_INTERNO' },
    };
    const res = createMockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'MIXED_INPUT_ERROR' }));
  });

  it('create: rejects invalid base64', async () => {
    Media.decodeDataUrl.mockImplementation(() => {
      throw new Error('bad');
    });

    const req: any = {
      body: { documentsBase64: 'data:image/jpeg;base64,INVALID' },
      user: { userId: 1, role: 'ADMIN_INTERNO' },
    };
    const res = createMockRes();

    await RemitosController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_BASE64' }));
  });

  it('create: success with images -> composePdfFromImages', async () => {
    Media.decodeDataUrl.mockReturnValue({ buffer: Buffer.from('img'), mimeType: 'image/jpeg' });
    Media.composePdfFromImages.mockResolvedValue(Buffer.from('pdf'));
    RemitoServiceMock.create.mockResolvedValue({ remito: { id: 1, estado: 'PENDIENTE_ANALISIS' }, imagenes: [{ id: 10 }, { id: 11 }] });

    const req: any = {
      body: { documentsBase64: ['data:image/jpeg;base64,aGVsbG8='], dadorCargaId: '2' },
      user: { userId: 1, role: 'ADMIN_INTERNO', tenantId: 1, dadorId: 2 },
    };
    const res = createMockRes();

    await RemitosController.create(req, res);

    expect(Media.composePdfFromImages).toHaveBeenCalled();
    expect(RemitoServiceMock.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('reject: requires motivo length', async () => {
    const req: any = { params: { id: '1' }, body: { motivo: 'a' }, user: { userId: 1, role: 'ADMIN_INTERNO' } };
    const res = createMockRes();
    await RemitosController.reject(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'VALIDATION_ERROR' }));
  });

  it('getById: 404 when not found', async () => {
    RemitoServiceMock.getById.mockResolvedValue(null);
    const req: any = { params: { id: '1' }, user: { userId: 1, role: 'ADMIN_INTERNO' } };
    const res = createMockRes();
    await RemitosController.getById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getById: returns signed urls', async () => {
    RemitoServiceMock.getById.mockResolvedValue({ id: 1, imagenes: [{ id: 2, bucketName: 'b', objectKey: 'k' }], historial: [] });
    minio.getSignedUrl.mockResolvedValue('http://signed');
    const req: any = { params: { id: '1' }, user: { userId: 1, role: 'ADMIN_INTERNO' } };
    const res = createMockRes();
    await RemitosController.getById(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('list: success', async () => {
    RemitoServiceMock.list.mockResolvedValue({
      items: [{ id: 1 }],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      stats: { total: 1, pendientes: 1, aprobados: 0, rechazados: 0 },
    });
    const req: any = { query: { page: '1', limit: '20' }, user: { userId: 1, role: 'ADMIN_INTERNO', tenantId: 1 } };
    const res = createMockRes();
    await RemitosController.list(req, res);
    expect(RemitoServiceMock.list).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('update: parses weights and calls service', async () => {
    RemitoServiceMock.updateManual.mockResolvedValue({ id: 1 });
    const req: any = {
      params: { id: '1' },
      body: { numeroRemito: 'R1', pesoOrigenBruto: '100', pesoOrigenTara: '', pesoDestinoBruto: null },
      user: { userId: 10, role: 'ADMIN_INTERNO' },
    };
    const res = createMockRes();
    await RemitosController.update(req, res);
    expect(RemitoServiceMock.updateManual).toHaveBeenCalledWith(
      1,
      10,
      expect.objectContaining({
        numeroRemito: 'R1',
        pesoOrigenBruto: 100,
        pesoOrigenTara: null,
        pesoDestinoBruto: null,
      })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('approve: calls service', async () => {
    RemitoServiceMock.approve.mockResolvedValue({ id: 1, estado: 'APROBADO' });
    const req: any = { params: { id: '1' }, user: { userId: 10, role: 'ADMIN_INTERNO' } };
    const res = createMockRes();
    await RemitosController.approve(req, res);
    expect(RemitoServiceMock.approve).toHaveBeenCalledWith(1, 10);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('stats: calls service', async () => {
    RemitoServiceMock.getStats.mockResolvedValue({ total: 1, pendientes: 1, aprobados: 0, rechazados: 0 });
    const req: any = { user: { tenantId: 1, dadorId: 2, userId: 10, role: 'ADMIN_INTERNO' } };
    const res = createMockRes();
    await RemitosController.stats(req, res);
    expect(RemitoServiceMock.getStats).toHaveBeenCalledWith(1, 2);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('getImage: 404 when image not found', async () => {
    RemitoServiceMock.getById.mockResolvedValue({ id: 1, imagenes: [{ id: 2, bucketName: 'b', objectKey: 'k' }], historial: [] });
    const req: any = { params: { id: '1', imagenId: '999' }, user: { userId: 1, role: 'ADMIN_INTERNO' } };
    const res = createMockRes();
    await RemitosController.getImage(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getImage: returns signed url', async () => {
    RemitoServiceMock.getById.mockResolvedValue({ id: 1, imagenes: [{ id: 2, bucketName: 'b', objectKey: 'k' }], historial: [] });
    minio.getSignedUrl.mockResolvedValue('http://signed-img');
    const req: any = { params: { id: '1', imagenId: '2' }, user: { userId: 1, role: 'ADMIN_INTERNO' } };
    const res = createMockRes();
    await RemitosController.getImage(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('reprocess: calls service', async () => {
    RemitoServiceMock.reprocess.mockResolvedValue({ id: 1, estado: 'PENDIENTE_ANALISIS', jobId: 'job-1' });
    const req: any = { params: { id: '1' }, user: { userId: 10, role: 'ADMIN_INTERNO' } };
    const res = createMockRes();
    await RemitosController.reprocess(req, res);
    expect(RemitoServiceMock.reprocess).toHaveBeenCalledWith(1, 10);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});


