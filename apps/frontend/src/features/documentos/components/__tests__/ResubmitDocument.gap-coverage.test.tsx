// Tests de gap coverage para `ResubmitDocument`: branches faltantes (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock de File global para test
class MockFile {
  public name: string;
  public size: number;
  public type: string;
  public lastModified: number;

  constructor(parts: BlobPart[], filename: string, options?: FilePropertyBag) {
    this.name = filename;
    this.size = 0;
    this.type = options?.type || 'application/octet-stream';
    this.lastModified = Date.now();
  }
}

global.File = MockFile as any;

describe('ResubmitDocument - Gap Coverage', () => {
  let ResubmitDocument: React.FC<{
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
  }>;
  let mockResubmit: jest.Mock;
  let mockResubmitMutation: {
    resubmit: jest.Mock;
    isLoading: boolean;
  };

  beforeAll(async () => {
    // Mock de useResubmitDocumentMutation
    mockResubmit = jest.fn();

    await jest.unstable_mockModule('../api/documentosApiSlice', () => ({
      useResubmitDocumentMutation: () => {
        mockResubmitMutation = {
          resubmit: mockResubmit,
          isLoading: false,
        };
        return [mockResubmitMutation.resubmit, mockResubmitMutation] as any;
      },
    }));

    // Importar el componente después de los mocks
    const module = await import('../ResubmitDocument');
    ResubmitDocument = module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockResubmit.mockResolvedValue({ data: { success: true } });
    mockResubmitMutation.isLoading = false;
  });

  const createDocument = (overrides: any = {}) => ({
    id: 1,
    templateName: 'Licencia de Conducir',
    entityType: 'CHOFER',
    rejectionReason: 'El documento está borroso',
    rejectedAt: '2025-01-15T10:00:00.000Z',
    ...overrides,
  });

  describe('entityName', () => {
    it('debe mostrar entityName cuando está presente', () => {
      const document = createDocument({ entityName: 'Juan Pérez' });

      render(<ResubmitDocument document={document} />);

      expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
    });

    it('no debe mostrar paréntesis vacíos cuando entityName no está presente', () => {
      const document = createDocument({ entityName: undefined });

      render(<ResubmitDocument document={document} />);

      const entityTypeText = screen.getByText(/Licencia de Conducir - CHOFER/);
      expect(entityTypeText.textContent).not.toContain('(');
    });
  });

  describe('handleSubmit sin archivo seleccionado', () => {
    it('debe retornar temprano si no hay archivo seleccionado', async () => {
      const document = createDocument();
      const onSuccess = jest.fn();

      render(<ResubmitDocument document={document} onSuccess={onSuccess} />);

      // Intentar hacer click en el botón de resubir sin archivo
      const submitButton = screen.getByText('Resubir Documento');
      fireEvent.click(submitButton);

      // El botón debería estar deshabilitado
      expect(submitButton).toBeDisabled();
      // onSuccess no debería haber sido llamado
      expect(onSuccess).not.toHaveBeenCalled();
      // resubmit mutation no debería haber sido llamado
      expect(mockResubmit).not.toHaveBeenCalled();
    });
  });

  describe('manejo de errores genéricos', () => {
    it('debe mostrar error genérico cuando el error no tiene data.message', async () => {
      const document = createDocument();
      const user = userEvent.setup();

      // Mock de error sin data.message
      const errorWithoutData = new Error('Network error');
      mockResubmit.mockRejectedValue(errorWithoutData);

      render(<ResubmitDocument document={document} />);

      // Crear un archivo válido
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      // Seleccionar el archivo
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Esperar a que el archivo se seleccione
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      // Intentar resubir
      const submitButton = screen.getByText('Resubir Documento');
      await user.click(submitButton);

      // Verificar que se muestra el error genérico
      await waitFor(() => {
        expect(screen.getByText('Error al resubir el documento')).toBeInTheDocument();
      });
    });

    it('debe mostrar error específico cuando el error tiene data.message', async () => {
      const document = createDocument();
      const user = userEvent.setup();

      // Mock de error con data.message
      mockResubmit.mockRejectedValue({
        data: { message: 'El archivo no es válido' },
      });

      render(<ResubmitDocument document={document} />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Resubir Documento');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('El archivo no es válido')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('debe mostrar "Subiendo..." durante la carga', async () => {
      const document = createDocument();
      const user = userEvent.setup();

      // Mock que retorna una promesa pendiente para mantener el loading state
      let resolveResubmit: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveResubmit = resolve;
      });
      mockResubmit.mockReturnValue(pendingPromise);

      render(<ResubmitDocument document={document} />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Resubir Documento');
      await user.click(submitButton);

      // Verificar que el texto cambió a "Subiendo..."
      await waitFor(() => {
        expect(screen.getByText('Subiendo...')).toBeInTheDocument();
      });

      // Resolver la promesa para limpiar
      (resolveResubmit as any)({ data: { success: true } });
    });

    it('debe deshabilitar botones durante loading', async () => {
      const document = createDocument();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      let resolveResubmit: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveResubmit = resolve;
      });
      mockResubmit.mockReturnValue(pendingPromise);

      render(<ResubmitDocument document={document} onCancel={onCancel} />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Resubir Documento');
      const cancelButton = screen.getByText('Cancelar');

      await user.click(submitButton);

      await waitFor(() => {
        // El botón Cancelar debería estar deshabilitado
        expect(cancelButton).toBeDisabled();
      });

      (resolveResubmit as any)({ data: { success: true } });
    });
  });

  describe('fileInputRef.click()', () => {
    it('debe llamar a fileInputRef.current?.click() al hacer click en el área de selección', async () => {
      const document = createDocument();

      // Spy del click method
      const mockClick = jest.fn();
      const originalInput = HTMLInputElement.prototype.click;

      HTMLInputElement.prototype.click = mockClick;

      render(<ResubmitDocument document={document} />);

      // Hacer click en el área de selección de archivo
      const uploadArea = screen.getByText(/Haz clic para seleccionar archivo/);
      fireEvent.click(uploadArea);

      // El método click debería haber sido llamado
      expect(mockClick).toHaveBeenCalled();

      HTMLInputElement.prototype.click = originalInput;
    });
  });

  describe('setSelectedFile(null)', () => {
    it('debe limpiar el archivo seleccionado al hacer click en la X', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      // Crear y seleccionar un archivo
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Verificar que el archivo se muestra
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      // Hacer click en la X para limpiar
      const clearButton = screen.getByText('✕');
      fireEvent.click(clearButton);

      // Verificar que el archivo ya no se muestra y vuelve a mostrar el área de selección
      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
        expect(screen.getByText(/Haz clic para seleccionar archivo/)).toBeInTheDocument();
      });
    });

    it('debe habilitar el botón de resubir solo cuando hay archivo seleccionado', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      // Sin archivo, el botón debería estar deshabilitado
      const submitButton = screen.getByText('Resubir Documento');
      expect(submitButton).toBeDisabled();

      // Seleccionar archivo
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Ahora el botón debería estar habilitado
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // Limpiar archivo
      fireEvent.click(screen.getByText('✕'));

      // Botón debería estar deshabilitado nuevamente
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('validación de archivos', () => {
    it('debe mostrar error para tipo de archivo no válido', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      // Crear archivo con tipo no válido
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('Solo se permiten archivos PDF o imágenes (JPG, PNG)')).toBeInTheDocument();
      });
    });

    it('debe mostrar error para archivo que excede el tamaño máximo', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      // Crear archivo más grande de 10MB
      const file = new File(['content'], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('El archivo no puede superar 10MB')).toBeInTheDocument();
      });
    });

    it('debe aceptar archivos PDF válidos', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
        expect(screen.queryByText(/Solo se permiten/)).not.toBeInTheDocument();
      });
    });

    it('debe aceptar imágenes JPG válidas', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('debe aceptar imágenes PNG válidas', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      const file = new File(['content'], 'test.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    });
  });

  describe('onSuccess callback', () => {
    it('debe llamar a onSuccess cuando el resubmit es exitoso', async () => {
      const document = createDocument();
      const onSuccess = jest.fn();
      const user = userEvent.setup();

      mockResubmit.mockResolvedValue({ data: { success: true } });

      render(<ResubmitDocument document={document} onSuccess={onSuccess} />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Resubir Documento');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(mockResubmit).toHaveBeenCalledWith({
          documentId: 1,
          file: expect.any(File),
        });
      });
    });
  });

  describe('onCancel callback', () => {
    it('debe llamar a onCancel cuando se hace click en Cancelar', () => {
      const document = createDocument();
      const onCancel = jest.fn();

      render(<ResubmitDocument document={document} onCancel={onCancel} />);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('no debe mostrar botón Cancelar si no se proporciona onCancel', () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    });
  });

  describe('información del rechazo', () => {
    it('debe mostrar el motivo del rechazo cuando existe', () => {
      const document = createDocument({
        rejectionReason: 'Foto borrosa e ilegible',
      });

      render(<ResubmitDocument document={document} />);

      expect(screen.getByText('Foto borrosa e ilegible')).toBeInTheDocument();
    });

    it('debe mostrar la fecha de rechazo cuando existe', () => {
      const document = createDocument({
        rejectedAt: '2025-01-15T10:00:00.000Z',
      });

      render(<ResubmitDocument document={document} />);

      expect(screen.getByText(/Rechazado el/)).toBeInTheDocument();
    });

    it('no debe mostrar motivo de rechazo cuando no existe', () => {
      const document = createDocument({
        rejectionReason: undefined,
      });

      render(<ResubmitDocument document={document} />);

      expect(screen.queryByText(/Motivo:/)).not.toBeInTheDocument();
    });

    it('no debe mostrar fecha de rechazo cuando no existe', () => {
      const document = createDocument({
        rejectedAt: undefined,
      });

      render(<ResubmitDocument document={document} />);

      expect(screen.queryByText(/Rechazado el/)).not.toBeInTheDocument();
    });
  });

  describe('limpieza de errores', () => {
    it('debe limpiar el error al seleccionar un archivo válido', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      // Primero seleccionar un archivo inválido para generar un error
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(invalidFile, 'size', { value: 1024 });

      let fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('Solo se permiten archivos PDF o imágenes (JPG, PNG)')).toBeInTheDocument();
      });

      // Ahora seleccionar un archivo válido
      const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });

      fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.queryByText('Solo se permiten archivos PDF o imágenes (JPG, PNG)')).not.toBeInTheDocument();
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('tamaño de archivo', () => {
    it('debe mostrar el tamaño del archivo en KB', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 512 * 1024 }); // 512 KB

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('512.0 KB')).toBeInTheDocument();
      });
    });

    it('debe mostrar el tamaño correcto para archivos pequeños', async () => {
      const document = createDocument();

      render(<ResubmitDocument document={document} />);

      const file = new File(['content'], 'small.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 }); // 10 KB

      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('10.0 KB')).toBeInTheDocument();
      });
    });
  });
});
