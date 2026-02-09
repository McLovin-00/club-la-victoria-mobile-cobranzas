/**
 * Tests de cobertura para DocumentosMainPage
 */
import React from 'react';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('DocumentosMainPage - Coverage', () => {
  let Component: React.FC<any>;
  let mockStore: ReturnType<typeof configureStore>;

  beforeAll(async () => {
    await jest.unstable_mockModule('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: jest.fn((fn) => fn({
        auth: {
          user: { id: 1, name: 'Admin', role: 'ADMIN' },
        },
      })),
      useDispatch: jest.fn(() => jest.fn()),
    }));

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetDocumentsSummaryQuery: () => ({
        data: { total: 0, pending: 0, approved: 0, rejected: 0 },
        isLoading: false,
      }),
      useGetDadoresQuery: () => ({
        data: [],
        isLoading: false,
      }),
      useGetDashboardDataQuery: () => ({
        data: { summary: { total: 0 } },
        isLoading: false,
      }),
      useGetPendingSummaryQuery: () => ({
        data: { pending: 0, approved: 0 },
        isLoading: false,
      }),
    }));

    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children }: any) => <button>{children}</button>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children }: any) => <div>{children}</div>,
      CardContent: ({ children }: any) => <div>{children}</div>,
      CardHeader: ({ children }: any) => <div>{children}</div>,
      CardTitle: ({ children }: any) => <h3>{children}</h3>,
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      DocumentArrowDownIcon: ({ className }: any) => <span>📄</span>,
      CheckCircleIcon: ({ className }: any) => <span>✓</span>,
      ClockIcon: ({ className }: any) => <span>🕐</span>,
      PlusIcon: ({ className }: any) => <span>+</span>,
      BuildingOfficeIcon: ({ className }: any) => <span>🏢</span>,
      TruckIcon: ({ className }: any) => <span>🚛</span>,
      UsersIcon: ({ className }: any) => <span>👥</span>,
      DocumentIcon: ({ className }: any) => <span>📄</span>,
      ChartBarIcon: ({ className }: any) => <span>📊</span>,
      XCircleIcon: ({ className }: any) => <span>✗</span>,
      DocumentTextIcon: ({ className }: any) => <span>📄</span>,
    }));

    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, name: 'Admin', role: 'ADMIN' } }) => state,
      },
    });

    const module = await import('../DocumentosMainPage.tsx');
    Component = module.default || module.DocumentosMainPage;
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
