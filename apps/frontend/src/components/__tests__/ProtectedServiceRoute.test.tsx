import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('ProtectedServiceRoute', () => {
  let useServiceConfigResult: any = {};
  let ProtectedServiceRoute: React.FC<any>;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let Routes: typeof import('react-router-dom').Routes;
  let Route: typeof import('react-router-dom').Route;

  beforeAll(async () => {
    await jest.unstable_mockModule('../../hooks/useServiceConfig', () => ({
      useServiceConfig: () => useServiceConfigResult,
    }));
    ({ ProtectedServiceRoute } = await import('../ProtectedServiceRoute'));
    ({ MemoryRouter, Routes, Route } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra loading cuando isLoading=true', async () => {
    useServiceConfigResult = {
      config: {},
      isLoading: true,
      error: null,
      summary: { enabledServices: [] },
    };

    render(
      <MemoryRouter initialEntries={['/documentos']}>
        <Routes>
          <Route
            path="/documentos"
            element={
              <ProtectedServiceRoute service="documentos">
                <div>child</div>
              </ProtectedServiceRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Verificando disponibilidad/i)).toBeInTheDocument();
  });

  it('redirige al fallback cuando hay error y showMessage=false', async () => {
    useServiceConfigResult = {
      config: {},
      isLoading: false,
      error: new Error('boom'),
      summary: { enabledServices: [] },
    };

    render(
      <MemoryRouter initialEntries={['/documentos']}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route
            path="/documentos"
            element={
              <ProtectedServiceRoute service="documentos" fallbackPath="/" showMessage={false}>
                <div>child</div>
              </ProtectedServiceRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('muestra mensaje cuando hay error y showMessage=true', async () => {
    useServiceConfigResult = {
      config: {},
      isLoading: false,
      error: new Error('boom'),
      summary: { enabledServices: [] },
    };

    render(
      <MemoryRouter initialEntries={['/documentos']}>
        <Routes>
          <Route
            path="/documentos"
            element={
              <ProtectedServiceRoute service="documentos" showMessage>
                <div>child</div>
              </ProtectedServiceRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Error de Configuración/i)).toBeInTheDocument();
  });

  it('redirige al fallback cuando el servicio está deshabilitado y showMessage=false', async () => {
    useServiceConfigResult = {
      config: { documentos: { enabled: false, name: 'Documentos' } },
      isLoading: false,
      error: null,
      summary: { enabledServices: ['remitos'] },
    };

    render(
      <MemoryRouter initialEntries={['/documentos']}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route
            path="/documentos"
            element={
              <ProtectedServiceRoute service="documentos" fallbackPath="/" showMessage={false}>
                <div>child</div>
              </ProtectedServiceRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('muestra mensaje cuando el servicio está deshabilitado y showMessage=true', async () => {
    useServiceConfigResult = {
      config: { documentos: { enabled: false, name: 'Documentos' } },
      isLoading: false,
      error: null,
      summary: { enabledServices: ['remitos'] },
    };

    render(
      <MemoryRouter initialEntries={['/documentos']}>
        <Routes>
          <Route
            path="/documentos"
            element={
              <ProtectedServiceRoute service="documentos" showMessage>
                <div>child</div>
              </ProtectedServiceRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Servicio No Disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/Los servicios disponibles son:/i)).toBeInTheDocument();
  });

  it('renderiza children cuando el servicio está habilitado', async () => {
    useServiceConfigResult = {
      config: { documentos: { enabled: true, name: 'Documentos' } },
      isLoading: false,
      error: null,
      summary: { enabledServices: ['documentos'] },
    };

    render(
      <MemoryRouter initialEntries={['/documentos']}>
        <Routes>
          <Route
            path="/documentos"
            element={
              <ProtectedServiceRoute service="documentos">
                <div>child</div>
              </ProtectedServiceRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('child')).toBeInTheDocument();
  });
});


