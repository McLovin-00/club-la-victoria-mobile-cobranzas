/**
 * Integration tests for remitos.routes.ts
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express, { Express, NextFunction, Request, Response } from 'express';
import request from 'supertest';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: jest.fn((_req: Request, _res: Response, next: NextFunction) => next()),
  authorize: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
  ROLES_UPLOAD: ['ADMIN'],
  ROLES_APPROVE: ['ADMIN'],
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
    exportExcel: jest.fn(),
    suggestions: jest.fn(),
  },
}));

describe('remitos.routes integration', () => {
  let app: Express;
  let controller: jest.Mocked<{
    create: (req: Request, res: Response) => Response;
    list: (req: Request, res: Response) => Response;
    getById: (req: Request, res: Response) => Response;
    stats: (req: Request, res: Response) => Response;
  }>;

  const setupApp = async () => {
    const routesModule = await import('../../src/routes/remitos.routes');
    const controllerModule = await import('../../src/controllers/remitos.controller');
    const { RemitosController } = controllerModule;

    controller = RemitosController as unknown as jest.Mocked<{
      create: (req: Request, res: Response) => Response;
      list: (req: Request, res: Response) => Response;
      getById: (req: Request, res: Response) => Response;
      stats: (req: Request, res: Response) => Response;
    }>;

    controller.create.mockImplementation((_req, res) => res.status(201).json({ ok: true }));
    controller.list.mockImplementation((_req, res) => res.status(200).json({ ok: true }));
    controller.getById.mockImplementation((_req, res) => res.status(200).json({ ok: true }));
    controller.stats.mockImplementation((_req, res) => res.status(200).json({ ok: true }));

    app = express();
    app.use(express.json());
    app.use('/remitos', routesModule.default);
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: 'Unknown error' });
    });
  };

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    await setupApp();
  });

  it('POST /remitos acepta imágenes válidas', async () => {
    const response = await request(app)
      .post('/remitos')
      .attach('imagenes', Buffer.from('test'), {
        filename: 'test.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    expect(controller.create).toHaveBeenCalled();
  });

  it('POST /remitos rechaza mimetypes inválidos', async () => {
    const response = await request(app)
      .post('/remitos')
      .attach('imagenes', Buffer.from('test'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Solo se permiten imágenes');
    expect(controller.create).not.toHaveBeenCalled();
  });

  it('POST /remitos retorna 403 si authorize falla', async () => {
    jest.resetModules();
    jest.clearAllMocks();
    const authModule = await import('../../src/middlewares/auth.middleware');
    const authorizeMock = authModule.authorize as jest.MockedFunction<typeof authModule.authorize>;
    authorizeMock.mockImplementationOnce(() => (_req: Request, res: Response) =>
      res.status(403).json({ message: 'Forbidden' })
    );

    await setupApp();

    const response = await request(app)
      .post('/remitos')
      .attach('imagenes', Buffer.from('test'), {
        filename: 'test.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(403);
    expect(controller.create).not.toHaveBeenCalled();
  });

  it('GET /remitos lista remitos', async () => {
    const response = await request(app).get('/remitos');

    expect(response.status).toBe(200);
    expect(controller.list).toHaveBeenCalled();
  });

  it('GET /remitos/:id obtiene remito', async () => {
    const response = await request(app).get('/remitos/123');

    expect(response.status).toBe(200);
    expect(controller.getById).toHaveBeenCalled();
  });

  it('GET /remitos/stats obtiene estadísticas', async () => {
    const response = await request(app).get('/remitos/stats');

    expect(response.status).toBe(200);
    expect(controller.stats).toHaveBeenCalled();
  });
});
