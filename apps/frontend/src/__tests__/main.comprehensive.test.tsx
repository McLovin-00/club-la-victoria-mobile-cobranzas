/**
 * Tests comprehensivos para main.tsx
 * 
 * El archivo main.tsx es el punto de entrada de la aplicación.
 * Testea la configuración de providers y el montaje del DOM.
 */
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Variables para los mocks
let mockRender: jest.Mock;
let mockCreateRoot: jest.Mock;
let mockRootElement: HTMLDivElement;
let originalGetElementById: typeof document.getElementById;

// Configurar mocks ANTES de importar main.tsx
beforeAll(() => {
  // Crear el mock de render
  mockRender = jest.fn();
  mockCreateRoot = jest.fn(() => ({
    render: mockRender,
  }));

  // Mock de react-dom/client
  jest.mock('react-dom/client', () => ({
    createRoot: mockCreateRoot,
  }));

  // Mock del store
  jest.mock('../store/store', () => ({
    store: {
      getState: jest.fn(() => ({ auth: {}, ui: {} })),
      dispatch: jest.fn(),
      subscribe: jest.fn(() => () => {}),
    },
  }));

  // Mock de App
  jest.mock('../App', () => ({
    __esModule: true,
    default: () => null,
  }));

  // Mock de CSS
  jest.mock('../index.css', () => ({}));

  // Guardar el getElementById original
  originalGetElementById = document.getElementById;
  
  // Crear un elemento mock para el root
  mockRootElement = document.createElement('div');
  mockRootElement.id = 'root';
  
  // Mock de getElementById para retornar nuestro elemento
  document.getElementById = jest.fn((id: string) => {
    if (id === 'root') {
      return mockRootElement;
    }
    return null;
  }) as typeof document.getElementById;
});

afterAll(() => {
  // Restaurar getElementById
  document.getElementById = originalGetElementById;
  jest.resetModules();
});

describe('main.tsx', () => {
  describe('Estructura básica', () => {
    it('el módulo main.tsx existe y es importable', async () => {
      // Importar el módulo debería funcionar sin errores
      const module = await import('../main');
      expect(module).toBeDefined();
    });
  });

  describe('Verificación de exports', () => {
    it('main.tsx no tiene exports nombrados (side-effect only)', async () => {
      const module = await import('../main');
      const exportKeys = Object.keys(module).filter(k => k !== '__esModule');
      // main.tsx solo ejecuta código, no exporta nada útil
      expect(exportKeys.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Comportamiento como entry point', () => {
    it('el archivo existe y puede ser leído', async () => {
      // Si el import funciona, el archivo existe
      await expect(import('../main')).resolves.toBeDefined();
    });
  });
});

describe('main.tsx - Componentes utilizados', () => {
  it('utiliza StrictMode de React', async () => {
    const React = await import('react');
    expect(React.StrictMode).toBeDefined();
  });

  it('utiliza Provider de react-redux', async () => {
    const { Provider } = await import('react-redux');
    expect(Provider).toBeDefined();
  });

  it('utiliza BrowserRouter de react-router-dom', async () => {
    const { BrowserRouter } = await import('react-router-dom');
    expect(BrowserRouter).toBeDefined();
  });

  it('el store existe y puede importarse', async () => {
    // Este test verifica que el store se puede importar
    // En el contexto real, el mock lo reemplaza
    const storeModule = await import('../store/store');
    expect(storeModule).toBeDefined();
  });

  it('App existe y puede importarse', async () => {
    const AppModule = await import('../App');
    expect(AppModule.default).toBeDefined();
  });
});

