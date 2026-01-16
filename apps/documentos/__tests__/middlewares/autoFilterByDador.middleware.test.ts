import { autoFilterByDador } from '../../src/middlewares/autoFilterByDador.middleware';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { warn: jest.fn(), error: jest.fn() },
}));

describe('autoFilterByDador', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as any;
  };

  it('returns 401 if no user', () => {
    const res = makeRes();
    autoFilterByDador({ user: null } as any, res as any, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('passes through for non dador role', () => {
    const next = jest.fn();
    const res = makeRes();
    autoFilterByDador({ user: { role: 'ADMIN' }, query: {} } as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('denies if dador missing scope or incoming mismatched; injects query otherwise', () => {
    const res = makeRes();
    autoFilterByDador({ user: { role: 'DADOR_DE_CARGA' }, query: {} } as any, res as any, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);

    const res2 = makeRes();
    autoFilterByDador({ user: { role: 'DADOR_DE_CARGA', dadorCargaId: 1 }, query: { dadorCargaId: '2' } } as any, res2 as any, jest.fn());
    expect(res2.status).toHaveBeenCalledWith(403);

    const next = jest.fn();
    const req: any = { user: { role: 'DADOR_DE_CARGA', dadorCargaId: 7 }, query: {} };
    autoFilterByDador(req, makeRes() as any, next);
    expect(req.query.dadorCargaId).toBe('7');
    expect(next).toHaveBeenCalled();
  });
});


