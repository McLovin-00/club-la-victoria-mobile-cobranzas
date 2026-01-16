import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { DocumentTemplate } from '../../api/documentosApiSlice';

describe('DocumentUploadModal - coverage', () => {
  let DocumentUploadModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onUpload: (data: {
      templateId: number;
      entityType: string;
      entityId: string;
      files: File[];
      expiresAt?: string;
    }) => void;
    templates: DocumentTemplate[];
    isLoading: boolean;
  }>;
  let uploadBatchMock: jest.Mock;
  let triggerJobStatusMock: jest.Mock;
  let showMock: jest.Mock;
  let apiErrorMock: jest.Mock;

  // Helper para simular la selección de archivos
  const uploadFiles = (inputElement: HTMLInputElement, files: File[]) => {
    // Crear un FileList simulado
    const fileList = {
      length: files.length,
      item: (index: number) => files[index] || null,
      ...files,
    } as unknown as FileList;

    Object.defineProperty(inputElement, 'files', {
      value: fileList,
      writable: false,
    });

    // Disparar el evento change manualmente envuelto en act
    act(() => {
      const changeEvent = new Event('change', { bubbles: true });
      Object.defineProperty(changeEvent, 'target', {
        value: inputElement,
        enumerable: true,
      });
      inputElement.dispatchEvent(changeEvent);
    });
  };

  const templates: DocumentTemplate[] = [
    {
      id: 1,
      nombre: 'Licencia',
      descripcion: 'Documento',
      entityType: 'CHOFER',
      campos: {},
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      nombre: 'Seguro',
      descripcion: 'Seguro',
      entityType: 'DADOR',
      campos: {},
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    uploadBatchMock = jest.fn();
    triggerJobStatusMock = jest.fn();
    showMock = jest.fn();
    apiErrorMock = jest.fn().mockReturnValue('API error');

    const actualApi = await import('../../api/documentosApiSlice');

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      ...actualApi,
      useUploadBatchDocsTransportistasMutation: () => [uploadBatchMock, { isLoading: false }],
      useLazyGetJobStatusQuery: () => [triggerJobStatusMock],
    }));

    await jest.unstable_mockModule('../../../../hooks/useToast', () => ({
      useToast: () => ({ show: showMock }),
    }));

    await jest.unstable_mockModule('../../../../utils/apiErrors', () => ({
      getApiErrorMessage: (...args: unknown[]) => apiErrorMock(...args),
    }));

    await jest.unstable_mockModule('../CameraCapture', () => ({
      CameraCapture: ({ isOpen, onClose, onCapture }: { isOpen: boolean; onClose: () => void; onCapture: (files: File[]) => void }) => (
        isOpen ? (
          <div data-testid='camera'>
            <button type='button' onClick={() => { onCapture([new File(['x'], 'foto.jpg', { type: 'image/jpeg' })]); onClose(); }}>
              capturar
            </button>
          </div>
        ) : null
      ),
    }));

    const module = await import('../DocumentUploadModal');
    DocumentUploadModal = module.DocumentUploadModal;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const uploadUnwrap = jest.fn(() => Promise.resolve({ jobId: 'job-1' }));
    uploadBatchMock.mockReturnValue({ unwrap: uploadUnwrap });
    const statusUnwrap = jest.fn(() => Promise.resolve({
      job: { status: 'completed', stats: { processed: 1, skippedDuplicates: 0, failed: 0 } },
    }));
    triggerJobStatusMock.mockReturnValue({ unwrap: statusUnwrap });
  });

  const renderModal = (props?: Partial<React.ComponentProps<typeof DocumentUploadModal>>) => {
    const onClose = jest.fn();
    const onUpload = jest.fn();
    const { container } = render(
      <DocumentUploadModal
        isOpen
        onClose={onClose}
        onUpload={onUpload}
        templates={templates}
        isLoading={false}
        {...props}
      />
    );
    return { onClose, onUpload, container };
  };

  it('muestra mensaje cuando no hay templates para el tipo', () => {
    renderModal({ templates: [{ ...templates[0], entityType: 'DADOR' }] });

    expect(screen.getByText(/No hay plantillas disponibles/i)).toBeTruthy();
  });

  it('agrega archivos al seleccionar y permite eliminarlos', async () => {
    const { container } = renderModal();

    // Buscar el input file directamente por su tipo
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput?.type).toBe('file');

    const archivo = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

    // Usar el helper para subir archivos
    uploadFiles(fileInput, [archivo]);

    // Esperar a que el DOM se actualice
    await waitFor(() => {
      expect(screen.getByText('doc.pdf')).toBeTruthy();
    });

    // Buscar el botón de eliminar - buscar el botón dentro del elemento que contiene el nombre del archivo
    // Buscar el texto "doc.pdf" y luego el padre (el div p con clase text-sm)
    const fileNameElement = screen.getByText('doc.pdf');
    const parentDiv = fileNameElement.closest('div[class*="bg-gray-50"]');
    expect(parentDiv).toBeTruthy();

    // Dentro de ese elemento, buscar el botón
    const removeButton = parentDiv?.querySelector('button') as HTMLButtonElement;
    expect(removeButton).toBeTruthy();

    if (removeButton) {
      fireEvent.click(removeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('doc.pdf')).toBeNull();
    });
  });

  it('envía datos y resetea el formulario', async () => {
    const { onUpload, container } = renderModal();

    // El placeholder es "Ingresa el DNI", buscamos por placeholder
    const entityInput = container.querySelector('input[placeholder*="DNI"]') as HTMLInputElement;
    expect(entityInput).toBeTruthy();

    if (entityInput) {
      fireEvent.change(entityInput, { target: { value: '123' } });
    }

    fireEvent.click(screen.getByText('Licencia'));

    // Buscar el input file directamente por su tipo
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const archivo = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

    // Usar el helper para subir archivos
    uploadFiles(fileInput, [archivo]);

    // Esperar a que el archivo se muestre
    await waitFor(() => {
      expect(screen.getByText('doc.pdf')).toBeTruthy();
    });

    // Buscar el botón de submit (type="submit")
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton).toBeTruthy();
    fireEvent.click(submitButton);

    expect(onUpload).toHaveBeenCalledWith({
      templateId: 1,
      entityType: 'CHOFER',
      entityId: '123',
      files: [archivo],
      expiresAt: undefined,
    });
  });

  it('agrega fotos desde la cámara', () => {
    renderModal();

    fireEvent.click(screen.getByText('Usar cámara'));
    fireEvent.click(screen.getByText('capturar'));

    expect(screen.getByText('foto.jpg')).toBeTruthy();
  });

  it('permite activar skipDedupe', () => {
    renderModal();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it('ejecuta flujo de batch upload con job completado', async () => {
    renderModal();

    const originalCreateElement = document.createElement.bind(document);
    const inputElement = originalCreateElement('input') as HTMLInputElement;

    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'input') {
        return inputElement;
      }
      return originalCreateElement(tagName);
    });

    fireEvent.click(screen.getByText('Seleccionar archivos'));

    const archivo = new File(['data'], 'batch.pdf', { type: 'application/pdf' });
    Object.defineProperty(inputElement, 'files', {
      value: [archivo] as unknown as FileList,
      configurable: true,
    });

    if (inputElement.onchange) {
      await inputElement.onchange(new Event('change'));
    }

    await waitFor(() => {
      expect(showMock).toHaveBeenCalledWith(expect.stringMatching(/Procesados/), 'success');
    });
  });

  it('muestra error cuando batch falla', async () => {
    const unwrap = jest.fn(() => Promise.reject(new Error('fail')));
    uploadBatchMock.mockReturnValue({ unwrap });

    renderModal();

    const originalCreateElement = document.createElement.bind(document);
    const inputElement = originalCreateElement('input') as HTMLInputElement;

    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'input') {
        return inputElement;
      }
      return originalCreateElement(tagName);
    });

    fireEvent.click(screen.getByText('Seleccionar archivos'));

    const archivo = new File(['data'], 'batch.pdf', { type: 'application/pdf' });
    Object.defineProperty(inputElement, 'files', {
      value: [archivo] as unknown as FileList,
      configurable: true,
    });

    if (inputElement.onchange) {
      await inputElement.onchange(new Event('change'));
    }

    await waitFor(() => {
      expect(showMock).toHaveBeenCalledWith('API error', 'error');
    });
  });
});
