// Tests completos de `EvolutionConfigPage`: configuración de Evolution API (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('EvolutionConfigPage - render completo con coverage', () => {
  let EvolutionConfigPage: React.FC;
  let mockGoBack: jest.Mock;
  let mockFetch: jest.Mock;

  beforeAll(async () => {
    mockGoBack = jest.fn();

    // Mock de useRoleBasedNavigation
    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
      useRoleBasedNavigation: () => ({ goBack: mockGoBack }),
    }));

    // Mock de getRuntimeEnv
    await jest.unstable_mockModule('../../../../lib/runtimeEnv', () => ({
      getRuntimeEnv: (key: string) => {
        if (key === 'VITE_DOCUMENTOS_API_URL') return 'http://localhost:3000';
        return '';
      },
      getRuntimeFlag: () => false,
    }));

    const module = await import('../EvolutionConfigPage');
    EvolutionConfigPage = module.default;
  });

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = (overrides = {}) => {
    const mockStore = configureStore({
      reducer: {
        auth: () => ({
          token: 'test-token',
          user: { empresaId: 123 },
        }),
      },
    });

    return render(
      <Provider store={mockStore}>
        <EvolutionConfigPage />
      </Provider>
    );
  };

  it('muestra loading mientras carga la configuración', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderPage();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('carga y muestra la configuración existente', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { server: 'https://api.evolution.com', token: 'abc123', instance: 'inst01' },
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://api.evolution.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('abc123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('inst01')).toBeInTheDocument();
    });
  });

  it('muestra error si falla la carga de configuración', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar la configuración')).toBeInTheDocument();
    });
  });

  it('muestra título y botón volver', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { server: '', token: '', instance: '' } }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Configuración Evolution API')).toBeInTheDocument();
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });
  });

  it('navega atrás al hacer click en Volver', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { server: '', token: '', instance: '' } }),
    });

    renderPage();

    await waitFor(() => {
      const volverButton = screen.getByText('Volver');
      fireEvent.click(volverButton);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('actualiza los inputs cuando el usuario escribe', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { server: '', token: '', instance: '' } }),
    });

    renderPage();

    await waitFor(() => {
      const serverInput = screen.getByPlaceholderText('https://evolution.example.com');
      const tokenInput = screen.getByPlaceholderText('token');
      const instanceInput = screen.getByPlaceholderText('instancia');

      fireEvent.change(serverInput, { target: { value: 'https://new-server.com' } });
      fireEvent.change(tokenInput, { target: { value: 'new-token' } });
      fireEvent.change(instanceInput, { target: { value: 'new-instance' } });

      expect(serverInput).toHaveValue('https://new-server.com');
      expect(tokenInput).toHaveValue('new-token');
      expect(instanceInput).toHaveValue('new-instance');
    });
  });

  it('guarda la configuración exitosamente', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { server: '', token: '', instance: '' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    renderPage();

    await waitFor(() => {
      const serverInput = screen.getByPlaceholderText('https://evolution.example.com');
      fireEvent.change(serverInput, { target: { value: 'https://saved.com' } });

      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/docs/evolution',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('https://saved.com'),
        })
      );
      expect(screen.getByText('Configuración guardada')).toBeInTheDocument();
    });
  });

  it('muestra error si falla el guardado', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { server: '', token: '', instance: '' } }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Error al guardar')).toBeInTheDocument();
    });
  });

  it('deshabilita botón Guardar mientras se guarda', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { server: '', token: '', instance: '' } }),
      })
      .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    renderPage();

    await waitFor(() => {
      const saveButton = screen.getByText('Guardar');
      fireEvent.click(saveButton);

      expect(screen.getByText('Guardando...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  it('prueba la conexión exitosamente', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { server: '', token: '', instance: '' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Conexión exitosa' }),
      });

    renderPage();

    await waitFor(() => {
      const testButton = screen.getByText('Probar conexión');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/docs/evolution/test',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(screen.getByText('Conexión exitosa')).toBeInTheDocument();
    });
  });

  it('muestra error si falla la prueba de conexión', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { server: '', token: '', instance: '' } }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      const testButton = screen.getByText('Probar conexión');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Error al probar conexión')).toBeInTheDocument();
    });
  });

  it('muestra OK si la prueba de conexión devuelve success=true', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { server: '', token: '', instance: '' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    renderPage();

    await waitFor(() => {
      const testButton = screen.getByText('Probar conexión');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      expect(screen.getByText('OK')).toBeInTheDocument();
    });
  });

  it('oculta el mensaje anterior al realizar una nueva acción', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { server: '', token: '', instance: '' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    renderPage();

    const saveButton = await screen.findByText('Guardar');

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuración guardada')).toBeInTheDocument();
    });

    // Al hacer click en Guardar de nuevo, el mensaje debería desaparecer
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText('Configuración guardada')).not.toBeInTheDocument();
    });
  });
});

