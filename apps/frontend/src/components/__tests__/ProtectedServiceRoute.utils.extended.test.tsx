/**
 * Tests extendidos para ProtectedServiceRoute.utils
 * Incrementa coverage cubriendo useCanAccessService y edge cases
 */
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

describe('ProtectedServiceRoute.utils (extended)', () => {
  let useCanAccessService: (service: 'documentos') => {
    canAccess: boolean;
    isLoading: boolean;
    error: string | null;
    serviceName: string;
  };
  let withServiceProtectionFactory: any;
  let mockUseServiceConfig: any;

  beforeAll(async () => {
    mockUseServiceConfig = {
      config: {
        documentos: { enabled: true, name: 'Documentos Service' },
      },
      isLoading: false,
      error: null,
    };

    await jest.unstable_mockModule('../../hooks/useServiceConfig', () => ({
      useServiceConfig: () => mockUseServiceConfig,
    }));

    const module = await import('../ProtectedServiceRoute.utils');
    useCanAccessService = module.useCanAccessService;
    withServiceProtectionFactory = module.withServiceProtectionFactory;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServiceConfig.config = {
      documentos: { enabled: true, name: 'Documentos Service' },
    };
    mockUseServiceConfig.isLoading = false;
    mockUseServiceConfig.error = null;
  });

  describe('useCanAccessService', () => {
    it('debe retornar canAccess true cuando servicio está habilitado', () => {
      const TestComponent = () => {
        const result = useCanAccessService('documentos');
        return (
          <div>
            <span data-testid="canAccess">{result.canAccess.toString()}</span>
            <span data-testid="serviceName">{result.serviceName}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('canAccess').textContent).toBe('true');
      expect(screen.getByTestId('serviceName').textContent).toBe('Documentos Service');
    });

    it('debe retornar canAccess false cuando está cargando', () => {
      mockUseServiceConfig.isLoading = true;
      
      const TestComponent = () => {
        const result = useCanAccessService('documentos');
        return <span data-testid="canAccess">{result.canAccess.toString()}</span>;
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('canAccess').textContent).toBe('false');
    });

    it('debe retornar canAccess false cuando hay error', () => {
      mockUseServiceConfig.error = 'Error de configuración';
      
      const TestComponent = () => {
        const result = useCanAccessService('documentos');
        return (
          <div>
            <span data-testid="canAccess">{result.canAccess.toString()}</span>
            <span data-testid="error">{result.error || 'none'}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('canAccess').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('Error de configuración');
    });

    it('debe retornar canAccess false cuando servicio deshabilitado', () => {
      mockUseServiceConfig.config.documentos.enabled = false;
      
      const TestComponent = () => {
        const result = useCanAccessService('documentos');
        return <span data-testid="canAccess">{result.canAccess.toString()}</span>;
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('canAccess').textContent).toBe('false');
    });

    it('debe retornar canAccess true cuando servicio no existe (default true)', () => {
      mockUseServiceConfig.config = {};
      
      const TestComponent = () => {
        const result = useCanAccessService('documentos');
        return <span data-testid="canAccess">{result.canAccess.toString()}</span>;
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('canAccess').textContent).toBe('true');
    });

    it('debe retornar serviceName del servicio cuando no hay nombre configurado', () => {
      mockUseServiceConfig.config = {};
      
      const TestComponent = () => {
        const result = useCanAccessService('documentos');
        return <span data-testid="serviceName">{result.serviceName}</span>;
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('serviceName').textContent).toBe('documentos');
    });

    it('debe retornar isLoading del hook', () => {
      mockUseServiceConfig.isLoading = true;
      
      const TestComponent = () => {
        const result = useCanAccessService('documentos');
        return <span data-testid="isLoading">{result.isLoading.toString()}</span>;
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('isLoading').textContent).toBe('true');
    });
  });

  describe('withServiceProtectionFactory', () => {
    it('debe crear un HOC funcional', () => {
      const MockProtectedServiceRoute = jest.fn(({ children }: any) => (
        <div data-testid="protected">{children}</div>
      ));
      
      const factory = withServiceProtectionFactory(MockProtectedServiceRoute as any);
      const hoc = factory('documentos', '/fallback');
      
      const MockComponent: React.FC = () => <span>Inner Content</span>;
      const ProtectedComponent = hoc(MockComponent);

      render(<ProtectedComponent />);

      expect(MockProtectedServiceRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'documentos',
          fallbackPath: '/fallback',
        }),
        expect.anything()
      );
      expect(screen.getByText('Inner Content')).toBeInTheDocument();
    });

    it('debe funcionar sin fallbackPath', () => {
      const MockProtectedServiceRoute = jest.fn(({ children }: any) => (
        <div>{children}</div>
      ));
      
      const factory = withServiceProtectionFactory(MockProtectedServiceRoute as any);
      const hoc = factory('documentos');
      
      const MockComponent: React.FC = () => <span>Test</span>;
      const ProtectedComponent = hoc(MockComponent);

      render(<ProtectedComponent />);

      expect(MockProtectedServiceRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'documentos',
          fallbackPath: undefined,
        }),
        expect.anything()
      );
    });

    it('debe pasar props al componente envuelto', () => {
      const MockProtectedServiceRoute = jest.fn(({ children }: any) => (
        <div>{children}</div>
      ));
      
      const factory = withServiceProtectionFactory(MockProtectedServiceRoute as any);
      const hoc = factory('documentos');
      
      interface TestProps {
        testProp: string;
      }
      
      const MockComponent: React.FC<TestProps> = ({ testProp }) => (
        <span data-testid="prop">{testProp}</span>
      );
      const ProtectedComponent = hoc(MockComponent);

      render(<ProtectedComponent testProp="test value" />);

      expect(screen.getByTestId('prop').textContent).toBe('test value');
    });

    it('debe manejar componente sin displayName ni name', () => {
      const MockProtectedServiceRoute = jest.fn(({ children }: any) => (
        <div>{children}</div>
      ));
      
      const factory = withServiceProtectionFactory(MockProtectedServiceRoute as any);
      const hoc = factory('documentos');
      
      // Componente anónimo
      const ProtectedComponent = hoc(() => <span>Anonymous</span>);

      // Debe tener un displayName aunque el componente sea anónimo
      expect(ProtectedComponent.displayName).toContain('withServiceProtection');
    });
  });
});

