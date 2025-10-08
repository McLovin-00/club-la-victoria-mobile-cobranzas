/** @type {import('jest').Config} */
module.exports = {
  // Define projects for each workspace
  projects: [
    '<rootDir>/apps/backend',
    '<rootDir>/apps/frontend',
    '<rootDir>/packages/utils',
    '<rootDir>/packages/types',
    '<rootDir>/packages/config',
    '<rootDir>/apps/documentos'
  ],

  // Global settings
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx,js,jsx}',
    '!src/**/*.test.{ts,tsx,js,jsx}',
    '!src/**/*.spec.{ts,tsx,js,jsx}',
    '!src/**/index.{ts,tsx,js,jsx}'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Output directory
  coverageDirectory: '<rootDir>/coverage',

  // Reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover'
  ],

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit
  forceExit: true,

  // Max concurrent workers
  maxWorkers: '50%',

  // Notify mode
  notify: false,

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.turbo/'
  ],

  // Watch path ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.turbo/'
  ]
}; 