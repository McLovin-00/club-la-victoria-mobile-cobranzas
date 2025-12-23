/** @type {import('jest').Config} */
module.exports = {
  // Display name for project
  displayName: 'Utils Package',

  // Test environment
  testEnvironment: 'node',

  // Root directory for this project
  rootDir: '.',

  // TypeScript preset
  preset: 'ts-jest',

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/tests/**/*.(test|spec).(ts|tsx|js|jsx)'
  ],

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@workspace/types$': '<rootDir>/../types/src'
  },

  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}'
  ],

  // Coverage thresholds (disabled for now)
  // coverageThreshold: {
  //   global: {
  //     branches: 85,
  //     functions: 85,
  //     lines: 85,
  //     statements: 85
  //   }
  // },

  // Coverage output
  coverageDirectory: '<rootDir>/coverage',

  // Test timeout
  testTimeout: 10000,

  // Clear mocks
  clearMocks: true,

  // Restore mocks
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Module paths
  modulePaths: ['<rootDir>/src'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],

  // Watch ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ]
}; 