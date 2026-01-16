/**
 * Smoke tests para archivos de configuración del backend
 */

describe('Backend Config - Smoke Tests', () => {
  it('should import database config without errors', () => {
    expect(() => require('../database')).not.toThrow();
  });

  it('should import environment config without errors', () => {
    expect(() => require('../environment')).not.toThrow();
  });

  it('should import logger config without errors', () => {
    expect(() => require('../logger')).not.toThrow();
  });

  it('should import prisma config without errors', () => {
    expect(() => require('../prisma')).not.toThrow();
  });

  it('should import serviceConfig without errors', () => {
    expect(() => require('../serviceConfig')).not.toThrow();
  });
});

