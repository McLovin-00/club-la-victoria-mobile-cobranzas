// Tests de gap coverage para `DocumentsList`: handleClosePreview via DocumentPreview (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  mimeType: 'application/pdf',
  fileSize: 12345,
  ...overrides,
});

describe('DocumentsList - Gap Coverage', () => {
  let DocumentsList: React.FC<{
    documents: ListDocument[];
    isLoading: boolean;
    onDelete: (id: number) => void;
  }>;
  let mockFormatDateTime: jest.Mock;
  let mockOnCloseCallback: jest.Mock;

  beforeAll(async () => {
    // Mock de formatDateTime
    mockFormatDateTime = jest.fn((date: string) => '01/01/2025');
    await jest.unstable_mockModule('../../../../utils/formatters', () => ({
      formatDateTime: (...args: any[]) => mockFormatDateTime(...args),
    }));

    // Mock de useGetDadoresQuery
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      ...jest.requireActual('../../api/documentosApiSlice'),
      useGetDadoresQuery: () => ({ data: [] }),
    }));

    // Crear mock de DocumentPreview que capture onClose
    mockOnCloseCallback = jest.fn();

    const DocumentPreviewMock = ({ isOpen, onClose, document }: {
      isOpen: boolean;
      onClose: () => void;
      document: ListDocument | null;
    }) => {
      // Guardar referencia al onClose para poder usarlo en los tests
      mockOnCloseCallback.mockImplementation(onClose);

      if (!isOpen || !document) return null;

      return (
        <div data-testid="document-preview">
          <div data-testid="preview-doc-id">{document.id}</div>
          <button data-testid="close-preview-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      );
    };

    await jest.unstable_mockModule('../DocumentPreview', () => ({
      DocumentPreview: DocumentPreviewMock,
    }));

    // Importar el componente después de los mocks
    const module = await import('../DocumentsList');
    DocumentsList = module.DocumentsList;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatDateTime.mockReturnValue('01/01/2025');
    mockOnCloseCallback.mockReturnValue(undefined);
  });

  describe('handleClosePreview', () => {
    it('debe cerrar el preview cuando se hace click en el botón cerrar del DocumentPreview', async () => {
      const documents = [createDocument({ id: 10, entityId: 'X' })];

      const { container } = render(
        <DocumentsList
          documents={documents}
          isLoading={false}
          onDelete={() => undefined}
        />
      );

      // El preview no debería estar visible inicialmente
      expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();

      // Abrir el preview haciendo click en el botón "Ver"
      const verButton = screen.getByText('Ver');
      fireEvent.click(verButton);

      // Ahora el preview debería estar visible
      expect(screen.getByTestId('document-preview')).toBeInTheDocument();
      expect(screen.getByTestId('preview-doc-id')).toHaveTextContent('10');

      // Cerrar el preview usando el botón de cerrar del DocumentPreview
      const closeButton = screen.getByTestId('close-preview-btn');
      fireEvent.click(closeButton);

      // El preview ya no debería estar visible después de cerrar
      await waitFor(() => {
        expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();
      });
    });

    it('debe restablecer previewDocument a null al cerrar', async () => {
      const documents = [createDocument({ id: 20, fileName: 'test.pdf' })];

      const { container } = render(
        <DocumentsList
          documents={documents}
          isLoading={false}
          onDelete={() => undefined}
        />
      );

      // Abrir preview
      fireEvent.click(screen.getByText('Ver'));
      expect(screen.getByTestId('preview-doc-id')).toHaveTextContent('20');

      // Cerrar preview
      fireEvent.click(screen.getByTestId('close-preview-btn'));

      // Verificar que el preview se cerró completamente
      await waitFor(() => {
        expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();
      });
    });

    it('debe poder abrir y cerrar el preview múltiples veces', async () => {
      const documents = [
        createDocument({ id: 1, entityId: 'A' }),
        createDocument({ id: 2, entityId: 'B' }),
      ];

      render(
        <DocumentsList
          documents={documents}
          isLoading={false}
          onDelete={() => undefined}
        />
      );

      // Abrir primer documento
      const verButtons = screen.getAllByText('Ver');
      fireEvent.click(verButtons[0]);
      expect(screen.getByTestId('preview-doc-id')).toHaveTextContent('1');

      // Cerrar
      fireEvent.click(screen.getByTestId('close-preview-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();
      });

      // Abrir segundo documento
      fireEvent.click(verButtons[1]);
      expect(screen.getByTestId('preview-doc-id')).toHaveTextContent('2');

      // Cerrar nuevamente
      fireEvent.click(screen.getByTestId('close-preview-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();
      });
    });

    it('debe cerrar el preview correctamente aunque existan múltiples documentos', async () => {
      const documents = [
        createDocument({ id: 1, fileName: 'doc1.pdf' }),
        createDocument({ id: 2, fileName: 'doc2.pdf' }),
        createDocument({ id: 3, fileName: 'doc3.pdf' }),
      ];

      render(
        <DocumentsList
          documents={documents}
          isLoading={false}
          onDelete={() => undefined}
        />
      );

      // Abrir el último documento
      const verButtons = screen.getAllByText('Ver');
      fireEvent.click(verButtons[2]);

      expect(screen.getByTestId('preview-doc-id')).toHaveTextContent('3');

      // Cerrar y verificar que no hay preview abierto
      fireEvent.click(screen.getByTestId('close-preview-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();
      });
    });
  });

  describe('isPreviewOpen state', () => {
    it('debe cambiar isPreviewOpen a true al abrir preview y a false al cerrar', async () => {
      const documents = [createDocument({ id: 5 })];

      render(
        <DocumentsList
          documents={documents}
          isLoading={false}
          onDelete={() => undefined}
        />
      );

      // Estado inicial: preview cerrado
      expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();

      // Abrir preview
      fireEvent.click(screen.getByText('Ver'));
      expect(screen.getByTestId('document-preview')).toBeInTheDocument();

      // Cerrar preview
      fireEvent.click(screen.getByTestId('close-preview-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();
      });

      // Verificar que se puede volver a abrir
      fireEvent.click(screen.getByText('Ver'));
      expect(screen.getByTestId('document-preview')).toBeInTheDocument();
    });
  });

  describe('setPreviewDocument state', () => {
    it('debe limpiar previewDocument al cerrar el preview', async () => {
      const documents = [
        createDocument({ id: 100, fileName: 'importante.pdf' }),
        createDocument({ id: 200, fileName: 'secundario.pdf' }),
      ];

      render(
        <DocumentsList
          documents={documents}
          isLoading={false}
          onDelete={() => undefined}
        />
      );

      const verButtons = screen.getAllByText('Ver');

      // Abrir primer documento
      fireEvent.click(verButtons[0]);
      expect(screen.getByTestId('preview-doc-id')).toHaveTextContent('100');

      // Cerrar
      fireEvent.click(screen.getByTestId('close-preview-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();
      });

      // Abrir segundo documento (verifica que el state se limpió correctamente)
      fireEvent.click(verButtons[1]);
      expect(screen.getByTestId('preview-doc-id')).toHaveTextContent('200');

      // Cerrar nuevamente
      fireEvent.click(screen.getByTestId('close-preview-btn'));
      await waitFor(() => {
        expect(screen.queryByTestId('document-preview')).not.toBeInTheDocument();
      });
    });
  });
});
