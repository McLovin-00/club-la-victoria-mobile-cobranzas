# Converting unstable_mockModule to jest.mock

## Problem
The codebase has 171+ test files using `jest.unstable_mockModule()` which is incompatible with SWC/Jest 30.0.4. This causes tests to fail and prevents proper code coverage measurement.

## Solution Pattern
Convert `unstable_mockModule` to proper `jest.mock()` with hoisting and controllable mock functions.

## Conversion Steps

### Before (using unstable_mockModule):
```typescript
let EditarEquipoPage: any;

beforeAll(async () => {
    const apiMock = {
        useGetEquipoByIdQuery: jest.fn(() => ({ data: mockData, isLoading: false })),
        // ... other hooks
    };

    await jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => apiMock);
    await jest.unstable_mockModule('@/hooks/useRoleBasedNavigation', () => ({ ... }));

    const module = await import('../EditarEquipoPage');
    EditarEquipoPage = module.default;
});
```

### After (using jest.mock with controllable functions):
```typescript
// Step 1: Create controllable mock functions at module level
const mockUseGetEquipoByIdQuery = jest.fn(() => ({
    data: mockData,
    isLoading: false,
    refetch: jest.fn()
}));
const mockUseGetClientsQuery = jest.fn(() => ({ data: mockClients, isLoading: false }));

// Step 2: Use jest.mock() with the controllable functions (MUST be hoisted before imports)
jest.mock('../../../documentos/api/documentosApiSlice', () => ({
    useGetEquipoByIdQuery: () => mockUseGetEquipoByIdQuery(),
    useGetClientsQuery: () => mockUseGetClientsQuery(),
    // ... other hooks
}));

// Step 3: Import the component normally
import EditarEquipoPage from '../EditarEquipoPage';

// Step 4: In beforeEach, reset mocks to default values
beforeEach(() => {
    mockUseGetEquipoByIdQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        refetch: jest.fn()
    });
});

// Step 5: In specific tests, override as needed
it('shows loading state', () => {
    mockUseGetEquipoByIdQuery.mockReturnValue({
        data: null,
        isLoading: true,
        refetch: jest.fn()
    });
    // ... test code
});
```

## Key Rules

1. **Always use function wrappers**: `() => mockFunction()` not `mockFunction`
   - ✅ `useGetEquipoByIdQuery: () => mockUseGetEquipoByIdQuery()`
   - ❌ `useGetEquipoByIdQuery: mockUseGetEquipoByIdQuery`

2. **Create mock functions before jest.mock() calls**
   - Define them at the top of the file, before any jest.mock() calls

3. **Reset mocks in beforeEach()**
   - This ensures each test starts with a clean state

4. **Add React import if using JSX in mocks**
   - `import React from 'react';`

5. **Remove beforeAll() blocks** that only handle dynamic imports

## Files to Convert

Total: 171 files with `unstable_mockModule`

### Priority 1 - EditarEquipoPage tests (6 files)
- [x] EditarEquipoPage.validation.test.tsx
- [x] EditarEquipoPage.upload.test.tsx
- [ ] EditarEquipoPage.handlers.test.tsx
- [ ] EditarEquipoPage.handlers.simple.test.tsx
- [ ] EditarEquipoPage.modals.test.tsx
- [ ] EditarEquipoPage.loaded.smoke.test.tsx

### Priority 2 - AltaEquipoCompletaPage tests (3 files)
- [ ] AltaEquipoCompletaPage.coverage.test.tsx
- [ ] AltaEquipoCompletaPage.creation.test.tsx
- [ ] AltaEquipoCompletaPage.render.test.tsx

### Priority 3 - RegisterUserModal tests (4 files)
- [ ] RegisterUserModal.permissions.test.tsx
- [ ] RegisterUserModal.temp-password.test.tsx
- [ ] RegisterUserModal.validation.test.tsx
- [ ] RegisterUserModal.render.test.tsx

### Priority 4 - EditPlatformUserModal tests (3 files)
- [ ] EditPlatformUserModal.permissions.test.tsx
- [ ] EditPlatformUserModal.validation.test.tsx
- [ ] EditPlatformUserModal.submit.test.tsx

### Priority 5 - Platform Users
- [ ] PlatformUsersPage.test.tsx

### Priority 6 - Documentos Pages (30+ files)
High impact for coverage - focus on files with most uncovered lines

### Priority 7 - Portal Pages (6 files)
- [ ] TransportistasPortalPage.edge.test.tsx
- [ ] ClientePortalPage.expanded.test.tsx
- [ ] ClientePortalPage.final.test.tsx
- [ ] TransportistasPortalPage.test.tsx
- [ ] TransportistasPortalPage.interaction.test.tsx
- [ ] ClientePortalPage.complete.test.tsx

### Priority 8 - Flow Tests
- [ ] FlowiseConfigPage.comprehensive.test.tsx
- [ ] template-management-flow.test.tsx
- [ ] document-approval-flow.test.tsx

### Priority 9 - Other Files (110+ remaining)

## Automated Conversion Script

A Node.js script is available at `scripts/convert-mocks.js` to help automate the conversion.

To run it:
```bash
node scripts/convert-mocks.js
```

**Note**: The automated script handles basic conversions but may require manual review and adjustments for complex cases.

## Verification

After conversion, verify tests pass:
```bash
npm test -- [path-to-converted-file]
```

## Coverage Impact

Current coverage: 63.41%
Target coverage: 90%
Gap: 26.59%

Converting these 171 files should:
1. Make 527+ currently failing tests pass
2. Increase coverage by executing actual code instead of just imports
3. Improve code quality and maintainability

## Common Issues and Solutions

### Issue: "mockReturnValue is not a function"
**Cause**: Trying to call mockReturnValue on the import directly
**Solution**: Use the controllable mock function created before jest.mock()

### Issue: Tests timing out or hanging
**Cause**: Async operations not properly awaited
**Solution**: Ensure all async operations use `await waitFor()` or proper promises

### Issue: Component not rendering expected content
**Cause**: Mock not returning proper data structure
**Solution**: Verify mock return values match expected interface

## Next Steps

1. Complete conversion of Priority 1-3 files (manual review)
2. Run automated script on Priority 4-9 files
3. Verify and fix any issues from automated conversion
4. Run full test suite with coverage
5. Measure progress toward 90% coverage goal
