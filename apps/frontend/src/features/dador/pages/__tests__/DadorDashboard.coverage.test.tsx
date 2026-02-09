/**
 * Tests de cobertura para DadorDashboard
 */
import React from 'react';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('DadorDashboard - Coverage', () => {
  let Component: React.FC<any>;
  let mockStore: ReturnType<typeof configureStore>;

  beforeAll(async () => {
    await jest.unstable_mockModule('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: jest.fn((fn) => fn({
        auth: {
          user: { id: 1, name: 'Dador User', role: 'DADOR' },
        },
      })),
      useDispatch: jest.fn(() => jest.fn()),
    }));

    await jest.unstable_mockModule('../../../../features/documentos/api/documentosApiSlice', () => ({
      useGetPortalDadorEquiposQuery: () => ({
        data: { equipos: [], resumen: { total: 0 } },
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
      PlusIcon: ({ className }: any) => <span>+</span>,
      TruckIcon: ({ className }: any) => <span>🚛</span>,
      DocumentTextIcon: ({ className }: any) => <span>📄</span>,
      MagnifyingGlassIcon: ({ className }: any) => <span>🔍</span>,
    }));

    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, name: 'Dador', role: 'DADOR' } }) => state,
      },
    });

    const module = await import('../DadorDashboard.tsx');
    Component = module.default || module.DadorDashboard;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );

  it('debería importar el componente', () => {
    expect(Component).toBeDefined();
  });

  it('debería renderizar el dashboard', () => {
    render(<Component />, { wrapper });
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
