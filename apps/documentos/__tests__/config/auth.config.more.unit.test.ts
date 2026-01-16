describe('DocumentosAuthService (more branches)', () => {
  it('uses JWT_PUBLIC_KEY_PATH when JWT_PUBLIC_KEY missing and normalizes \\n', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('../../src/config/logger', () => ({
        AppLogger: { warn: jest.fn(), debug: jest.fn() },
      }));

      jest.doMock('../../src/config/environment', () => ({
        getEnvironment: () => ({
          JWT_PUBLIC_KEY: '',
          JWT_PUBLIC_KEY_PATH: '/fake/key.pem',
          JWT_LEGACY_SECRET: null,
          ENABLE_DOCUMENTOS: true,
        }),
      }));

      jest.doMock('fs', () => ({
        readFileSync: jest.fn(() => 'LINE1\\nLINE2'),
      }));

      const verify = jest.fn(() => ({ userId: 1, email: 'a@b.com', role: 'ADMIN', empresaId: 2 }));
      jest.doMock('jsonwebtoken', () => ({ verify }));

      const { DocumentosAuthService } = await import('../../src/config/auth');
      await DocumentosAuthService.verifyToken('t');

      expect(verify).toHaveBeenCalledWith('t', 'LINE1\nLINE2', expect.any(Object));
    });
  });

  it('returns null when no public key configured (and no legacy secret)', async () => {
    await jest.isolateModulesAsync(async () => {
      const warn = jest.fn();
      jest.doMock('../../src/config/logger', () => ({
        AppLogger: { warn, debug: jest.fn() },
      }));

      jest.doMock('../../src/config/environment', () => ({
        getEnvironment: () => ({
          JWT_PUBLIC_KEY: '',
          JWT_PUBLIC_KEY_PATH: '',
          JWT_LEGACY_SECRET: null,
          ENABLE_DOCUMENTOS: true,
        }),
      }));

      jest.doMock('jsonwebtoken', () => ({ verify: jest.fn() }));

      const { DocumentosAuthService } = await import('../../src/config/auth');
      await expect(DocumentosAuthService.verifyToken('t')).resolves.toBeNull();
      expect(warn).toHaveBeenCalled();
    });
  });

  it('legacy fallback returns null on invalid structure and on HS verify error', async () => {
    await jest.isolateModulesAsync(async () => {
      const warn = jest.fn();
      jest.doMock('../../src/config/logger', () => ({
        AppLogger: { warn, debug: jest.fn() },
      }));

      jest.doMock('../../src/config/environment', () => ({
        getEnvironment: () => ({
          JWT_PUBLIC_KEY: '-----BEGIN KEY-----\\nX\\n-----END KEY-----',
          JWT_LEGACY_SECRET: 'legacy',
          ENABLE_DOCUMENTOS: true,
        }),
      }));

      const verify = jest
        .fn()
        // RS256 fails
        .mockImplementationOnce(() => {
          throw new Error('rs');
        })
        // HS256 returns invalid payload
        .mockReturnValueOnce({ bad: true })
        // RS256 fails again
        .mockImplementationOnce(() => {
          throw new Error('rs');
        })
        // HS256 fails
        .mockImplementationOnce(() => {
          throw new Error('hs');
        });
      jest.doMock('jsonwebtoken', () => ({ verify }));

      const { DocumentosAuthService } = await import('../../src/config/auth');
      await expect(DocumentosAuthService.verifyToken('t')).resolves.toBeNull();
      await expect(DocumentosAuthService.verifyToken('t')).resolves.toBeNull();
      expect(warn).toHaveBeenCalled();
    });
  });

  it('hasEmpresaAccess covers OPERATOR and other roles', async () => {
    const { DocumentosAuthService } = await import('../../src/config/auth');
    expect(DocumentosAuthService.hasEmpresaAccess({ userId: 1, email: 'x', role: 'OPERATOR' as any, empresaId: 2 }, 2)).toBe(true);
    expect(DocumentosAuthService.hasEmpresaAccess({ userId: 1, email: 'x', role: 'CHOFER' as any, empresaId: 2 }, 2)).toBe(false);
  });
});


