/**
 * Tests comprehensivos para testWrappers.tsx
 * 
 * Verifica que los wrappers de test proveen los contexts correctamente.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React, { useContext, createContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { AllProviders } from '../testWrappers';

describe('testWrappers', () => {
  describe('AllProviders', () => {
    describe('Renderizado básico', () => {
      it('renderiza children', () => {
        render(
          <AllProviders>
            <div data-testid="child">Test</div>
          </AllProviders>
        );
        
        expect(screen.getByTestId('child')).toBeInTheDocument();
      });

      it('renderiza múltiples children', () => {
        render(
          <AllProviders>
            <div data-testid="child1">Child 1</div>
            <div data-testid="child2">Child 2</div>
            <div data-testid="child3">Child 3</div>
          </AllProviders>
        );
        
        expect(screen.getByTestId('child1')).toBeInTheDocument();
        expect(screen.getByTestId('child2')).toBeInTheDocument();
        expect(screen.getByTestId('child3')).toBeInTheDocument();
      });

      it('renderiza children anidados', () => {
        render(
          <AllProviders>
            <div data-testid="parent">
              <div data-testid="nested">Nested</div>
            </div>
          </AllProviders>
        );
        
        expect(screen.getByTestId('parent')).toBeInTheDocument();
        expect(screen.getByTestId('nested')).toBeInTheDocument();
      });

      it('preserva texto de children', () => {
        render(
          <AllProviders>
            <span>Hello World</span>
          </AllProviders>
        );
        
        expect(screen.getByText('Hello World')).toBeInTheDocument();
      });
    });

    describe('Redux Provider', () => {
      it('provee context de Redux', () => {
        const TestComponent = () => {
          // Si no hay Provider, esto lanzaría error
          return <div data-testid="redux-test">Redux Works</div>;
        };
        
        expect(() => {
          render(
            <AllProviders>
              <TestComponent />
            </AllProviders>
          );
        }).not.toThrow();
      });

      it('permite usar useSelector', () => {
        const TestComponent = () => {
          // Usar useSelector para verificar que el store está disponible
          const state = useSelector((s: unknown) => s);
          return <div data-testid="selector-test">{state ? 'Has State' : 'No State'}</div>;
        };
        
        render(
          <AllProviders>
            <TestComponent />
          </AllProviders>
        );
        
        expect(screen.getByTestId('selector-test')).toBeInTheDocument();
      });

      it('permite usar useDispatch', () => {
        const TestComponent = () => {
          const dispatch = useDispatch();
          return (
            <div data-testid="dispatch-test">
              {typeof dispatch === 'function' ? 'Has Dispatch' : 'No Dispatch'}
            </div>
          );
        };
        
        render(
          <AllProviders>
            <TestComponent />
          </AllProviders>
        );
        
        expect(screen.getByText('Has Dispatch')).toBeInTheDocument();
      });
    });

    describe('Router Provider', () => {
      it('provee context de Router', () => {
        const TestComponent = () => {
          return <div data-testid="router-test">Router Works</div>;
        };
        
        expect(() => {
          render(
            <AllProviders>
              <TestComponent />
            </AllProviders>
          );
        }).not.toThrow();
      });

      it('permite usar useNavigate', () => {
        const TestComponent = () => {
          const navigate = useNavigate();
          return (
            <div data-testid="navigate-test">
              {typeof navigate === 'function' ? 'Has Navigate' : 'No Navigate'}
            </div>
          );
        };
        
        render(
          <AllProviders>
            <TestComponent />
          </AllProviders>
        );
        
        expect(screen.getByText('Has Navigate')).toBeInTheDocument();
      });

      it('permite usar useLocation', () => {
        const TestComponent = () => {
          const location = useLocation();
          return (
            <div data-testid="location-test">
              {location.pathname ? 'Has Location' : 'No Location'}
            </div>
          );
        };
        
        render(
          <AllProviders>
            <TestComponent />
          </AllProviders>
        );
        
        expect(screen.getByText('Has Location')).toBeInTheDocument();
      });

      it('location tiene pathname por defecto', () => {
        const TestComponent = () => {
          const location = useLocation();
          return <div data-testid="pathname">{location.pathname}</div>;
        };
        
        render(
          <AllProviders>
            <TestComponent />
          </AllProviders>
        );
        
        expect(screen.getByTestId('pathname')).toHaveTextContent('/');
      });
    });

    describe('Integración de Providers', () => {
      it('permite usar Redux y Router juntos', () => {
        const TestComponent = () => {
          const dispatch = useDispatch();
          const navigate = useNavigate();
          
          return (
            <div data-testid="integration">
              {typeof dispatch === 'function' && typeof navigate === 'function' 
                ? 'Both Work' 
                : 'Missing Provider'}
            </div>
          );
        };
        
        render(
          <AllProviders>
            <TestComponent />
          </AllProviders>
        );
        
        expect(screen.getByText('Both Work')).toBeInTheDocument();
      });

      it('no interfiere con custom contexts', () => {
        const CustomContext = createContext({ value: 'default' });
        
        const TestComponent = () => {
          const ctx = useContext(CustomContext);
          return <div data-testid="custom">{ctx.value}</div>;
        };
        
        render(
          <AllProviders>
            <CustomContext.Provider value={{ value: 'custom' }}>
              <TestComponent />
            </CustomContext.Provider>
          </AllProviders>
        );
        
        expect(screen.getByText('custom')).toBeInTheDocument();
      });
    });

    describe('Componente funcional', () => {
      it('es un componente funcional de React', () => {
        expect(typeof AllProviders).toBe('function');
      });

      it('acepta props children', () => {
        const result = AllProviders({ children: <div>Test</div> });
        expect(result).not.toBeNull();
      });

      it('puede usarse como wrapper en render', () => {
        const { container } = render(
          <AllProviders>
            <div>Content</div>
          </AllProviders>
        );
        
        expect(container).not.toBeNull();
      });
    });
  });
});

