import { errorHandler, notFoundHandler, createError } from '../../src/middlewares/error.middleware';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ NODE_ENV: 'development' }),
}));

describe('error.middleware', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any;
  };

  it('createError builds DocumentosError', () => {
    const e: any = createError('x', 400, 'C', { a: 1 });
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('C');
    expect(e.details).toEqual({ a: 1 });
  });

  it('errorHandler returns mapped message and includes stack in dev', () => {
    const res = makeRes();
    errorHandler(createError('x', 413, 'FILE_TOO_LARGE') as any, { method: 'GET', path: '/p', ip: '1', get: () => 'ua' } as any, res as any, jest.fn());
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.status.mock.calls[0][0]).toBe(413);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'FILE_TOO_LARGE', stack: expect.anything() }));
  });

  it('notFoundHandler returns 404', () => {
    const res = makeRes();
    notFoundHandler({ method: 'GET', path: '/x', ip: '1' } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});


