/**
 * Tests reales para DatabaseInitializationService (sin Postgres real)
 * @jest-environment node
 */

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock seeds
const runSeeds = jest.fn().mockResolvedValue(undefined);
jest.mock('../../seed/index', () => ({ runSeeds }));

// Mock databaseConfig
jest.mock('../../config/database', () => ({
  databaseConfig: {
    getConfig: () => ({
      host: 'localhost',
      port: 5432,
      database: 'appdb',
      username: 'user',
      password: 'pass',
      adminDatabase: 'postgres',
      schema: 'public',
      connectionTimeout: 1000,
      commandTimeout: 1000,
      enableLogging: false,
      enableQueryLogging: false,
    }),
    getApplicationUrl: () => 'postgresql://user:pass@localhost:5432/appdb?schema=public',
  },
}));

// Mock util.promisify(exec) used by the service
const execFn = jest.fn().mockResolvedValue({ stdout: 'ok', stderr: '' });
jest.mock('util', () => ({
  promisify: () => execFn,
}));
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

// Mock pg Client
let dbExists = false;
let tablesExist = false;
let hasData = false;

class MockClient {
  public db: string;
  constructor(cfg: any) {
    this.db = cfg.database;
  }
  async connect() {}
  async end() {}
  async query(sql: string, params?: any[]) {
    const q = sql.trim();

    // Admin checks
    if (q.startsWith('SELECT version()')) {
      return { rows: [{ version: 'PostgreSQL 15.0' }] };
    }
    if (q.includes('FROM pg_database')) {
      return { rows: dbExists ? [{ datname: 'appdb', encoding: 'UTF8', datcollate: 'C' }] : [] };
    }
    if (q.includes('FROM pg_collation')) {
      return { rows: [{ collate: 'C', ctype: 'C' }] };
    }
    if (q.startsWith('CREATE DATABASE')) {
      dbExists = true;
      return { rows: [] };
    }

    // App DB checks
    if (q === 'SELECT 1') return { rows: [{ '?column?': 1 }] };
    if (q.includes('has_schema_privilege') && q.includes("'USAGE'")) {
      return { rows: [{ can_use: true, can_create: true }] };
    }
    if (q.includes('SELECT has_schema_privilege') && Array.isArray(params) && params.length === 3) {
      return { rows: [{ has_schema_privilege: true }] };
    }
    if (q.includes('SELECT current_database()')) {
      return { rows: [{ current_database: 'appdb', current_user: 'user' }] };
    }

    if (q.includes('FROM information_schema.tables') && q.includes("table_name IN ('users', 'empresas_textos')")) {
      return { rows: tablesExist ? [{ table_name: 'users' }, { table_name: 'empresas_textos' }] : [] };
    }
    if (q.includes("table_name = 'users'") && q.includes('information_schema.tables')) {
      return { rows: [{ count: tablesExist ? '1' : '0' }] };
    }
    if (q === 'SELECT COUNT(*) as count FROM users') {
      return { rows: [{ count: hasData ? '1' : '0' }] };
    }
    if (q.includes("table_name = 'empresas_textos'") && q.includes('information_schema.tables')) {
      return { rows: [{ count: tablesExist ? '1' : '0' }] };
    }
    if (q.includes('SELECT COUNT(*) as count FROM empresas_textos')) {
      return { rows: [{ count: hasData ? '1' : '0' }] };
    }

    // getDatabaseInfo query
    if (q.includes('current_setting') && q.includes('pg_database_size')) {
      return { rows: [{ database: 'appdb', user: 'user', postgres_version: 'x', encoding: 'UTF8', collation: 'C', size: '1 MB' }] };
    }

    return { rows: [] };
  }
}

jest.mock('pg', () => ({
  Client: MockClient,
}));

import { DatabaseInitializationService } from '../database-initialization.service';

describe('DatabaseInitializationService (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbExists = false;
    tablesExist = false;
    hasData = false;
    delete process.env.FORCE_SEED;
  });

  it('initializeDatabase creates DB, runs migrations and seeds when empty', async () => {
    const svc = new DatabaseInitializationService();
    const res = await svc.initializeDatabase();
    expect(res.success).toBe(true);
    expect(res.created).toBe(true);
    expect(execFn).toHaveBeenCalled(); // migrations
    expect(runSeeds).toHaveBeenCalled();
  });

  it('initializeDatabase skips migrations/seeds when tables and data exist', async () => {
    dbExists = true;
    tablesExist = true;
    hasData = true;
    const svc = new DatabaseInitializationService();
    const res = await svc.initializeDatabase();
    expect(res.success).toBe(true);
    expect(res.created).toBe(false);
    expect(execFn).not.toHaveBeenCalled();
    expect(runSeeds).not.toHaveBeenCalled();
  });

  it('getDatabaseInfo returns info', async () => {
    dbExists = true;
    const svc = new DatabaseInitializationService();
    const info = await svc.getDatabaseInfo();
    expect((info as any).database).toBe('appdb');
  });
});


