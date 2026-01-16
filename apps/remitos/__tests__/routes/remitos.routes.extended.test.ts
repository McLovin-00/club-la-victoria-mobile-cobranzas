/**
 * Tests extendidos para remitos.routes.ts - cubrir fileFilter de multer
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request } from 'express';
import type { Options } from 'multer';

type RouterStack = {
  stack: Array<{ route?: { path?: string; methods?: Record<string, boolean> } }>;
};

jest.mock('../../src/config/logger', () => ({

  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/controllers/remitos.controller', () => ({
  RemitosController: {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    stats: jest.fn(),
    getImage: jest.fn(),
    reprocess: jest.fn(),
  },
}));

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: jest.fn((_req: unknown, _res: unknown, next: (err?: unknown) => void) => next()),
  authorize: jest.fn(() => (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next()),
  ROLES_UPLOAD: ['ADMIN', 'CHOFER', 'TRANSPORTISTA', 'DADOR'],
  ROLES_APPROVE: ['ADMIN', 'ADMIN_INTERNO'],
}));

let capturedMulterOptions: Options | undefined;

jest.mock('multer', () => {
  const multerFn = (options: Options) => {
    capturedMulterOptions = options;
    return {
      array: () => (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
    };
  };
  (multerFn as unknown as { memoryStorage: () => object }).memoryStorage = () => ({});
  return multerFn;
});


describe('remitos.routes extended', () => {
  let router: unknown;


  beforeEach(async () => {
    jest.resetModules();
    capturedMulterOptions = undefined;
    const module = await import('../../src/routes/remitos.routes');
    router = module.default;
  });


  it('exporta un router de Express', () => {
    expect(router).toBeDefined();
    expect((router as RouterStack).stack).toBeDefined();
  });

  it('tiene ruta GET /stats', () => {
    const route = (router as RouterStack).stack.find(
      (layer) => layer.route?.path === '/stats' && layer.route?.methods?.get
    );
    expect(route).toBeDefined();
  });

  it('tiene ruta GET /', () => {
    const route = (router as RouterStack).stack.find(
      (layer) => layer.route?.path === '/' && layer.route?.methods?.get
    );
    expect(route).toBeDefined();
  });

  it('tiene ruta POST /', () => {
    const route = (router as RouterStack).stack.find(
      (layer) => layer.route?.path === '/' && layer.route?.methods?.post
    );
    expect(route).toBeDefined();
  });

  it('tiene ruta GET /:id', () => {
    const route = (router as RouterStack).stack.find(
      (layer) => layer.route?.path === '/:id' && layer.route?.methods?.get
    );
    expect(route).toBeDefined();
  });

  it('tiene ruta PATCH /:id', () => {
    const route = (router as RouterStack).stack.find(
      (layer) => layer.route?.path === '/:id' && layer.route?.methods?.patch
    );
    expect(route).toBeDefined();
  });

  it('tiene ruta POST /:id/approve', () => {
    const route = (router as RouterStack).stack.find(
      (layer) => layer.route?.path === '/:id/approve' && layer.route?.methods?.post
    );
    expect(route).toBeDefined();
  });

  it('tiene ruta POST /:id/reject', () => {
    const route = (router as RouterStack).stack.find(
      (layer) => layer.route?.path === '/:id/reject' && layer.route?.methods?.post
    );
    expect(route).toBeDefined();
  });

  it('tiene ruta POST /:id/reprocess', () => {
    const route = (router as RouterStack).stack.find(
      (layer) => layer.route?.path === '/:id/reprocess' && layer.route?.methods?.post
    );
    expect(route).toBeDefined();
  });

  it('tiene ruta GET /:id/image/:imagenId', () => {
    const route = (router as RouterStack).stack.find(
      (layer) => layer.route?.path === '/:id/image/:imagenId' && layer.route?.methods?.get
    );
    expect(route).toBeDefined();
  });
});

describe('multer fileFilter', () => {
  beforeEach(async () => {
    jest.resetModules();
    capturedMulterOptions = undefined;
    await import('../../src/routes/remitos.routes');
  });

  const createMockCb = () => {
    return jest.fn();
  };

  const getFileFilter = () => {
    if (!capturedMulterOptions?.fileFilter) {
      throw new Error('fileFilter no configurado');
    }
    return capturedMulterOptions.fileFilter;
  };

  const mockReq = {} as Request;
  const createFile = (mimetype: string): Express.Multer.File => ({
    mimetype,
  } as Express.Multer.File);

  it('configura límites de multer', () => {
    expect(capturedMulterOptions?.limits?.fileSize).toBe(20 * 1024 * 1024);
    expect(capturedMulterOptions?.limits?.files).toBe(10);
    expect(capturedMulterOptions?.storage).toBeDefined();
  });

  it('acepta imágenes JPEG', () => {

    const fileFilter = getFileFilter();
    const cb = createMockCb();
    fileFilter(mockReq, createFile('image/jpeg'), cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('acepta imágenes PNG', () => {
    const fileFilter = getFileFilter();
    const cb = createMockCb();
    fileFilter(mockReq, createFile('image/png'), cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('acepta PDFs', () => {
    const fileFilter = getFileFilter();
    const cb = createMockCb();
    fileFilter(mockReq, createFile('application/pdf'), cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('rechaza archivos no soportados', () => {
    const fileFilter = getFileFilter();
    const cb = createMockCb();
    fileFilter(mockReq, createFile('application/zip'), cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));

  });

  it('rechaza archivos de texto', () => {
    const fileFilter = getFileFilter();
    const cb = createMockCb();
    fileFilter(mockReq, createFile('text/plain'), cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));

  });
});

