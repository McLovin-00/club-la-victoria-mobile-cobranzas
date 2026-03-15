/**
 * Tests extendidos para remitos.controller.ts - cubrir líneas faltantes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Response } from 'express';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockRemitoService: any = {
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
  RemitoService: mockRemitoService,
}));

const mockMinioService: any = {
  getSignedUrl: jest.fn(),
};

jest.mock('../../src/services/minio.service', () => ({
  minioService: mockMinioService,
}));

const mockMediaService: any = {
  isImage: jest.fn(),
  isPdf: jest.fn(),
  decodeDataUrl: jest.fn(),
  composePdfFromImages: jest.fn(),
};

jest.mock('../../src/services/media.service', () => ({
  MediaService: mockMediaService,
}));

describe('RemitosController extended', () => {
  let RemitosController: any;
  let mockRes: any;
  let jsonMock: jest.Mock<any>;
  let statusMock: jest.Mock<any>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../src/controllers/remitos.controller');
    RemitosController = module.RemitosController;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    const sendMock = jest.fn().mockReturnThis();
    const setHeaderMock = jest.fn().mockReturnThis();
    mockRes = {
      json: jsonMock,
      status: statusMock,
      send: sendMock,
      setHeader: setHeaderMock,
    };
  });

  describe('create', () => {
    it('lanza error si no hay archivos ni base64', async () => {
      const req = {
        files: [],
        body: {},
        user: { userId: 1, role: 'ADMIN', tenantId: 1 },
      };

      mockMediaService.isImage.mockReturnValue(false);
      mockMediaService.isPdf.mockReturnValue(false);

      await RemitosController.create(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('lanza error si base64 es inválido', async () => {
      const req = {
        files: [],
        body: { documentsBase64: 'invalid-base64' },
        user: { userId: 1, role: 'ADMIN', tenantId: 1 },
      };

      mockMediaService.decodeDataUrl.mockImplementation(() => {
        throw new Error('Invalid');
      });

      await RemitosController.create(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('lanza error si mezcla PDF con imágenes', async () => {
      const req = {
        files: { imagenes: [{ buffer: Buffer.from('a'), mimetype: 'image/jpeg', originalname: 'a.jpg' }] },
        body: { documentsBase64: 'data:application/pdf;base64,abc' },
        user: { userId: 1, role: 'ADMIN', tenantId: 1 },
      };

      mockMediaService.decodeDataUrl.mockReturnValue({ buffer: Buffer.from('pdf'), mimeType: 'application/pdf' });
      mockMediaService.isImage.mockImplementation((m: string) => m.includes('image'));
      mockMediaService.isPdf.mockImplementation((m: string) => m.includes('pdf'));

      await RemitosController.create(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('usa choferId del usuario si es CHOFER', async () => {
      const req = {
        files: { imagenes: [{ buffer: Buffer.from('img'), mimetype: 'image/jpeg', originalname: 'img.jpg' }] },
        body: {},
        user: { userId: 1, role: 'CHOFER', tenantId: 1, choferId: 99, choferDni: '12345', choferNombre: 'Juan', choferApellido: 'Perez' },
      };

      mockMediaService.isImage.mockReturnValue(true);
      mockMediaService.isPdf.mockReturnValue(false);
      mockMediaService.composePdfFromImages.mockResolvedValue(Buffer.from('pdf'));
      mockRemitoService.create.mockResolvedValue({ remito: { id: 1, estado: 'PENDIENTE' }, imagenes: [] });

      await RemitosController.create(req as any, mockRes as Response);

      expect(mockRemitoService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          choferId: 99,
          choferCargadorDni: '12345',
          choferCargadorNombre: 'Juan',
          choferCargadorApellido: 'Perez',
        }),
        expect.anything()
      );
    });
  });

  describe('update', () => {
    it('parsea pesos correctamente incluyendo valores vacíos', async () => {
      const req = {
        params: { id: '1' },
        body: {
          pesoOrigenBruto: '100',
          pesoOrigenTara: '',
          pesoOrigenNeto: null,
        },
        user: { userId: 1 },
      };

      mockRemitoService.updateManual.mockResolvedValue({ id: 1 });

      await RemitosController.update(req as any, mockRes as Response);

      expect(mockRemitoService.updateManual).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          pesoOrigenBruto: 100,
          pesoOrigenTara: null,
          pesoOrigenNeto: null,
        }),
        undefined
      );
    });

    it('maneja errores en update', async () => {
      const req = {
        params: { id: '1' },
        body: {},
        user: { userId: 1 },
      };

      mockRemitoService.updateManual.mockRejectedValue(new Error('Update failed') as never);

      await RemitosController.update(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('approve', () => {
    it('aprueba remito exitosamente', async () => {
      const req = { params: { id: '1' }, user: { userId: 1 } };
      mockRemitoService.approve.mockResolvedValue({ id: 1, estado: 'APROBADO' });

      await RemitosController.approve(req as any, mockRes as Response);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(true);
      expect(sent.message).toBe('Remito aprobado');
      expect(sent.data).toEqual({ id: 1, estado: 'APROBADO' });
    });

    it('maneja errores en approve', async () => {
      const req = { params: { id: '1' }, user: { userId: 1 } };
      mockRemitoService.approve.mockRejectedValue(new Error('Approve failed') as never);

      await RemitosController.approve(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('reject', () => {
    it('rechaza remito con motivo válido', async () => {
      const req = { params: { id: '1' }, body: { motivo: 'Imagen ilegible' }, user: { userId: 1 } };
      mockRemitoService.reject.mockResolvedValue({ id: 1, estado: 'RECHAZADO' });

      await RemitosController.reject(req as any, mockRes as Response);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(true);
      expect(sent.message).toBe('Remito rechazado');
      expect(sent.data).toEqual({ id: 1, estado: 'RECHAZADO' });
    });

    it('lanza error si motivo es muy corto', async () => {
      const req = { params: { id: '1' }, body: { motivo: 'ab' }, user: { userId: 1 } };

      await RemitosController.reject(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('maneja errores en reject', async () => {
      const req = { params: { id: '1' }, body: { motivo: 'Motivo válido' }, user: { userId: 1 } };
      mockRemitoService.reject.mockRejectedValue(new Error('Reject failed') as never);

      await RemitosController.reject(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('stats', () => {
    it('retorna estadísticas', async () => {
      const req = { user: { tenantId: 1, dadorId: 2 } };
      mockRemitoService.getStats.mockResolvedValue({ total: 10, pendientes: 5 });

      await RemitosController.stats(req as any, mockRes as Response);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(true);
      expect(sent.data).toEqual({ total: 10, pendientes: 5 });
    });

    it('maneja errores en stats', async () => {
      const req = { user: { tenantId: 1 } };
      mockRemitoService.getStats.mockRejectedValue(new Error('Stats failed') as never);

      await RemitosController.stats(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getImage', () => {
    it('retorna URL firmada de imagen', async () => {
      const req = { params: { id: '1', imagenId: '10' }, user: { userId: 1, role: 'ADMIN' } };
      mockRemitoService.getById.mockResolvedValue({
        id: 1,
        imagenes: [{ id: 10, bucketName: 'bucket', objectKey: 'key' }],
      });
      mockMinioService.getSignedUrl.mockResolvedValue('http://signed.url');

      await RemitosController.getImage(req as any, mockRes as Response);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(true);
      expect(sent.data).toEqual({ url: 'http://signed.url' });
    });

    it('lanza error si remito no existe', async () => {
      const req = { params: { id: '999', imagenId: '10' }, user: { userId: 1, role: 'ADMIN' } };
      mockRemitoService.getById.mockResolvedValue(null);

      await RemitosController.getImage(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('lanza error si imagen no existe', async () => {
      const req = { params: { id: '1', imagenId: '999' }, user: { userId: 1, role: 'ADMIN' } };
      mockRemitoService.getById.mockResolvedValue({ id: 1, imagenes: [{ id: 10 }] });

      await RemitosController.getImage(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('reprocess', () => {
    it('reprocesa remito exitosamente', async () => {
      const req = { params: { id: '1' }, user: { userId: 1 } };
      mockRemitoService.reprocess.mockResolvedValue({ jobId: 'job123' });

      await RemitosController.reprocess(req as any, mockRes as Response);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(true);
      expect(sent.message).toBe('Remito encolado para reprocesamiento');
      expect(sent.data).toEqual({ jobId: 'job123' });
    });

    it('maneja errores en reprocess', async () => {
      const req = { params: { id: '1' }, user: { userId: 1 } };
      mockRemitoService.reprocess.mockRejectedValue(new Error('Reprocess failed') as never);

      await RemitosController.reprocess(req as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});

