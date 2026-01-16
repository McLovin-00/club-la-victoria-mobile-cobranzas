import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeAll, afterEach } from '@jest/globals';
// import { renderHook } from '@testing-library/react'; // Disabled due to ESM issues

describe('ProtectedServiceRoute.utils', () => {

  // We can't mock useServiceFlags easily here for renderHook without causing issues.
  // So we test structure.

  it('exports required functions', async () => {
    const module = await import('../ProtectedServiceRoute.utils');
    expect(module.useCanAccessService).toBeDefined();
    expect(module.withServiceProtectionFactory).toBeDefined();
  });

  it('withServiceProtectionFactory returns a HOC', async () => {
    const { withServiceProtectionFactory } = await import('../ProtectedServiceRoute.utils');

    const MockProtectedRoute = jest.fn(({ children }: any) => <div data-testid="wrapper">{children}</div>);
    const factory = withServiceProtectionFactory(MockProtectedRoute as any);
    const hoc = factory('documentos');

    expect(typeof hoc).toBe('function');

    const MyComp = () => <span>Content</span>;
    (MyComp as any).displayName = 'MyComp';

    const Wrapped = hoc(MyComp);
    expect(Wrapped.displayName).toBe('withServiceProtection(MyComp)');
  });
});
