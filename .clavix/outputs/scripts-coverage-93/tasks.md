# Implementation Plan

**Project**: scripts-coverage-93
**Generated**: 2026-01-20T14:30:00Z
**Target**: Achieve ≥93% test coverage for all scripts in `apps/backend/scripts/` and `apps/backend/src/scripts/`

---

## Technical Context & Standards

*Detected Stack & Patterns*
- **Architecture**: Monorepo (Turborepo), Backend app (Node.js/Express)
- **Framework**: TypeScript (ES2020, CommonJS), Jest 30.0.4 + ts-jest
- **Database**: Prisma 6.12.0 + PostgreSQL
- **Test Runner**: Jest with ts-jest preset
- **Test Environment**: `@jest-environment node`
- **Test Location**: `src/**/__tests__/**/*.test.ts`
- **Mock Strategy**: `jest.mock()` at top of files, factory functions for PrismaClient
- **Naming**: `.test.ts` suffix for test files
- **Coverage**: lcov + text reporters, target ≥93%
- **Conventions**:
  - Mock external dependencies (PrismaClient, child_process, bcrypt)
  - Use `process.exit` mocking for CLI scripts
  - Tests organized by file: `__tests__/filename.test.ts`

---

## Current Coverage Status

| File | Current Coverage | Uncovered Lines | Target |
|------|------------------|-----------------|--------|
| src/scripts/baseline-after-split.ts | 21.42% | ~11 | ≥93% |
| src/scripts/check-db-status.ts | 16.21% | ~28 | ≥93% |
| src/scripts/debug-migration.ts | 13.79% | ~25 | ≥93% |
| src/scripts/fix-password.ts | 26.66% | ~11 | ≥93% |
| src/scripts/migrate-user-split.ts | 21.42% | ~11 | ≥93% |
| src/scripts/setup-database.ts | 29.72% | ~26 | ≥93% |
| scripts/dev-database-check.ts | 0% | ~25 | ≥93% |
| scripts/migrate-user-separation.ts | 0% | ~280 | ≥93% |
| scripts/reset-database.ts | 0% | ~320 | ≥93% |
| scripts/setup-database.ts | 0% | ~260 | ≥93% |
| **TOTAL** | **~21%** | **~997** | **≥93%** |

---

## Phase 1: Create Test Suite for apps/backend/scripts/ (Zero Coverage Files)

These scripts have NO tests yet. Priority: HIGH.

- [x] **Create __tests__ directory for scripts folder** (ref: infrastructure)
  Task ID: phase-1-infra-01
  > **Implementation**: Create directory `apps/backend/scripts/__tests__/`.
  > **Details**: This folder will contain all test files for the scripts in the root scripts/ folder.

- [x] **Create dev-database-check.test.ts** (ref: scripts/dev-database-check.ts)
  Task ID: phase-1-dev-check-01
  > **Implementation**: Create `apps/backend/scripts/__tests__/dev-database-check.test.ts`.
  > **Details**:
  > - Add `@jest-environment node` at top
  > - Mock `DatabaseInitializationService` from `../src/services/database-initialization.service`
  > - Mock `AppLogger` from `../src/config/logger`
  > - Mock `process.exit` with `jest.fn()`
  > - Test `checkDatabaseForDevelopment()` with `result.success = true`
  > - Test `checkDatabaseForDevelopment()` with `result.success = false`
  > - Test `checkDatabaseForDevelopment()` with thrown error
  > - Verify `process.exit(0)` on success, `process.exit(1)` on failure
  > - Restore `process.exit` in `afterEach`

- [x] **Create migrate-user-separation.test.ts - Part 1** (ref: scripts/migrate-user-separation.ts)
  Task ID: phase-1-migrate-split-01
  > **Implementation**: Create `apps/backend/scripts/__tests__/migrate-user-separation.test.ts`.
  > **Details**:
  > - Add `@jest-environment node`
  > - Mock `PrismaClient` with factory function
  > - Mock `exec` from `child_process` with `promisify` wrapper
  > - Test `constructor()` with `--rollback` flag (sets `isRollback = true`)
  > - Test `constructor()` without flag (sets `isRollback = false`)
  > - Test `run()` calls `performMigration()` when not rollback
  > - Test `run()` calls `performRollback()` when rollback flag set
  > - Test `run()` with error triggers automatic rollback
  > - Test `run()` calls `prisma.$disconnect()` in finally block
  > - Test `printStats()` with no errors

- [x] **Create migrate-user-separation.test.ts - Part 2** (ref: scripts/migrate-user-separation.ts)
  Task ID: phase-1-migrate-split-02
  > **Implementation**: Extend `apps/backend/scripts/__tests__/migrate-user-separation.test.ts`.
  > **Details**:
  > - Test `performMigration()` executes all steps in order
  > - Test `performRollback()` executes SQL rollback command
  > - Test `validateDatabaseStructure()` throws when users table doesn't exist
  > - Test `validateDatabaseStructure()` passes when table exists
  > - Test `analyzeExistingData()` counts platform users
  > - Test `analyzeExistingData()` counts end users
  > - Test `runPrismaMigration()` calls `execAsync('cd apps/backend && npx prisma migrate deploy')`
  > - Test `regeneratePrismaClient()` calls `execAsync('cd apps/backend && npx prisma generate')`

- [x] **Create migrate-user-separation.test.ts - Part 3** (ref: scripts/migrate-user-separation.ts)
  Task ID: phase-1-migrate-split-03
  > **Implementation**: Extend `apps/backend/scripts/__tests__/migrate-user-separation.test.ts`.
  > **Details**:
  > - Test `migrateUserData()` validates platform user count matches
  > - Test `migrateUserData()` adds error when counts don't match
  > - Test `updateForeignKeys()` counts permisos references
  > - Test `validateDataIntegrity()` detects orphaned permissions
  > - Test `validateDataIntegrity()` detects duplicate identifiers
  > - Test `performCleanup()` logs preservation message
  > - Test `printStats()` with errors array populated
  > - Test `printStats()` includes next steps in output

- [x] **Create reset-database.test.ts - Part 1** (ref: scripts/reset-database.ts)
  Task ID: phase-1-reset-01
  > **Implementation**: Create `apps/backend/scripts/__tests__/reset-database.test.ts`.
  > **Details**:
  > - Add `@jest-environment node`
  > - Mock `Client` from `pg`
  > - Mock `spawn` from `child_process`
  > - Mock `databaseConfig` from `../src/config/database`
  > - Mock `setupDatabase` from `./setup-database`
  > - Test `resetDatabase()` with successful flow
  > - Test `performSafetyChecks()` throws in production without `--force`
  > - Test `performSafetyChecks()` passes in production with `--force`
  > - Test `performSafetyChecks()` warns when database doesn't exist
  > - Test `performSafetyChecks()` throws with active connections without `--force`

- [x] **Create reset-database.test.ts - Part 2** (ref: scripts/reset-database.ts)
  Task ID: phase-1-reset-02
  > **Implementation**: Extend `apps/backend/scripts/__tests__/reset-database.test.ts`.
  > **Details**:
  > - Test `performSafetyChecks()` throws without `--confirm` when data exists
  > - Test `checkDatabaseExists()` returns `true` when database exists
  > - Test `checkDatabaseExists()` returns `false` when not exists
  > - Test `checkDatabaseExists()` handles errors gracefully (returns false)
  > - Test `getActiveConnections()` returns count of active connections
  > - Test `getActiveConnections()` handles errors (returns 0)
  > - Test `createBackup()` executes pg_dump command
  > - Test `createBackup()` handles error and adds to warnings

- [x] **Create reset-database.test.ts - Part 3** (ref: scripts/reset-database.ts)
  Task ID: phase-1-reset-03
  > **Implementation**: Extend `apps/backend/scripts/__tests__/reset-database.test.ts`.
  > **Details**:
  > - Test `disconnectActiveUsers()` terminates active connections
  > - Test `disconnectActiveUsers()` handles errors
  > - Test `dropDatabase()` executes DROP DATABASE command
  > - Test `dropDatabase()` handles "does not exist" error as warning
  > - Test `recreateDatabase()` calls `setupDatabase()`
  > - Test `createAdminClient()` creates Client with correct config
  > - Test `createAdminClient()` connects successfully

- [x] **Create reset-database.test.ts - Part 4** (ref: scripts/reset-database.ts)
  Task ID: phase-1-reset-04
  > **Implementation**: Extend `apps/backend/scripts/__tests__/reset-database.test.ts`.
  > **Details**:
  > - Test `runCommand()` resolves on code 0
  > - Test `runCommand()` rejects on non-zero code
  > - Test `runCommand()` handles spawn error event
  > - Test `runCommand()` handles timeout (5 minutes)
  > - Mock `setTimeout` to test timeout behavior without waiting
  > - Test `resetDatabase()` function export with full options
  > - Test CLI argument parsing (`--force`, `--confirm`, `--preserve-data`, `--skip-backup`, `--verbose`)

- [x] **Create setup-database.test.ts - Part 1** (ref: scripts/setup-database.ts)
  Task ID: phase-1-setup-01
  > **Implementation**: Create `apps/backend/scripts/__tests__/setup-database.test.ts`.
  > **Details**:
  > - Add `@jest-environment node`
  > - Mock `DatabaseInitializationService` from `../src/services/database-initialization.service`
  > - Mock `AppLogger` from `../src/config/logger`
  > - Mock `databaseConfig` from `../src/config/database`
  > - Mock `spawn` from `child_process`
  > - Test `setupDatabase()` completes all steps successfully
  > - Test `setupDatabase()` with `skipSeeds: true` option
  > - Test `setupDatabase()` with `force: true` option
  > - Test `setupDatabase()` with `verbose: true` option
  > - Test `setupDatabase()` handles failure and returns error result

- [x] **Create setup-database.test.ts - Part 2** (ref: scripts/setup-database.ts)
  Task ID: phase-1-setup-02
  > **Implementation**: Extend `apps/backend/scripts/__tests__/setup-database.test.ts`.
  > **Details**:
  > - Test `executeStep()` marks step as completed on success
  > - Test `executeStep()` sets duration on completion
  > - Test `executeStep()` throws on critical step failure
  > - Test `executeStep()` warns on non-critical step failure
  > - Test `markStepSkipped()` marks step completed with duration 0
  > - Test `markStepSkipped()` adds warning for skipped step
  > - Test `validateConfiguration()` throws when package.json missing
  > - Test `validateConfiguration()` throws when prisma/schema.prisma missing

- [x] **Create setup-database.test.ts - Part 3** (ref: scripts/setup-database.ts)
  Task ID: phase-1-setup-03
  > **Implementation**: Extend `apps/backend/scripts/__tests__/setup-database.test.ts`.
  > **Details**:
  > - Test `initializeDatabase()` with `result.created = true`
  > - Test `initializeDatabase()` with `result.created = false`
  > - Test `generatePrismaClient()` calls spawn with npx prisma generate
  > - Test `runMigrations()` in development (uses migrate dev)
  > - Test `runMigrations()` in production (uses migrate deploy)
  > - Test `runSeeds()` calls spawn with npm run seed
  > - Test `validateFinalSetup()` throws on dbInfo error
  > - Test `validateFinalSetup()` succeeds with valid dbInfo

- [x] **Create setup-database.test.ts - Part 4** (ref: scripts/setup-database.ts)
  Task ID: phase-1-setup-04
  > **Implementation**: Extend `apps/backend/scripts/__tests__/setup-database.test.ts`.
  > **Details**:
  > - Test `runCommand()` resolves on successful spawn (code 0)
  > - Test `runCommand()` rejects on non-zero exit code
  > - Test `runCommand()` rejects on spawn error event
  > - Test `runCommand()` handles timeout (5 minutes)
  > - Use `jest.useFakeTimers()` for timeout testing
  > - Test `buildSuccessResult()` returns complete success object
  > - Test `handleSetupFailure()` adds error to errors array
  > - Test `attemptRollback()` in development environment
  > - Test `attemptRollback()` skips rollback in production
  > - Test exported `setupDatabase()` function with all options

---

## Phase 2: Extend Tests for apps/backend/src/scripts/ (Existing Tests)

These files have tests but insufficient coverage. Extend existing test files.

- [x] **Extend check-db-status.ts coverage** (ref: src/scripts/check-db-status.ts)
  Task ID: phase-2-check-status-01
  > **Implementation**: Edit `apps/backend/src/scripts/__tests__/scripts.additional.coverage.test.ts`.
  > **Details**:
  > - Add test for `forEach` callback in empresa display (map function coverage)
  > - Add test for `map` callback in user display
  > - Add test for `map` callback in service display
  > - Add test for `require.main === module` branch (currently not covered)
  > - Ensure all console.log branches are covered

- [x] **Extend debug-migration.ts coverage** (ref: src/scripts/debug-migration.ts)
  Task ID: phase-2-debug-migration-01
  > **Implementation**: Edit `apps/backend/src/scripts/__tests__/scripts.additional.coverage.test.ts`.
  > **Details**:
  > - Add test for `forEach` callback in platformUsers (currently uncovered)
  > - Add test for error in catch block with process.exit(1)
  > - Add test for `require.main === module` branch
  > - Test path where empresa doesn't exist (create empresa)
  > - Test path where test user doesn't exist (create user)

- [x] **Extend baseline-after-split.ts coverage** (ref: src/scripts/baseline-after-split.ts)
  Task ID: phase-2-baseline-01
  > **Implementation**: Edit `apps/backend/src/scripts/__tests__/scripts.additional.coverage.test.ts`.
  > **Details**:
  > - Add test for error in `$executeRawUnsafe` (catch block)
  > - Add test for `require.main === module` branch
  > - Add test for error handler in catch block calling console.error

- [x] **Extend migrate-user-split.ts coverage** (ref: src/scripts/migrate-user-split.ts)
  Task ID: phase-2-migrate-split-src-01
  > **Implementation**: Edit `apps/backend/src/scripts/__tests__/scripts.additional.coverage.test.ts`.
  > **Details**:
  > - Add test for error in catch block
  > - Add test for `require.main === module` branch
  > - Add test validating totalUsers count is logged
  > - Add test for both platformInsert and endInsert results

- [x] **Extend fix-password.ts coverage** (ref: src/scripts/fix-password.ts)
  Task ID: phase-2-fix-password-01
  > **Implementation**: Edit `apps/backend/src/scripts/__tests__/scripts.additional.coverage.test.ts`.
  > **Details**:
  > - Add test for error when user not found (update throws)
  > - Add test for `require.main === module` branch
  > - Add test for console.log output verification
  > - Add test for finally block calling $disconnect

- [x] **Extend setup-database.ts (src) coverage** (ref: src/scripts/setup-database.ts)
  Task ID: phase-2-setup-src-01
  > **Implementation**: Edit `apps/backend/src/scripts/__tests__/scripts.additional.coverage.test.ts`.
  > **Details**:
  > - Add test for `runCommand` with unauthorized command (ALLOWED_COMMANDS check)
  > - Add test for error in execSync catch block
  > - Add test for `require.main === module` branch
  > - Add test for main() catch block with process.exit(1)
  > - Ensure both branches of empresa.findFirst are covered (exists vs null)

---

## Phase 3: Verification and Validation

- [ ] **Run all tests and generate coverage report** (ref: verification)
  Task ID: phase-3-verify-01
  > **Implementation**: Run `npm run test:coverage` in `apps/backend` directory.
  > **Details**:
  > - Execute: `cd apps/backend && npm run test:coverage`
  > - Check exit code is 0 (all tests pass)
  > - Review coverage/lcov-report/index.html for overall percentage
  > - Verify each script file has ≥93% coverage

- [ ] **Verify individual script coverage** (ref: verification)
  Task ID: phase-3-verify-02
  > **Implementation**: Check coverage/lcov-report/src/scripts/index.html.
  > **Details**:
  > - Open `apps/backend/coverage/lcov-report/src/scripts/index.html`
  > - Verify each file shows ≥93% in statements, branches, functions, lines
  > - Document any files still below 93%

- [ ] **Create coverage summary document** (ref: documentation)
  Task ID: phase-3-verify-03
  > **Implementation**: Create `apps/backend/SCRIPTS_COVERAGE_REPORT.md`.
  > **Details**:
  > - List all scripts with before/after coverage percentages
  > - Document total lines covered vs uncovered
  > - Note any edge cases intentionally excluded
  > - Include command to regenerate coverage: `npm run test:coverage`

---

## Test Coverage Goals by File

| File | Statements Target | Branches Target | Functions Target | Lines Target |
|------|-------------------|-----------------|------------------|--------------|
| baseline-after-split.ts | ≥93% | ≥93% | ≥93% | ≥93% |
| check-db-status.ts | ≥93% | ≥93% | ≥93% | ≥93% |
| debug-migration.ts | ≥93% | ≥93% | ≥93% | ≥93% |
| fix-password.ts | ≥93% | ≥93% | ≥93% | ≥93% |
| migrate-user-split.ts | ≥93% | ≥93% | ≥93% | ≥93% |
| setup-database.ts (src) | ≥93% | ≥93% | ≥93% | ≥93% |
| dev-database-check.ts | ≥93% | ≥93% | ≥93% | ≥93% |
| migrate-user-separation.ts | ≥93% | ≥93% | ≥93% | ≥93% |
| reset-database.ts | ≥93% | ≥93% | ≥93% | ≥93% |
| setup-database.ts (scripts) | ≥93% | ≥93% | ≥93% | ≥93% |

---

## Mock Factory Pattern Reference

Use this pattern for PrismaClient mocks across all test files:

```typescript
function makePrisma(overrides: Partial<any> = {}) {
  return {
    $disconnect: jest.fn(async () => undefined),
    $executeRawUnsafe: jest.fn(async () => 1),
    $queryRaw: jest.fn(async () => []),
    user: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
      create: jest.fn(async () => ({})),
      ...overrides.user,
    },
    empresa: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({})),
      ...overrides.empresa,
    },
    ...overrides,
  };
}

let prismaInstance: any;
jest.mock('@prisma/client', () => ({
  PrismaClient: function PrismaClient() {
    return prismaInstance;
  },
}));
```

---

*Generated by Clavix /clavix:plan*
