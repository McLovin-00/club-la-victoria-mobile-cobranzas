/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
    '!src/prisma/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Path mappings for accurate source file resolution
    '^@helpdesk/prisma-client$': '<rootDir>/node_modules/@helpdesk/prisma-client',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.ts'],
  clearMocks: true,
  verbose: true,
  // Ensure lcov.info uses forward slashes (Windows compatibility)
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Exclude bot handlers from coverage - they are glue code tested via E2E
  // Business logic is in services/ which has good coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/src/bot/handlers/',
    '/src/bot/index\\.ts$',
  ]
};
