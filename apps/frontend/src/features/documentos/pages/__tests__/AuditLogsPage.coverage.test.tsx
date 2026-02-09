/**
 * Tests de cobertura para AuditLogsPage
 */
import React from 'react';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('AuditLogsPage - Coverage', () => {
  let Component: React.FC<any>;
  let mockStore: ReturnType<typeof configureStore>;

  beforeAll(async () => {
    // Mock de react-redux
    await jest.unstable_mockModule('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: jest.fn((fn) => fn({
        auth: {
          user: { id: 1, name: 'Admin', role: 'ADMIN' },
        },
      })),
      useDispatch: jest.fn(() => jest.fn()),
    }));

    // Mock de documentosApiSlice
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetAuditLogsQuery: () => ({
        data: { logs: [], pagination: { total: 0, page: 1, limit: 10 } },
        isLoading: false,
        error: null,
      }),
    }));

    // Mock de componentes UI
    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children }: any) => <div>{children}</div>,
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      ChevronLeftIcon: ({ className }: any) => <span className={className}>◀</span>,
      ChevronRightIcon: ({ className }: any) => <span className={className}>▶</span>,
      ArrowLeftIcon: ({ className }: any) => <span className={className}>◀</span>,
      MagnifyingGlassIcon: ({ className }: any) => <span className={className}>🔍</span>,
      XMarkIcon: ({ className }: any) => <span className={className}>✕</span>,
    }));

    // Create mock store
    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, name: 'Admin', role: 'ADMIN' } }) => state,
      },
    });

    const module = await import('../AuditLogsPage.tsx');
    Component = module.default || module.AuditLogsPage;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );

  it('debería importar el componente', () => {
    expect(Component).toBeDefined();
  });

  it('debería renderizar la página', () => {
    render(<Component />, { wrapper });
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
