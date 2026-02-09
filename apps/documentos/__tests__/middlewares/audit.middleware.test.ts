/**
 * Tests para audit.middleware.ts
 * Propósito: Cubrir branches de middleware de auditoría
 */

import { Request, Response, NextFunction } from 'express';
import { auditMiddleware } from '../../src/middlewares/audit.middleware';
import { AuditService } from '../../src/services/audit.service';

jest.mock('../../src/services/audit.service', () => ({
  AuditService: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('audit.middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      method: 'GET',
      path: '/test',
      originalUrl: '/test',
      ip: '127.0.0.1',
      get: jest.fn(),
      tenantId: 1,
      user: {
        userId: 100,
        email: 'test@example.com',
        role: 'ADMIN',
      },
    } as any;

    mockRes = {
      statusCode: 200,
      on: jest.fn().mockReturnThis(),
      get: jest.fn(),
    } as any;

    mockNext = jest.fn();
  });

  it('debe llamar next()', () => {
    auditMiddleware(mockReq as any, mockRes as any, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('debe auditar métodos POST', (done) => {
    mockReq.method = 'POST';

    auditMiddleware(mockReq as any, mockRes as any, mockNext);

    // Simular evento finish
    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];
    finishCallback();

    setImmediate(() => {
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/test',
          action: 'POST /test',
        })
      );
      done();
    });
  });

  it('debe auditar métodos PUT', (done) => {
    mockReq.method = 'PUT';
    mockRes.statusCode = 200;

    auditMiddleware(mockReq as any, mockRes as any, mockNext);

    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];
    finishCallback();

    setImmediate(() => {
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
        })
      );
      done();
    });
  });

  it('debe auditar métodos PATCH', (done) => {
    mockReq.method = 'PATCH';

    auditMiddleware(mockReq as any, mockRes as any, mockNext);

    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];
    finishCallback();

    setImmediate(() => {
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
        })
      );
      done();
    });
  });

  it('debe auditar métodos DELETE', (done) => {
    mockReq.method = 'DELETE';
    mockRes.statusCode = 204;

    auditMiddleware(mockReq as any, mockRes as any, mockNext);

    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];
    finishCallback();

    setImmediate(() => {
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          statusCode: 204,
        })
      );
      done();
    });
  });

  it('NO debe auditar método GET', () => {
    mockReq.method = 'GET';

    auditMiddleware(mockReq as any, mockRes as any, mockNext);

    // No debe registrar el evento 'finish'
    expect(mockRes.on).not.toHaveBeenCalled();
  });

  it('debe incluir duración en detalles', (done) => {
    mockReq.method = 'POST';

    auditMiddleware(mockReq as any, mockRes as any, mockNext);

    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];

    // Esperar un poco para que haya duración
    setTimeout(() => {
      finishCallback();

      setImmediate(() => {
        expect(AuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              durationMs: expect.any(Number),
            }),
          })
        );
        done();
      });
    }, 10);
  });

  it('debe manejar método en minúsculas', (done) => {
    mockReq.method = 'post' as any;

    auditMiddleware(mockReq as any, mockRes as any, mockNext);

    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];
    finishCallback();

    setImmediate(() => {
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
        })
      );
      done();
    });
  });

  it('debe usar req.route.path cuando está disponible', (done) => {
    mockReq.method = 'POST';
    (mockReq as any).route = { path: '/api/test/:id' };

    auditMiddleware(mockReq as any, mockRes as any, mockNext);

    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];
    finishCallback();

    setImmediate(() => {
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'POST /api/test/:id',
        })
      );
      done();
    });
  });

});
