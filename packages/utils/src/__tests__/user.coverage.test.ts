/**
 * Coverage tests for user utilities
 * These tests import real code to generate coverage
 */

import {
  getUserDisplayName,
  getUserRoleLabel,
  canUserAccessResource,
  isUserInEmpresa,
} from '../index';
import { UserRole } from '@workspace/types';

describe('User Utilities Coverage', () => {
  describe('getUserDisplayName', () => {
    it('should return full name', () => {
      const user = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      expect(getUserDisplayName(user)).toBe('John Doe');
    });

    it('should return first name only', () => {
      const user = { firstName: 'John', email: 'john@example.com' };
      expect(getUserDisplayName(user)).toBe('John');
    });

    it('should return last name only', () => {
      const user = { lastName: 'Doe', email: 'john@example.com' };
      expect(getUserDisplayName(user)).toBe('Doe');
    });

    it('should return email as fallback', () => {
      const user = { email: 'john@example.com' };
      expect(getUserDisplayName(user)).toBe('john@example.com');
    });

    it('should handle empty strings', () => {
      const user = { firstName: '', lastName: '', email: 'test@example.com' };
      expect(getUserDisplayName(user)).toBe('test@example.com');
    });
  });

  describe('getUserRoleLabel', () => {
    it('should return label for ADMIN', () => {
      const label = getUserRoleLabel(UserRole.ADMIN);
      expect(label).toBeDefined();
      expect(typeof label).toBe('string');
    });

    it('should return label for SUPERADMIN', () => {
      const label = getUserRoleLabel(UserRole.SUPERADMIN);
      expect(label).toBeDefined();
    });

    it('should return label for OPERATOR', () => {
      const label = getUserRoleLabel(UserRole.OPERATOR);
      expect(label).toBeDefined();
    });

    it('should return label for CLIENTE', () => {
      const label = getUserRoleLabel(UserRole.CLIENTE);
      expect(label).toBeDefined();
    });

    it('should return role as fallback for unknown', () => {
      const label = getUserRoleLabel('UNKNOWN' as UserRole);
      expect(label).toBe('UNKNOWN');
    });
  });

  describe('canUserAccessResource', () => {
    it('should allow SUPERADMIN to access any resource', () => {
      expect(canUserAccessResource(UserRole.SUPERADMIN, 'any')).toBe(true);
    });

    it('should allow ADMIN to access common resources', () => {
      expect(canUserAccessResource(UserRole.ADMIN, 'dashboard')).toBe(true);
    });

    it('should allow ADMIN to access users', () => {
      expect(canUserAccessResource(UserRole.ADMIN, 'users')).toBe(true);
    });

    it('should restrict OPERATOR from users', () => {
      expect(canUserAccessResource(UserRole.OPERATOR, 'users')).toBe(false);
    });

    it('should restrict CLIENTE from internal resources', () => {
      expect(canUserAccessResource(UserRole.CLIENTE, 'users')).toBe(false);
    });

    it('should handle unknown resources', () => {
      const result = canUserAccessResource(UserRole.ADMIN, 'unknown_resource');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isUserInEmpresa', () => {
    it('should return true when user belongs to empresa', () => {
      const user = { empresaId: 100 };
      expect(isUserInEmpresa(user, 100)).toBe(true);
    });

    it('should return false when user does not belong to empresa', () => {
      const user = { empresaId: 100 };
      expect(isUserInEmpresa(user, 200)).toBe(false);
    });

    it('should return false when user has no empresaId', () => {
      const user = {};
      expect(isUserInEmpresa(user, 100)).toBe(false);
    });

    it('should handle undefined empresaId', () => {
      const user = { empresaId: undefined };
      expect(isUserInEmpresa(user, 100)).toBe(false);
    });

    it('should handle null user', () => {
      expect(isUserInEmpresa(null as any, 100)).toBe(false);
    });
  });
});



