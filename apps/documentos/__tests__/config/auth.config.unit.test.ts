jest.mock('../../src/config/logger', () => ({
  AppLogger: { warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ JWT_PUBLIC_KEY: '-----BEGIN KEY-----\\nX\\n-----END KEY-----', JWT_LEGACY_SECRET: 'legacy', ENABLE_DOCUMENTOS: true }),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

import * as jwt from 'jsonwebtoken';
import { DocumentosAuthService } from '../../src/config/auth';

describe('DocumentosAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DocumentosAuthService as any).publicKey = undefined;
    (DocumentosAuthService as any).legacySecret = null;
  });

  it('verifyToken returns payload for RS256 and null for invalid structure', async () => {
    (jwt.verify as jest.Mock).mockReturnValueOnce({ userId: 1, email: 'a@b.com', role: 'SUPERADMIN', empresaId: 1 });
    await expect(DocumentosAuthService.verifyToken('t')).resolves.toMatchObject({ userId: 1 });

    (jwt.verify as jest.Mock).mockReturnValueOnce({ bad: true });
    await expect(DocumentosAuthService.verifyToken('t')).resolves.toBeNull();
  });

  it('verifyToken falls back to legacy secret', async () => {
    (jwt.verify as jest.Mock)
      .mockImplementationOnce(() => { throw new Error('rs'); })
      .mockReturnValueOnce({ userId: 1, email: 'a@b.com', role: 'ADMIN', empresaId: 2 });
    await expect(DocumentosAuthService.verifyToken('t')).resolves.toMatchObject({ role: 'ADMIN' });
  });

  it('hasEmpresaAccess/isServiceEnabled', () => {
    expect(DocumentosAuthService.hasEmpresaAccess({ userId: 1, email: 'x', role: 'SUPERADMIN' as any }, 9)).toBe(true);
    expect(DocumentosAuthService.hasEmpresaAccess({ userId: 1, email: 'x', role: 'ADMIN' as any, empresaId: 2 }, 2)).toBe(true);
    expect(DocumentosAuthService.isServiceEnabled()).toBe(true);
  });
});


