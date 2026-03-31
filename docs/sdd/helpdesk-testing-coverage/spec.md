# Spec: helpdesk-testing-coverage

## Overview

This specification defines comprehensive test coverage requirements for the helpdesk microservice to achieve 80% code coverage and pass SonarQube Quality Gate. The specification includes requirements organized by component type, detailed scenarios, and specific test cases in Given-When-Then format.

**Testing Strategy**: 60% Unit Tests, 30% Integration Tests, 10% E2E Tests

**Coverage Target**: ≥80% for all components

---

## Requirements

### Controllers

#### REQ-001: Ticket Controller Tests
- **Priority**: P0
- **Component**: Controller
- **File**: `apps/helpdesk/src/controllers/ticket.controller.ts`
- **Description**: Tests for all ticket operations (create, read, update, close, reopen, list, statistics)

**Scenarios:**

**SCN-001.1**: Happy path - Create ticket with JSON body
- **Requirement**: REQ-001
- **Type**: happy-path
- **Given**: User is authenticated with role USER
- **When**: POST /api/helpdesk/tickets with valid ticket data
- **Then**: Ticket created with status OPEN, user receives 201 response

**SCN-001.2**: Error case - Create ticket without authentication
- **Requirement**: REQ-001
- **Type**: error-case
- **Then**: Server returns 401 with error message

**SCN-001.3**: Happy path - Create ticket with multipart attachments
- **Requirement**: REQ-001
- **Type**: happy-path
- **Then**: Ticket created, attachments uploaded to MinIO, 201 response

**SCN-001.8**: Error case - Access other user's ticket
- **Requirement**: REQ-001
- **Type**: error-case
- **Then**: Server returns 403 with permission error

**SCN-001.11**: Happy path - Reopen ticket within 72h
- **Requirement**: REQ-001
- **Type**: happy-path
- **Then**: Ticket status changes to OPEN, 200 response

**Test Cases:**
- TC-001.1: Create ticket with JSON
- TC-001.2: Create ticket with multipart attachments
- TC-001.3: Prevent access to other user's ticket

---

#### REQ-002: Message Controller Tests
- **Priority**: P0
- **Component**: Controller
- **File**: `apps/helpdesk/src/controllers/message.controller.ts`
- **Description**: Tests for message operations (send, list)

**Scenarios:**
- SCN-002.1: Happy path - Send message to own ticket
- SCN-002.2: Error case - Send message to closed ticket
- SCN-002.3: Happy path - List ticket messages

**Test Cases:**
- TC-002.1: Send message to own ticket
- TC-002.2: List paginated messages

---

#### REQ-003: Attachment Controller Tests
- **Priority**: P0
- **Component**: Controller
- **File**: `apps/helpdesk/src/controllers/attachment.controller.ts`
- **Description**: Tests for file download operations

**Scenarios:**
- SCN-003.1: Happy path - Download attachment
- SCN-003.2: Error case - Download from other user's ticket
- SCN-003.3: Error case - Download non-existent attachment

**Test Cases:**
- TC-003.1: Download user's attachment

---

### Middlewares

#### REQ-004: Auth Middleware Tests
- **Priority**: P0
- **Component**: Middleware
- **File**: `apps/helpdesk/src/middlewares/auth.middleware.ts`
- **Description**: Tests for JWT validation and user extraction

**Scenarios:**
- SCN-004.1: Happy path - Valid JWT token
- SCN-004.2: Error case - Missing authorization header
- SCN-004.3: Error case - Invalid token format
- SCN-004.4: Error case - Invalid JWT signature
- SCN-004.5: Error case - Missing userId in token

**Test Cases:**
- TC-004.1: Valid JWT verification
- TC-004.2: Missing authorization header
- TC-004.3: Invalid token format
- TC-004.4: Invalid JWT signature
- TC-004.5: Missing userId in token

---

#### REQ-005: Admin Middleware Tests
- **Priority**: P0
- **Component**: Middleware
- **File**: `apps/helpdesk/src/middlewares/admin.middleware.ts`
- **Description**: Tests for role-based access control

**Scenarios:**
- SCN-005.1: Happy path - User has admin role
- SCN-005.2: Happy path - User has superadmin role
- SCN-005.3: Error case - User without admin role

**Test Cases:**
- TC-005.1: ADMIN role allowed
- TC-005.2: SUPERADMIN role allowed
- TC-005.3: USER role denied

---

#### REQ-006: Error Middleware Tests
- **Priority**: P0
- **Component**: Middleware
- **File**: `apps/helpdesk/src/middlewares/error.middleware.ts`
- **Description**: Tests for global error handling

**Scenarios:**
- SCN-006.1: Happy path - 404 Not Found
- SCN-006.2: Happy path - 500 Internal Server Error
- SCN-006.3: Happy path - Custom validation error

**Test Cases:**
- TC-006.1: Handle 404 Not Found
- TC-006.2: Handle 500 Internal Server Error
- TC-006.3: Handle validation error

---

### Routes

#### REQ-007: Ticket Routes Tests
- **Priority**: P0
- **Component**: Routes
- **File**: `apps/helpdesk/src/routes/ticket.routes.ts`
- **Description**: Tests for all ticket endpoints

**Scenarios:**
- SCN-007.1: Happy path - POST /tickets creates ticket
- SCN-007.2: Happy path - GET /tickets lists user tickets
- SCN-007.5: Happy path - PATCH /tickets/:id/close closes ticket

**Test Cases:**
- TC-007.1: Ticket creation endpoint
- TC-007.2: Ticket listing endpoint
- TC-007.3: Close ticket endpoint

---

#### REQ-008: Attachment Routes Tests
- **Priority**: P0
- **Component**: Routes
- **File**: `apps/helpdesk/src/routes/attachment.routes.ts`
- **Description**: Tests for attachment endpoints

**Scenarios:**
- SCN-008.1: Happy path - GET /attachments/:id/download returns file
- SCN-008.3: Error case - Download non-existent attachment

**Test Cases:**
- TC-008.1: Download attachment endpoint
- TC-008.2: Non-existent attachment

---

#### REQ-009: Admin Routes Tests
- **Priority**: P1
- **Component**: Routes
- **File**: `apps/helpdesk/src/routes/admin.routes.ts`
- **Description**: Tests for admin endpoints (stats, config)

**Scenarios:**
- SCN-009.1: Happy path - GET /admin/stats returns statistics
- SCN-009.2: Error case - GET /admin/stats without admin role
- SCN-009.4: Happy path - PUT /admin/config/:category updates config

**Test Cases:**
- TC-009.1: Get admin statistics
- TC-009.2: Non-admin blocked from stats
- TC-009.3: Update resolver configuration

---

### Services

#### REQ-010: Ticket Service Tests
- **Priority**: P0
- **Component**: Service
- **File**: `apps/helpdesk/src/services/ticket.service.ts`
- **Description**: Tests for all ticket business logic (create, read, update, close, reopen, list, statistics)

**Scenarios:**
- SCN-010.1: Happy path - Create ticket
- SCN-010.3: Happy path - Get ticket by ID
- SCN-010.5: Happy path - Close ticket
- SCN-010.7: Happy path - Reopen ticket within 72h
- SCN-010.11: Happy path - Get ticket statistics

**Test Cases:**
- TC-010.1: Create new ticket
- TC-010.2: Create ticket without subject validation
- TC-010.3: Close ticket successfully
- TC-010.4: Reopen ticket within 72h
- TC-010.5: Get ticket statistics

---

#### REQ-011: Message Service Tests
- **Priority**: P0
- **Component**: Service
- **File**: `apps/helpdesk/src/services/message.service.ts`
- **Description**: Tests for message operations (create, list, notification)

**Scenarios:**
- SCN-011.1: Happy path - Create message
- SCN-011.3: Happy path - Create message with attachment

**Test Cases:**
- TC-011.1: Create message in open ticket
- TC-011.2: Create message with attachment
- TC-011.3: Mark message as read
- TC-011.4: Mark all messages as read

---

#### REQ-012: Telegram Service Tests
- **Priority**: P1
- **Component**: Service
- **File**: `apps/helpdesk/src/services/telegram.service.ts`
- **Description**: Tests for Telegram bot integration (create topic, send messages, get config)

**Scenarios:**
- SCN-012.1: Happy path - Create Telegram topic for ticket
- SCN-012.7: Happy path - Format ticket info for Telegram
- SCN-012.5: Happy path - Get resolver config for category

**Test Cases:**
- TC-012.1: Create topic for ticket
- TC-012.2: Format ticket info
- TC-012.3: Get resolver configuration

---

#### REQ-013: WebSocket Service Tests
- **Priority**: P2
- **Component**: Service
- **File**: `apps/helpdesk/src/services/websocket.service.ts`
- **Description**: Tests for real-time notifications

**Scenarios:**
- SCN-013.1: Happy path - Send notification to
