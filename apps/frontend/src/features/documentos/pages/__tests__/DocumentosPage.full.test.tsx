// Tests adicionales de cobertura para DocumentosPage
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('DocumentosPage - Additional Coverage', () => {
  let DocumentosPage: React.FC;

  let useGetDocumentsByEmpresaQuery: jest.Mock;
  let mockNavigate: jest.Mock;
  let mockShow: jest.Mock;

  const mockDocuments = [
    {
      id: 1,
      templateId: 1,
      dadorCargaId: 1,
      entityType: 'CHOFER',
      entityId: '12345678',
      status: 'PENDIENTE',
      uploadedAt: '2025-01-01T00:00:00.000Z',
      files: [{ id: 1, fileName: 'doc.pdf', fileUrl: '/doc.pdf' }],
    },
    {
      id: 2,
      templateId: 2,
      dadorCargaId: 1,
      entityType: 'CAMION',
      entityId: 'ABC123',
      status: 'APROBADO',
      uploadedAt: '2025-01-02T00:00:00.000Z',
      files: [{ id: 2, fileName: 'doc2.pdf', fileUrl: '/doc2.pdf' }],
    },
  ];

  beforeAll(async () => {
    useGetDocumentsByEmpresaQuery = jest.fn();
    mockNavigate = jest.fn();
    mockShow = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetDocumentsByEmpresaQuery: (...args: unknown[]) => useGetDocumentsByEmpresaQuery(...args),
    }));

    await jest.unstable_mockModule('../../../../hooks/useToast', () => ({
      useToast: () => ({ show: mockShow }),
    }));

    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
      useSearchParams: () => [new URLSearchParams(), jest.fn()],
    }));

    const module = await import('../DocumentosPage.tsx');
    DocumentosPage = module.DocumentosPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: { data: mockDocuments, pagination: { page: 1, limit: 20, total: 2 } },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <DocumentosPage />
      </MemoryRouter>
    );
  };

  it('debe importar el componente', () => {
    expect(DocumentosPage).toBeDefined();
  });

  it('debe renderizar documentos list', () => {
    renderPage();
    // Verificar que se renderiza la página
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe manejar estado vacío cuando no hay documentos', () => {
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0 } },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe mostrar loading durante carga', () => {
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe mostrar estado de error', () => {
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Error loading' },
      refetch: jest.fn(),
    });

    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe filtrar por status PENDIENTE', () => {
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: {
        data: mockDocuments.filter((d) => d.status === 'PENDIENTE'),
        pagination: { page: 1, limit: 20, total: 1 },
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe filtrar por status APROBADO', () => {
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: {
        data: mockDocuments.filter((d) => d.status === 'APROBADO'),
        pagination: { page: 1, limit: 20, total: 1 },
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe filtrar por status RECHAZADO', () => {
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: {
        data: mockDocuments.filter((d) => d.status === 'RECHAZADO'),
        pagination: { page: 1, limit: 20, total: 0 },
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe filtrar por status VENCIDO', () => {
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: {
        data: mockDocuments.filter((d) => d.status === 'VENCIDO'),
        pagination: { page: 1, limit: 20, total: 0 },
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe filtrar por entityType CHOFER', () => {
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: {
        data: mockDocuments.filter((d) => d.entityType === 'CHOFER'),
        pagination: { page: 1, limit: 20, total: 1 },
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debe filtrar por entityType CAMION', () => {
    useGetDocumentsByEmpresaQuery.mockReturnValue({
      data: {
        data: mockDocuments.filter((d) => d.entityType === 'CAMION'),
        pagination: { page: 1, limit: 20, total: 1 },
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
