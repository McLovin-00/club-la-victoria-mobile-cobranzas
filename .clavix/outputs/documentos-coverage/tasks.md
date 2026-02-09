# Implementation Plan

**Project**: documentos-coverage-80-percent
**Generated**: 2025-01-20T12:00:00Z

---

## Technical Context & Standards

**Detected Stack & Patterns:**
- **Framework**: React 18.2.0 + TypeScript
- **Testing**: Jest (ESM mode) + React Testing Library
- **State Management**: Redux Toolkit (@reduxjs/toolkit ^2.6.1)
- **Routing**: React Router DOM v7.5.0
- **UI Components**: Custom UI components + Radix UI primitives + Heroicons
- **API**: RTK Query createApi with fetchBaseQuery
- **Mocking**: jest.unstable_mockModule for ESM
- **Test Structure**: `__tests__/` folders alongside source files
- **Naming Convention**: `*.test.tsx` for main tests, `*.coverage.test.tsx` for gap-filling, `*.smoke.test.ts` for basic checks

---

## Phase 1: API Slice - Lowest Coverage (31.92%)

**Target**: `apps/frontend/src/features/documentos/api/documentosApiSlice.ts`
**Current Coverage**: 31.92% statements | 18.68% branches | 14.9% functions
**Goal**: >80% coverage

### Priority 1: Core Endpoints Without Coverage

- [x] **Create test file for untested query endpoints** (ref: documentosApiSlice.ts:88-250)
  Task ID: phase-1-api-01
  > **Implementation**: Create `api/__tests__/documentosApiSlice.queries.test.ts`.
  > **Details**: Test query endpoints not covered in existing tests:
  > - `getDocuments` with filters (status, entityType, entityId)
  > - `getDocumentById` with error cases
  > - `getClientDocuments` pagination and filters
  > - `getApprovalQueue` with different status filters
  > - `getJobStatus` with different job states
  > - `getExtractedData` endpoint
  > - `getNotificationsConfig` endpoint
  >
  > Use pattern from `documentosApiSlice.test.ts:8-33` for testing hook exports.

- [x] **Create test file for mutation endpoints** (ref: documentosApiSlice.ts:250-400)
  Task ID: phase-1-api-02
  > **Implementation**: Create `api/__tests__/documentosApiSlice.mutations.test.ts`.
  > **Details**: Test mutation endpoints:
  > - `updateDocument` - all updatable fields
  > - `deleteDocument` - error handling
  > - `approveDocument` - state transitions
  > - `rejectDocument` - different rejection reasons
  > - `resubmitDocument` - file upload with approval
  > - `uploadBatchDocsTransportistas` - with/without skipDedupe
  > - `updateNotificationsConfig` endpoint
  >
  > Mock RTK Query mutations using `jest.fn()` pattern from existing tests.

- [x] **Create test file for compliance endpoints** (ref: documentosApiSlice.ts:91-110)
  Task ID: phase-1-api-03
  > **Implementation**: Create `api/__tests__/documentosApiSlice.compliance-full.test.ts`.
  > **Details**: Test compliance-specific endpoints:
  > - `getEquipoCompliance` - transformResponse verification
  > - `getClienteEquipos` - with clienteId parameter
  > - `getMisEquipos` - user-specific equipment list
  > - `getEquipoKpis` - KPI calculation
  > - `getEquipoHistory` - historical data retrieval
  > - `bulkSearchPlates` - batch plate search
  >
  > Verify transformResponse: `(r: any) => r?.data ?? r` pattern.

- [x] **Create test file for search and autocomplete endpoints** (ref: documentosApiSlice.ts:400-500)
  Task ID: phase-1-api-04
  > **Implementation**: Create `api/__tests__/documentosApiSlice.search.test.ts`.
  > **Details**: Test search functionality:
  > - `searchEquipos` - with various search terms
  > - `transportistasSearch` - company search
  > - `getDefaults` - default configuration
  > - `getMaestros` - master data retrieval
  >
  > Test with empty results, partial matches, exact matches.

- [x] **Create test file for template endpoints** (ref: documentosApiSlice.ts:150-200)
  Task ID: phase-1-api-05
  > **Implementation**: Create `api/__tests__/documentosApiSlice.templates.test.ts`.
  > **Details**: Test template CRUD endpoints:
  > - `getTemplates` - list all templates
  > - `createTemplate` - with validation
  > - `updateTemplate` - partial updates
  > - `deleteTemplate` - cascade effects
  >
  > Test with different `entityType` values: DADOR, EMPRESA_TRANSPORTISTA, CHOFER, CAMION, ACOPLADO.

- [x] **Create test file for client requirements endpoints** (ref: documentosApiSlice.ts:200-250)
  Task ID: phase-1-api-06
  > **Implementation**: Create `api/__tests__/documentosApiSlice.requirements.test.ts`.
  > **Details**: Test client requirements:
  > - `getClientRequirements` - per-client requirements
  > - `addClientRequirement` - create new requirement
  > - `removeClientRequirement` - delete requirement
  >
  > Test with different requirement types and validation.

- [x] **Create test file for empresas transportistas endpoints** (ref: documentosApiSlice.ts:300-350)
  Task ID: phase-1-api-07
  > **Implementation**: Create `api/__tests__/documentosApiSlice.empresas-transportistas.test.ts`.
  > **Details**: Test transport company endpoints:
  > - `getEmpresasTransportistas` - list companies
  > - `createEmpresaTransportista` - company creation
  > - `transportistasSearch` - search functionality
  >
  > Test with search filters and pagination.

---

## Phase 2: Pages - Medium Coverage (40-60%)

### Priority 2: TemplatesPage (43.39% coverage)

- [x] **Add comprehensive tests for TemplatesPage** (ref: pages/TemplatesPage.tsx)
  Task ID: phase-2-pages-01
  > **Implementation**: Extend `pages/__tests__/TemplatesPage.coverage.test.tsx`.
  > **Details**: Add missing test cases:
  > - `handleSave` with updateTemplate success and error paths
  > - `handleSave` with createTemplate success and error paths
  > - `handleDelete` with confirm=false early return
  > - `handleDelete` with API error
  > - `handleToggleActive` switching between active/inactive
  > - `handleToggleActive` error handling
  > - Modal close behavior resetting editingTemplate
  > - Statistics calculation with empty templates array
  >
  > Use mock pattern from `TemplatesPage.test.ts:39-73` for ESM mocking.

### Priority 3: DocumentosPage (53.70% coverage)

- [x] **Create comprehensive tests for DocumentosPage** (ref: pages/DocumentosPage.tsx)
  Task ID: phase-2-pages-02
  > **Implementation**: Create `pages/__tests__/DocumentosPage.full.test.tsx`.
  > **Details**: Test document listing and filtering:
  > - Render with documents list
  > - Filter by status (PENDIENTE, APROBADO, RECHAZADO, VENCIDO)
  > - Filter by entity type
  > - Search functionality
  > - Pagination controls
  > - Empty state when no documents
  > - Loading state
  > - Error state
  >
  > Follow pattern from `DocumentosPage.test.tsx` and extend with missing branches.

### Priority 4: EquiposPage (58.06% coverage)

- [x] **Add comprehensive tests for EquiposPage** (ref: pages/EquiposPage.tsx)
  Task ID: phase-2-pages-03
  > **Implementation**: Extend `pages/__tests__/EquiposPage.full.test.tsx`.
  > **Details**: Add missing test cases:
  > - Dador change handler
  > - Semaforo rendering states (red, yellow, green)
  > - Edge cases: empty equipos list, API errors
  > - Filter combinations
  > - Equipment selection and detail view
  > - Status change operations
  >
  > Build on existing `EquiposPage.test.tsx`, `EquiposPage.render.test.tsx`, `EquiposPage.semaforo.test.tsx`.

---

## Phase 3: Components - Medium-High Coverage (70-80%)

### Priority 5: CameraCapture (74.41% coverage)

- [x] **Add error handling tests for CameraCapture** (ref: components/CameraCapture.tsx)
  Task ID: phase-3-components-01
  > **Implementation**: Create `components/__tests__/CameraCapture.error-handling.test.tsx`.
  > **Details**: Test camera error scenarios:
  > - `NotAllowedError` - user denied permission
  > - `NotFoundError` - no camera found
  > - `NotReadableError` - camera in use
  > - `OverconstrainedError` - camera constraints not met
  > - `SecurityError` - security restriction
  > - Permission status: 'denied', 'not-supported'
  > - `removeAt` function to delete captured photos
  > - `onCapture` callback with multiple photos
  >
  > Mock `navigator.mediaDevices.getUserMedia` and `useCameraPermissions` hook.

### Priority 6: DocumentosMainPage (72.72% coverage)

- [x] **Add comprehensive tests for DocumentosMainPage** (ref: pages/DocumentosMainPage.tsx)
  Task ID: phase-3-components-02
  > **Implementation**: Extend `pages/__tests__/DocumentosMainPage.coverage.test.tsx`.
  > **Details**: Test main page navigation and states:
  > - Navigation between different document sections
  > - Tab switching behavior
  > - Search and filter combinations
  > - Empty states per section
  > - Loading and error states per section
  >
  > Use pattern from existing `DocumentosMainPage.test.tsx`.

### Priority 7: DocumentUploadModal (79.81% coverage)

- [x] **Add comprehensive tests for DocumentUploadModal** (ref: components/DocumentUploadModal.tsx)
  Task ID: phase-3-components-03
  > **Implementation**: Extend `components/__tests__/DocumentUploadModal.full.test.tsx`.
  > **Details**: Test modal functionality:
  > - `getEntityIdLabel` for all entity types: CHOFER, CAMION, ACOPLADO, EMPRESA_TRANSPORTISTA, default
  > - `getEntityIdPlaceholder` for all entity types
  > - Drag and drop: `handleDrop`, `handleDragOver`, `handleDragLeave`
  > - Batch upload with errors
  > - Batch upload loading state
  > - `expiresAt` date change handler
  > - File validation for different mime types
  >
  > Build on existing `DocumentUploadModal.test.tsx` and `DocumentUploadModal.coverage.test.tsx`.

---

## Phase 4: Higher Coverage Pages (80-90%)

### Priority 8: AcopladosPage (82.05% coverage)

- [x] **Complete AcopladosPage tests** (ref: pages/AcopladosPage.tsx)
  Task ID: phase-4-pages-01
  > **Implementation**: Extend `pages/__tests__/AcopladosPage.full.test.tsx`.
  > **Details**: Add missing branches:
  > - Edge cases: empty list, API errors
  > - Filter combinations
  > - Pagination edge cases
  >
  > Use `AcopladosPage.test.tsx` and `AcopladosPage.coverage.test.tsx` as base.

### Priority 9: FlowiseConfigPage (85.71% coverage)

- [x] **Complete FlowiseConfigPage tests** (ref: pages/FlowiseConfigPage.tsx)
  Task ID: phase-4-pages-02
  > **Implementation**: Extend `pages/__tests__/FlowiseConfigPage.full.test.tsx`.
  > **Details**: Add missing configuration test cases:
  > - Configuration save/load
  > - Validation errors
  > - Connection testing
  >
  > Build on `FlowiseConfigPage.test.tsx` and `FlowiseConfigPage.coverage.test.tsx`.

### Priority 10: DashboardDadoresPage (85.71% coverage)

- [x] **Complete DashboardDadoresPage tests** (ref: pages/DashboardDadoresPage.tsx)
  Task ID: phase-4-pages-03
  > **Implementation**: Extend `pages/__tests__/DashboardDadoresPage.full.test.tsx`.
  > **Details**: Add dashboard-specific tests:
  > - Metrics calculation
  > - Chart rendering
  > - Date range filters
  >
  > Build on `DashboardDadoresPage.render.test.tsx` and `DashboardDadoresPage.coverage.test.tsx`.

---

## Phase 5: Pages with No/Low Coverage

### Pages requiring initial test creation:

- [x] **Create tests for AuditLogsPage** (ref: pages/AuditLogsPage.tsx)
  Task ID: phase-5-pages-01
  > **Implementation**: Create `pages/__tests__/AuditLogsPage.main.test.tsx`.
  > **Details**: Test audit log viewing:
  > - Render logs list
  > - Filter by action type
  > - Filter by date range
  > - Filter by user
  > - Pagination
  > - Empty state
  >
  > Use `AuditLogsPage.coverage.test.tsx` as reference, add missing cases.

- [x] **Create tests for ClientRequirementsPage** (ref: pages/ClientRequirementsPage.tsx)
  Task ID: phase-5-pages-02
  > **Implementation**: Create `pages/__tests__/ClientRequirementsPage.main.test.tsx`.
  > **Details**: Test client requirements management:
  > - List requirements per client
  > - Add requirement
  > - Remove requirement
  > - Validation
  >
  > Build on `ClientRequirementsPage.test.tsx` and `ClientRequirementsPage.coverage.test.tsx`.

- [x] **Create tests for ConsultaPage** (ref: pages/ConsultaPage.tsx)
  Task ID: phase-5-pages-03
  > **Implementation**: Create `pages/__tests__/ConsultaPage.full.test.tsx`.
  > **Details**: Test consultation/search page:
  > - Search functionality
  > - Filter combinations
  > - Result display
  > - Empty results
  >
  > Extend `ConsultaPage.test.tsx` and `ConsultaPage.coverage.test.tsx`.

- [x] **Create tests for EvolutionConfigPage** (ref: pages/EvolutionConfigPage.tsx)
  Task ID: phase-5-pages-04
  > **Implementation**: Create `pages/__tests__/EvolutionConfigPage.full.test.tsx`.
  > **Details**: Test Evolution AI configuration:
  > - Configuration form
  > - API key validation
  > - Connection test
  > - Save/load settings
  >
  > Build on `EvolutionConfigPage.test.tsx`.

- [x] **Create tests for ExtractedDataPage** (ref: pages/ExtractedDataPage.tsx)
  Task ID: phase-5-pages-05
  > **Implementation**: Create `pages/__tests__/ExtractedDataPage.full.test.tsx`.
  > **Details**: Test extracted data viewing:
  > - Display extracted fields
  > - Edit extracted data
  > - Approve/reject extraction
  > - Error handling
  >
  > Build on `ExtractedDataPage.test.tsx`.

- [x] **Create tests for NotificationsConfigPage** (ref: pages/NotificationsConfigPage.tsx)
  Task ID: phase-5-pages-06
  > **Implementation**: Create `pages/__tests__/NotificationsConfigPage.full.test.tsx`.
  > **Details**: Test notification configuration:
  > - WhatsApp settings
  > - Email settings
  > - Save configuration
  > - Test notification
  >
  > Build on `NotificationsConfigPage.test.tsx` and `NotificationsConfigPage.coverage.test.tsx`.

- [x] **Create tests for EmpresaTransportistaDetailPage** (ref: pages/EmpresaTransportistaDetailPage.tsx)
  Task ID: phase-5-pages-07
  > **Implementation**: Create `pages/__tests__/EmpresaTransportistaDetailPage.full.test.tsx`.
  > **Details**: Test transport company detail page:
  > - Company information display
  > - Associated equipment list
  > - Document requirements
  > - Edit functionality
  >
  > Build on `EmpresaTransportistaDetailPage.test.tsx`.

---

## Phase 6: Types and Utilities

- [x] **Create tests for API types** (ref: types/api.ts)
  Task ID: phase-6-types-01
  > **Implementation**: Create `types/__tests__/api.test.ts`.
  > **Details**: Test type guards, validators, and utility functions in api.ts.
  > Verify type exports and structure.

- [x] **Create tests for entities types** (ref: types/entities.ts)
  Task ID: phase-6-types-02
  > **Implementation**: Create `types/__tests__/entities.test.ts`.
  > **Details**: Test entity type guards, validators, and utility functions in entities.ts.

---

## Phase 7: Integration Tests

- [x] **Create integration tests for document approval flow** (ref: feature documents)
  Task ID: phase-7-integration-01
  > **Implementation**: Create `__tests__/flows/document-approval-flow.test.tsx`.
  > **Details**: Test complete flow:
  > - Upload → Pending → Approve → Download
  > - Upload → Pending → Reject → Resubmit → Approve
  >
  > Use multiple components together, test state changes across the feature.

- [x] **Create integration tests for template management flow** (ref: feature documents)
  Task ID: phase-7-integration-02
  > **Implementation**: Create `__tests__/flows/template-management-flow.test.tsx`.
  > **Details**: Test template lifecycle:
  > - Create → Edit → Activate/Deactivate → Delete

---

## Coverage Ranking Reference (Lowest to Highest)

| Priority | File | Current Coverage | Lines Missing |
|----------|------|------------------|---------------|
| 1 | api/documentosApiSlice.ts | 31.92% | 241/354 |
| 2 | pages/TemplatesPage.tsx | 43.39% | 30/53 |
| 3 | pages/DocumentosPage.tsx | 53.70% | 25/54 |
| 4 | pages/EquiposPage.tsx | 58.06% | 36/62 |
| 5 | components/CameraCapture.tsx | 74.41% | 22/86 |
| 6 | pages/DocumentosMainPage.tsx | 72.72% | 21/77 |
| 7 | components/DocumentUploadModal.tsx | 79.81% | 22/109 |
| 8 | pages/AcopladosPage.tsx | 82.05% | 9/50 |
| 9 | pages/FlowiseConfigPage.tsx | 85.71% | 6/42 |
| 10 | pages/DashboardDadoresPage.tsx | 85.71% | 9/63 |
| 11 | pages/ClientsPage.tsx | 93.54% | 2/31 |
| 12 | components/DocumentsList.tsx | 100.00% | 0/32 ✅ |
| 13 | components/DocumentsSemaforo.tsx | 100.00% | 0/24 ✅ |

---

## Test Execution Commands

```bash
# Run all documentos tests
npm test -- apps/frontend/src/features/documentos

# Run with coverage
npm run test:coverage -- apps/frontend/src/features/documentos

# Run specific test file
npm test -- apps/frontend/src/features/documentos/api/__tests__/documentosApiSlice.queries.test.ts

# Watch mode during development
npm run test:watch -- apps/frontend/src/features/documentos
```

---

## Success Criteria

After completing all phases:
- **API**: >80% statements, >75% branches, >75% functions
- **Components**: >90% statements, >85% branches
- **Pages**: >80% statements, >75% branches
- **Total documentos**: >80% across all metrics

---

*Generated by Clavix /clavix:plan*
