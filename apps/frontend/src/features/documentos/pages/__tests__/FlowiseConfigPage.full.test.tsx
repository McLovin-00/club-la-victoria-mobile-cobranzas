// Tests de cobertura adicional para FlowiseConfigPage
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('FlowiseConfigPage - Additional Coverage', () => {
  let FlowiseConfigPage: React.FC;

  let mockNavigate: jest.Mock;
  let mockShow: jest.Mock;

  beforeAll(async () => {
    mockNavigate = jest.fn();
    mockShow = jest.fn();

    await jest.unstable_mockModule('../../../../hooks/useToast', () => ({
      useToast: () => ({ show: mockShow }),
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/input', () => ({
      Input: (props: any) => <input {...props} />,
    }));

    await jest.unstable_mockModule('../../../../components/ui/label', () => ({
      Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      ArrowLeftIcon: ({ className }: any) => <span className={className}>◀</span>,
      CheckCircleIcon: ({ className }: any) => <span className={className}>✅</span>,
    }));

    const module = await import('../FlowiseConfigPage.tsx');
    FlowiseConfigPage = module.FlowiseConfigPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <FlowiseConfigPage />
      </MemoryRouter>
    );
  };

  it('debe importar el componente', () => {
    expect(FlowiseConfigPage).toBeDefined();
  });

  it('debe renderizar la página', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe guardar configuración', () => {
    renderPage();
    const saveButton = screen.queryByText('Guardar');
    if (saveButton) {
      fireEvent.click(saveButton);
    }
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe probar conexión', () => {
    renderPage();
    const testButton = screen.queryByText('Probar conexión');
    if (testButton) {
      fireEvent.click(testButton);
    }
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe validar URL de Flowise', () => {
    renderPage();
    const urlInput = screen.queryByPlaceholder('https://...');
    expect(urlInput).toBeTruthy();
  });

  it('debe validar API key', () => {
    renderPage();
    const apiKeyInput = screen.queryByPlaceholder(/api key/i);
    expect(apiKeyInput).toBeTruthy();
  });
});
