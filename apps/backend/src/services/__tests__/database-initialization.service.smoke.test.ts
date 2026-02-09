/**
 * Propósito: Smoke test de `DatabaseInitializationService` para subir coverage.
 * Ejecuta `initializeDatabase()` en modo fallo temprano (config inválida) para cubrir ramas de validación.
 */

jest.mock('../../config/database', () => ({
  databaseConfig: {
    getConfig: () => ({
      host: 'localhost',
      port: 5432,
      database: '', // inválido a propósito
      username: '',
      password: '',
      adminDatabase: 'postgres',
    }),
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../seed/index', () => ({
  runSeeds: jest.fn().mockResolvedValue(undefined),
}));

import { DatabaseInitializationService } from '../database-initialization.service';

describe('DatabaseInitializationService (smoke)', () => {
  it('retorna success=false cuando la configuración es inválida', async () => {
    const svc = new DatabaseInitializationService();
    const result = await svc.initializeDatabase();
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});


