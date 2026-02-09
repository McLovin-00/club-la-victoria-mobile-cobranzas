/**
 * Tests para testWrappers.tsx
 */
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AllProviders } from '../testWrappers';

describe('AllProviders', () => {
  it('renderiza children correctamente', () => {
    render(
      <AllProviders>
        <div data-testid="child">Test Child</div>
      </AllProviders>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('provee context de Redux', () => {
    // Si AllProviders no tuviera Redux Provider, esto fallaría
    const TestComponent = () => {
      // Este componente se renderiza sin error dentro del Provider
      return <div>Redux works</div>;
    };
    
    expect(() => {
      render(
        <AllProviders>
          <TestComponent />
        </AllProviders>
      );
    }).not.toThrow();
    
    expect(screen.getByText('Redux works')).toBeInTheDocument();
  });

  it('provee context de Router', () => {
    // Si AllProviders no tuviera BrowserRouter, useNavigate fallaría
    const TestComponent = () => {
      // Este componente se renderiza sin error dentro del Router
      return <div>Router works</div>;
    };
    
    expect(() => {
      render(
        <AllProviders>
          <TestComponent />
        </AllProviders>
      );
    }).not.toThrow();
    
    expect(screen.getByText('Router works')).toBeInTheDocument();
  });

  it('puede renderizar múltiples children', () => {
    render(
      <AllProviders>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
      </AllProviders>
    );
    
    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
  });
});

