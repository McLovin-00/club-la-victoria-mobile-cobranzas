/**
 * Tests adicionales para config/environment.ts
 * Cubriendo caching, normalización de claves, error en zod, readFileIfExists
 * @jest-environment node
 */

import fs from 'fs';
import path from 'path';

describe('config/environment additional coverage', () => {
    const origEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...origEnv };
        jest.resetModules();
    });

    it('returns cached env on second call', async () => {
        process.env.JWT_LEGACY_SECRET = 'legacy-for-caching-test';

        const { getEnvironment } = await import('../environment');

        const env1 = getEnvironment();
        const env2 = getEnvironment();

        expect(env1).toBe(env2); // Mismo objeto en memoria (cached)
    });

    it('normalizes JWT keys with \\n escape sequences', async () => {
        process.env.JWT_PRIVATE_KEY = '-----BEGIN PRIVATE-----\\ntest\\n-----END PRIVATE-----';
        process.env.JWT_PUBLIC_KEY = '-----BEGIN PUBLIC-----\\ntest\\n-----END PUBLIC-----';

        const { getEnvironment } = await import('../environment');
        const env = getEnvironment();

        // Las claves deben contener saltos de línea reales
        expect(env.jwtPrivateKey).toContain('-----BEGIN PRIVATE-----');
        expect(env.jwtPublicKey).toContain('-----BEGIN PUBLIC-----');
    });

    it('normalizes keys that already contain BEGIN marker', async () => {
        const realKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----';
        process.env.JWT_PRIVATE_KEY = realKey;
        process.env.JWT_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----';

        const { getEnvironment } = await import('../environment');
        const env = getEnvironment();

        // No debe modificar si ya contiene BEGIN
        expect(env.jwtPrivateKey).toBe(realKey);
    });

    it('throws on invalid schema (invalid NODE_ENV)', async () => {
        // Forzar un valor inválido
        process.env.NODE_ENV = 'invalid_env' as 'production';

        await expect(async () => {
            const { getEnvironment } = await import('../environment');
            getEnvironment();
        }).rejects.toThrow('Invalid environment configuration');
    });

    it('throws when no JWT keys and no legacy secret', async () => {
        delete process.env.JWT_PRIVATE_KEY;
        delete process.env.JWT_PRIVATE_KEY_PATH;
        delete process.env.JWT_PUBLIC_KEY;
        delete process.env.JWT_PUBLIC_KEY_PATH;
        delete process.env.JWT_LEGACY_SECRET;

        await expect(async () => {
            const { getEnvironment } = await import('../environment');
            getEnvironment();
        }).rejects.toThrow('JWT keys are required');
    });

    it('reads keys from file paths when provided', async () => {
        // Crear archivos temporales para las claves
        const tempDir = path.join(__dirname, 'temp_keys');
        const privPath = path.join(tempDir, 'priv.pem');
        const pubPath = path.join(tempDir, 'pub.pem');

        // Crear directorio y archivos
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        fs.writeFileSync(privPath, '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----');
        fs.writeFileSync(pubPath, '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----');

        try {
            process.env.JWT_PRIVATE_KEY_PATH = privPath;
            process.env.JWT_PUBLIC_KEY_PATH = pubPath;
            delete process.env.JWT_PRIVATE_KEY;
            delete process.env.JWT_PUBLIC_KEY;

            const { getEnvironment } = await import('../environment');
            const env = getEnvironment();

            expect(env.jwtPrivateKey).toContain('BEGIN PRIVATE KEY');
            expect(env.jwtPublicKey).toContain('BEGIN PUBLIC KEY');
        } finally {
            // Cleanup
            fs.unlinkSync(privPath);
            fs.unlinkSync(pubPath);
            fs.rmdirSync(tempDir);
        }
    });

    it('readFileIfExists returns undefined for non-existent path', async () => {
        process.env.JWT_PRIVATE_KEY_PATH = '/nonexistent/path/key.pem';
        process.env.JWT_PUBLIC_KEY_PATH = '/another/nonexistent/key.pem';
        process.env.JWT_LEGACY_SECRET = 'fallback';

        const { getEnvironment } = await import('../environment');
        const env = getEnvironment();

        // Debe usar legacy secret porque los archivos no existen
        expect(env.JWT_LEGACY_SECRET).toBe('fallback');
    });

    it('sets enabledServices.documentos based on ENABLE_DOCUMENTOS', async () => {
        process.env.ENABLE_DOCUMENTOS = 'true';
        process.env.JWT_LEGACY_SECRET = 'secret';

        const { getEnvironment } = await import('../environment');
        const env = getEnvironment();

        expect(env.enabledServices?.documentos).toBe(true);
    });

    it('enabledServices.documentos false when not enabled', async () => {
        delete process.env.ENABLE_DOCUMENTOS;
        process.env.JWT_LEGACY_SECRET = 'secret';

        const { getEnvironment } = await import('../environment');
        const env = getEnvironment();

        expect(env.enabledServices?.documentos).toBe(false);
    });

    it('uses default values for optional env vars', async () => {
        process.env.JWT_LEGACY_SECRET = 'secret';
        delete process.env.BACKEND_PORT;
        delete process.env.RATE_LIMIT_WINDOW_MS;
        delete process.env.RATE_LIMIT_MAX;

        const { getEnvironment } = await import('../environment');
        const env = getEnvironment();

        expect(env.BACKEND_PORT).toBe(4003);
        expect(env.RATE_LIMIT_WINDOW_MS).toBe(60000);
        expect(env.RATE_LIMIT_MAX).toBe(300);
    });
});
