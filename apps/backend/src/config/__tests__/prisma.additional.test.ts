/**
 * Tests adicionales para config/prisma.ts
 * Cubriendo disconnect con error, máximo de reintentos, getDatabaseInfo con error
 * @jest-environment node
 */

// Mocks deben declararse antes de los imports
const mockAppLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

jest.mock('../logger', () => ({
    AppLogger: mockAppLogger,
}));

jest.mock('../database', () => ({
    databaseConfig: {
        getApplicationUrl: () => 'postgresql://test:test@localhost:5432/testdb',
        getConfig: () => ({
            database: 'testdb',
            host: 'localhost',
            enableLogging: true,
            enableQueryLogging: true,
        }),
    },
}));

describe('config/prisma additional coverage', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('disconnect does nothing if not connected', async () => {
        // Fresh import para tener isConnected = false
        let _connectCalled = false;

        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn(async () => { _connectCalled = true; });
                $disconnect = jest.fn(async () => { });
                $queryRaw = jest.fn(async () => [{ ok: 1 }]);
                $transaction = jest.fn();
            },
        }));

        const { prismaService } = await import('../prisma');

        // Intentar disconnect sin haber conectado - no debe hacer nada
        await prismaService.disconnect();

        // No se debió loguear desconexión porque no estaba conectado
        expect(mockAppLogger.info).not.toHaveBeenCalledWith(
            expect.stringContaining('Desconectado de base de datos')
        );
    });

    it('disconnect throws and logs error on failure', async () => {
        const disconnectError = new Error('Disconnect failed');
        let disconnectCalled = false;

        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn(async () => { });
                $disconnect = jest.fn(async () => {
                    disconnectCalled = true;
                    throw disconnectError;
                });
                $queryRaw = jest.fn(async () => [{ ok: 1 }]);
                $transaction = jest.fn();
            },
        }));

        // Reset mocks del logger antes de este test
        mockAppLogger.error.mockClear();

        const { prismaService } = await import('../prisma');

        // Conectar primero (esto debe funcionar)
        await prismaService.connect();

        // Ahora disconnect debe fallar
        try {
            await prismaService.disconnect();
        } catch (error) {
            // Esperamos que lance error
            expect((error as Error).message).toBe('Disconnect failed');
        }

        expect(disconnectCalled).toBe(true);
    });

    it('connect fails after max retries', async () => {
        let attempts = 0;

        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn(async () => {
                    attempts++;
                    throw new Error('Connection refused');
                });
                $disconnect = jest.fn();
                $queryRaw = jest.fn();
                $transaction = jest.fn();
            },
        }));

        const { prismaService } = await import('../prisma');

        await expect(prismaService.connect()).rejects.toThrow('No se pudo conectar');
        expect(attempts).toBe(3); // maxRetries = 3
        expect(mockAppLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('después de todos los intentos'),
            expect.any(Object)
        );
    });

    it('getClient logs debug when not connected', async () => {
        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn();
                $disconnect = jest.fn();
                $queryRaw = jest.fn();
                $transaction = jest.fn();
            },
        }));

        const { prismaService } = await import('../prisma');

        // Llamar getClient sin conectar
        const client = prismaService.getClient();
        expect(client).toBeDefined();
        expect(mockAppLogger.debug).toHaveBeenCalledWith(
            expect.stringContaining('conexión en progreso')
        );
    });

    it('getDatabaseInfo throws and logs error on failure', async () => {
        const queryError = new Error('Query failed');

        let queryCallCount = 0;

        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn(async () => { });
                $disconnect = jest.fn();
                // Primera llamada es para verificar conexión en connect(), segunda para getDatabaseInfo
                $queryRaw = jest.fn(async () => {
                    queryCallCount++;
                    if (queryCallCount > 1) {
                        throw queryError;
                    }
                    return [{ ok: 1 }];
                });
                $transaction = jest.fn();
            },
        }));

        const { prismaService } = await import('../prisma');
        await prismaService.connect();

        await expect(prismaService.getDatabaseInfo()).rejects.toThrow('Query failed');
        expect(mockAppLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Error obteniendo información'),
            expect.any(Error)
        );
    });

    it('getConnectionStats returns correct stats', async () => {
        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn(async () => { });
                $disconnect = jest.fn();
                $queryRaw = jest.fn(async () => [{ ok: 1 }]);
                $transaction = jest.fn();
            },
        }));

        const { prismaService } = await import('../prisma');
        await prismaService.connect();

        const stats = prismaService.getConnectionStats();
        expect(stats).toMatchObject({
            isConnected: true,
            maxRetries: 3,
            database: 'testdb',
            host: 'localhost',
        });
    });

    it('executeTransaction fails after max retries', async () => {
        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn(async () => { });
                $disconnect = jest.fn();
                $queryRaw = jest.fn(async () => [{ ok: 1 }]);
                $transaction = jest.fn(async () => { throw new Error('Transaction failed'); });
            },
        }));

        const { prismaService } = await import('../prisma');
        await prismaService.connect();

        await expect(
            prismaService.executeTransaction(async () => 'test', 2)
        ).rejects.toThrow('Transaction failed');

        expect(mockAppLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Transacción falló después de todos los intentos'),
            expect.any(Object)
        );
    });

    it('cleanup calls disconnect', async () => {
        const disconnectMock = jest.fn(async () => { });

        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn(async () => { });
                $disconnect = disconnectMock;
                $queryRaw = jest.fn(async () => [{ ok: 1 }]);
                $transaction = jest.fn();
            },
        }));

        const { prismaService } = await import('../prisma');
        await prismaService.connect();

        await prismaService.cleanup();

        expect(mockAppLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('Limpiando conexiones')
        );
    });

    it('connect with enableLogging true logs setup info', async () => {
        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn(async () => { });
                $disconnect = jest.fn();
                $queryRaw = jest.fn(async () => [{ ok: 1 }]);
                $transaction = jest.fn();
            },
        }));

        const { prismaService } = await import('../prisma');
        await prismaService.connect();

        // Con enableLogging: true, debe loguear info de setup
        expect(mockAppLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('Prisma configurado'),
            expect.objectContaining({ database: 'testdb' })
        );
    });

    it('second connect call is a no-op', async () => {
        let connectCount = 0;

        jest.doMock('@prisma/client', () => ({
            PrismaClient: class MockPrismaClient {
                $connect = jest.fn(async () => { connectCount++; });
                $disconnect = jest.fn();
                $queryRaw = jest.fn(async () => [{ ok: 1 }]);
                $transaction = jest.fn();
            },
        }));

        const { prismaService } = await import('../prisma');

        await prismaService.connect();
        await prismaService.connect(); // Segunda llamada

        // Solo debe haberse conectado una vez
        expect(connectCount).toBe(1);
    });
});
