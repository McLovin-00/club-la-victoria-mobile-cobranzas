/**
 * Tests adicionales para DatabaseInitializationService
 * Propósito: Cubrir branches de error y edge cases no cubiertos en tests anteriores
 */

import { DatabaseInitializationService } from '../database-initialization.service';
import { Pool } from 'pg';

// Mock de logger
jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock de database config
jest.mock('../../config/database', () => ({
  databaseConfig: {
    getConfig: () => ({
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_pass',
      adminDatabase: 'postgres',
      schema: 'public',
      connectionRetries: 3,
      connectionRetryDelay: 1000,
    }),
    getApplicationUrl: () => 'postgresql://test_user:test_pass@localhost:5432/test_db',
    getAdminUrl: () => 'postgresql://test_user:test_pass@localhost:5432/postgres',
  },
}));

describe('DatabaseInitializationService - branches adicionales', () => {
  let service: DatabaseInitializationService;

  beforeEach(() => {
    service = new DatabaseInitializationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateConfiguration - branches de error', () => {
    it('debe lanzar error cuando database está vacío', async () => {
      // Override config para este test
      (service as any).config = {
        database: '',
        username: 'test_user',
        password: 'test_pass',
      };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Nombre de base de datos no puede estar vacío'
      );
    });

    it('debe lanzar error cuando database es solo espacios', async () => {
      (service as any).config = {
        database: '   ',
        username: 'test_user',
        password: 'test_pass',
      };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Nombre de base de datos no puede estar vacío'
      );
    });

    it('debe lanzar error cuando username está vacío', async () => {
      (service as any).config = {
        database: 'test_db',
        username: '',
        password: 'test_pass',
      };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Usuario de base de datos no puede estar vacío'
      );
    });

    it('debe lanzar error cuando username es solo espacios', async () => {
      (service as any).config = {
        database: 'test_db',
        username: '  ',
        password: 'test_pass',
      };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Usuario de base de datos no puede estar vacío'
      );
    });

    it('debe lanzar error cuando password está vacío', async () => {
      (service as any).config = {
        database: 'test_db',
        username: 'test_user',
        password: '',
      };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Contraseña de base de datos no puede estar vacía'
      );
    });

    it('debe lanzar error cuando password es undefined', async () => {
      (service as any).config = {
        database: 'test_db',
        username: 'test_user',
        password: undefined,
      };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Contraseña de base de datos no puede estar vacía'
      );
    });

    it('debe lanzar error cuando database name tiene caracteres inválidos (@#$)', async () => {
      (service as any).config = {
        database: 'test@db#',
        username: 'test_user',
        password: 'test_pass',
      };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        "Nombre de base de datos 'test@db#' contiene caracteres inválidos"
      );
    });

    it('debe lanzar error cuando database name tiene espacios', async () => {
      (service as any).config = {
        database: 'test db',
        username: 'test_user',
        password: 'test_pass',
      };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        "Nombre de base de datos 'test db' contiene caracteres inválidos"
      );
    });

    it('debe aceptar database name con guiones y guiones bajos', async () => {
      (service as any).config = {
        database: 'test_db-123',
        username: 'test_user',
        password: 'test_pass',
      };

      await expect((service as any).validateConfiguration()).resolves.not.toThrow();
    });
  });

  describe('verifyAdministrativeConnection - retry logic', () => {
    it('debe reintentar cuando falla el primer intento', async () => {
      let attempts = 0;
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ version: 'PostgreSQL 14.0' }],
        }),
        end: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(service as any, 'createAdminClient').mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Connection failed');
        }
        return mockClient as unknown as Pool;
      });

      await expect((service as any).verifyAdministrativeConnection()).resolves.not.toThrow();
      expect(attempts).toBe(2);
    });

    it('debe lanzar error después de todos los intentos fallidos', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Connection failed')),
        end: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(service as any, 'createAdminClient').mockResolvedValue(mockClient);

      await expect((service as any).verifyAdministrativeConnection()).rejects.toThrow(
        'No se pudo conectar a PostgreSQL después de'
      );
    });
  });

  describe('createDatabase - error branches', () => {
    it('debe retornar false cuando database ya existe', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('database "test_db" already exists')),
        end: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(service as any, 'createAdminClient').mockResolvedValue(mockClient);

      const result = await (service as any).createDatabase();
      expect(result).toBe(false);
    });

    it('debe lanzar error específico cuando hay permission denied', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('permission denied for database postgres')),
        end: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(service as any, 'createAdminClient').mockResolvedValue(mockClient);

      await expect((service as any).createDatabase()).rejects.toThrow(
        'Sin permisos para crear base de datos'
      );
    });
  });

  describe('checkTablesExist - error branch', () => {
    it('debe retornar false cuando hay error en query', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Connection lost')),
        end: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(service as any, 'createApplicationClient').mockResolvedValue(mockClient);

      const result = await (service as any).checkTablesExist();
      expect(result).toBe(false);
    });
  });

  describe('checkDatabaseHasData - error branch', () => {
    it('debe retornar false cuando hay error en query', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Connection lost')),
        end: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(service as any, 'createApplicationClient').mockResolvedValue(mockClient);

      const result = await (service as any).checkDatabaseHasData();
      expect(result).toBe(false);
    });
  });

  describe('getOptimalLocaleConfig - fallback branch', () => {
    it('debe retornar configuración por defecto cuando falla el query', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Query failed')),
      };

      const result = await (service as any).getOptimalLocaleConfig(mockClient);
      expect(result).toEqual({
        collate: 'C',
        ctype: 'C',
      });
    });

    it('debe retornar configuración por defecto cuando no hay locales coincidentes', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [], // No locales encontrados
        }),
      };

      const result = await (service as any).getOptimalLocaleConfig(mockClient);
      expect(result).toEqual({
        collate: 'C',
        ctype: 'C',
      });
    });
  });
});
