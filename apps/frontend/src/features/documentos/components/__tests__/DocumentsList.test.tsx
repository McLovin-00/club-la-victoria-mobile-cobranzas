// Tests completos de `DocumentsList`: lista de documentos con acciones (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Document } from '../../api/documentosApiSlice';

type ListDocument = Document & {
  fileName: string;
  uploadedAt: string;
  entityId: string;
  entityType: Document['entityType'];
  status: Document['status'];
};

const createDocument = (overrides: Partial<ListDocument> = {}): ListDocument => ({
  id: 1,
  templateId: 5,
  dadorCargaId: 9,
  entityType: 'CHOFER',
  entityId: '123',
  status: 'APROBADO',
  uploadedAt: '2025-01-02T00:00:00.000Z',
  files: [],
  fileName: 'doc.pdf',
  ...overrides,
});

describe('DocumentsList - render completo con coverage', () => {
  let DocumentsList: React.FC<{
    documents: ListDocument[];
    isLoading: boolean;
    onDelete: (id: number) => void;
  }>;
  let mockFormatDateTime: jest.Mock;
  let mockDocumentPreview: jest.Mock;

  beforeAll(async () => {
    // Mock de formatDateTime
    mockFormatDateTime = jest.fn((date: string) => '01/01/2025');
    await jest.unstable_mockModule('../../../../utils/formatters', () => ({
      formatDateTime: (...args: any[]) => mockFormatDateTime(...args),
    }));

    // Mock de DocumentPreview para evitar hooks de Redux
    const DocumentPreviewMock = ({ isOpen }: { isOpen: boolean }) =>
      isOpen ? <div data-testid="document-preview">Preview abierto</div> : null;
    mockDocumentPreview = jest.fn(DocumentPreviewMock);

    await jest.unstable_mockModule('../DocumentPreview', () => ({
      DocumentPreview: mockDocumentPreview,
    }));

    // Importar el componente después de los mocks
    const module = await import('../DocumentsList');
    DocumentsList = module.DocumentsList;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatDateTime.mockReturnValue('01/01/2025');
  });

  it('muestra spinner cuando isLoading=true', () => {
    const { container } = render(
      <DocumentsList
        documents={[]}
        isLoading={true}
        onDelete={() => undefined}
      />
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay documentos', () => {
    render(
      <DocumentsList
        documents={[]}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText('No hay documentos')).toBeInTheDocument();
  });

  it('ordena por fecha descendente y muestra notas', () => {
    const documents = [
      createDocument({ id: 1, uploadedAt: '2025-01-01T00:00:00.000Z', entityId: 'A', validationNotes: 'Nota' }),
      createDocument({ id: 2, uploadedAt: '2025-02-01T00:00:00.000Z', entityId: 'B', expiresAt: '2025-03-01T00:00:00.000Z' }),
    ];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    // Verificar que el orden es descendente por fecha (B está primero porque tiene fecha más reciente)
    const headers = Array.from(document.querySelectorAll('h3')).map((node) => node.textContent ?? '');
    expect(headers[0]).toContain('CHOFER - B');
    expect(screen.getByText('Nota')).toBeInTheDocument();
    expect(screen.getByText(/Vence:/i)).toBeInTheDocument();
  });

  it('abre preview y permite eliminar', () => {
    const onDelete = jest.fn();
    const documents = [createDocument({ id: 10, entityId: 'X' })];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={onDelete}
      />
    );

    const verButtons = screen.getAllByText('Ver');
    fireEvent.click(verButtons[0]);
    expect(screen.getByTestId('document-preview')).toBeInTheDocument();

    const eliminarButtons = screen.getAllByText('Eliminar');
    fireEvent.click(eliminarButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(10);
  });

  it('muestra correctamente el estado APROBADO', () => {
    const documents = [createDocument({ status: 'APROBADO' })];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText('Aprobado')).toBeInTheDocument();
  });

  it('muestra correctamente el estado PENDIENTE', () => {
    const documents = [createDocument({ status: 'PENDIENTE' })];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('muestra correctamente el estado RECHAZADO', () => {
    const documents = [createDocument({ status: 'RECHAZADO' })];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });

  it('muestra correctamente el estado VENCIDO', () => {
    const documents = [createDocument({ status: 'VENCIDO' })];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText('Vencido')).toBeInTheDocument();
  });

  it('muestra el nombre del archivo', () => {
    const documents = [createDocument({ fileName: 'documento.pdf' })];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText('documento.pdf')).toBeInTheDocument();
  });

  it('muestra la plantilla con su nombre cuando está disponible', () => {
    const documents = [
      createDocument({
        templateId: 5,
        template: { id: 5, name: 'DNI Chofer' } as any,
      }),
    ];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText('Plantilla: DNI Chofer')).toBeInTheDocument();
  });

  it('muestra la plantilla con ID cuando no tiene nombre', () => {
    const documents = [createDocument({ templateId: 5 })];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText('Plantilla: ID 5')).toBeInTheDocument();
  });

  it('muestra notas de validación cuando existen', () => {
    const documents = [
      createDocument({ validationNotes: 'El documento está borroso' }),
    ];

    const { container } = render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    // Las notas se muestran en un div con bg-muted, verificamos que exista el texto
    expect(container.textContent).toContain('El documento está borroso');
  });

  it('llama a onDelete con el ID correcto', () => {
    const onDelete = jest.fn();
    const documents = [
      createDocument({ id: 5 }),
      createDocument({ id: 10 }),
    ];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={onDelete}
      />
    );

    const eliminarButtons = screen.getAllByText('Eliminar');
    fireEvent.click(eliminarButtons[1]);
    expect(onDelete).toHaveBeenCalledWith(10);
  });

  it('muestra contador de documentos', () => {
    const documents = [
      createDocument({ id: 1 }),
      createDocument({ id: 2 }),
      createDocument({ id: 3 }),
    ];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText('Documentos (3)')).toBeInTheDocument();
  });

  it('muestra fecha de vencimiento cuando existe', () => {
    const documents = [
      createDocument({ expiresAt: '2025-12-31T00:00:00.000Z' }),
    ];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.getByText(/Vence:/)).toBeInTheDocument();
    expect(mockFormatDateTime).toHaveBeenCalledWith('2025-12-31T00:00:00.000Z');
  });

  it('no muestra fecha de vencimiento cuando no existe', () => {
    const documents = [createDocument({ expiresAt: undefined as any })];

    render(
      <DocumentsList
        documents={documents}
        isLoading={false}
        onDelete={() => undefined}
      />
    );

    expect(screen.queryByText(/Vence:/)).not.toBeInTheDocument();
  });
});
