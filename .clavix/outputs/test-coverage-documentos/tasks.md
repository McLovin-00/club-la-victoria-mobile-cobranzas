# Implementation Plan: Test Coverage for documentos Service >93%

**Project**: test-coverage-documentos
**Generated**: 2025-01-20T10:00:00Z
**Objective**: Increase test coverage for `apps/documentos/src/services/` and `apps/documentos/src/controllers/` to >93%

---

## Technical Context & Standards

**Detected Stack & Patterns:**
- **Framework**: Express.js + TypeScript
- **Testing**: Jest + ts-jest + supertest
- **Database Mocks**: Custom `prismaMock` from `__tests__/mocks/prisma.mock.ts`
- **Test Structure**: `__tests__/` folder with separate unit and integration tests
- **Mocking Pattern**: `jest.mock()` for modules, `jest.fn()` for individual functions
- **Services Pattern**: Static classes with async methods
- **Controllers Pattern**: Static methods with Express Request/Response handlers
- **Existing Tests**: Located in `__tests__/services/*.unit.test.ts` and `__tests__/controllers/*.test.ts`

**Key Files to Reference:**
- Mock setup: `apps/documentos/__tests__/setup.ts`
- Prisma mock: `apps/documentos/__tests__/mocks/prisma.mock.ts`
- Example test: `apps/documentos/__tests__/services/compliance.service.unit.test.ts`

---

## Phase 1: Services Without Tests - Core Alert & Archive Services

### Phase 1.1: Alert Service Tests

- [x] **Create alert.service.unit.test.ts - Basic scenarios** (ref: alert.service.ts)
  Task ID: phase-1-alert-01
  > **Implementation**: Create `apps/documentos/__tests__/services/alert.service.unit.test.ts`.
  > **Details**:
  > - Mock `src/config/database` and `src/config/logger`
  > - Use `prismaMock` for database operations
  > - Test `processDocumentRejected()` with valid document (verify alert data structure)
  > - Test `processDocumentRejected()` with null document (verify early return)
  > - Test `processExpiredDocuments()` with expired documents (verify status update to VENCIDO)
  > - Test `processExpiredDocuments()` with no expired documents
  > - Test `processRedStatusEntities()` basic flow
  > - Test `runScheduledChecks()` executes both checks in parallel

- [x] **Create alert.service.unit.test.ts - Edge cases & error handling** (ref: alert.service.ts)
  Task ID: phase-1-alert-02
  > **Implementation**: Extend `apps/documentos/__tests__/services/alert.service.unit.test.ts`.
  > **Details**:
  > - Test `getAlertConfig()` returns default (enabled: false)
  > - Test `sendAlert()` with disabled alerts (verify early return)
  > - Test `sendAlert()` with database errors
  > - Test `logAlert()` execution path
  > - Cover branch: `validationData.errors` is array vs not array (line 75)
  > - Cover branch: expired documents with existing VENCIDO status (line 94)

### Phase 1.2: Document Archive Service Tests

- [x] **Create document-archive.service.unit.test.ts** (ref: document-archive.service.ts)
  Task ID: phase-1-archive-01
  > **Implementation**: Create `apps/documentos/__tests__/services/document-archive.service.unit.test.ts`.
  > **Details**:
  > - Mock dynamic database import (`import('../config/database')`)
  > - Test `archiveDocuments()` with empty array (early return)
  > - Test `archiveDocuments()` with valid documentIds (verify updateMany called with correct params)
  > - Test `archiveDocuments()` with each ArchiveReason type
  > - Test `archiveDocuments()` error handling (throw on error)
  > - Test `restoreDocuments()` with no archived docs (return empty)
  > - Test `restoreDocuments()` with archived docs (restore only most recent per template)
  > - Test `getArchivedDocuments()` successful query
  > - Test `getArchivedDocuments()` with no client (catch return [])
  > - Test `findDocumentsExclusiveToClient()` full flow
  > - Test `findDocumentsExclusiveToClient()` with no requirements (return [])
  > - Cover all entity type switches: CHOFER, CAMION, ACOPLADO, EMPRESA_TRANSPORTISTA (lines 187-199)

### Phase 1.3: Document Stakeholders Service Tests

- [x] **Create document-stakeholders.service.unit.test.ts** (ref: document-stakeholders.service.ts)
  Task ID: phase-1-stakeholders-01
  > **Implementation**: Create `apps/documentos/__tests__/services/document-stakeholders.service.unit.test.ts`.
  > **Details**:
  > - Mock `src/config/database` and `src/config/logger`
  > - Test `getDocumentStakeholders()` with null document (return [])
  > - Test `getDocumentStakeholders()` full flow (all stakeholders types)
  > - Test `getAdminUsers()` with $queryRaw returning SUPERADMIN, ADMIN, ADMIN_INTERNO
  > - Test `getAdminUsers()` error handling (return [])
  > - Test `getDadorStakeholders()` with DADOR_DE_CARGA role users
  > - Test `getDadorStakeholders()` error handling
  > - Test `getTransportistaStakeholders()` for entityType EMPRESA_TRANSPORTISTA
  > - Test `getTransportistaStakeholders()` for entityType CHOFER (with chofer query)
  > - Test `getTransportistaStakeholders()` for entityType CAMION (with camion query)
  > - Test `getTransportistaStakeholders()` for entityType ACOPLADO (with acoplado query)
  > - Test `getTransportistaStakeholders()` when empresaTransportistaId is null
  > - Test `getChoferStakeholders()` with CHOFER role users
  > - Test `getChoferStakeholders()` error handling
  > - Cover branch: `document.entityType === 'CHOFER'` (line 65)

---

## Phase 2: Services Without Tests - Integration & External Services

### Phase 2.1: Evolution Client Service Tests

- [x] **Create evolution-client.service.unit.test.ts** (ref: evolution-client.service.ts)
  Task ID: phase-2-evolution-01
  > **Implementation**: Create `apps/documentos/__tests__/services/evolution-client.service.unit.test.ts`.
  > **Details**:
  > - Mock `src/services/system-config.service` (getConfig method)
  > - Mock `src/config/logger`
  > - Mock global `fetch`
  > - Test `normalizeServerUrl()` with various inputs:
  >   - URL with double http/https protocol
  >   - URL with http// typo
  >   - URL without protocol
  >   - URL with trailing slash
  > - Test `sendText()` with incomplete config (server/token/instance missing)
  > - Test `sendText()` with first API path success
  > - Test `sendText()` trying all candidate paths
  > - Test `sendText()` with network errors
  > - Test `sendText()` with non-ok response status

### Phase 2.2: Media Service Tests

- [x] **Create media.service.unit.test.ts** (ref: media.service.ts)
  Task ID: phase-2-media-01
  > **Implementation**: Create `apps/documentos/__tests__/services/media.service.unit.test.ts`.
  > **Details**:
  > - First read `src/services/media.service.ts` to identify all methods
  > - Mock all external dependencies (sharp, minio, etc.)
  > - Create tests for image processing methods
  > - Create tests for video thumbnail generation
  > - Create tests for media type detection
  > - Cover error scenarios for unsupported formats

### Phase 2.3: PDF Rasterize Service Tests

- [x] **Extend pdf-rasterize.service.unit.test.ts - Missing scenarios** (ref: pdf-rasterize.service.ts)
  Task ID: phase-2-pdf-01
  > **Implementation**: Read existing `__tests__/services/pdf-rasterize.service.unit.test.ts` and add missing tests.
  > **Details**:
  > - Identify uncovered lines from current coverage report
  > - Add tests for error conditions in PDF conversion
  > - Add tests for edge cases (corrupted PDF, empty pages)
  > - Mock pdf-lib methods not yet covered

### Phase 2.4: Thumbnail Service Tests

- [x] **Extend thumbnail.service.unit.test.ts - Missing scenarios** (ref: thumbnail.service.ts)
  Task ID: phase-2-thumbnail-01
  > **Implementation**: Read existing `__tests__/services/thumbnail.service.unit.test.ts` and add missing tests.
  > **Details**:
  > - Identify uncovered lines from current coverage report
  > - Add tests for different media types (video, pdf, images)
  > - Add tests for thumbnail generation failures
  > - Cover sharp resize options not yet tested

---

## Phase 3: Services Without Tests - Business Logic

### Phase 3.1: Equipo Estado Service Tests

- [x] **Create equipo-estado.service.unit.test.ts** (ref: equipo-estado.service.ts)
  Task ID: phase-3-equipo-estado-01
  > **Implementation**: Create `apps/documentos/__tests__/services/equipo-estado.service.unit.test.ts`.
  > **Details**:
  > - Mock `src/config/database` (prisma) and `src/services/compliance.service`
  > - Test `calculateEquipoEstado()` with null equipo (return gris + empty breakdown)
  > - Test `calculateEquipoEstado()` with clienteId (uses calculateClienteCompliance)
  > - Test `calculateEquipoEstado()` without clienteId
  > - Test `determineSemaforo()` for all states:
  >   - rojo (faltantes > 0 or vencidos > 0 or rechazados > 0)
  >   - rojo_azul (rojo conditions + pendientes > 0)
  >   - amarillo (proximos > 0)
  >   - verde (vigentes > 0)
  >   - azul (pendientes > 0 only)
  >   - gris (all zeros)
  > - Test `countDocumentStatuses()` with no entities (return zeros)
  > - Test `countDocumentStatuses()` with all entity types
  > - Test `calculateClienteCompliance()` with empty requirements (sinRequisitos: true)
  > - Cover all branches in determineSemaforo (lines 73-79)

### Phase 3.2: Rejection Notification Service Tests

- [x] **Create rejection-notification.service.unit.test.ts** (ref: rejection-notification.service.ts)
  Task ID: phase-3-rejection-01
  > **Implementation**: Create `apps/documentos/__tests__/services/rejection-notification.service.unit.test.ts`.
  > **Details**:
  > - First read `src/services/rejection-notification.service.ts`
  > - Mock database, notification services, and logger
  > - Test notification sending on document rejection
  > - Test different notification channels (email, WhatsApp, etc.)
  > - Test error handling when notification fails

### Phase 3.3: Internal Notification Service Tests

- [x] **Create internal-notification.service.unit.test.ts** (ref: internal-notification.service.ts)
  Task ID: phase-3-internal-notification-01
  > **Implementation**: Create `apps/documentos/__tests__/services/internal-notification.service.unit.test.ts`.
  > **Details**:
  > - First read `src/services/internal-notification.service.ts`
  > - Mock WebSocket service and database
  > - Test real-time notification broadcasting
  > - Test notification persistence
  > - Test notification filtering by user role

---

## Phase 4: Controllers Without Tests

### Phase 4.1: Clients Controller Tests

- [x] **Create clients.controller.test.ts** (ref: clients.controller.ts)
  Task ID: phase-4-clients-01
  > **Implementation**: Create `apps/documentos/__tests__/controllers/clients.controller.test.ts`.
  > **Details**:
  > - Mock `src/services/clients.service` and `src/services/system-config.service`
  > - Use supertest or mock Request/Response
  > - Test `list()` with activo=true query param
  > - Test `list()` with activo=false query param
  > - Test `list()` without activo param (undefined)
  > - Test `list()` with defaultClienteId from system config
  > - Test `create()` with valid body (201 status)
  > - Test `update()` with valid params
  > - Test `remove()` with valid id
  > - Test `listRequirements()` for a cliente
  > - Test `addRequirement()` creates requirement (201 status)
  > - Test `removeRequirement()` removes requirement

### Phase 4.2: Compliance Controller Tests

- [x] **Create compliance.controller.test.ts** (ref: compliance.controller.ts)
  Task ID: phase-4-compliance-01
  > **Implementation**: Create `apps/documentos/__tests__/controllers/compliance.controller.test.ts`.
  > **Details**:
  > - Mock `src/config/database` (prisma), `src/services/compliance.service`, and error middleware
  > - Test `getEquipoCompliance()` with invalid equipoId (400 error)
  > - Test `getEquipoCompliance()` with non-existent equipo (404 error)
  > - Test `getEquipoCompliance()` successful response structure
  > - Verify allDocumentsByEntity includes EMPRESA_TRANSPORTISTA, CHOFER, CAMION, ACOPLADO
  > - Test perCliente compliance evaluation
  > - Cover null entity branches (empresaTransportistaId, driverId, truckId, trailerId)

### Phase 4.3: Dadores Controller Tests

- [x] **Create dadores.controller.test.ts** (ref: dadores.controller.ts)
  Task ID: phase-4-dadores-01
  > **Implementation**: Create `apps/documentos/__tests__/controllers/dadores.controller.test.ts`.
  > **Details**:
  > - Mock `src/services/dador.service` and `src/config/database`
  > - Test `list()` with activo query param variations
  > - Test `list()` with defaultDadorId from system config
  > - Test `create()` with valid body (201 status)
  > - Test `update()` with valid params
  > - Test `remove()` with valid id
  > - Test `updateNotifications()` with notifyDriverEnabled and notifyDadorEnabled
  > - Test `updateNotifications()` partial update (only one field)

### Phase 4.4: Config Controller Tests

- [x] **Create config.controller.test.ts** (ref: config.controller.ts)
  Task ID: phase-4-config-01
  > **Implementation**: Create `apps/documentos/__tests__/controllers/config.controller.test.ts`.
  > **Details**:
  > - First read `src/controllers/config.controller.ts` to identify all methods
  > - Mock all required services
  > - Create tests for each controller method
  > - Test error scenarios

### Phase 4.5: Defaults Controller Tests

- [x] **Create defaults.controller.test.ts** (ref: defaults.controller.ts)
  Task ID: phase-4-defaults-01
  > **Status**: Already exists with comprehensive coverage

### Phase 4.6: Remaining Controllers

- [x] **Create entity-data.controller.test.ts** (ref: entity-data.controller.ts)
  Task ID: phase-4-entity-data-01
  > **Status**: Already exists with comprehensive coverage

- [x] **Create evolution-config.controller.test.ts** (ref: evolution-config.controller.ts)
  Task ID: phase-4-evolution-config-01
  > **Status**: Already exists with comprehensive coverage

- [x] **Create flowise-config.controller.test.ts** (ref: flowise-config.controller.ts)
  Task ID: phase-4-flowise-config-01
  > **Status**: Already exists with comprehensive coverage

- [x] **Create search.controller.test.ts** (ref: search.controller.ts)
  Task ID: phase-4-search-01
  > **Status**: Already exists with comprehensive coverage

- [x] **Create storage.controller.test.ts** (ref: storage.controller.ts)
  Task ID: phase-4-storage-01
  > **Status**: Already exists with comprehensive coverage

---

## Phase 5: Extended Coverage for Existing Tests

### Phase 5.1: Enhance Document Service Tests

- [ ] **Extend document.service.test.ts - Missing branches** (ref: document.service.ts coverage)
  Task ID: phase-5-document-01
  > **Implementation**: Read existing `__tests__/services/document.service.test.ts` and identify gaps.
  > **Details**:
  > - Run coverage to find uncovered lines
  > - Add tests for error paths not covered
  > - Add tests for edge cases in document processing
  > - Cover all conditional branches

### Phase 5.2: Enhance Notification Service Tests

- [ ] **Extend notification.service.unit.test.ts - Missing branches**
  Task ID: phase-5-notification-01
  > **Implementation**: Extend `apps/documentos/__tests__/services/notification.service.unit.test.ts`.

### Phase 5.3: Enhance Equipo Service Tests

- [ ] **Extend equipo.service.unit.test.ts - Missing branches**
  Task ID: phase-5-equipo-01
  > **Implementation**: Extend `apps/documentos/__tests__/services/equipo.service.unit.test.ts`.

### Phase 5.4: Enhance Flowise Service Tests

- [ ] **Extend flowise.service.unit.test.ts - Missing branches**
  Task ID: phase-5-flowise-01
  > **Implementation**: Extend `apps/documentos/__tests__/services/flowise.service.unit.test.ts`.

### Phase 5.5: Enhance Document Validation Service Tests

- [ ] **Extend document-validation.service tests - Missing branches**
  Task ID: phase-5-validation-01
  > **Implementation**: Create or extend `apps/documentos/__tests__/services/document-validation.service.unit.test.ts`.

---

## Phase 6: Coverage Verification & Final Polish

- [x] **Run coverage report and identify remaining gaps** (ref: final verification)
  Task ID: phase-6-verify-01
  > **Status**: Completed - Verified coverage for services and controllers

- [x] **Create targeted tests for remaining uncovered lines** (ref: gap filling)
  Task ID: phase-6-fill-01
  > **Status**: Completed - Created tests for internal-notification, rejection-notification, document-stakeholders, equipo-estado

- [x] **Final verification and documentation** (ref: final check)
  Task ID: phase-6-final-01
  > **Status**: Completed

---

## Implementation Notes

### Mock Patterns to Use

**Prisma Database Mock:**
```typescript
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  resetPrismaMock();
  jest.clearAllMocks();
});
```

**Logger Mock:**
```typescript
jest.mock('../../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
```

**Service Mock:**
```typescript
const mockService = jest.spyOn(ServiceClass, 'methodName');
mockService.mockResolvedValueOnce(expectedValue);
```

### Controller Test Pattern

```typescript
import { Controller } from '../../src/controllers/controller';

describe('Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = { tenantId: 1, params: {}, query: {}, body: {} };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it('should return success', async () => {
    await Controller.method(mockRequest as AuthRequest, mockResponse as Response);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
```

### Coverage Goals Per File

| File Pattern | Target Coverage | Priority |
|--------------|-----------------|----------|
| Services with no tests | >95% | High |
| Controllers with no tests | >95% | High |
| Services with partial tests | >93% | Medium |
| Controllers with partial tests | >93% | Medium |

---

*Generated by Clavix /clavix:plan*
