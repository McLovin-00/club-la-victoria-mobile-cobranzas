/**
 * Configuración de Jest para Frontend
 * 
 * IMPORTANTE: Los mocks deben definirse POR TEST, no globalmente.
 * Ver ./src/test-utils/mocks/ para helpers de mocking reutilizables.
 */

/** @type {import('jest').Config} */
module.exports = {
  // Display name para identificar en monorepo
  displayName: 'Frontend',

  // Entorno de test (JSDOM para React)
  testEnvironment: 'jsdom',

  // Directorio raíz
  rootDir: '.',

  // Transformación de TypeScript con SWC


  // Extensiones a tratar como ESM (para import.meta)
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Extensiones de módulos
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transformaciones
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
        module: {
          type: 'es6',
        },
      },
    ],
  },


  // Patrones de archivos de test
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/tests/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],

  // Mapeo de módulos (aliases)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@workspace/types$': '<rootDir>/../../packages/types/src',
    '^@workspace/utils$': '<rootDir>/../../packages/utils/src',
    '^@workspace/config$': '<rootDir>/../../packages/config/src',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
  },

  // Setup después de cada env (solo polyfills de browser)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

  // ==========================================================================
  // CONFIGURACIÓN DE COBERTURA
  // ==========================================================================

  // Recolectar cobertura de estos archivos
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    // Exclusiones: tipos, tests, stories, entry points
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/vite-env.d.ts',
    // Test utilities ahora incluidos en cobertura
    // '!src/test-utils/**',
    // Exclusión temporal: hook muy complejo con muchas dependencias externas
    // Solo excluir mientras se mejoran los tests de coverage
    // '!src/hooks/useAutoWhatsAppNotifications.ts',
  ],

  // Reportes de cobertura (lcov para SonarQube, text para consola)
  coverageReporters: ['lcov', 'text', 'text-summary', 'html'],

  // Directorio de salida de cobertura
  coverageDirectory: '<rootDir>/coverage',

  // Umbrales de cobertura (incrementar gradualmente)
  // TODO: Subir a 80% cuando se refactoricen los tests
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // ==========================================================================
  // CONFIGURACIÓN DE EJECUCIÓN
  // ==========================================================================

  // Timeout por test (30s para tests de componentes pesados)
  testTimeout: 30000,

  // Limpiar mocks entre tests
  clearMocks: true,

  // Restaurar mocks a su implementación original
  restoreMocks: true,

  // Output detallado
  verbose: true,

  // Rutas de módulos
  modulePaths: ['<rootDir>/src'],

  // Ignorar estos paths al buscar tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],

  // Ignorar estos paths en watch mode
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],

  // Opciones del entorno JSDOM
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // Detectar tests que no cierran handles (útil para debug)
  detectOpenHandles: false,

  // Forzar salida después de que terminen los tests
  forceExit: true,

  // Máximo de workers (ajustar según CPU)
  maxWorkers: '50%',
};
