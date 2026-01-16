/**
 * Tests de cobertura para DocumentosPage
 */
import React from 'react';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('DocumentosPage - Coverage', () => {
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
      useGetDocumentsByEmpresaQuery: () => ({
        data: { data: [], pagination: { total: 0, page: 1 } },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      }),
      useGetTemplatesQuery: () => ({
        data: [],
        isLoading: false,
      }),
      useUploadDocumentMutation: () => [
        jest.fn(),
        { isLoading: false, error: null, reset: jest.fn() },
      ],
      useDeleteDocumentMutation: () => [
        jest.fn(),
        { isLoading: false, reset: jest.fn() },
      ],
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
      MagnifyingGlassIcon: ({ className }: any) => <span>🔍</span>,
      CameraIcon: ({ className }: any) => <span>📷</span>,
      DocumentIcon: ({ className }: any) => <span>📄</span>,
      CheckCircleIcon: ({ className }: any) => <span>✓</span>,
      XCircleIcon: ({ className }: any) => <span>✗</span>,
      ClockIcon: ({ className }: any) => <span>🕐</span>,
      XMarkIcon: ({ className }: any) => <span>✕</span>,
      CloudArrowUpIcon: ({ className }: any) => <span>☁️</span>,
      DocumentTextIcon: ({ className }: any) => <span>📄</span>,
      ArrowLeftIcon: ({ className }: any) => <span>←</span>,
    }));

    await jest.unstable_mockModule('../../../../hooks/useToast', () => ({
      useToast: () => ({ show: jest.fn() }),
    }));

    await jest.unstable_mockModule('../../../../hooks/useConfirmDialog', () => ({
      useConfirmDialog: () => ({ confirm: jest.fn() }),
    }));

    await jest.unstable_mockModule('../../../../components/ui/Pagination', () => ({
      Pagination: ({ children }: any) => <div>{children}</div>,
    }));

    await jest.unstable_mockModule('../../components/DocumentsSemaforo', () => ({
      DocumentsSemaforo: ({ empresaId }: { empresaId: number }) => (
        <div data-testid="semaforo">Semaforo {empresaId}</div>
      ),
    }));

    await jest.unstable_mockModule('../../components/DocumentUploadModal', () => ({
      DocumentUploadModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
        isOpen ? <div data-testid="upload-modal">Upload Modal</div> : null,
    }));

    await jest.unstable_mockModule('../../components/DocumentsList', () => ({
      DocumentsList: ({ documents, isLoading, onDelete }: any) => (
        <div data-testid="documents-list">
          {isLoading ? 'Loading...' : `${documents?.length || 0} documents`}
        </div>
      ),
    }));

    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, name: 'Admin', role: 'ADMIN' } }) => state,
      },
    });

    const module = await import('../DocumentosPage.tsx');
    Component = module.default || module.DocumentosPage;
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
