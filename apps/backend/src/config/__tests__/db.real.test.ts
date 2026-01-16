/**
 * Tests para config/db.ts (Pool de conexiones pg)
 * Cubre exportación del pool, eventos connect/error y testConnection
 * @jest-environment node
 */

import { EventEmitter } from 'events';

describe('config/db (real)', () => {
    const origEnv = { ...process.env };

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...origEnv };
    });

    afterEach(() => {
        process.env = { ...origEnv };
        jest.resetModules();
    });

    it('creates a Pool with env defaults and emits connect event', async () => {
        const mockClient = { release: jest.fn() };
        const poolEventEmitter = new EventEmitter();

        const mockPool = Object.assign(poolEventEmitter, {
            connect: jest.fn().mockResolvedValue(mockClient),
            on: poolEventEmitter.on.bind(poolEventEmitter),
        });

        jest.doMock('pg', () => ({
            Pool: jest.fn().mockImplementation(() => mockPool),
        }));

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        const { db, testConnection } = await import('../db');

        // Simular evento connect
        db.emit('connect');
        expect(consoleSpy).toHaveBeenCalledWith('Cliente de base de datos conectado');

        // Test connection exitosa
        const result = await testConnection();
        expect(result).toBe(true);
        expect(mockClient.release).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('emits error event and testConnection returns false on failure', async () => {
        const poolEventEmitter = new EventEmitter();

        const mockPool = Object.assign(poolEventEmitter, {
            connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
            on: poolEventEmitter.on.bind(poolEventEmitter),
        });

        jest.doMock('pg', () => ({
            Pool: jest.fn().mockImplementation(() => mockPool),
        }));

        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const { db, testConnection } = await import('../db');

        // Simular evento error
        const testError = new Error('DB Error');
        db.emit('error', testError);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error en cliente de base de datos:', testError);

        // Test connection fallida
        const result = await testConnection();
        expect(result).toBe(false);

        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('uses environment variables when provided', async () => {
        process.env.DB_HOST = 'testhost';
        process.env.DB_PORT = '5433';
        process.env.DB_NAME = 'testdb';
        process.env.DB_USER = 'testuser';
        process.env.DB_PASSWORD = 'testpass';

        let poolConfig: Record<string, unknown> = {};

        jest.doMock('pg', () => ({
            Pool: jest.fn().mockImplementation((config: Record<string, unknown>) => {
                poolConfig = config;
                return {
                    on: jest.fn(),
                    connect: jest.fn(),
                };
            }),
        }));

        await import('../db');

        expect(poolConfig.host).toBe('testhost');
        expect(poolConfig.port).toBe(5433);
        expect(poolConfig.database).toBe('testdb');
        expect(poolConfig.user).toBe('testuser');
        expect(poolConfig.password).toBe('testpass');
    });

    it('uses default values when env vars are not provided', async () => {
        // Establecer env vars como undefined (no pueden ser realmente borradas)
        Object.defineProperty(process.env, 'DB_HOST', { value: undefined, writable: true, configurable: true });
        Object.defineProperty(process.env, 'DB_PORT', { value: undefined, writable: true, configurable: true });
        Object.defineProperty(process.env, 'DB_NAME', { value: undefined, writable: true, configurable: true });
        Object.defineProperty(process.env, 'DB_USER', { value: undefined, writable: true, configurable: true });
        Object.defineProperty(process.env, 'DB_PASSWORD', { value: undefined, writable: true, configurable: true });

        let poolConfig: Record<string, unknown> = {};

        jest.doMock('pg', () => ({
            Pool: jest.fn().mockImplementation((config: Record<string, unknown>) => {
                poolConfig = config;
                return {
                    on: jest.fn(),
                    connect: jest.fn(),
                };
            }),
        }));

        await import('../db');

        // El módulo usa || para defaults, así que undefined caerá a los valores default
        expect(poolConfig.host).toBe('localhost');
        expect(poolConfig.port).toBe(5432);
        expect(poolConfig.database).toBe('empresas_db');
        expect(poolConfig.user).toBe('postgres');
        expect(poolConfig.password).toBe('postgres');
    });
});
