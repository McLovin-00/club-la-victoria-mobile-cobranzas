/**
 * Propósito: Configuración de Jest para tests unitarios de Page Objects.
 * Genera reportes de coverage en formato lcov para SonarQube.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Directorios de tests
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/unit/**/*.spec.ts',
  ],

  // Ignorar tests de Playwright (usan @playwright/test)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/setup/',
    '/tests/auth/',
    '/tests/cliente/',
    '/tests/chofer/',
    '/tests/transportista/',
    '/tests/dador/',
    '/tests/admin-interno/',
    '/tests/pages/',
    '/tests/fixtures/',
    '/tests/helpers/',
    '/tests/seed/',
  ],

  // Colectar coverage solo de la carpeta pages
  collectCoverage: true,
  collectCoverageFrom: [
    'pages/**/*.ts',
    '!pages/**/*.d.ts',
  ],

  // Reportes de coverage
  coverageReporters: ['lcov', 'text', 'text-summary', 'html'],
  coverageDirectory: '<rootDir>/coverage',

  // Thresholds de coverage (ajustados para branches que dependen de lógica de UI)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 90,
      statements: 90,
    },
  },

  // Transformaciones
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },

  // Module name mapper para imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Verbose output
  verbose: true,
};
