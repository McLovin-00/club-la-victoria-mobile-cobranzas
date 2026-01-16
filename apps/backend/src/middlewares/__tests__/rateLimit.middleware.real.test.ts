/**
 * Tests reales para middlewares/rateLimit.middleware.ts
 * @jest-environment node
 */

jest.mock('express-rate-limit', () => (config: any) => config);
jest.mock('../../config/logger', () => ({
  AppLogger: { warn: jest.fn() },
}));

import { loginRateLimiter, passwordChangeRateLimiter, apiRateLimiter } from '../rateLimit.middleware';

describe('rateLimit.middleware (real)', () => {
  it('loginRateLimiter keyGenerator/skip/handler', () => {
    const req1: any = { headers: { 'x-forwarded-for': '9.9.9.9, 1.1.1.1' }, ip: '2.2.2.2', body: { email: 'a' } };
    expect(loginRateLimiter.keyGenerator(req1)).toBe('9.9.9.9');

    const req2: any = { headers: { 'x-real-ip': '8.8.8.8' }, ip: '2.2.2.2', body: {} };
    expect(loginRateLimiter.keyGenerator(req2)).toBe('8.8.8.8');

    const req3: any = { headers: {}, ip: '7.7.7.7', path: '/health', body: {} };
    expect(loginRateLimiter.skip(req3)).toBe(true);
    req3.path = '/login';
    expect(loginRateLimiter.skip(req3)).toBe(false);

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    loginRateLimiter.handler(req1, res);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('passwordChangeRateLimiter keyGenerator uses forwarded-for or ip', () => {
    const req1: any = { headers: { 'x-forwarded-for': '1.2.3.4' }, ip: '9.9.9.9' };
    expect(passwordChangeRateLimiter.keyGenerator(req1)).toBe('1.2.3.4');
    const req2: any = { headers: {}, ip: '9.9.9.9' };
    expect(passwordChangeRateLimiter.keyGenerator(req2)).toBe('9.9.9.9');
  });

  it('apiRateLimiter keyGenerator/skip', () => {
    const req1: any = { headers: { 'x-forwarded-for': '5.5.5.5' }, ip: '9.9.9.9', path: '/api/health' };
    expect(apiRateLimiter.keyGenerator(req1)).toBe('5.5.5.5');
    expect(apiRateLimiter.skip(req1)).toBe(true);
    req1.path = '/socket.io';
    expect(apiRateLimiter.skip(req1)).toBe(true);
    req1.path = '/api/x';
    expect(apiRateLimiter.skip(req1)).toBe(false);
  });
});


