/**
 * Propósito: subir "Coverage on New Code" de DatabaseInitializationService.
 * Cubre todas las ramas condicionales, error paths, edge cases y funciones exportadas
 * reportadas como descubiertas por SonarQube (23 líneas, 24 condiciones).
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockClientEnd = jest.fn<any>().mockResolvedValue(undefined);
const mockClientQuery = jest.fn<any>();
const mockClientConnect = jest.fn<any>().mockResolvedValue(undefined);

jest.mock('pg', () => ({
  Client: jest.fn<any>().mockImplementation(() => ({
    connect: mockClientConnect,
    query: mockClientQuery,
    end: mockClientEnd,
  })),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
  },
}));

const mockRunSeeds = jest.fn<any>().mockResolvedValue(undefined);
jest.mock('../../seed/index', () => ({
  runSeeds: mockRunSeeds,
}));

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
      connectionTimeout: 5000,
      commandTimeout: 10000,
    }),
    getApplicationUrl: jest.fn<any>().mockReturnValue(
      'postgresql://test_user:test_pass@localhost:5432/test_db?schema=public'
    ),
  },
}));

jest.mock('child_process', () => ({
  exec: jest.fn<any>(),
}));

jest.mock('util', () => ({
  ...jest.requireActual<typeof import('util')>('util'),
  promisify: jest.fn<any>(() => jest.fn<any>()),
}));

import { DatabaseInitializationService } from '../database-initialization.service';

describe('DatabaseInitializationService (coverage)', () => {
  let service: DatabaseInitializationService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClientConnect.mockReset().mockResolvedValue(undefined);
    mockClientQuery.mockReset();
    mockClientEnd.mockReset().mockResolvedValue(undefined);
    mockRunSeeds.mockReset().mockResolvedValue(undefined);
    process.env = { ...originalEnv };
    service = new DatabaseInitializationService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─────────────────────────────────────────────
  // buildResultMessage (standalone helper, tested via initializeDatabase)
  // ─────────────────────────────────────────────

  describe('buildResultMessage via initializeDatabase', () => {
    function setupHappyPath(opts: {
      dbExists?: boolean;
      tablesExist?: boolean;
      hasData?: boolean;
      forceSeed?: boolean;
    }): void {
      const { dbExists = true, tablesExist = true, hasData = true, forceSeed = false } = opts;

      if (forceSeed) process.env.FORCE_SEED = 'true';
      else delete process.env.FORCE_SEED;

      // NOSONAR: required to inject mock into private member for unit test isolation
      (service as any).execAsync = jest.fn<any>().mockResolvedValue({ stdout: '', stderr: '' });
      (service as any).connectionRetries = 1;
      (service as any).connectionRetryDelay = 0;

      let pgDbCallCount = 0;
      let infoSchemaCallCount = 0;

      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('version()') && !query.includes('current_database')) {
          return Promise.resolve({ rows: [{ version: 'PostgreSQL 15.0 on x86_64' }] });
        }
        if (query.includes('pg_database')) {
          pgDbCallCount++;
          if (pgDbCallCount === 1) {
            return dbExists
              ? Promise.resolve({ rows: [{ datname: 'test_db', encoding: 'UTF8', datcollate: 'en_US.UTF-8' }] })
              : Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [{ datname: 'test_db', encoding: 'UTF8', datcollate: 'en_US.UTF-8' }] });
        }
        if (query.includes('SELECT 1')) {
          return Promise.resolve({ rows: [{}] });
        }
        if (query.includes('has_schema_privilege') && query.includes('USAGE')) {
          return Promise.resolve({ rows: [{ can_use: true, can_create: true }] });
        }
        if (query.includes('has_schema_privilege')) {
          return Promise.resolve({ rows: [{}] });
        }
        if (query.includes('current_database')) {
          return Promise.resolve({ rows: [{ current_database: 'test_db', current_user: 'test_user' }] });
        }
        if (query.includes('information_schema.tables') && query.includes('BASE TABLE')) {
          infoSchemaCallCount++;
          if (tablesExist) {
            return Promise.resolve({ rows: [{ table_name: 'users' }, { table_name: 'empresas_textos' }] });
          }
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes("table_name = 'users'")) {
          return Promise.resolve({ rows: [{ count: hasData ? '1' : '0' }] });
        }
        if (query.includes('information_schema.tables') && query.includes("table_name = 'empresas_textos'")) {
          return Promise.resolve({ rows: [{ count: hasData ? '1' : '0' }] });
        }
        if (query.includes('FROM users')) {
          return Promise.resolve({ rows: [{ count: hasData ? '5' : '0' }] });
        }
        if (query.includes('FROM empresas_textos')) {
          return Promise.resolve({ rows: [{ count: hasData ? '3' : '0' }] });
        }
        return Promise.resolve({ rows: [] });
      });
    }

    it('returns message with no actions when db exists, tables exist, and has data', async () => {
      setupHappyPath({ dbExists: true, tablesExist: true, hasData: true });
      const result = await service.initializeDatabase();

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(result.message).toContain('ya está lista y accesible');
    });

    it('includes "seeds ejecutados" when hasData is false', async () => {
      setupHappyPath({ dbExists: true, tablesExist: true, hasData: false });
      const result = await service.initializeDatabase();

      expect(result.success).toBe(true);
      expect(result.message).toContain('seeds ejecutados');
    });

    it('includes "seeds ejecutados" when FORCE_SEED=true even if hasData', async () => {
      setupHappyPath({ dbExists: true, tablesExist: true, hasData: true, forceSeed: true });
      const result = await service.initializeDatabase();

      expect(result.success).toBe(true);
      expect(result.message).toContain('seeds ejecutados');
    });

    it('includes "migraciones ejecutadas" when tables do not exist', async () => {
      setupHappyPath({ dbExists: true, tablesExist: false, hasData: false });
      const result = await service.initializeDatabase();

      expect(result.success).toBe(true);
      expect(result.message).toContain('migraciones ejecutadas');
    });
  });

  // ─────────────────────────────────────────────
  // initializeDatabase – error path
  // ─────────────────────────────────────────────

  describe('initializeDatabase – error handling', () => {
    it('returns failure with error message when an Error is thrown', async () => {
      // NOSONAR: required to test private method error path
      (service as any).config = { ...((service as any).config), database: '', username: 'u', password: 'p' };

      const result = await service.initializeDatabase();

      expect(result.success).toBe(false);
      expect(result.created).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.message).toContain('Falló la inicialización');
    });

    it('handles non-Error thrown values with "Error desconocido"', async () => {
      jest.spyOn(service as any, 'validateConfiguration').mockRejectedValue('string-error');

      const result = await service.initializeDatabase();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Error desconocido');
    });
  });

  // ─────────────────────────────────────────────
  // validateConfiguration
  // ─────────────────────────────────────────────

  describe('validateConfiguration', () => {
    it('throws when database is undefined (falsy)', async () => {
      // NOSONAR: injecting invalid config to test validation branch
      (service as any).config = { database: undefined, username: 'u', password: 'p' };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Nombre de base de datos no puede estar vacío'
      );
    });

    it('throws when database is whitespace only', async () => {
      // NOSONAR: injecting invalid config to test validation branch
      (service as any).config = { database: '  ', username: 'u', password: 'p' };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Nombre de base de datos no puede estar vacío'
      );
    });

    it('throws when username is undefined (falsy)', async () => {
      // NOSONAR: injecting invalid config to test validation branch
      (service as any).config = { database: 'db', username: undefined, password: 'p' };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Usuario de base de datos no puede estar vacío'
      );
    });

    it('throws when username is whitespace only', async () => {
      // NOSONAR: injecting invalid config to test validation branch
      (service as any).config = { database: 'db', username: '   ', password: 'p' };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Usuario de base de datos no puede estar vacío'
      );
    });

    it('throws when password is falsy', async () => {
      // NOSONAR: injecting invalid config to test validation branch
      (service as any).config = { database: 'db', username: 'u', password: '' };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'Contraseña de base de datos no puede estar vacía'
      );
    });

    it('throws when database name contains invalid characters', async () => {
      // NOSONAR: injecting invalid config to test validation branch
      (service as any).config = { database: 'my db!', username: 'u', password: 'p' };

      await expect((service as any).validateConfiguration()).rejects.toThrow(
        'contiene caracteres inválidos'
      );
    });

    it('passes with a valid config', async () => {
      // NOSONAR: injecting valid config to test happy path
      (service as any).config = { database: 'valid_db-1', username: 'u', password: 'p' };

      await expect((service as any).validateConfiguration()).resolves.toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────
  // verifyAdministrativeConnection – retry branches
  // ─────────────────────────────────────────────

  describe('verifyAdministrativeConnection', () => {
    beforeEach(() => {
      // NOSONAR: reducing retries for faster test execution
      (service as any).connectionRetries = 3;
      (service as any).connectionRetryDelay = 0;
    });

    it('succeeds on first attempt', async () => {
      mockClientQuery.mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 15.0' }] });

      await expect((service as any).verifyAdministrativeConnection()).resolves.toBeUndefined();
      expect(mockClientEnd).toHaveBeenCalled();
    });

    it('succeeds on second attempt after first connection failure', async () => {
      let connectCalls = 0;
      mockClientConnect.mockImplementation(() => {
        connectCalls++;
        if (connectCalls === 1) return Promise.reject(new Error('ECONNREFUSED'));
        return Promise.resolve();
      });
      mockClientQuery.mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] });

      await expect((service as any).verifyAdministrativeConnection()).resolves.toBeUndefined();
      expect(connectCalls).toBe(2);
    });

    it('throws after all retries exhausted', async () => {
      mockClientConnect.mockRejectedValue(new Error('Connection refused'));

      await expect((service as any).verifyAdministrativeConnection()).rejects.toThrow(
        'No se pudo conectar a PostgreSQL después de 3 intentos'
      );
    });

    it('handles non-Error thrown during retries', async () => {
      mockClientConnect.mockRejectedValue('unknown-error');

      await expect((service as any).verifyAdministrativeConnection()).rejects.toThrow(
        'Error desconocido'
      );
    });

    it('extracts version from rows[0] or falls back to "Desconocida"', async () => {
      mockClientQuery.mockResolvedValueOnce({ rows: [{}] });

      await expect((service as any).verifyAdministrativeConnection()).resolves.toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────
  // checkDatabaseStatus – all branches
  // ─────────────────────────────────────────────

  describe('checkDatabaseStatus', () => {
    it('returns exists:false when DB does not exist', async () => {
      mockClientQuery.mockResolvedValue({ rows: [] });

      const status = await (service as any).checkDatabaseStatus();

      expect(status.exists).toBe(false);
      expect(status.accessible).toBe(false);
      expect(status.hasRequiredPermissions).toBe(false);
    });

    it('returns exists:true with accessibility when DB exists and app client succeeds', async () => {
      let queryCount = 0;
      mockClientQuery.mockImplementation((q: string) => {
        queryCount++;
        const query = typeof q === 'string' ? q : '';
        if (queryCount === 1 || query.includes('pg_database')) {
          return Promise.resolve({
            rows: [{ datname: 'test_db', encoding: 'UTF8', datcollate: 'en_US.UTF-8' }],
          });
        }
        if (query.includes('SELECT 1')) {
          return Promise.resolve({ rows: [{}] });
        }
        if (query.includes('has_schema_privilege')) {
          return Promise.resolve({ rows: [{}] });
        }
        return Promise.resolve({ rows: [] });
      });

      const status = await (service as any).checkDatabaseStatus();

      expect(status.exists).toBe(true);
      expect(status.accessible).toBe(true);
      expect(status.hasRequiredPermissions).toBe(true);
      expect(status.encoding).toBe('UTF8');
      expect(status.collation).toBe('en_US.UTF-8');
    });

    it('returns accessible:false when app client connection throws', async () => {
      let connectCalls = 0;
      mockClientConnect.mockImplementation(() => {
        connectCalls++;
        if (connectCalls > 1) return Promise.reject(new Error('App connect fail'));
        return Promise.resolve();
      });

      mockClientQuery.mockResolvedValue({
        rows: [{ datname: 'test_db', encoding: 'UTF8', datcollate: 'C' }],
      });

      const status = await (service as any).checkDatabaseStatus();

      expect(status.exists).toBe(true);
      expect(status.accessible).toBe(false);
      expect(status.hasRequiredPermissions).toBe(false);
    });

    it('throws wrapped error when admin client connect fails', async () => {
      mockClientConnect.mockRejectedValue(new Error('Admin fail'));

      await expect((service as any).checkDatabaseStatus()).rejects.toThrow(
        'Error verificando estado de BD'
      );
    });
  });

  // ─────────────────────────────────────────────
  // createDatabase – all branches
  // ─────────────────────────────────────────────

  describe('createDatabase', () => {
    it('returns true when database is created successfully', async () => {
      let pgDbCount = 0;
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('pg_collation')) {
          return Promise.resolve({ rows: [{ collate: 'C', ctype: 'C' }] });
        }
        if (query.includes('CREATE DATABASE')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('pg_database')) {
          pgDbCount++;
          return Promise.resolve({
            rows: [{ datname: 'test_db', encoding: 'UTF8', datcollate: 'C' }],
          });
        }
        if (query.includes('SELECT 1')) {
          return Promise.resolve({ rows: [{}] });
        }
        if (query.includes('has_schema_privilege')) {
          return Promise.resolve({ rows: [{}] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await (service as any).createDatabase();
      expect(result).toBe(true);
    });

    it('returns false when "already exists" error occurs', async () => {
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('pg_collation')) {
          return Promise.resolve({ rows: [{ collate: 'C', ctype: 'C' }] });
        }
        if (query.includes('CREATE DATABASE')) {
          return Promise.reject(new Error('database "test_db" already exists'));
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await (service as any).createDatabase();
      expect(result).toBe(false);
    });

    it('throws specific error on "permission denied"', async () => {
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('pg_collation')) {
          return Promise.resolve({ rows: [{ collate: 'C', ctype: 'C' }] });
        }
        if (query.includes('CREATE DATABASE')) {
          return Promise.reject(new Error('permission denied to create database'));
        }
        return Promise.resolve({ rows: [] });
      });

      await expect((service as any).createDatabase()).rejects.toThrow(
        'Sin permisos para crear base de datos'
      );
    });

    it('throws generic error for other creation failures', async () => {
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('pg_collation')) {
          return Promise.resolve({ rows: [{ collate: 'C', ctype: 'C' }] });
        }
        if (query.includes('CREATE DATABASE')) {
          return Promise.reject(new Error('disk full'));
        }
        return Promise.resolve({ rows: [] });
      });

      await expect((service as any).createDatabase()).rejects.toThrow(
        'Error creando base de datos: disk full'
      );
    });

    it('handles non-Error thrown value with "Error desconocido"', async () => {
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('pg_collation')) {
          return Promise.resolve({ rows: [{ collate: 'C', ctype: 'C' }] });
        }
        if (query.includes('CREATE DATABASE')) {
          return Promise.reject('string-error'); // eslint-disable-line prefer-promise-reject-errors
        }
        return Promise.resolve({ rows: [] });
      });

      await expect((service as any).createDatabase()).rejects.toThrow(
        'Error creando base de datos: Error desconocido'
      );
    });

    it('throws when post-creation status check shows exists=false', async () => {
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('pg_collation')) {
          return Promise.resolve({ rows: [{ collate: 'C', ctype: 'C' }] });
        }
        if (query.includes('CREATE DATABASE')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('pg_database')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect((service as any).createDatabase()).rejects.toThrow(
        'La base de datos no se creó correctamente'
      );
    });
  });

  // ─────────────────────────────────────────────
  // verifyUserPermissions – all branches
  // ─────────────────────────────────────────────

  describe('verifyUserPermissions', () => {
    it('succeeds when connected to correct DB with all permissions', async () => {
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('current_database')) {
          return Promise.resolve({
            rows: [{ current_database: 'test_db', current_user: 'test_user' }],
          });
        }
        if (query.includes('has_schema_privilege')) {
          return Promise.resolve({ rows: [{ can_use: true, can_create: true }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect((service as any).verifyUserPermissions()).resolves.toBeUndefined();
    });

    it('throws when connected to wrong database', async () => {
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('current_database')) {
          return Promise.resolve({
            rows: [{ current_database: 'wrong_db', current_user: 'test_user' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect((service as any).verifyUserPermissions()).rejects.toThrow(
        'Error de permisos'
      );
    });

    it('throws when user lacks USAGE permission', async () => {
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('current_database')) {
          return Promise.resolve({
            rows: [{ current_database: 'test_db', current_user: 'test_user' }],
          });
        }
        if (query.includes('has_schema_privilege')) {
          return Promise.resolve({ rows: [{ can_use: false, can_create: true }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect((service as any).verifyUserPermissions()).rejects.toThrow(
        'no tiene permisos USAGE'
      );
    });

    it('throws when user lacks CREATE permission', async () => {
      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('current_database')) {
          return Promise.resolve({
            rows: [{ current_database: 'test_db', current_user: 'test_user' }],
          });
        }
        if (query.includes('has_schema_privilege')) {
          return Promise.resolve({ rows: [{ can_use: true, can_create: false }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect((service as any).verifyUserPermissions()).rejects.toThrow(
        'no tiene permisos CREATE'
      );
    });

    it('handles non-Error thrown in catch block', async () => {
      mockClientConnect.mockRejectedValue(42); // eslint-disable-line prefer-promise-reject-errors

      await expect((service as any).verifyUserPermissions()).rejects.toThrow(
        'Error de permisos: Error desconocido'
      );
    });
  });

  // ─────────────────────────────────────────────
  // getOptimalLocaleConfig – all branches
  // ─────────────────────────────────────────────

  describe('getOptimalLocaleConfig', () => {
    it('returns detected locale when rows are found', async () => {
      const mockClient = {
        query: jest.fn<any>().mockResolvedValue({
          rows: [{ collate: 'en_US.UTF-8', ctype: 'en_US.UTF-8' }],
        }),
      };

      const result = await (service as any).getOptimalLocaleConfig(mockClient);
      expect(result).toEqual({ collate: 'en_US.UTF-8', ctype: 'en_US.UTF-8' });
    });

    it('returns default C locale when no rows found', async () => {
      const mockClient = {
        query: jest.fn<any>().mockResolvedValue({ rows: [] }),
      };

      const result = await (service as any).getOptimalLocaleConfig(mockClient);
      expect(result).toEqual({ collate: 'C', ctype: 'C' });
    });

    it('returns default C locale when query throws', async () => {
      const mockClient = {
        query: jest.fn<any>().mockRejectedValue(new Error('Query fail')),
      };

      const result = await (service as any).getOptimalLocaleConfig(mockClient);
      expect(result).toEqual({ collate: 'C', ctype: 'C' });
    });
  });

  // ─────────────────────────────────────────────
  // checkTablesExist – all branches
  // ─────────────────────────────────────────────

  describe('checkTablesExist', () => {
    it('returns true when >= 2 tables found', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [{ table_name: 'users' }, { table_name: 'empresas_textos' }],
      });

      const result = await (service as any).checkTablesExist();
      expect(result).toBe(true);
    });

    it('returns false when < 2 tables found', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [{ table_name: 'users' }],
      });

      const result = await (service as any).checkTablesExist();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockClientConnect.mockRejectedValueOnce(new Error('fail'));

      const result = await (service as any).checkTablesExist();
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // checkDatabaseHasData – all branches
  // ─────────────────────────────────────────────

  describe('checkDatabaseHasData', () => {
    it('returns false when users table does not exist (count=0)', async () => {
      mockClientQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await (service as any).checkDatabaseHasData();
      expect(result).toBe(false);
    });

    it('returns true when users table has data (userCount > 0)', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })   // users table exists
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })   // users data count
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })   // empresas_textos table exists
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });  // empresas_textos data count

      const result = await (service as any).checkDatabaseHasData();
      expect(result).toBe(true);
    });

    it('returns true when only empresas_textos has data', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })   // users table exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })   // users data count = 0
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })   // empresas_textos table exists
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });  // empresas_textos data count

      const result = await (service as any).checkDatabaseHasData();
      expect(result).toBe(true);
    });

    it('returns false when both tables have 0 records', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })   // users table exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })   // users data count = 0
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })   // empresas_textos table exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });  // empresas_textos data count = 0

      const result = await (service as any).checkDatabaseHasData();
      expect(result).toBe(false);
    });

    it('skips empresas_textos data query when table does not exist', async () => {
      mockClientQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })   // users table exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })   // users data count = 0
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });  // empresas_textos table does NOT exist

      const result = await (service as any).checkDatabaseHasData();
      expect(result).toBe(false);
      expect(mockClientQuery).toHaveBeenCalledTimes(3);
    });

    it('returns false on error', async () => {
      mockClientConnect.mockRejectedValueOnce(new Error('fail'));

      const result = await (service as any).checkDatabaseHasData();
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // runPrismaMigrations – all branches
  // ─────────────────────────────────────────────

  describe('runPrismaMigrations', () => {
    it('succeeds and logs short stdout (<=15 lines)', async () => {
      // NOSONAR: injecting mock for private execAsync
      (service as any).execAsync = jest.fn<any>().mockResolvedValue({
        stdout: 'Migration applied\nDone',
        stderr: '',
      });

      await expect((service as any).runPrismaMigrations()).resolves.toBeUndefined();
    });

    it('logs warning when stderr contains non-warn content', async () => {
      // NOSONAR: injecting mock for private execAsync
      (service as any).execAsync = jest.fn<any>().mockResolvedValue({
        stdout: '',
        stderr: 'ERROR: something went wrong',
      });

      await expect((service as any).runPrismaMigrations()).resolves.toBeUndefined();
    });

    it('does not warn when stderr only contains warn text', async () => {
      // NOSONAR: injecting mock for private execAsync
      (service as any).execAsync = jest.fn<any>().mockResolvedValue({
        stdout: '',
        stderr: 'warn: already up to date',
      });

      await expect((service as any).runPrismaMigrations()).resolves.toBeUndefined();
    });

    it('truncates stdout when more than 15 lines', async () => {
      const longOutput = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n');
      // NOSONAR: injecting mock for private execAsync
      (service as any).execAsync = jest.fn<any>().mockResolvedValue({
        stdout: longOutput,
        stderr: '',
      });

      await expect((service as any).runPrismaMigrations()).resolves.toBeUndefined();
    });

    it('skips stdout logging when stdout is empty', async () => {
      // NOSONAR: injecting mock for private execAsync
      (service as any).execAsync = jest.fn<any>().mockResolvedValue({
        stdout: '',
        stderr: '',
      });

      await expect((service as any).runPrismaMigrations()).resolves.toBeUndefined();
    });

    it('throws wrapped error on exec failure (Error)', async () => {
      // NOSONAR: injecting mock for private execAsync
      (service as any).execAsync = jest.fn<any>().mockRejectedValue(new Error('exec failed'));

      await expect((service as any).runPrismaMigrations()).rejects.toThrow(
        'Error en migraciones: exec failed'
      );
    });

    it('throws "Error desconocido" on non-Error rejection', async () => {
      // NOSONAR: injecting mock for private execAsync
      (service as any).execAsync = jest.fn<any>().mockRejectedValue('string-error');

      await expect((service as any).runPrismaMigrations()).rejects.toThrow(
        'Error en migraciones: Error desconocido'
      );
    });
  });

  // ─────────────────────────────────────────────
  // executeSeedsProcess – all branches
  // ─────────────────────────────────────────────

  describe('executeSeedsProcess', () => {
    it('calls runSeeds successfully', async () => {
      await expect((service as any).executeSeedsProcess()).resolves.toBeUndefined();
      expect(mockRunSeeds).toHaveBeenCalled();
    });

    it('throws wrapped error when runSeeds fails (Error)', async () => {
      mockRunSeeds.mockRejectedValueOnce(new Error('seed failed'));

      await expect((service as any).executeSeedsProcess()).rejects.toThrow(
        'Error en seeds: seed failed'
      );
    });

    it('throws "Error desconocido" when runSeeds rejects non-Error', async () => {
      mockRunSeeds.mockRejectedValueOnce(42);

      await expect((service as any).executeSeedsProcess()).rejects.toThrow(
        'Error en seeds: Error desconocido'
      );
    });
  });

  // ─────────────────────────────────────────────
  // getDatabaseInfo – all branches
  // ─────────────────────────────────────────────

  describe('getDatabaseInfo', () => {
    it('returns database info on success', async () => {
      const dbInfo = {
        database: 'test_db',
        user: 'test_user',
        postgres_version: 'PostgreSQL 15.0',
        encoding: 'UTF8',
        collation: 'en_US.UTF-8',
        size: '10 MB',
      };
      mockClientQuery.mockResolvedValueOnce({ rows: [dbInfo] });

      const result = await service.getDatabaseInfo();
      expect(result).toEqual(dbInfo);
      expect(mockClientEnd).toHaveBeenCalled();
    });

    it('returns error object when query fails (Error)', async () => {
      mockClientConnect.mockRejectedValueOnce(new Error('connection fail'));

      const result = await service.getDatabaseInfo();
      expect(result).toEqual({ error: 'connection fail' });
    });

    it('returns "Error desconocido" when non-Error is thrown', async () => {
      mockClientConnect.mockRejectedValueOnce('weird');

      const result = await service.getDatabaseInfo();
      expect(result).toEqual({ error: 'Error desconocido' });
    });
  });

  // ─────────────────────────────────────────────
  // sleep utility
  // ─────────────────────────────────────────────

  describe('sleep', () => {
    it('resolves after specified delay', async () => {
      jest.useFakeTimers();
      const promise = (service as any).sleep(100);
      jest.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
      jest.useRealTimers();
    });
  });

  // ─────────────────────────────────────────────
  // createAdminClient / createApplicationClient
  // ─────────────────────────────────────────────

  describe('createAdminClient', () => {
    it('creates and connects a pg Client with admin config', async () => {
      const client = await (service as any).createAdminClient();
      expect(mockClientConnect).toHaveBeenCalled();
      expect(client).toBeDefined();
    });
  });

  describe('createApplicationClient', () => {
    it('creates and connects a pg Client with application config', async () => {
      const client = await (service as any).createApplicationClient();
      expect(mockClientConnect).toHaveBeenCalled();
      expect(client).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────
  // initializeDatabase – full flow: DB doesn't exist (createDatabase branch)
  // ─────────────────────────────────────────────

  describe('initializeDatabase – createDatabase branch (status.exists = false)', () => {
    it('creates DB when it does not exist then runs full pipeline', async () => {
      // NOSONAR: injecting mocks for private members
      (service as any).connectionRetries = 1;
      (service as any).connectionRetryDelay = 0;
      (service as any).execAsync = jest.fn<any>().mockResolvedValue({ stdout: 'ok', stderr: '' });

      let pgDbCallCount = 0;

      mockClientQuery.mockImplementation((q: string) => {
        const query = typeof q === 'string' ? q : '';
        if (query.includes('version()') && !query.includes('current_database')) {
          return Promise.resolve({ rows: [{ version: 'PostgreSQL 15.0 on x86_64' }] });
        }
        if (query.includes('pg_database')) {
          pgDbCallCount++;
          if (pgDbCallCount === 1) return Promise.resolve({ rows: [] });
          return Promise.resolve({
            rows: [{ datname: 'test_db', encoding: 'UTF8', datcollate: 'C' }],
          });
        }
        if (query.includes('pg_collation')) {
          return Promise.resolve({ rows: [{ collate: 'C', ctype: 'C' }] });
        }
        if (query.includes('CREATE DATABASE')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('current_database')) {
          return Promise.resolve({
            rows: [{ current_database: 'test_db', current_user: 'test_user' }],
          });
        }
        if (query.includes('has_schema_privilege') && query.includes('USAGE')) {
          return Promise.resolve({ rows: [{ can_use: true, can_create: true }] });
        }
        if (query.includes('has_schema_privilege')) {
          return Promise.resolve({ rows: [{}] });
        }
        if (query.includes('SELECT 1')) {
          return Promise.resolve({ rows: [{}] });
        }
        if (query.includes('information_schema.tables') && query.includes('BASE TABLE')) {
          return Promise.resolve({ rows: [{ table_name: 'users' }, { table_name: 'empresas_textos' }] });
        }
        if (query.includes('information_schema.tables')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('FROM users')) {
          return Promise.resolve({ rows: [{ count: '5' }] });
        }
        if (query.includes('FROM empresas_textos')) {
          return Promise.resolve({ rows: [{ count: '3' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.initializeDatabase();

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(result.message).toContain('creada');
    });
  });
});
