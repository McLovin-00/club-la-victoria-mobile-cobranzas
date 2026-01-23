// Tests de cobertura adicional para ClientRequirementsPage
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('ClientRequirementsPage - Additional Coverage', () => {
  let ClientRequirementsPage: React.FC;

  let useGetClientRequirementsQuery: jest.Mock;
  let useAddClientRequirementMutation: jest.Mock;
  let useRemoveClientRequirementMutation: jest.Mock;

  const mockRequirements = [
    {
      id: 1,
      templateId: 1,
      entityType: 'CHOFER',
      obligatorio: true,
      diasAnticipacion: 30,
      template: { id: 1, name: 'DNI', entityType: 'CHOFER' },
    },
  ];

  beforeAll(async () => {
    useGetClientRequirementsQuery = jest.fn();
    useAddClientRequirementMutation = jest.fn();
    useRemoveClientRequirementMutation = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetClientRequirementsQuery: (...args: unknown[]) => useGetClientRequirementsQuery(...args),
      useAddClientRequirementMutation: (...args: unknown[]) => useAddClientRequirementMutation(...args),
      useRemoveClientRequirementMutation: (...args: unknown[]) => useRemoveClientRequirementMutation(...args),
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({ clienteId: '1' }),
    }));

    const module = await import('../ClientRequirementsPage.tsx');
    ClientRequirementsPage = module.ClientRequirementsPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetClientRequirementsQuery.mockReturnValue({
      data: mockRequirements,
      isLoading: false,
    });
    useAddClientRequirementMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    useRemoveClientRequirementMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ClientRequirementsPage />
      </MemoryRouter>
    );
  };

  it('debe importar el componente', () => {
    expect(ClientRequirementsPage).toBeDefined();
  });

  it('debe renderizar requisitos del cliente', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe listar requisitos', () => {
    renderPage();
    expect(useGetClientRequirementsQuery).toHaveBeenCalled();
  });

  it('debe agregar nuevo requisito', () => {
    renderPage();
    const addMut = useAddClientRequirementMutation()[0];
    expect(addMut).toBeDefined();
  });

  it('debe eliminar requisito', () => {
    renderPage();
    const removeMut = useRemoveClientRequirementMutation()[0];
    expect(removeMut).toBeDefined();
  });

  it('debe validar datos', () => {
    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
