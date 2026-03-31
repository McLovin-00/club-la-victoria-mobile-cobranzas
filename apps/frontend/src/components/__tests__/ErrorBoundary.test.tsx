// Tests de `ErrorBoundary`: captura errores de render y muestra fallback (incluye mensaje en dev).
import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('ErrorBoundary', () => {
  let loggerError = jest.fn();
  let ErrorBoundary: typeof import('../ErrorBoundary').ErrorBoundary;

  const Bomb: React.FC = () => {
    throw new Error('boom');
  };

  beforeAll(async () => {
    await jest.unstable_mockModule('../../utils/logger', () => ({
      __esModule: true,
      default: {
        error: (...args: any[]) => loggerError(...args),
      },
    }));

    ({ ErrorBoundary } = await import('../ErrorBoundary'));
  });

  beforeEach(() => {
    loggerError = jest.fn();
  });

  it('renderiza children cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <div>ok</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('muestra fallback y loguea cuando un child rompe (DEV=true)', () => {
    const prev = process.env.DEV;
    process.env.DEV = 'true';

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Ha ocurrido un error inesperado')).toBeInTheDocument();
    expect(screen.getByText(/Por favor, recarga la página/i)).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(loggerError).toHaveBeenCalledWith(
      '🌐 ErrorBoundary atrapó un error:',
      expect.any(Error),
      expect.any(Object)
    );

    process.env.DEV = prev;
  });

  it('NO muestra detalles del error en producción', () => {
    const prev = process.env.DEV;
    process.env.DEV = 'false';

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Ha ocurrido un error inesperado')).toBeInTheDocument();
    expect(screen.queryByText('boom')).not.toBeInTheDocument();

    process.env.DEV = prev;
  });
});


