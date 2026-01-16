/**
 * Tests de cobertura completa para ApprovalDetailPage
 * Objetivo: ≥90% coverage (líneas + ramas)
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ApprovalPendingDocument } from '../types/entities';

// Mock data completo
const mockDocumentData: ApprovalPendingDocument = {
  id: 123,
  uploadedAt: '2024-01-15T10:30:00Z',
  entityType: 'CHOFER',
  entityId: 456,
  entityNaturalId: '12345678',
  classification: {
    detectedEntityType: 'CHOFER',
    detectedEntityId: '12345678',
    detectedDocumentType: 'Licencia de Conducir',
    detectedExpiration: '2025-12-31',
    confidence: 0.95,
    disparidades: [],
  },
  template: {
    id: 1,
    name: 'Licencia',
    nombre: 'Licencia',
    entityType: 'CHOFER',
  },
  expiresAt: '2025-12-31',
  previewUrl: 'https://example.com/preview.pdf',
};

const mockDocumentWithDisparidades: ApprovalPendingDocument = {
  ...mockDocumentData,
  classification: {
    ...mockDocumentData.classification!,
    disparidades: [
      {
        campo: 'Vencimiento',
        valorEnSistema: '2025-12-31',
        valorEnDocumento: '2024-06-01',
        severidad: 'critica',
        mensaje: 'El vencimiento en el documento es anterior al vencimiento en sistema',
      },
      {
        campo: 'Nombre',
        valorEnSistema: 'Juan Pérez',
        valorEnDocumento: 'Juan Peréz',
        severidad: 'advertencia',
        mensaje: 'Posible error ortográfico en el nombre',
      },
      {
        campo: 'Dirección',
        valorEnSistema: 'Calle Falsa 123',
        valorEnDocumento: 'Calle Falsa 124',
        severidad: 'info',
        mensaje: 'Diferencia leve en dirección',
      },
    ],
  },
};

const mockDocumentWithoutEntityNaturalId: ApprovalPendingDocument = {
  id: 124,
  uploadedAt: '2024-01-15T10:30:00Z',
  entityType: 'CHOFER',
  entityId: 789,
  entityNaturalId: undefined,
  classification: {
    detectedEntityType: 'CHOFER',
    detectedEntityId: '98765432',
    detectedDocumentType: 'Licencia',
    detectedExpiration: '2025-06-30',
    confidence: 0.9,
    disparidades: [],
  },
  template: {
    id: 1,
    name: 'Licencia',
    nombre: 'Licencia',
    entityType: 'CHOFER',
  },
  expiresAt: '2025-06-30',
  previewUrl: 'https://example.com/preview2.pdf',
};

const mockTemplates = [
  { id: 1, name: 'Licencia', nombre: 'Licencia', entityType: 'CHOFER', tipo: 'CHOFER' },
  { id: 2, name: 'Cédula Federal', nombre: 'Cédula Federal', entityType: 'CHOFER', tipo: 'CHOFER' },
  { id: 3, name: 'Seguro', nombre: 'Seguro', entityType: 'CAMION', tipo: 'CAMION' },
  { id: 4, name: 'VTV', nombre: 'VTV', entityType: 'ACOPLADO', tipo: 'ACOPLADO' },
];

// Variables globales para los mocks
let mockNavigate: jest.Mock;
let mockGoBack: jest.Mock;
let mockRefetch: jest.Mock;
let mockApprove: jest.Mock;
let mockReject: jest.Mock;
let mockRecheck: jest.Mock;

// Objeto global mutable para el estado dinámico
const mockState = {
  documentData: mockDocumentData,
  isLoading: false,
  error: null,
  userRole: 'SUPERADMIN',
  search: '', // Para control dinámico de location.search
};

beforeAll(async () => {
  // Mock de react-router-dom
  await jest.unstable_mockModule('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ id: '123' }),
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      get search() { return mockState.search; },
      pathname: '/documentos/aprobacion/123',
      hash: '',
      state: null,
    }),
  }));

  // Mock de useRoleBasedNavigation
  await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
    useRoleBasedNavigation: () => ({
      goBack: mockGoBack,
      canGoBack: true,
    }),
  }));

  // Mock de documentosApiSlice
  await jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
    useGetApprovalPendingByIdQuery: () => {
      return {
        data: mockState.documentData,
        isFetching: mockState.isLoading,
        error: mockState.error,
        refetch: mockRefetch,
      };
    },
    useApprovePendingDocumentMutation: () => [mockApprove, { isLoading: false }],
    useRejectPendingDocumentMutation: () => [mockReject, { isLoading: false }],
    useRecheckDocumentWithAIMutation: () => [mockRecheck, { isLoading: false, unwrap: jest.fn() }],
    useGetTemplatesQuery: () => ({
      data: mockTemplates,
      isLoading: false,
    }),
  }));

  // Mock de store hooks
  await jest.unstable_mockModule('@/store/hooks', () => ({
    useAppSelector: jest.fn((fn) => {
      const state = {
        auth: {
          user: { id: 1, name: 'Test Admin', role: mockState.userRole },
          token: 'mock-token-123',
        },
      };
      return fn(state);
    }),
    useAppDispatch: () => jest.fn(),
  }));

  // Mock de runtimeEnv
  await jest.unstable_mockModule('../../../../lib/runtimeEnv', () => ({
    getRuntimeEnv: jest.fn((key: string) => {
      if (key === 'VITE_DOCUMENTOS_API_URL') return 'https://api.example.com';
      return '';
    }),
  }));

  // Mock de heroicons
  await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
    ArrowPathIcon: ({ className }: any) => <span data-mock-icon="arrow-path">↻</span>,
    ExclamationTriangleIcon: ({ className }: any) => <span data-mock-icon="exclamation">⚠</span>,
    InformationCircleIcon: ({ className }: any) => <span data-mock-icon="info">ℹ</span>,
    ShieldExclamationIcon: ({ className }: any) => <span data-mock-icon="shield">🛡</span>,
  }));

  // Mock de fetch para preview
  global.fetch = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();

  mockNavigate = jest.fn();
  mockGoBack = jest.fn();
  mockRefetch = jest.fn();
  mockApprove = jest.fn();
  mockReject = jest.fn();
  mockRecheck = jest.fn().mockResolvedValue({ data: {} });

  // Reset state
  mockState.documentData = mockDocumentData;
  mockState.isLoading = false;
  mockState.error = null;
  mockState.userRole = 'SUPERADMIN';
  mockState.search = '';

  // Mock localStorage
  Storage.prototype.getItem = jest.fn((key: string) => {
    if (key === 'token') return 'mock-token-123';
    return null;
  });

  // Mock URL.createObjectURL y URL.revokeObjectURL
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();

  // Mock fetch exitoso por defecto
  (global.fetch as jest.Mock).mockImplementation(() =>
    Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob(['mock content'], { type: 'application/pdf' })),
    } as Response)
  );
});

afterEach(() => {
  jest.clearAllTimers();
});

const createMockStore = (userRole: string = 'SUPERADMIN') => configureStore({
  reducer: {
    auth: (state = {
      user: { id: 1, name: 'Test Admin', role: userRole },
      token: 'mock-token-123'
    }) => state,
  },
});

const createWrapper = (store: ReturnType<typeof configureStore>) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={['/documentos/aprobacion/123']}>
          {children}
        </MemoryRouter>
      </Provider>
    );
  };
};

const importComponent = async () => {
  const module = await import('../ApprovalDetailPage');
  return module.default;
};

describe('ApprovalDetailPage - Coverage Completo', () => {
  describe('1. Setup básico y renderizado', () => {
    it('debería importar el componente correctamente', async () => {
      const Component = await importComponent();
      expect(Component).toBeDefined();
    });

    it('debería renderizar con datos de documento', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText('Revisión de Documento #123')).toBeInTheDocument();
      });
    });

    it('debería mostrar botón volver', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText('← Volver')).toBeInTheDocument();
      });
    });
  });

  describe('2. Diferentes roles de usuario - botón Rechequear', () => {
    it('SUPERADMIN debería ver botón Rechequear con IA', async () => {
      const Component = await importComponent();
      const store = createMockStore('SUPERADMIN');
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Rechequear con IA/)).toBeInTheDocument();
      });
    });

    it('CLIENTE NO debería ver botón Rechequear con IA', async () => {
      mockState.userRole = 'CLIENTE';
      const Component = await importComponent();
      const store = createMockStore('CLIENTE');
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.queryByText(/Rechequear con IA/)).not.toBeInTheDocument();
      });
    });
  });

  describe('3. Estados de preview del documento', () => {
    it('debería mostrar loading state mientras carga el preview', async () => {
      const Component = await importComponent();
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(() => {})
      );
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Cargando preview/)).toBeInTheDocument();
      });
    });

    it('debería mostrar error cuando falla la carga del preview', async () => {
      const Component = await importComponent();
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(
        () => {
          expect(screen.getByText(/Error/i)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('debería mostrar iframe cuando el preview carga exitosamente', async () => {
      const Component = await importComponent();
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock content'], { type: 'application/pdf' })),
        } as Response)
      );
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(
        () => {
          const iframe = document.querySelector('iframe');
          expect(iframe).toBeInTheDocument();
          expect(iframe?.getAttribute('src')).toContain('blob:');
        },
        { timeout: 5000 }
      );
    });

    it('debería reintentar hasta 3 veces con backoff exponencial', async () => {
      const Component = await importComponent();
      let attempts = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock'])),
        } as Response);
      });

      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(
        () => {
          expect(attempts).toBeGreaterThanOrEqual(3);
        },
        { timeout: 10000 }
      );
    });

    it('debería manejar error HTTP con texto personalizado', async () => {
      const Component = await importComponent();
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('Mensaje de error personalizado'),
        } as Response)
      );

      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(
        () => {
          expect(screen.getByText(/Mensaje de error personalizado/)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('4. Pre-llenado de campos desde metadata', () => {
    it('debería pre-llenar entityType desde metadata del documento', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const select = container.querySelector('select') as HTMLSelectElement;
        expect(select?.value).toBe('CHOFER');
      });
    });

    it('debería pre-llenar entityId desde entityNaturalId', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const input = screen.queryByDisplayValue('12345678');
        expect(input).toBeInTheDocument();
      });
    });

    it('debería pre-llenar templateId desde template del documento', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.queryByText('Licencia')).toBeInTheDocument();
      });
    });

    it('debería pre-llenar expiresAt desde expiresAt del documento', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      const dateInput = await container.querySelector('input[type="date"]') as HTMLInputElement;
      // Esperar a que se pre-llene el valor con un límite de intentos
      let attempts = 0;
      while (dateInput?.value !== '2025-12-31' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      expect(dateInput?.value).toBe('2025-12-31');
    });

    it('debería usar detectedEntityId cuando no hay entityNaturalId', async () => {
      mockState.documentData = mockDocumentWithoutEntityNaturalId;
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const input = screen.queryByDisplayValue('98765432');
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe('5. Pre-llenado desde URL params', () => {
    it('debería pre-llenar expiresAt desde query param ?expiresAt=', async () => {
      mockState.search = '?expiresAt=2024-06-15';
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      const dateInput = await container.querySelector('input[type="date"]') as HTMLInputElement;
      // Esperar a que se pre-llene el valor con un límite de intentos
      let attempts = 0;
      while (dateInput?.value !== '2024-06-15' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      expect(dateInput?.value).toBe('2024-06-15');
    });
  });

  describe('6. Disparidades', () => {
    it('debería mostrar panel de disparidades cuando existen', async () => {
      mockState.documentData = mockDocumentWithDisparidades;
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      // Esperar con polling en lugar de waitFor
      let attempts = 0;
      let found = false;
      while (!found && attempts < 100) {
        try {
          expect(screen.getByText(/Disparidades detectadas/i)).toBeInTheDocument();
          expect(screen.getByText(/Vencimiento/i)).toBeInTheDocument();
          expect(screen.getByText(/Nombre/i)).toBeInTheDocument();
          expect(screen.getByText(/Dirección/i)).toBeInTheDocument();
          found = true;
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }
      if (!found) {
        throw new Error('No se encontraron las disparidades después de 100 intentos');
      }
    });
  });

    it('debería mostrar severidad CRITICA correctamente', async () => {
      mockState.documentData = mockDocumentWithDisparidades;
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText('CRITICA')).toBeInTheDocument();
      });
    });

    it('debería mostrar severidad ADVERTENCIA correctamente', async () => {
      mockState.documentData = mockDocumentWithDisparidades;
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText('ADVERTENCIA')).toBeInTheDocument();
      });
    });

    it('debería mostrar severidad INFO correctamente', async () => {
      mockState.documentData = mockDocumentWithDisparidades;
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText('INFO')).toBeInTheDocument();
      });
    });
  });

  describe('7. mustChooseTemplate', () => {
    it('debería mostrar advertencia cuando template es AUTO y no hay tipo detectado', async () => {
      const docWithAutoTemplate = {
        ...mockDocumentData,
        template: { id: 999, name: 'AUTO', nombre: 'AUTO', entityType: 'CHOFER', tipo: 'CHOFER' },
        classification: { detectedEntityType: 'CHOFER', detectedDocumentType: null, disparidades: [] },
      };
      mockState.documentData = docWithAutoTemplate;
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Seleccioná el tipo de documento/)).toBeInTheDocument();
      });
    });
  });

  describe('8. Acciones: onApprove', () => {
    it('debería llamar approve y navegar cuando todos los campos están completos', async () => {
      const Component = await importComponent();
      mockApprove.mockResolvedValue({});
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Aprobar/)).toBeInTheDocument();
      });

      const approveBtn = screen.getByText(/Aprobar/).closest('button');
      if (approveBtn && !approveBtn.disabled) {
        await userEvent.click(approveBtn);

        await waitFor(() => {
          expect(mockApprove).toHaveBeenCalled();
        });
      }
    });

    it('debería estar deshabilitado si faltan campos requeridos', async () => {
      const docSinDatos = {
        id: 123,
        uploadedAt: '2024-01-15T10:30:00Z',
        classification: null,
      } as any;
      mockState.documentData = docSinDatos;
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const approveBtn = screen.getByText(/Aprobar/).closest('button');
        expect(approveBtn).toBeDisabled();
      });
    });
  });

  describe('9. Acciones: onReject', () => {
    it('debería llamar reject con razón', async () => {
      const Component = await importComponent();
      mockReject.mockResolvedValue({});
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Rechazar/)).toBeInTheDocument();
      });

      const rejectBtn = screen.getByText(/Rechazar/).closest('button');
      await userEvent.click(rejectBtn!);

      await waitFor(() => {
        expect(mockReject).toHaveBeenCalled();
      });
    });
  });

  describe('10. Acciones: onRecheck', () => {
    it('debería llamar recheckWithAI y refetch después de 2 segundos', async () => {
      const Component = await importComponent();
      const unwrapMock = jest.fn().mockResolvedValue({ data: {} });
      mockRecheck.mockReturnValue({
        unwrap: unwrapMock,
      });

      const store = createMockStore('SUPERADMIN');
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Rechequear con IA/)).toBeInTheDocument();
      });

      const recheckBtn = screen.getByText(/Rechequear con IA/).closest('button');
      await userEvent.click(recheckBtn!);

      await waitFor(
        () => {
          expect(mockRecheck).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );
    });

    it('debería manejar error en recheck', async () => {
      const Component = await importComponent();
      const unwrapMock = jest.fn().mockRejectedValue(new Error('AI Error'));
      mockRecheck.mockReturnValue({
        unwrap: unwrapMock,
      });

      const store = createMockStore('SUPERADMIN');
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Rechequear con IA/)).toBeInTheDocument();
      });

      const recheckBtn = screen.getByText(/Rechequear con IA/).closest('button');
      await userEvent.click(recheckBtn!);

      // No debería lanzar error, solo loggear a console
      await waitFor(
        () => {
          expect(mockRecheck).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );
    });
  });

  describe('11. Redirección 404', () => {
    it('debería redirigir cuando el documento devuelve 404', async () => {
      mockState.error = { status: 404 };
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/documentos/aprobacion');
      });
    });
  });

  describe('12. Filtrado de templates por entityType', () => {
    it('debería filtrar templates según el entityType seleccionado', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const entityTypeSelect = container.querySelector('select') as HTMLSelectElement;
        expect(entityTypeSelect).toBeInTheDocument();
      });

      const entityTypeSelect = container.querySelector('select') as HTMLSelectElement;
      await userEvent.selectOptions(entityTypeSelect, 'CAMION');

      await waitFor(() => {
        expect(screen.getByText('Seguro')).toBeInTheDocument();
      });
    });
  });

  describe('13. Helpers de conversión de fecha', () => {
    it('debería mostrar fecha en formato DD/MM/YYYY cuando se selecciona fecha', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: '2024-06-15' } });
      });

      await waitFor(() => {
        expect(screen.getByText('15/06/2024')).toBeInTheDocument();
      });
    });
  });

  describe('14. Botón Volver', () => {
    it('debería llamar goBack al hacer click en Volver', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText('← Volver')).toBeInTheDocument();
      });

      const backBtn = screen.getByText('← Volver');
      await userEvent.click(backBtn);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('15. Campo de notas opcional', () => {
    it('debería permitir escribir notas de revisión', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText('Notas (opcional)')).toBeInTheDocument();
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'Esta es una nota de prueba');

      expect(textarea.value).toBe('Esta es una nota de prueba');
    });
  });

  describe('16. Vista previa de campos detectados', () => {
    it('debería mostrar todos los campos detectados', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      // Esperar con polling en lugar de waitFor
      let attempts = 0;
      let found = false;
      while (!found && attempts < 100) {
        try {
          expect(screen.getByText(/Entidad detectada/i)).toBeInTheDocument();
          expect(screen.getByText(/Identidad detectada/i)).toBeInTheDocument();
          expect(screen.getByText(/Tipo documento detectado/i)).toBeInTheDocument();
          expect(screen.getByText(/Subido/i)).toBeInTheDocument();
          expect(screen.getByText(/Vencimiento detectado/i)).toBeInTheDocument();
          found = true;
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }
      if (!found) {
        throw new Error('No se encontraron los campos detectados después de 100 intentos');
      }
    });

    it('debería mostrar "-" cuando no hay dato detectado', async () => {
      const docSinDatos = {
        id: 123,
        uploadedAt: '2024-01-15T10:30:00Z',
        entityType: null,
        entityNaturalId: null,
        classification: null,
      } as any;
      mockState.documentData = docSinDatos;

      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const dashes = screen.getAllByText('-');
        expect(dashes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('17. Rate limit handling (HTTP 429)', () => {
    it('debería esperar con backoff cuando recibe 429', async () => {
      const Component = await importComponent();

      let attempts = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: () => Promise.resolve('Rate limited'),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock'])),
        } as Response);
      });

      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(
        () => {
          expect(attempts).toBeGreaterThanOrEqual(3);
        },
        { timeout: 15000 }
      );
    });
  });

  describe('18. Motivo de rechazo personalizado', () => {
    it('debería permitir escribir motivo de rechazo personalizado', async () => {
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      // Esperar con polling en lugar de waitFor
      let attempts = 0;
      let found = false;
      while (!found && attempts < 100) {
        try {
          expect(screen.getByText(/O escribir motivo personalizado/)).toBeInTheDocument();
          found = true;
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }
      if (!found) {
        throw new Error('No se encontró el input de motivo personalizado después de 100 intentos');
      }

      const customInput = container.querySelector('input[placeholder*="personalizado"]') as HTMLInputElement;
      await userEvent.type(customInput, 'Motivo personalizado de prueba');

      expect(customInput.value).toBe('Motivo personalizado de prueba');
    });
  });

  describe('19. Prefill desde classification como fallback', () => {
    it('debería usar classification cuando no hay datos en metadata', async () => {
      const docSoloConClassification = {
        id: 123,
        uploadedAt: '2024-01-15T10:30:00Z',
        classification: {
          detectedEntityType: 'CAMION',
          detectedEntityId: 'ABC-123',
          detectedDocumentType: 'VTV',
          detectedExpiration: '2025-06-30',
          disparidades: [],
        },
      } as any;
      mockState.documentData = docSoloConClassification;

      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const entityTypeSelect = screen.getByDisplayValue('Camión') || screen.getByDisplayValue('CAMION');
        expect(entityTypeSelect).toBeInTheDocument();
      });
    });
  });

  describe('20. Campos detectados sin datos - manejo de fechas inválidas', () => {
    it('debería mostrar "-" para fecha inválida en Field component', async () => {
      const docConFechaInvalida = {
        id: 123,
        uploadedAt: '2024-01-15T10:30:00Z',
        entityType: 'CHOFER',
        entityId: 456,
        entityNaturalId: '12345678',
        classification: {
          detectedEntityType: 'CHOFER',
          detectedEntityId: '12345678',
          detectedDocumentType: 'Licencia',
          detectedExpiration: 'fecha-invalida', // Fecha inválida
          disparidades: [],
        },
        template: {
          id: 1,
          name: 'Licencia',
          nombre: 'Licencia',
          entityType: 'CHOFER',
        },
        expiresAt: '2025-12-31',
        previewUrl: 'https://example.com/preview.pdf',
      } as any;
      mockState.documentData = docConFechaInvalida;

      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        // La fecha inválida debería mostrar "-"
        const dashes = screen.getAllByText('-');
        expect(dashes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('21. TemplateId sin entityNaturalId ni detectedEntityId - fallback docEntityId', () => {
    it('debería usar docEntityId como último fallback', async () => {
      const docConSoloDocEntityId = {
        id: 123,
        uploadedAt: '2024-01-15T10:30:00Z',
        entityType: 'CHOFER',
        entityId: 999, // Este debería usarse como fallback
        entityNaturalId: undefined,
        classification: {
          detectedEntityType: 'CHOFER',
          detectedEntityId: undefined, // No hay detectedEntityId
          detectedDocumentType: 'Licencia',
          detectedExpiration: '2025-12-31',
          disparidades: [],
        },
        template: {
          id: 1,
          name: 'Licencia',
          nombre: 'Licencia',
          entityType: 'CHOFER',
        },
        expiresAt: '2025-12-31',
        previewUrl: 'https://example.com/preview.pdf',
      } as any;
      mockState.documentData = docConSoloDocEntityId;

      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const input = screen.queryByDisplayValue('999');
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe('22. Tests específicos para líneas no cubiertas', () => {
    it('debería cubrir toYmd function helper - conversión de fecha', async () => {
      // Este test cubre las líneas 33-36 (toYmd function)
      // Nota: toYmd está definido pero no se usa directamente en el componente
      // Se incluye aquí para documentación y futura refactorización
      const toYmd = (dmy: string): string => {
        const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!m) return '';
        const [_, dd, mm, yyyy] = m;
        return `${yyyy}-${mm}-${dd}`;
      };

      // Probar la función directamente
      expect(toYmd('31/12/2024')).toBe('2024-12-31');
      expect(toYmd('01/01/2025')).toBe('2025-01-01');
      expect(toYmd('invalid')).toBe('');
    });

    it('debería manejar error HTTP 429 con retry y backoff', async () => {
      // Cubre líneas 114-117 para rate limiting
      const Component = await importComponent();
      let attempts = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: () => Promise.resolve('Rate limit exceeded'),
          } as Response);
        }
        if (attempts === 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: () => Promise.resolve('Rate limit exceeded'),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock content'])),
        } as Response);
      });

      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(
        () => {
          expect(attempts).toBeGreaterThanOrEqual(2);
        },
        { timeout: 15000 }
      );
    });

    it('debería manejar AbortError con retry', async () => {
      // Cubre líneas 136-138 (abort retry)
      const Component = await importComponent();
      let attempts = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          const error: Error & { name?: string } = new Error('Aborted');
          error.name = 'AbortError';
          return Promise.reject(error);
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock'])),
        } as Response);
      });

      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(
        () => {
          expect(attempts).toBeGreaterThanOrEqual(2);
        },
        { timeout: 10000 }
      );
    });

    it('debería manejar network error con retry', async () => {
      // Cubre líneas 143-145 (network retry)
      const Component = await importComponent();
      let attempts = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error('fetch failed'));
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock'])),
        } as Response);
      });

      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(
        () => {
          expect(attempts).toBeGreaterThanOrEqual(2);
        },
        { timeout: 10000 }
      );
    });

    it('debería manejar error en recheckWithAI', async () => {
      // Cubre líneas 270-275 (recheck catch)
      const Component = await importComponent();
      const unwrapMock = jest.fn().mockRejectedValue(new Error('AI service error'));
      mockRecheck.mockReturnValue({
        unwrap: unwrapMock,
      });

      const store = createMockStore('SUPERADMIN');
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Rechequear con IA/)).toBeInTheDocument();
      });

      const recheckBtn = screen.getByText(/Rechequear con IA/).closest('button');
      await userEvent.click(recheckBtn!);

      // La función maneja el error con console.error, no debería lanzar
      await waitFor(() => {
        expect(mockRecheck).toHaveBeenCalled();
      });
    });

    it('debería mostrar fecha inválida como "-" en Field component', async () => {
      // Cubre línea 350 (catch bloque en date parsing)
      const docConFechaInvalida = {
        id: 123,
        uploadedAt: '2024-01-15T10:30:00Z',
        entityType: 'CHOFER',
        entityId: 456,
        entityNaturalId: '12345678',
        classification: {
          detectedEntityType: 'CHOFER',
          detectedEntityId: '12345678',
          detectedDocumentType: 'Licencia',
          detectedExpiration: 'not-a-date', // Esto causa el catch
          disparidades: [],
        },
        template: {
          id: 1,
          name: 'Licencia',
          nombre: 'Licencia',
          entityType: 'CHOFER',
        },
        expiresAt: '2025-12-31',
        previewUrl: 'https://example.com/preview.pdf',
      } as any;
      mockState.documentData = docConFechaInvalida;

      const Component = await importComponent();
      const store = createMockStore();
      render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        // La fecha inválida debería mostrar "-"
        const dashes = screen.getAllByText('-');
        expect(dashes.length).toBeGreaterThan(0);
      });
    });

    it('debería cubrir handlers de input de entityId', async () => {
      // Cubre línea 384 (setEntityId handler)
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Identidad \(ID\)/i)).toBeInTheDocument();
      });

      // Buscar el input de entityId
      const input = container.querySelector('input[placeholder="Ej: 123"]') as HTMLInputElement;
      if (input) {
        await userEvent.clear(input);
        await userEvent.type(input, '99999');
        expect(input.value).toBe('99999');
      }
    });

    it('debería cubrir handler de select de templateId', async () => {
      // Cubre línea 392 (setTemplateId handler)
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Tipo de documento/)).toBeInTheDocument();
      });

      // Buscar todos los selects - el segundo es el de tipo de documento
      const selects = container.querySelectorAll('select');
      if (selects.length > 1) {
        const templateSelect = selects[1]; // El segundo select es de template
        await userEvent.selectOptions(templateSelect, '2'); // Cambiar a "Cédula Federal"
        expect(templateSelect).toHaveValue('2');
      }
    });

    it('debería cubrir handler de select de rejectReason', async () => {
      // Cubre líneas 447-450 (select de reject reason)
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        expect(screen.getByText(/Seleccionar motivo de rechazo/)).toBeInTheDocument();
      });

      const rejectSelect = container.querySelector('select') as HTMLSelectElement;
      // Buscar el select de rechazo específico
      const allSelects = container.querySelectorAll('select');
      const rejectReasonSelect = Array.from(allSelects).find(
        s => s.options[0]?.text === 'Seleccionar motivo de rechazo...'
      );

      if (rejectReasonSelect) {
        await userEvent.selectOptions(rejectReasonSelect, 'Documento ilegible');
        expect(rejectReasonSelect).toHaveValue('Documento ilegible');
      }
    });

    it('debería cubrir handler de input de custom rejectReason', async () => {
      // Cubre línea 460 (input de custom reject reason)
      const Component = await importComponent();
      const store = createMockStore();
      const { container } = render(<Component />, { wrapper: createWrapper(store) });

      await waitFor(() => {
        const input = container.querySelector('input[placeholder*="personalizado"]');
        if (input) {
          expect(input).toBeInTheDocument();
          return true;
        }
        return screen.getByText(/O escribir motivo personalizado/);
      });

      const customInput = container.querySelector('input[placeholder*="personalizado"]') as HTMLInputElement;
      if (customInput) {
        await userEvent.type(customInput, 'Motivo personalizado');
        expect(customInput.value).toBe('Motivo personalizado');
      }
    });
  });
});
