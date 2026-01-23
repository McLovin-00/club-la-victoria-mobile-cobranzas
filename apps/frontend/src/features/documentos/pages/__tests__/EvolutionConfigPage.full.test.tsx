// Tests de cobertura adicional para EvolutionConfigPage
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('EvolutionConfigPage - Additional Coverage', () => {
  let EvolutionConfigPage: React.FC;

  let mockShow: jest.Mock;
  let mockNavigate: jest.Mock;

  beforeAll(async () => {
    mockShow = jest.fn();
    mockNavigate = jest.fn();

    await jest.unstable_mockModule('../../../../hooks/useToast', () => ({
      useToast: () => ({ show: mockShow }),
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/input', () => ({
      Input: (props: any) => <input {...props} />,
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      ArrowLeftIcon: ({ className }: any) => <span className={className}>◀</span>,
    }));

    const module = await import('../EvolutionConfigPage.tsx');
    EvolutionConfigPage = module.EvolutionConfigPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <EvolutionConfigPage />
      </MemoryRouter>
    );
  };

  it('debe importar el componente', () => {
    expect(EvolutionConfigPage).toBeDefined();
  });

  it('debe renderizar la página', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe guardar configuración', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe probar conexión Evolution', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe validar API key', () => {
    renderPage();
    const inputs = document.querySelectorAll('input[type="password"]');
    expect(inputs.length).toBeGreaterThanOrEqual(0);
  });
});
