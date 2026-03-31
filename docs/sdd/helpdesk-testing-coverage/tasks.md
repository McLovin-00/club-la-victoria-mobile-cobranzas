# Tasks: helpdesk-testing-coverage

> **Change**: helpdesk-testing-coverage  
> **Goal**: 80% test coverage, SonarQube Quality Gate PASSED  
> **Timeline**: 3-4 weeks  
> **Total Tests**: 309-500 new tests

---

## Phase 1: Infrastructure & Test Utilities (Week 1, Days 1-2)

### 1.1 Jest Configuration Update
- [x] **1.1.1** Update `apps/helpdesk/jest.config.js` - Change coverage thresholds from 70% to 80% for branches, functions, lines, statements
- [x] **1.1.2** Add coverage path mappings in Jest config for accurate source file resolution
- [x] **1.1.3** Verify lcov.info output format uses forward slashes (Windows compatibility)

### 1.2 Test Infrastructure Setup
- [x] **1.2.1** Create `apps/helpdesk/src/__tests__/test-database.ts` - Test database utilities (getTestDatabase, clearTestDatabase, seedTestDatabase)
- [x] **1.2.2** Update `apps/helpdesk/src/__tests__/jest.setup.ts` - Add global test database connection and cleanup hooks
- [x] **1.2.3** Create `apps/helpdesk/src/__tests__/helpers/test-app.ts` - Express app factory for integration tests with middleware setup

### 1.3 Mock Factories
- [x] **1.3.1** Create `apps/helpdesk/src/__tests__/__mocks__/telegram-bot.mock.ts` - Grammy bot mock with sendPhoto, sendDocument, sendMessage, getChat, getChatMember
- [x] **1.3.2** Create `apps/helpdesk/src/__tests__/__mocks__/minio.mock.ts` - MinIO client mock with putObject, getObject, statObject, removeObject, bucketExists
- [x] **1.3.3** Create `apps/helpdesk/src/__tests__/__mocks__/redis.mock.ts` - Redis mock with get, set, del, lpush, rpop, hset, hget, expire
- [x] **1.3.4** Create `apps/helpdesk/src/__tests__/__mocks__/queue.mock.ts` - BullMQ queue mock with add, process, getCompleted, getFailed, clean
- [x] **1.3.5** Create `apps/helpdesk/src/__tests__/helpers/time.mock.ts` - Time/date mocking utilities (mockTime, resetTime, createPastDate, create72HoursAgo)

### 1.4 Test Data Factories
- [x] **1.4.1** Create `apps/helpdesk/src/__tests__/factories/ticket.factory.ts` - Ticket factory with build(), buildList(), withMessages(), closed(), resolved()
- [x] **1.4.2** Create `apps/helpdesk/src/__tests__/factories/message.factory.ts` - Message factory with build(), buildList(), withAttachments(), fromUser(), fromResolver()
- [x] **1.4.3** Create `apps/helpdesk/src/__tests__/factories/user.factory.ts` - User factory with build(), admin(), superAdmin(), withTelegramLink()
- [x] **1.4.4** Create `apps/helpdesk/src/__tests__/factories/attachment.factory.ts` - Attachment factory with build(), image(), audio(), video(), document()

### 1.5 Assertion Helpers
- [x] **1.5.1** Create `apps/helpdesk/src/__tests__/helpers/assertions.ts` - Custom matchers for ticket status, message content, pagination structure
- [x] **1.5.2** Create `apps/helpdesk/src/__tests__/helpers/jwt.mock.ts` - JWT token generation helper for authenticated requests

---

## Phase 2: Unit Tests - Controllers (Week 1, Days 3-5)

### 2.1 Ticket Controller Tests (P0)
- [x] **2.1.1** Create `apps/helpdesk/src/__tests__/unit/controllers/ticket.controller.test.ts` - Test file setup
- [x] **2.1.2** Test: Create ticket with JSON body → returns 201 with ticket data
- [x] **2.1.3** Test: Create ticket with multipart attachments → uploads to MinIO, returns 201
- [x] **2.1.4** Test: Create ticket without auth → returns 401
- [x] **2.1.5** Test: Get ticket by ID (owner) → returns 200 with ticket
- [x] **2.1.6** Test: Get ticket by ID (non-owner) → returns 403
- [x] **2.1.7** Test: List user tickets → returns paginated list
- [x] **2.1.8** Test: Close ticket (owner) → returns 200, status RESOLVED
- [x] **2.1.9** Test: Reopen ticket within 72h → returns 200, status OPEN
- [x] **2.1.10** Test: Reopen ticket after 72h → returns 400, cannot reopen
- [x] **2.1.11** Test: Get ticket statistics → returns stats object

### 2.2 Message Controller Tests (P0)
- [x] **2.2.1** Create `apps/helpdesk/src/__tests__/unit/controllers/message.controller.test.ts` - Test file setup
- [x] **2.2.2** Test: Send message to open ticket → returns 201 with message
- [x] **2.2.3** Test: Send message to closed ticket → returns 400
- [x] **2.2.4** Test: Send message with attachment → uploads to MinIO, returns 201
- [x] **2.2.5** Test: List ticket messages → returns paginated list
- [x] **2.2.6** Test: Mark message as read → returns 200

### 2.3 Attachment Controller Tests (P0)
- [x] **2.3.1** Create `apps/helpdesk/src/__tests__/unit/controllers/attachment.controller.test.ts` - Test file setup
- [x] **2.3.2** Test: Download own attachment → returns file stream
- [x] **2.3.3** Test: Download other user's attachment → returns 403
- [x] **2.3.4** Test: Download non-existent attachment → returns 404
- [x] **2.3.5** Test: Download with invalid attachment ID → returns 400

---

## Phase 3: Unit Tests - Middlewares (Week 1, Days 5-6)

### 3.1 Auth Middleware Tests (P0)
- [x] **3.1.1** Create `apps/helpdesk/src/__tests__/unit/middlewares/auth.middleware.test.ts` - Test file setup
- [x] **3.1.2** Test: Valid JWT token → calls next(), sets req.user
- [x] **3.1.3** Test: Missing authorization header → returns 401
- [x] **3.1.4** Test: Invalid token format (not Bearer) → returns 401
- [x] **3.1.5** Test: Invalid JWT signature → returns 401
- [x] **3.1.6** Test: Expired JWT token → returns 401
- [x] **3.1.7** Test: Missing userId in token payload → returns 401

### 3.2 Admin Middleware Tests (P0)
- [x] **3.2.1** Create `apps/helpdesk/src/__tests__/unit/middlewares/admin.middleware.test.ts` - Test file setup
- [x] **3.2.2** Test: User with ADMIN role → calls next()
- [x] **3.2.3** Test: User with SUPERADMIN role → calls next()
- [x] **3.2.4** Test: User with USER role → returns 403
- [x] **3.2.5** Test: Missing req.user → returns 401

### 3.3 Error Middleware Tests (P0)
- [x] **3.3.1** Create `apps/helpdesk/src/__tests__/unit/middlewares/error.middleware.test.ts` - Test file setup
- [x] **3.3.2** Test: Handle 404 Not Found → returns JSON error with message
- [x] **3.3.3** Test: Handle 500 Internal Server Error → returns JSON error,- [x] **3.3.4** Test: Handle 403 Forbidden → returns JSON error
- [x] **3.3.5** Test: Handle createError helper → creates proper error objects

---

## Phase 4: Unit Tests - Services (Week 1-2, Days 6-10)

### 4.1 Ticket Service Tests (P0) - Extend Existing
- [ ] **4.1.1** Extend `apps/helpdesk/src/__tests__/services/ticket.service.test.ts` - Add missing test cases
- [ ] **4.1.2** Test: Create ticket with category → assigns resolver config
- [ ] **4.1.3** Test: Create ticket with sequential number per company
- [ ] **4.1.4** Test: Close ticket → sets closedAt timestamp
- [ ] **4.1.5** Test: Reopen ticket after 72h → throws error
- [ ] **4.1.6** Test: Get ticket statistics by date range
- [ ] **4.1.7** Test: Get ticket statistics by category
- [ ] **4.1.8** Test: Search tickets with pagination and filters

### 4.2 Message Service Tests (P0) - Extend Existing
- [ ] **4.2.1** Extend `apps/helpdesk/src/__tests__/services/message.service.test.ts` - Add missing test cases
- [ ] **4.2.2** Test: Create message with multiple attachments
- [ ] **4.2.3** Test: Create message triggers notification to resolver
- [ ] **4.2.4** Test: Create message triggers notification to user
- [ ] **4.2.5** Test: Mark all messages as read for user
- [ ] **4.2.6** Test: Get unread message count

### 4.3 Telegram Service Tests (P1)
- [ ] **4.3.1** Create `apps/helpdesk/src/__tests__/unit/services/telegram.service.test.ts` - Test file setup
- [ ] **4.3.2** Test: Create topic for ticket → returns topic ID
- [ ] **4.3.3** Test: Send message to topic → returns message ID
- [ ] **4.3.4** Test: Format ticket info for Telegram → returns formatted HTML
- [ ] **4.3.5** Test: Get resolver config for category → returns config or null
- [ ] **4.3.6** Test: Handle Telegram API error → logs and throws

### 4.4 WebSocket Service Tests (P2)
- [ ] **4.4.1** Create `apps/helpdesk/src/__tests__/unit/services/websocket.service.test.ts` - Test file setup
- [ ] **4.4.2** Test: Send notification to user → emits to socket
- [ ] **4.4.3** Test: Send notification to resolver → emits to socket
- [ ] **4.4.4** Test: Handle disconnection gracefully

### 4.5 Queue Service Tests (P1)
- [ ] **4.5.1** Create `apps/helpdesk/src/__tests__/unit/services/queue.service.test.ts`
- [ ] **4.5.2** Test: Add job to queue → returns job ID
- [ ] **4.5.3** Test: Get job status → returns job state
- [ ] **4.5.4** Test: Handle queue connection error → logs and throws

---

## Phase 5: Unit Tests - Bot Handlers (Week 2, Days 1-3) ✅

### 5.1 DM Handler Tests (P1)
- [x] **5.1.1** Create `apps/helpdesk/src/__tests__/unit/bot/handlers/dm.handler.test.ts`
- [x] **5.1.2** Test: Handle text message from linked user → creates/updates ticket
- [x] **5.1.3** Test: Handle text message from unlinked user → prompts linking
- [x] **5.1.4** Test: Handle photo message → uploads to MinIO, creates ticket
- [x] **5.1.5** Test: Handle document message → uploads to MinIO, creates ticket

### 5.2 Group Handler Tests (P1)
- [x] **5.2.1** Create `apps/helpdesk/src/__tests__/unit/bot/handlers/group.handler.test.ts`
- [x] **5.2.2** Test: Handle message in resolver group → forwards to ticket
- [x] **5.2.3** Test: Handle reply to ticket message → creates response

### 5.3 Command Handler Tests (P1)
- [x] **5.3.1** Create `apps/helpdesk/src/__tests__/unit/bot/handlers/command.handler.test.ts`
- [x] **5.3.2** Test: /start command → sends welcome message
- [x] **5.3.3** Test: /nuevo command → creates new ticket (starts wizard)
- [x] **5.3.4** Test: /mis_tickets command → returns user tickets
- [x] **5.3.5** Test: /cerrar command → closes ticket (resolver only)

---

## Phase 6: Unit Tests - Workers (Week 2, Days 3-4) ✅

### 6.1 Auto-Close Worker Tests (P1)
- [x] **6.1.1** Create `apps/helpdesk/src/__tests__/unit/workers/auto-close.worker.test.ts`
- [x] **6.1.2** Test: Close tickets with 72h inactivity → status changes to CLOSED
- [x] **6.1.3** Test: Do not close tickets with recent activity
- [x] **6.1.4** Test: Do not close already closed tickets

### 6.2 Media-Sync Worker Tests (P1)
- [x] **6.2.1** Create `apps/helpdesk/src/__tests__/unit/workers/media-sync.worker.test.ts`
- [x] **6.2.2** Test: Sync Telegram photo → downloads and uploads to MinIO
- [x] **6.2.3** Test: Handle sync failure → logs error, retries

---

## Phase 7: Integration Tests - Routes (Week 2, Days 4-6) ✅

### 7.1 Ticket Routes Tests (P0)
- [x] **7.1.1** Create `apps/helpdesk/src/__tests__/integration/routes/ticket.routes.test.ts`
- [x] **7.1.2** Test: POST /api/helpdesk/tickets → creates ticket in DB
- [x] **7.1.3** Test: GET /api/helpdesk/tickets → returns paginated list
- [x] **7.1.4** Test: PATCH /api/helpdesk/tickets/:id/close → updates status
- [x] **7.1.5** Test: PATCH /api/helpdesk/tickets/:id/reopen → updates status

### 7.2 Attachment Routes Tests (P0)
- [x] **7.2.1** Create `apps/helpdesk/src/__tests__/integration/routes/attachment.routes.test.ts`
- [x] **7.2.2** Test: GET /api/helpdesk/attachments/:id/download → streams file
- [x] **7.2.3** Test: Download non-owner attachment → returns 403

### 7.3 Admin Routes Tests (P1)
- [x] **7.3.1** Create `apps/helpdesk/src/__tests__/integration/routes/admin.routes.test.ts`
- [x] **7.3.2** Test: GET /api/helpdesk/admin/stats → returns statistics
- [x] **7.3.3** Test: PUT /api/helpdesk/admin/config/:category → updates config

---

## Phase 8: E2E Tests (Week 3) ✅

### 8.1 Playwright Setup
- [x] **8.1.1** Create `apps/e2e/tests/helpdesk/helpdesk-e2e.config.ts`
- [x] **8.1.2** Create `apps/e2e/tests/helpdesk/fixtures/helpdesk-fixtures.ts`

### 8.2 E2E: Ticket Creation Flow
- [x] **8.2.1** Create `apps/e2e/tests/helpdesk/ticket-creation.spec.ts`
- [x] **8.2.2** Test: User creates ticket with text → ticket appears in list
- [x] **8.2.3** Test: User creates ticket with image → attachment downloadable

### 8.3 E2E: Message Flow
- [x] **8.3.1** Create `apps/e2e/tests/helpdesk/message-flow.spec.ts`
- [x] **8.3.2** Test: User sends message → resolver receives notification
- [x] **8.3.3** Test: Resolver responds → user receives notification

### 8.4 E2E: Close and Reopen Flow
- [x] **8.4.1** Create `apps/e2e/tests/helpdesk/close-reopen.spec.ts`
- [x] **8.4.2** Test: Resolver closes ticket → status RESOLVED
- [x] **8.4.3** Test: User reopens within 72h → status OPEN
- [x] **8.4.4** Test: User tries reopen after 72h → error

---

## Phase 9: Verification & SonarQube (Week 3-4)

### 9.1 Coverage Verification
- [ ] **9.1.1** Run `npm run test:coverage` → verify ≥80% coverage
- [ ] **9.1.2** Check coverage report for gaps → add tests if needed
- [ ] **9.1.3** Verify no flaky tests → run tests 3x, all pass

### 9.2 SonarQube Integration
- [ ] **9.2.1** Update `sonar-project.properties` - include helpdesk paths
- [ ] **9.2.2** Run `sonar-scanner` → verify Quality Gate PASSED
- [ ] **9.2.3** Address any bugs/vulnerabilities from scan

### 9.3 CI/CD Validation
- [ ] **9.3.1** Run full CI pipeline locally → all checks pass
- [ ] **9.3.2** Create PR → CI passes
- [ ] **9.3.3** Merge to main → deploy to DEV succeeds

---

## Phase 10: Documentation (Week 4)

- [ ] **10.1** Update `docs/testing/JEST_BEST_PRACTICES.md` - add helpdesk patterns
- [ ] **10.2** Create `apps/helpdesk/TESTING.md` - document test structure
- [ ] **10.3** Update PRD checklist → mark all criteria complete

---

## Summary

| Phase | Tasks | Focus | Duration |
|-------|-------|-------|----------|
| Phase 1 | 17 | Infrastructure | Days 1-2 |
| Phase 2 | 11 | Controllers | Days 3-5 |
| Phase 3 | 13 | Middlewares | Days 5-6 |
| Phase 4 | 19 | Services | Days 6-10 |
| Phase 5 | 10 | Bot Handlers | Week 2 |
| Phase 6 | 6 | Workers | Week 2 |
| Phase 7 | 8 | Routes Integration | Week 2 |
| Phase 8 | 10 | E2E Tests | Week 3 |
| Phase 9 | 8 | Verification | Week 3-4 |
| Phase 10 | 3 | Documentation | Week 4 |
| **Total** | **105** | | **3-4 weeks** |

---

**Ready for implementation**: `/sdd-apply helpdesk-testing-coverage`
