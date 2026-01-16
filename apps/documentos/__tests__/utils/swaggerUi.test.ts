import { tryGetSwaggerUi } from '../../src/utils/swaggerUi';

describe('tryGetSwaggerUi', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('should return the module itself if default is not present', () => {
        // Mock require to return an object without 'default' property
        jest.doMock('swagger-ui-express', () => ({
            serve: 'serve-function',
            setup: 'setup-function',
        }), { virtual: true });

        const result = tryGetSwaggerUi();
        expect(result).toEqual({
            serve: 'serve-function',
            setup: 'setup-function',
        });
    });

    it('should return the default export if present', () => {
        // Mock require to return an object with 'default' property
        jest.doMock('swagger-ui-express', () => ({
            default: {
                serve: 'serve-default',
                setup: 'setup-default',
            },
            __esModule: true,
        }), { virtual: true });

        const result = tryGetSwaggerUi();
        expect(result).toEqual({
            serve: 'serve-default',
            setup: 'setup-default',
        });
    });

    it('should return null if swagger-ui-express throws on require', () => {
        jest.doMock('swagger-ui-express', () => {
            throw new Error('MODULE_NOT_FOUND');
        }, { virtual: true });

        const result = tryGetSwaggerUi();
        expect(result).toBeNull();
    });
});
