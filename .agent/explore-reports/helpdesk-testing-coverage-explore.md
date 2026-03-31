# Helpdesk Testing Coverage - Exploration Report

## Executive Summary

The helpdesk microservice has significant testing gaps, with only 14 test files covering a small fraction of the codebase. Current coverage is estimated at **21%**, falling short of the **80%** requirement for SonarQube Quality Gate. The service is located at `apps/helpdesk/src` with **51 source files** (excluding tests and prisma) and **14 existing test files**.

## Current State

### Codebase Structure
```
apps/helpdesk/src/
├── __tests__/           # 14 test files
├── bot/                 # Telegram bot (handlers, middleware, utils)
├── controllers/         # 4 controller files
├── config/              # 5 config files (database, env, logger, minio, redis)
├── middlewares/         # 3 middleware files
├── prisma/              # Database migrations
├── routes/              # 6 route files
├── schedulers/          # 1 scheduler file
├── schemas/             # 3 schema files
├── services/            # 8 service files
├── types/               # TypeScript types
└── workers/             # 3 worker files
```

### Testing Infrastructure
- **Test Framework**: Jest 30.0.4 + ts-jest 29.4.5
- **Test Runner**: Supertest 7.1.4 (integration tests)
- **Coverage Tool**: Jest coverage reports (text, lcov, html)
- **Config Location**: `apps/helpdesk/jest.config.js`
- **Test Setup**: `apps/helpdesk/src/__tests__/jest.setup.ts`
- **Coverage Thresholds**: 70% (lines, branches, functions, statements)
- **Target**: 80% for SonarQube Quality Gate

### Existing Test Files (14 files)
```
src/__tests__/
├── bot/
│   ├── handlers/middleware-routing.test.ts
│   └── utils/telegram-html-escape.test.ts
├── controllers/
│   └── ticket-create.helpers.test.ts
├── routes/
│   ├── admin.routes.test.ts
│   ├── health.routes.test.ts
│   └── message.routes.test.ts
├── services/
│   ├── helpdesk-internal-notification.service.test.ts
│   ├── helpdesk-media-sync.service.test.ts
│   ├── message.service.test.ts
│   ├── platform-user-link.service.test.ts
│   ├── tenant-scope.test.ts
│   ├── ticket-read-state.service.test.ts
│   └── ticket.service.test.ts
└── utils/
    └── message-attachments.test.ts
```

## Coverage Analysis

### Components WITH Tests (7 categories, 14 files)

| Category | Files | Test Files |
|----------|-------|------------|
| Services | 7 | 7 |
| Routes | 3 | 3 |
| Controllers | 1 | 1 |
| Bot utils | 1 | 1 |
| Bot middleware | 1 | 1 |
| Utils | 1 | 1 |

### Components WITHOUT Tests (major gaps)

| Category | Files | Priority | Impact |
|----------|-------|----------|--------|
| Services | 4 | P0-P2 | **HIGH** - Business logic |
| Controllers | 3 | P0 | **HIGH** - API endpoints |
| Middlewares | 2 | P0 | **HIGH** - Security/auth |
| Routes | 2 | P0 | **HIGH** - API routes |
| Bot Handlers | 3 | P1 | **MEDIUM** - Telegram integration |
| Workers | 2 | P1 | **MEDIUM** - Background jobs |
| Schedulers | 1 | P1 | **MEDIUM** - Scheduled jobs |
| Utils | 3 | P2 | **LOW** - Helper functions |
| Config | 5 | P2 | **LOW** - Configuration |

### Detailed Component Breakdown

#### Services WITHOUT Tests
1. telegram.service.ts - P1 - Telegram API integration
2. websocket.service.ts - P2 - Real-time notifications
3. queue.service.ts - P1 - BullMQ queue management
4. sync-resolver-config.ts - P1 - Telegram resolver config

#### Controllers WITHOUT Tests
1. ticket.controller.ts - P0 - Main ticket controller (684 lines)
2. message.controller.ts - P0 - Message controller (147 lines)
3. admin-message.controller.ts - P0 - Admin message management

#### Middlewares WITHOUT Tests
1. admin.middleware.ts - P0 - Admin role verification
2. error.middleware.ts - P0 - Error handling

#### Routes WITHOUT Tests
1. ticket.routes.ts - P0 - Ticket endpoints
2. attachment.routes.ts - P0 - File upload endpoints

#### Bot Handlers WITHOUT Tests
1. dm.handler.ts - P1 - Direct messages
2. group.handler.ts - P1 - Group messages
3. commands.handler.ts - P1 - Commands

#### Workers WITHOUT Tests
1. auto-close.worker.ts - P1 - Auto-close jobs
2. media-sync.worker.ts - P1 - Media sync jobs

#### Other Components WITHOUT Tests
- auto-close.scheduler.ts - P1 - Scheduled job scheduling
- controller-helper.ts - P2 - Controller utilities
- ticket-formatter.ts - P2 - Ticket formatting
- viewer-context.ts - P2 - Viewer context builder
- config/*.ts - 5 files - Configuration

## SonarQube Configuration

### Server Details
- URL: http://10.3.0.244:9900
- Project Key: monorepo-bca
- Quality Gate: Currently FAILING (needs ≥80% coverage)
- Current Coverage: ~21%

### Configuration Files
- SonarQube Config: sonar-project.properties (root)
- Helpdesk Config: apps/helpdesk/jest.config.js

### Coverage Thresholds
- Current (Jest): 70% (lines, branches, functions, statements)
- Target (SonarQube): 80% (new code coverage)
- Gap: 10 percentage points

## Gaps and Blockers

### High-Priority Gaps
1. No tests for Controllers - P0: ticket.controller.ts (684 lines), message.controller.ts (147 lines)
2. No tests for Middlewares - P0: auth.middleware.ts (175 lines), admin.middleware.ts, error.middleware.ts
3. No tests for Ticket Routes - P0: ticket.routes.ts
4. No tests for Telegram Bot Handlers - P1: dm, group, commands handlers
5. No tests for Workers - P1: auto-close.worker.ts, media-sync.worker.ts

### Medium-Priority Gaps
6. No tests for Services - P0-P1: telegram.service.ts, websocket.service.ts, queue.service.ts
7. No tests for Schedulers - P1: auto-close.scheduler.ts
8. No tests for Message Routes - P0: message.routes.ts, attachment.routes.ts
9. No tests for Admin Middleware - P0: admin.middleware.ts

### Low-Priority Gaps
10. No tests for Utility Functions - P2: controller-helper.ts, ticket-formatter.ts, viewer-context.ts
11. No tests for Configuration - P2: database.ts, environment.ts, logger.ts, minio.ts, redis.ts
12. No tests for WebSocket Service - P2: websocket.service.ts

### Infrastructure Gaps
13. No Test Utilities/Factories - No dedicated test helpers or mock factories
14. No Database Integration Tests - All tests use mocks
15. No E2E Tests - No Playwright tests for complete workflows
16. Coverage Report Missing - No helpdesk coverage in coverage/lcov.info

## Recommendations

### Phase 1: P0 Components (Immediate)
1. Controllers - Add integration tests
2. Middlewares - Add unit tests
3. Routes - Add integration tests

### Phase 2: P1 Components (High Priority)
4. Services - Add unit tests
5. Bot Handlers - Add unit tests
6. Workers - Add unit tests
7. Schedulers - Add unit tests

### Phase 3: P2 Components (Medium Priority)
8. Utils - Add unit tests
9. Config - Add unit tests

### Phase 4: Infrastructure Improvements
10. Create Test Utilities
11. Add Database Integration Tests
12. Add E2E Tests
13. Fix Coverage Report

## Estimated Effort

### Total Estimated Tests
- Unit: 174-280 tests
- Integration: 75-100 tests
- E2E: 60-120 tests
- **Grand Total**: 309-500 tests

### Estimated Timeline
- **P0 Components**: 1-2 weeks (40-50 tests)
- **P1 Components**: 1-2 weeks (80-120 tests)
- **P2 Components**: 1 week (50-80 tests)
- **Infrastructure**: 1 week (30-50 tests)
- **Total**: 3-4 weeks

## Success Criteria

### Code Coverage
- Lines coverage: ≥80%
- Branch coverage: ≥80%
- Function coverage: ≥80%
- Statement coverage: ≥80%

### SonarQube Quality Gate
- New Code Coverage: ≥80%
- Reliability Rating: A (0 bugs)
- Security Rating: A (0 vulnerabilities)
- Maintainability Rating: A (0 code smells)

## Conclusion

The helpdesk microservice needs **309-500 new tests** to reach 80% coverage and pass SonarQube Quality Gate. The highest priority is adding tests for controllers, middlewares, and routes (P0 components), which are critical for API security and functionality.

**Key Action Items**:
1. Start with P0: Controllers, Middlewares, Routes (1-2 weeks)
2. Add test utilities and factories (parallel)
3. Add P1 components: Services, Workers, Bot Handlers (1-2 weeks)
4. Add P2 components: Utils, Config (1 week)
5. Add E2E tests (1 week)
6. Verify Sonar
