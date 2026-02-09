/**
 * Tests de cobertura para ResubmitDocument
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ResubmitDocument - Coverage', () => {
  type ResubmitDocumentProps = {
    document: {
      id: number;
      templateName: string;
      entityType: string;
      entityName?: string;
      rejectionReason?: string;
      rejectedAt?: string;
    };
    onSuccess?: () => void;
    onCancel?: () => void;
  };

  let ResubmitDocument: React.FC<ResubmitDocumentProps>;
  let mockResubmit: jest.Mock;

  beforeAll(async () => {
    mockResubmit = jest.fn();

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useResubmitDocumentMutation: () => [mockResubmit, { isLoading: false }],
    }));

    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        variant?: string;
      }) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className}>{children}</div>
      ),
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      ArrowUpTrayIcon: ({ className }: { className?: string }) => <span className={className}>UploadIcon</span>,
      DocumentIcon: ({ className }: { className?: string }) => <span className={className}>DocIcon</span>,
      XCircleIcon: ({ className }: { className?: string }) => <span className={className}>XIcon</span>,
      ExclamationTriangleIcon: ({ className }: { className?: string }) => <span className={className}>WarningIcon</span>,
    }));

    const module = await import('../ResubmitDocument');
    ResubmitDocument = module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockResubmit.mockReturnValue({
      unwrap: jest.fn(() => Promise.resolve({ success: true })),
    });
  });

  const baseDocument = (): ResubmitDocumentProps['document'] => ({
    id: 1,
    templateName: 'Licencia',
    entityType: 'CHOFER',
  });

  it('debería importar el componente', () => {
    expect(ResubmitDocument).toBeDefined();
  });

  it('debería renderizar el componente', () => {
    const { container } = render(
      <ResubmitDocument
        document={{ ...baseDocument(), rejectionReason: 'Documento ilegible' }}
      />
    );

    expect(container.querySelector('.bg-red-50')).toBeTruthy();
  });

  it('muestra error cuando el archivo es inválido', () => {
    render(
      <ResubmitDocument document={baseDocument()} />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    const archivo = new File(['texto'], 'archivo.txt', { type: 'text/plain' });

    if (input) {
      fireEvent.change(input, { target: { files: [archivo] } });
    }

    expect(screen.getByText(/Solo se permiten archivos PDF/i)).toBeTruthy();
  });

  it('muestra error cuando el archivo supera 10MB', () => {
    render(<ResubmitDocument document={baseDocument()} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    const bigBuffer = new Uint8Array(10 * 1024 * 1024 + 1);
    const archivo = new File([bigBuffer], 'big.pdf', { type: 'application/pdf' });

    if (input) {
      fireEvent.change(input, { target: { files: [archivo] } });
    }

    expect(screen.getByText(/no puede superar 10MB/i)).toBeTruthy();
  });

  it('resubmite el documento válido', async () => {
    const onSuccess = jest.fn();

    render(<ResubmitDocument document={baseDocument()} onSuccess={onSuccess} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    const archivo = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

    if (input) {
      fireEvent.change(input, { target: { files: [archivo] } });
    }

    fireEvent.click(screen.getByText('Resubir Documento'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('muestra error cuando falla la API', async () => {
    mockResubmit.mockReturnValue({
      unwrap: jest.fn(() => Promise.reject({ data: { message: 'Error API' } })),
    });

    render(<ResubmitDocument document={baseDocument()} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    const archivo = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

    if (input) {
      fireEvent.change(input, { target: { files: [archivo] } });
    }

    fireEvent.click(screen.getByText('Resubir Documento'));

    expect(await screen.findByText('Error API')).toBeTruthy();
  });
});
