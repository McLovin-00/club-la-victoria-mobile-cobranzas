/**
 * Tests de cobertura para ClienteDashboard
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('ClienteDashboard - Coverage', () => {
  let ClienteDashboard: React.FC<any>;

  beforeAll(async () => {
    // Mock de documentosApiSlice
    await jest.unstable_mockModule('../../../../features/documentos/api/documentosApiSlice', () => ({
      useGetPortalClienteEquiposQuery: () => ({
        data: {
          equipos: [],
          resumen: { total: 0, vigentes: 0, proximosVencer: 0, vencidos: 0, incompletos: 0 },
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: jest.fn(),
      }),
    }));

    // Mock de componentes UI
    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant }: any) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/Toast.utils', () => ({
      showToast: jest.fn(),
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      CheckCircleIcon: ({ className }: any) => <span className={className}>Check</span>,
      ExclamationTriangleIcon: ({ className }: any) => <span className={className}>Warning</span>,
      XCircleIcon: ({ className }: any) => <span className={className}>XCircle</span>,
      MagnifyingGlassIcon: ({ className }: any) => <span className={className}>Search</span>,
      DocumentArrowDownIcon: ({ className }: any) => <span className={className}>Download</span>,
      TruckIcon: ({ className }: any) => <span className={className}>Truck</span>,
      ListBulletIcon: ({ className }: any) => <span className={className}>List</span>,
      ChevronLeftIcon: ({ className }: any) => <span className={className}>Left</span>,
      ChevronRightIcon: ({ className }: any) => <span className={className}>Right</span>,
      ArrowLeftIcon: ({ className }: any) => <span className={className}>Back</span>,
      Bars3Icon: ({ className }: any) => <span className={className}>Menu</span>,
      XMarkIcon: ({ className }: any) => <span className={className}>X</span>,
      ArrowDownTrayIcon: ({ className }: any) => <span className={className}>Upload</span>,
    }));

    const module = await import('../ClienteDashboard');
    ClienteDashboard = module.ClienteDashboard || module.default;
  });

  it('debería importar el componente', () => {
    expect(ClienteDashboard).toBeDefined();
  });

  it('debería renderizar el dashboard', () => {
    render(
      <MemoryRouter>
        <ClienteDashboard />
      </MemoryRouter>
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
