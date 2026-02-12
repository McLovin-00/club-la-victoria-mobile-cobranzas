/**
 * Tests unitarios para jwt.utils
 * Cubre verificación de tokens JWT y manejo de claves públicas
 */

const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----';
const mockReadFileSync = jest.fn().mockReturnValue(mockPublicKey);
const mockJwtVerify = jest.fn();

// Mock de fs y jsonwebtoken antes de cualquier import
jest.mock('fs', () => ({
  readFileSync: mockReadFileSync,
}));

jest.mock('jsonwebtoken', () => ({
  verify: mockJwtVerify,
}));

import * as jwtUtils from '../../src/utils/jwt.utils';

describe('jwt.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFileSync.mockReturnValue(mockPublicKey);
    jwtUtils._resetJwtCache();
  });

  describe('getJwtPublicKey', () => {
    it('debe leer la clave pública desde el path por defecto', () => {
      // Arrange
      delete process.env.JWT_PUBLIC_KEY_PATH;
      
      // Act
      const key = jwtUtils.getJwtPublicKey();

      // Assert
      expect(mockReadFileSync).toHaveBeenCalledWith('/keys/jwt_public.pem', 'utf8');
      expect(key).toBe(mockPublicKey);
    });

    it('debe leer la clave pública desde el path configurado en env', () => {
      // Arrange
      process.env.JWT_PUBLIC_KEY_PATH = '/custom/path/key.pem';
      jwtUtils._resetJwtCache();
      
      // Act
      const key = jwtUtils.getJwtPublicKey();

      // Assert
      expect(mockReadFileSync).toHaveBeenCalledWith('/custom/path/key.pem', 'utf8');
      expect(key).toBe(mockPublicKey);
    });

    it('debe cachear la clave pública después de la primera lectura', () => {
      // Act
      const key1 = jwtUtils.getJwtPublicKey();
      const key2 = jwtUtils.getJwtPublicKey();

      // Assert
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
      expect(key1).toBe(key2);
      expect(key1).toBe(mockPublicKey);
    });

    it('debe lanzar error si el archivo no existe', () => {
      // Arrange
      jwtUtils._resetJwtCache();
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      
      // Act & Assert
      expect(() => jwtUtils.getJwtPublicKey()).toThrow('ENOENT: no such file or directory');
    });
  });

  describe('verifyJwtFromForm', () => {
    it('debe verificar un token válido exitosamente', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const mockPayload = { userId: 123, email: 'test@example.com', exp: 9999999999 };
      mockJwtVerify.mockReturnValue(mockPayload);

      // Act
      const result = jwtUtils.verifyJwtFromForm(token);

      // Assert
      expect(mockJwtVerify).toHaveBeenCalledWith(token, mockPublicKey, { algorithms: ['RS256'] });
      expect(result).toEqual(mockPayload);
    });

    it('debe retornar null si el token es inválido', () => {
      // Arrange
      const token = 'invalid.token';
      mockJwtVerify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      // Act
      const result = jwtUtils.verifyJwtFromForm(token);

      // Assert
      expect(mockJwtVerify).toHaveBeenCalledWith(token, mockPublicKey, { algorithms: ['RS256'] });
      expect(result).toBeNull();
    });

    it('debe retornar null si el token ha expirado', () => {
      // Arrange
      const token = 'expired.token';
      mockJwtVerify.mockImplementation(() => {
        const error: any = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      // Act
      const result = jwtUtils.verifyJwtFromForm(token);

      // Assert
      expect(mockJwtVerify).toHaveBeenCalledWith(token, mockPublicKey, { algorithms: ['RS256'] });
      expect(result).toBeNull();
    });

    it('debe retornar null si la firma es inválida', () => {
      // Arrange
      const token = 'tampered.token';
      mockJwtVerify.mockImplementation(() => {
        const error: any = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      // Act
      const result = jwtUtils.verifyJwtFromForm(token);

      // Assert
      expect(mockJwtVerify).toHaveBeenCalledWith(token, mockPublicKey, { algorithms: ['RS256'] });
      expect(result).toBeNull();
    });

    it('debe manejar diferentes tipos de errores de JWT', () => {
      // Arrange
      const token = 'malformed.token';
      mockJwtVerify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      // Act
      const result = jwtUtils.verifyJwtFromForm(token);

      // Assert
      expect(result).toBeNull();
    });

    it('debe usar la clave pública cacheada', () => {
      // Arrange
      const token1 = 'token1';
      const token2 = 'token2';
      const mockPayload1 = { userId: 1 };
      const mockPayload2 = { userId: 2 };
      
      mockJwtVerify
        .mockReturnValueOnce(mockPayload1)
        .mockReturnValueOnce(mockPayload2);

      // Act
      jwtUtils.verifyJwtFromForm(token1);
      jwtUtils.verifyJwtFromForm(token2);

      // Assert
      expect(mockReadFileSync).toHaveBeenCalledTimes(1); // Solo una vez por el cache
      expect(mockJwtVerify).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integración getJwtPublicKey + verifyJwtFromForm', () => {
    it('debe verificar token usando la clave pública leída', () => {
      // Arrange
      const token = 'test.token';
      const mockPayload = { userId: 999 };
      mockJwtVerify.mockReturnValue(mockPayload);

      // Act
      const result = jwtUtils.verifyJwtFromForm(token);

      // Assert
      expect(mockReadFileSync).toHaveBeenCalled();
      expect(mockJwtVerify).toHaveBeenCalledWith(token, mockPublicKey, { algorithms: ['RS256'] });
      expect(result).toEqual(mockPayload);
    });
  });

  describe('Casos de borde adicionales', () => {
    it('debe manejar tokens vacíos', () => {
      // Arrange
      const token = '';
      mockJwtVerify.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      // Act
      const result = jwtUtils.verifyJwtFromForm(token);

      // Assert
      expect(result).toBeNull();
    });

    it('debe manejar errores no estándar de JWT', () => {
      // Arrange
      const token = 'token.with.issue';
      mockJwtVerify.mockImplementation(() => {
        throw { message: 'Unexpected error' }; // Error sin ser instancia de Error
      });

      // Act
      const result = jwtUtils.verifyJwtFromForm(token);

      // Assert
      expect(result).toBeNull();
    });
  });
});
