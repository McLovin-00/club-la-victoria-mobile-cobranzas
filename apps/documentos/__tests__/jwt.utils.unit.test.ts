const mockReadFileSync = jest.fn().mockReturnValue('mock-public-key');
const mockVerify = jest.fn();

jest.mock('fs', () => ({
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));

jest.mock('jsonwebtoken', () => ({
  verify: (...args: unknown[]) => mockVerify(...args),
}));

import { getJwtPublicKey, verifyJwtFromForm } from '../src/utils/jwt.utils';

describe('jwt.utils', () => {
  describe('getJwtPublicKey', () => {
    it('lee el archivo y lo cachea', () => {
      const result = getJwtPublicKey();
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
      expect(mockReadFileSync).toHaveBeenCalledWith('/keys/jwt_public.pem', 'utf8');
      expect(result).toBe('mock-public-key');
    });

    it('retorna el valor cacheado en la segunda llamada (no vuelve a leer)', () => {
      mockReadFileSync.mockClear();
      const result = getJwtPublicKey();
      expect(mockReadFileSync).not.toHaveBeenCalled();
      expect(result).toBe('mock-public-key');
    });
  });

  describe('verifyJwtFromForm', () => {
    it('retorna el payload decodificado cuando el token es válido', () => {
      const payload = { sub: 'user-123', iat: 1708000000 };
      mockVerify.mockReturnValue(payload);
      const result = verifyJwtFromForm('token-valido');
      expect(mockVerify).toHaveBeenCalledWith('token-valido', 'mock-public-key', { algorithms: ['RS256'] });
      expect(result).toEqual(payload);
    });

    it('retorna null cuando el token es inválido', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('invalid token');
      });
      const result = verifyJwtFromForm('token-invalido');
      expect(result).toBeNull();
    });

    it('retorna null cuando hay error de verificación', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('jwt expired');
      });
      const result = verifyJwtFromForm('token-expirado');
      expect(result).toBeNull();
    });
  });
});
