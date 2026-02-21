/**
 * Tests para server.ts - Aumentar coverage de signal handlers y error handlers
 * @jest-environment node
 */

import { EventEmitter } from 'events';

// Mock de AppLogger antes de importar
jest.mock('../config/logger', () => ({
    AppLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock de initializeApp
const mockListen = jest.fn();
const mockClose = jest.fn();
const mockApp = {
    listen: mockListen,
};

jest.mock('../app', () => ({
    initializeApp: jest.fn().mockResolvedValue(mockApp),
}));

// Mock de environment
jest.mock('../config/environment', () => ({
    getEnvironment: jest.fn().mockReturnValue({
        BACKEND_PORT: 4800,
        FRONTEND_URLS: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:3000',
        NODE_ENV: 'test',
    }),
}));

describe('server.ts - Signal Handlers and Error Handlers', () => {
    let _processEmitter: EventEmitter;
    let originalExit: any;
    let originalOn: any;
    let exitSpy: jest.SpyInstance;
    let signalHandlers: Map<string, Function>;

    beforeEach(() => {
        jest.clearAllMocks();
        signalHandlers = new Map();

        // Spy on process.exit
        originalExit = process.exit;
        exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
            throw new Error(`process.exit(${code})`);
        });

        // Capture signal handlers
        originalOn = process.on;
        jest.spyOn(process, 'on').mockImplementation((event: string | symbol, listener: (...args: unknown[]) => void) => {
            signalHandlers.set(String(event), listener);
            return process;
        });

        // Mock server.close to call callback
        mockClose.mockImplementation((callback: Function) => {
            if (callback) callback();
        });

        // Mock listen to return server with close method
        mockListen.mockImplementation((port: number, callback: Function) => {
            if (callback) callback();
            return { close: mockClose };
        });
    });

    afterEach(() => {
        process.exit = originalExit;
        process.on = originalOn;
        exitSpy.mockRestore();
        // Clear module cache to reset require.main
        jest.resetModules();
    });

    it('should register SIGINT handler and exit gracefully', async () => {
        // Import server to register handlers
        await import('../server');
        const { startServer } = await import('../server');

        // Start server
        await startServer();

        // Get SIGINT handler
        const sigintHandler = signalHandlers.get('SIGINT');
        expect(sigintHandler).toBeDefined();

        // Trigger SIGINT
        try {
            sigintHandler!();
            await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error: any) {
            expect(error.message).toContain('process.exit(0)');
        }

        expect(mockClose).toHaveBeenCalled();
    });

    it('should register SIGTERM handler and exit gracefully', async () => {
        const { startServer } = await import('../server');

        await startServer();

        const sigtermHandler = signalHandlers.get('SIGTERM');
        expect(sigtermHandler).toBeDefined();

        try {
            sigtermHandler!();
            await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error: any) {
            expect(error.message).toContain('process.exit(0)');
        }

        expect(mockClose).toHaveBeenCalled();
    });

    it('should handle uncaughtException and exit with code 1', async () => {
        const { AppLogger } = await import('../config/logger');
        const { startServer } = await import('../server');

        await startServer();

        const uncaughtHandler = signalHandlers.get('uncaughtException');
        expect(uncaughtHandler).toBeDefined();

        const testError = new Error('Test uncaught exception');

        try {
            uncaughtHandler!(testError);
        } catch (error: any) {
            expect(error.message).toContain('process.exit(1)');
        }

        expect(AppLogger.error).toHaveBeenCalledWith(
            'UNCAUGHT EXCEPTION! 💥 Shutting down...',
            expect.objectContaining({
                error: expect.stringContaining('Test uncaught exception'),
            })
        );
    });

    it('should handle unhandledRejection and exit with code 1', async () => {
        const { AppLogger } = await import('../config/logger');
        const { startServer } = await import('../server');

        await startServer();

        const unhandledHandler = signalHandlers.get('unhandledRejection');
        expect(unhandledHandler).toBeDefined();

        const testReason = 'Test unhandled rejection';

        try {
            unhandledHandler!(Promise.resolve(), testReason);
        } catch (error: any) {
            expect(error.message).toContain('process.exit(1)');
        }

        expect(AppLogger.error).toHaveBeenCalledWith(
            'UNHANDLED REJECTION! 💥 Shutting down...',
            expect.objectContaining({
                error: testReason,
            })
        );
    });

    it('should handle error during server initialization', async () => {
        const { AppLogger } = await import('../config/logger');
        const { initializeApp } = await import('../app');

        // Mock initializeApp to throw error
        (initializeApp as jest.Mock).mockRejectedValueOnce(new Error('Init failed'));

        const { startServer } = await import('../server');

        try {
            await startServer();
        } catch (error: any) {
            expect(error.message).toContain('process.exit(1)');
        }

        expect(AppLogger.error).toHaveBeenCalledWith(
            '❌ Fatal error starting server:',
            expect.objectContaining({
                error: expect.stringContaining('Init failed'),
            })
        );
    });

    it('should use PORT from environment if available', async () => {
        const originalPort = process.env.PORT;
        process.env.PORT = '5000';

        jest.resetModules();
        const { startServer } = await import('../server');

        await startServer();

        expect(mockListen).toHaveBeenCalledWith(5000, expect.any(Function));

        process.env.PORT = originalPort;
    });

    it('should log server startup information', async () => {
        const { AppLogger } = await import('../config/logger');
        const { startServer } = await import('../server');

        await startServer();

        expect(AppLogger.info).toHaveBeenCalledWith(expect.stringContaining('🚀 Server running on port'));
        expect(AppLogger.info).toHaveBeenCalledWith(expect.stringContaining('📱 Frontend URLs:'));
        expect(AppLogger.info).toHaveBeenCalledWith(expect.stringContaining('🏗️ Environment:'));
        expect(AppLogger.info).toHaveBeenCalledWith('✅ Server ready to receive requests');
    });
});
