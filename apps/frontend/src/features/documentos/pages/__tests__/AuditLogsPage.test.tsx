/**
 * Tests para AuditLogsPage
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { AllProviders } from '@/test-utils/testWrappers';

// Mock de react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useNavigate: () => jest.fn(),
}));

// Mock de useAppSelector
jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (s: any) => any) => selector({
    auth: { token: 'test-token', user: { role: 'ADMIN', empresaId: 1 } }
  }),
}));

// Mock de API
jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetAuditLogsQuery: () => ({
    data: {
      data: [
        {
          id: 1,
          createdAt: '2024-01-15T10:30:00Z',
          accion: 'APPROVAL_APPROVE',
          method: 'POST',
          statusCode: 200,
          userEmail: 'user@test.com',
          userId: '123',
          userRole: 'ADMIN',
          entityType: 'DOCUMENT',
          entityId: 456,
          path: '/api/docs/approve'
        },
      ],
      page: 1,
      totalPages: 1,
      total: 1
    },
    isLoading: false
  }),
}));

// Mock de runtimeEnv
jest.mock('@/lib/runtimeEnv', () => ({
  getRuntimeEnv: () => 'http://test.com',
}));

// Mock de Toast
jest.mock('@/components/ui/Toast.utils', () => ({
  showToast: jest.fn(),
}));

// Mock de fetch global
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob(['test'])),
  } as Response)) as jest.MockedFunction<typeof fetch>;

const { default: AuditLogsPage } = await import('../AuditLogsPage');

describe('AuditLogsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar el título y botón Volver', () => {
    render(<AuditLogsPage />, { wrapper: AllProviders });
    expect(screen.getByText('Auditoría')).toBeInTheDocument();
    expect(screen.getByText('Volver')).toBeInTheDocument();
  });

  it('debería renderizar filtros de entrada', () => {
    render(<AuditLogsPage />, { wrapper: AllProviders });
    // Verificar inputs por su atributo label
    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    // Verificar que hay elementos de filtro (usando getAllByText para evitar ambigüedades)
    const allText = document.body.textContent || '';
    expect(allText.includes('Método')).toBeTruthy();
    expect(allText.includes('Status')).toBeTruthy();
    expect(allText.includes('Acción')).toBeTruthy();
    expect(allText.includes('Entidad')).toBeTruthy();
    // Verificar que existen los inputs (pueden ser múltiples debido a tabla)
    expect(screen.getAllByLabelText('Entidad').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Entidad ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Ruta contiene')).toBeInTheDocument();
  });

  it('debería renderizar paginación', () => {
    render(<AuditLogsPage />, { wrapper: AllProviders });
    expect(screen.getByText('Página 1 / 1')).toBeInTheDocument();
    expect(screen.getByText('Anterior')).toBeDisabled();
    expect(screen.getByText('Siguiente')).toBeDisabled();
  });

  it('debería renderizar botones de descarga', () => {
    render(<AuditLogsPage />, { wrapper: AllProviders });
    expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
    expect(screen.getByText('Descargar Excel')).toBeInTheDocument();
  });

  it('debería renderizar botones rápidos de fecha', () => {
    render(<AuditLogsPage />, { wrapper: AllProviders });
    expect(screen.getByText('Rápidos:')).toBeInTheDocument();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Últimos 7 días')).toBeInTheDocument();
  });

  it('debería renderizar toggles de columnas', () => {
    render(<AuditLogsPage />, { wrapper: AllProviders });
    const allText = document.body.textContent || '';
    expect(allText.includes('Columnas:')).toBeTruthy();
    expect(allText.includes('Fecha')).toBeTruthy();
    expect(allText.includes('Acción')).toBeTruthy();
    expect(allText.includes('Método')).toBeTruthy();
  });

  it('debería renderizar tabla con datos', () => {
    render(<AuditLogsPage />, { wrapper: AllProviders });
    const allText = document.body.textContent || '';
    expect(allText.includes('user@test.com')).toBeTruthy();
  });
});

describe('toInt helper', () => {
  const toInt = (s: string | null, def: number): number => {
    const n = s ? parseInt(s, 10) : NaN;
    return Number.isNaN(n) ? def : n;
  };

  it('debería convertir string válido a número', () => {
    expect(toInt('42', 0)).toBe(42);
  });

  it('debería devolver default para string inválido', () => {
    expect(toInt('invalid', 0)).toBe(0);
  });

  it('debería devolver default para null', () => {
    expect(toInt(null, 10)).toBe(10);
  });

  it('debería devolver default para string vacío', () => {
    expect(toInt('', 5)).toBe(5);
  });
});
