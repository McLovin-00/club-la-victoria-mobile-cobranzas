# Proposal: helpdesk-testing-coverage

> **Fecha**: 2026-03-25
> **Status**: Propuesto
> **Complejidad**: Alta
> **Tiempo estimado**: 3-4 semanas
> **Cambios a confirmar**: 309-500 tests nuevos

---

## Intent

### Why Are We Doing This?

**Core Problem**: The helpdesk microservice has only ~21% test coverage, which violates SonarQube Quality Gate requirements and exposes the system to silent regressions on every code change. Currently, 30 out of 51 source files lack tests entirely, leaving critical business logic completely unprotected.

**Business Impact**:
- ❌ CI/CD pipeline fails Quality Gate → manual deployments required
- ❌ Every refactoring carries risk of introducing bugs
- ❌ Users can experience broken functionality without detection
- ❌ Debugging issues takes hours instead of minutes because tests don't catch failures
- ❌ New developers can't understand expected behavior through tests

**Value We Deliver**:
- ✅ Pass SonarQube Quality Gate → automated deployments unblocked
- ✅ Catch regressions before they reach users
- ✅ Create living documentation of expected behavior
- ✅ Enable confident refactoring and feature additions
- ✅ Reduce debugging time from hours to minutes

**Alignment with Business Goals**:
- Reduces deployment risk (CI/CD automation enabled)
- Improves system stability (regression detection)
- Enhances developer productivity (faster debugging)
- Supports scalability (protected code paths resist breaking changes)

---

## Scope

### What Exactly Will Change?

**Component Coverage Gap**:
- **Current**: 14 source files have tests (21% coverage)
- **Target**: All 51 source files have tests (≥80% coverage)
- **Additional**: 30 files need tests added

**Scope Inclusion** (P0 Priority - Required for Quality Gate):

#### Controllers (0% → ≥80%)
- `ticket.controller.ts` - Ticket creation, retrieval, update operations
- `message.controller.ts` - Message sending, listing
- `admin-message.controller.ts` - Admin message management
- `attachment.controller.ts` - File upload/download operations

#### Middlewares (0% → ≥80%)
- `auth.middleware.ts` - JWT verification and token extraction
- `admin.middleware.ts` - Role-based access control
- `error.middleware.ts` - Global error handling and formatting

#### Routes (0% → ≥80%)
- `ticket.routes.ts` - All ticket endpoints (CRUD + search)
- `attachment.routes.ts` - File upload/download endpoints
- `admin.routes.ts` - Admin configuration endpoints

#### Services (13% → ≥80%)
- `ticket.service.ts` - Ticket business logic (create, list, update, close)
- `message.service.ts` - Message persistence and notification logic
- `telegram.service.ts` - Telegram bot integration
- `websocket.service.ts` - Real-time WebSocket notifications
- `queue.service.ts` - Background job processing (BullMQ)

#### Bot Handlers (~0% → ≥80%)
- `dm.handler.ts` - Direct messages from users
- `group.handler.ts` - Group chat message handling
- `command.handler.ts` - Bot commands (/ticket, /status, /close)

#### Workers (0% → ≥80%)
- `auto-close.worker.ts` - Automated ticket closure after 72h inactivity
- `media-sync.worker.ts` - Media synchronization tasks

#### Other Components (Partial → ≥80%)
- `ticket-formatter.service.ts` - Ticket data formatting utilities
- `controller-helper.service.ts` - Shared controller utilities
- `config/*.ts` - Configuration files (excluded if <50 LOC)

**Scope Exclusion** (Explicitly Out of Scope):
- ❌ Performance/stress tests
- ❌ Security penetration tests (only functional validation)
- ❌ Database migration tests (covered by integration tests)
- ❌ Configuration files if <50 lines (determined per file)
- ❌ UI/frontend components (separate microservice)

**Testing Types Included**:
- **60% Unit Tests** - Pure logic testing with mocks
- **30% Integration Tests** - Database + HTTP layer interaction
- **10% E2E Tests** - Critical user flows with Playwright

---

## Approach

### Implementation Strategy

**Phase 1: Unit Tests** (1-2 weeks)
- **Goal**: Cover all business logic in services, controllers, and utilities
- **Strategy**: Write tests in parallel for independent components
- **Testing Pattern**: Given-When-Then format with Jest
- **Mock Strategy**: Jest mocks for external services (Telegram, MinIO, Redis)

**Phase 2: Integration Tests** (1 week)
- **Goal**: Test component interactions and data persistence
- **Strategy**: Use in-memory PostgreSQL and Redis for speed
- **Testing Pattern**: Test database operations with Prisma client
- **Coverage Target**: Routes and middleware endpoints

**Phase 3: E2E Tests** (1 week)
- **Goal**: Verify critical user flows end-to-end
- **Strategy**: Playwright with headless browser
- **Flows**: Ticket creation → Message → Attachment → Close
- **Coverage**: Top 6 critical flows (deterministic execution)

**Parallelization**:
- Multiple developers can work on different component suites
- No dependency blockers between phases (except final E2E verification)
- Shared test utilities and factories to avoid duplication

### Testing Framework & Tools

**Unit/Integration**:
- **Framework**: Jest 30.0.4 (already configured)
- **Transformer**: ts-jest for TypeScript
- **HTTP Testing**: Supertest (already configured)
- **Mocking**: Jest.fn() and jest.mock() for services
- **Data Factories**: Test utilities for creating test data (tickets, messages, users)

**E2E**:
- **Framework**: Playwright (already configured in `apps/e2e`)
- **Execution**: Headless Chrome/Firefox
- **Execution Time**: ≤ 5 minutes for full suite

### Quality Standards

**Determinism**:
- All tests must be stateless and isolated
- No reliance on external services (use mocks or test databases)
- No file system dependencies (use in-memory storage)
- Test isolation enforced with `beforeEach`/`afterEach`

**Speed**:
- Unit tests: < 60s execution time
- Integration tests: < 90s execution time
- E2E tests: ≤ 5 minutes execution time
- Parallel execution across files enabled

**Maintainability**:
- Each test describes one behavior
- Clear, descriptive test names
- Test files match source file structure (same directory)
- No test files > 300 lines (split if necessary)

---

## Success Criteria

### What Does "Done" Look Like?

**Quantitative Metrics**:

1. **Code Coverage**:
   - ✅ **Overall coverage**: ≥ 80% (current: 21%)
   - ✅ **Line coverage**: ≥ 80%
   - ✅ **Branch coverage**: ≥ 80%
   - ✅ **Function coverage**: ≥ 80%

2. **SonarQube Quality Gate**:
   - ✅ **Status**: PASSED (currently FAILED)
   - ✅ **Blockers**: 0
   - ✅ **Criticals**: 0
   - ✅ **Majors**: 0 (or <5 acceptable)
   - ✅ **Warnings**: 0

3. **Test Coverage by Component**:
   - ✅ **Controllers**: ≥ 80% (all endpoints tested)
   - ✅ **Services**: ≥ 80% (all business logic paths)
   - ✅ **Middlewares**: ≥ 80% (all error conditions tested)
   - ✅ **Routes**: ≥ 80% (all endpoints with valid/invalid input)
   - ✅ **Workers**: ≥ 80% (all scheduled jobs)
   - ✅ **Bot Handlers**: ≥ 80% (all message types)

4. **Test Suite Metrics**:
   - ✅ **Total tests**: 309-500 new tests
   - ✅ **Unit tests**: 174-280 tests (60% of total)
   - ✅ **Integration tests**: 75-100 tests (30% of total)
   - ✅ **E2E tests**: 60-120 tests (10% of total)
   - ✅ **Test execution time**: < 5 minutes (full suite)

**Qualitative Metrics**:

1. **Maintainability**:
   - ✅ No test files exceed 300 lines
   - ✅ Test descriptions clearly state expected behavior
   - ✅ Test data factories created for common scenarios
   - ✅ Mocks are well-documented with `// @ts-expect-error` comments for type safety

2. **Flakiness**:
   - ✅ 0 flaky tests (re-run 3x → 100% pass rate)
   - ✅ All tests are deterministic
   - ✅ No external service dependencies

3. **Documentation**:
   - ✅ Each test describes one clear behavior
   - ✅ Tests serve as documentation for expected behavior
   - ✅ New developers can understand system through tests

**Acceptance Test** (System-level verification):

> Given the helpdesk microservice
> When the full test suite is executed
> Then:
> 1. All 309-500 tests pass
> 2. Coverage report shows ≥ 80% overal

### Risk & Mitigation Strategies

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Excessive mocking hiding bugs | Medium | High | Real DB tests, meaningful assertions |
| Slow tests discouraging execution | Medium | Medium | <60s unit tests, parallel execution |
| E2E flakiness from external deps | High | Medium | Mock Telegram API, test isolation |
| Effort underestimated | Medium | Medium | P0 priority first, reusable factories |
| Coverage inflated with trivial tests | Medium | High | Meaningful assertions, manual review |
| Test pattern migration friction | Low | Low | Follow existing patterns, peer review |

---

## Timeline & Effort

**Total**: 3-4 weeks

| Phase | Duration | Tests | Owners |
|-------|----------|-------|--------|
| Phase 1: Unit Tests | 1-2 weeks | 174-280 | 2 devs |
| Phase 2: Integration Tests | 1 week | 75-100 | 1 dev |
| Phase 3: E2E Tests | 1 week | 60-120 | 1 dev |
| Review & Optimize | 0.5 week | - | All |

**Phase 1 Breakdown**:
- Day 1-2: Setup test utilities and factories
- Day 3-5: Services (ticket, message, telegram, websocket)
- Day 6-10: Controllers, middlewares, routes
- Day 11-12: Review and cleanup

**Phase 2 Breakdown**:
- Day 1-2: Routes with database
- Day 3-4: Workers and bot handlers

**Phase 3 Breakdown**:
- Day 1: Playwright setup
- Day 2-4: Critical flows (ticket creation, user messages, Telegram DM, close/reopen)
- Day 5: Optimization and cleanup

---

## Dependencies

**External**:
- SonarQube Server: http://10.3.0.244:9900
- Jest 30.0.4 + ts-jest + Supertest + Playwright
- In-memory PostgreSQL and Redis

**Internal**:
- Existing tests in `__tests__/` directory
- Codebase stability (no breaking changes during implementation)
- Team skills (Jest testing patterns)

---

## Next Steps

### Immediate Actions
1. Review and approve proposal
2. Assign owners for each phase
3. Add to sprint backlog
4. Setup test infrastructure locally

### Follow-up Phases
1. Execute Phase 1 (Unit Tests) - 1-2 weeks
2. Execute Phase 2 (Integration Tests) - 1 week
3. Execute Phase 3 (E2E Tests) - 1 week
4. Validate with SonarQube and celebrate success

---

## References

- **PRD**: `docs/prd/2026-03-25-helpdesk-testing-coverage.md`
- **Exploration**: `sdd/helpdesk-testing-coverage/explore`
- **Existing Tests**: `__tests__/` directory
- **Test Documentation**: `docs/testing/JEST_BEST_PRACTICES.md`

**Approved by**: TBD
**Review by**: TBD
**Start Date**: TBD
