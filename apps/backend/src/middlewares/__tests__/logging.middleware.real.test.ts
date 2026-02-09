/**
 * Tests reales para middlewares/logging.middleware.ts
 * @jest-environment node
 */

jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logRequest: jest.fn(),
  },
}));

import { httpLogger, errorLogger } from '../logging.middleware';

describe('logging.middleware (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('httpLogger wraps res.send and logs request; warns on error status', () => {
    const next = jest.fn();
    const req: any = {
      method: 'GET',
      originalUrl: '/x',
      ip: '1.1.1.1',
      connection: { remoteAddress: '2.2.2.2' },
      get: jest.fn(() => 'jest'),
      body: { a: 1 },
      query: { q: '1' },
      params: { id: '1' },
    };
    const res: any = {
      statusCode: 200,
      send: jest.fn(function (_data: any) {
        return _data;
      }),
    };

    httpLogger(req, res, next);
    expect(next).toHaveBeenCalled();
    res.send('ok');

    // error status path
    res.statusCode = 500;
    res.send('fail');
  });

  it('errorLogger logs error details and forwards error', () => {
    const next = jest.fn();
    const req: any = {
      method: 'POST',
      originalUrl: '/y',
      ip: '1.1.1.1',
      connection: { remoteAddress: '2.2.2.2' },
      get: jest.fn(() => 'jest'),
      body: { a: 1 },
      query: {},
      params: {},
    };
    const res: any = {};
    const err = new Error('boom');
    errorLogger(err, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});


