---
id: std-20250213-test-phases
depthUsed: standard
timestamp: 2025-02-13T00:00:00Z
executed: true
originalPrompt: "agarra y quiero que crees fases por cada archivo, en cada fase tenes que crear tests para que cada archivo llegue a un 80% coverage"
---

# Improved Prompt

```markdown
# Frontend Test Coverage Improvement Plan

## Objective
Increase test coverage for frontend files to reach 80% coverage target through phased test implementation.

## Context
- **Target**: `apps/frontend/src/`
- **Current State**: Files with varying coverage levels (from 0% to 98%)
- **Goal**: 80% coverage per file
- **Test Framework**: Jest (based on project configuration)

## Phase Definition

Organize files into phases based on current coverage levels:

- **Phase 1 - Critical Coverage (0-20%)**: Files with minimal or no test coverage
- **Phase 2 - Low Coverage (20-40%)**: Files requiring significant test additions
- **Phase 3 - Medium Coverage (40-60%)**: Files needing moderate test improvements
- **Phase 4 - Good Coverage (60-80%)**: Files requiring targeted tests for remaining gaps
- **Phase 5 - Already Good (80%+)**: Files meeting target, maintain coverage

## Output Requirements

For each file in each phase:

### Test File Location
- Create test file alongside source: `src/__tests__/` or `src/**/*.test.tsx` or `src/**/*.spec.tsx`
- Use naming convention: `<ComponentName>.test.tsx` or `<ComponentName>.spec.tsx`

### Test Content Requirements
- **Unit Tests**: Test individual functions, hooks, and utilities in isolation
- **Integration Tests**: Test component interactions with mocks/stubs
- **Coverage Goals**: Write tests to cover all branches, conditions, and edge cases
- **Test Quality**:
  - Descriptive test names (`should... when...`)
  - Arrange: Given, When, Then pattern
  - Mock external dependencies (API calls, services)
  - Test error conditions
  - Test loading states

### Success Criteria Per File
- File achieves ≥80% coverage
- All critical paths are tested
- Edge cases are covered
- Tests are maintainable and readable

## Implementation Strategy

1. **Prioritize by Impact**: Start with files that have most uncovered lines and highest business value
2. **Test-Driven Approach**: Write tests before fixing code (Red-Green-Refactor)
3. **Incremental Progress**: Focus on one file at a time within each phase
4. **Coverage Validation**: After each file, run coverage report to verify 80% target is met
5. **Documentation**: Add comments explaining complex test scenarios

## Execution Order

**Phase 1 (Critical)**: Process files in order of most uncovered lines first
**Phase 2 (Low)**: Continue to next most critical files
**Phase 3 (Medium)**: Address moderate coverage gaps
**Phase 4 (Good)**: Target remaining gaps to reach 80%
**Phase 5 (Maintenance)**: Ensure existing coverage doesn't drop below 80%
```

## Quality Scores
- **Clarity**: 75%
- **Efficiency**: 80%
- **Structure**: 85%
- **Completeness**: 80%
- **Actionability**: 85%
- **Specificity**: 75%
- **Overall**: 80% (good)

## Original Prompt
```
agarra y quiero que crees fases por cada archivo, en cada fase tenes que crear tests para que cada archivo llegue a un 80% coverage
```
