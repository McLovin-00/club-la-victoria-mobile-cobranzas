/**
 * Propósito: ejecutar endpoints de `transferencias.routes.ts` para subir cobertura (validaciones + branches de rol).
 */

import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

jest.mock('../../src/middlewares/auth.middleware', () => ({
  // En tests de rutas, evitamos acoplar a Zod/auth real.
  validate: () => (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: {
    log: jest.fn(),
  },
}));

const crearSolicitud = jest.fn();
const listarSolicitudes = jest.fn();
const obtenerSolicitud = jest.fn();

jest.mock('../../src/services/transferencia.service', () => ({
  TransferenciaService: {
    crearSolicitud: (...args: unknown[]) => crearSolicitud(...args),
    listarSolicitudes: (...args: unknown[]) => listarSolicitudes(...args),
    obtenerSolicitud: (...args: unknown[]) => obtenerSolicitud(...args),
  },
}));

describe('transferencias.routes (coverage)', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = (await import('../../src/routes/transferencias.routes')).default;

    app = express();
    app.use(express.json());

    // Middleware para inyectar contexto esperado por las rutas
    app.use((req: any, _res, next) => {
      req.tenantId = 1;
      req.user = { userId: 7, email: 'u@test.com', role: 'USER', empresaId: 10 };
      req.dadorCargaId = 10;
      next();
    });

    app.use('/api/docs/transferencias', router);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST / devuelve 400 si el usuario no tiene dadorCargaId', async () => {
    const localApp = express();
    localApp.use(express.json());
    localApp.use((req: any, _res, next) => {
      req.tenantId = 1;
      req.user = { userId: 7, email: 'u@test.com', role: 'USER', empresaId: 10 };
      req.dadorCargaId = undefined;
      next();
    });
    const router = (await import('../../src/routes/transferencias.routes')).default;
    localApp.use('/api/docs/transferencias', router);

    const res = await request(localApp)
      .post('/api/docs/transferencias')
      .send({ dadorActualId: 99, entidades: [{ tipo: 'CHOFER', id: 1, identificador: 'X' }] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(crearSolicitud).not.toHaveBeenCalled();
  });

  it('POST / devuelve 400 si solicita transferencia a sí mismo', async () => {
    const res = await request(app)
      .post('/api/docs/transferencias')
      .send({ dadorActualId: 10, entidades: [{ tipo: 'CHOFER', id: 1, identificador: 'X' }] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(crearSolicitud).not.toHaveBeenCalled();
  });

  it('GET / filtra por dador si no es admin', async () => {
    listarSolicitudes.mockResolvedValueOnce({ data: [], total: 0, limit: 50, offset: 0 } as any);

    const res = await request(app).get('/api/docs/transferencias?limit=50&offset=0');

    expect(res.status).toBe(200);
    expect(listarSolicitudes).toHaveBeenCalledWith(
      expect.objectContaining({ tenantEmpresaId: 1, dadorCargaId: 10 })
    );
  });

  it('GET /:id devuelve 404 si no existe la solicitud', async () => {
    obtenerSolicitud.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/docs/transferencias/123');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

