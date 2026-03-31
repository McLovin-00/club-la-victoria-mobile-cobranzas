/**
 * Tests for middlewares/index.ts
 */

import {
  isAuthenticatedRequest,
  getAuthenticatedUser,
  AuthenticatedRequest,
} from '../../middlewares/index';
import { Request } from 'express';

describe('middlewares/index', () => {
  describe('isAuthenticatedRequest', () => {
    it('should return true when request has user property', () => {
      const req = {
        user: { id: 1, email: 'test@test.com', role: 'USER' },
      } as AuthenticatedRequest;

      expect(isAuthenticatedRequest(req as Request)).toBe(true);
    });

    it('should return false when request has no user property', () => {
      const req = {} as Request;

      expect(isAuthenticatedRequest(req)).toBe(false);
    });

    it('should return false when user is undefined', () => {
      const req = { user: undefined } as unknown as Request;

      expect(isAuthenticatedRequest(req)).toBe(false);
    });

    it('should return true when user is null (null !== undefined)', () => {
      // Note: the implementation checks `req.user !== undefined`, so null is considered "present"
      const req = { user: null } as unknown as Request;

      expect(isAuthenticatedRequest(req)).toBe(true);
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return user when request is authenticated', () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        role: 'ADMIN',
        nombre: 'Test',
        apellido: 'User',
        empresaId: 10,
      };
      const req = { user: mockUser } as AuthenticatedRequest;

      const result = getAuthenticatedUser(req as Request);

      expect(result).toEqual(mockUser);
    });

    it('should return null when request has no user', () => {
      const req = {} as Request;

      const result = getAuthenticatedUser(req);

      expect(result).toBeNull();
    });

    it('should return null when user is undefined', () => {
      const req = { user: undefined } as unknown as Request;

      const result = getAuthenticatedUser(req);

      expect(result).toBeNull();
    });

    it('should return user with optional fields', () => {
      const mockUser = {
        id: 2,
        email: 'admin@test.com',
        role: 'SUPERADMIN',
        nombre: 'Admin',
        apellido: 'User',
      };
      const req = { user: mockUser } as AuthenticatedRequest;

      const result = getAuthenticatedUser(req as Request);

      expect(result).toEqual(mockUser);
      expect(result?.nombre).toBe('Admin');
      expect(result?.apellido).toBe('User');
    });

    it('should return user with minimal required fields', () => {
      const mockUser = {
        id: 3,
        email: 'minimal@test.com',
        role: 'USER',
      };
      const req = { user: mockUser } as AuthenticatedRequest;

      const result = getAuthenticatedUser(req as Request);

      expect(result).toEqual(mockUser);
      expect(result?.id).toBe(3);
      expect(result?.email).toBe('minimal@test.com');
      expect(result?.role).toBe('USER');
    });
  });
});
