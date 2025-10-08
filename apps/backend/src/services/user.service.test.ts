/**
 * @jest-environment node
 */

import { UserService } from './user.service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = UserService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = UserService.getInstance();
      const instance2 = UserService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Test basic functionality', () => {
    it('should be defined', () => {
      expect(userService).toBeDefined();
    });

    it('should have findByEmail method', () => {
      expect(typeof userService.findByEmail).toBe('function');
    });

    it('should have verifyPassword method', () => {
      expect(typeof userService.verifyPassword).toBe('function');
    });

    it('should have changePassword method', () => {
      expect(typeof userService.changePassword).toBe('function');
    });

    it('should have findByEmpresa method', () => {
      expect(typeof userService.findByEmpresa).toBe('function');
    });

    it('should have getStats method', () => {
      expect(typeof userService.getStats).toBe('function');
    });

    it('should have count method', () => {
      expect(typeof userService.count).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof userService.findById).toBe('function');
    });
  });
}); 