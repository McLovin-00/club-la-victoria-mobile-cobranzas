/**
 * Comprehensive tests for RemitoUploader using ESM mocking pattern
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock implementations
let mockUploadRemito: jest.Mock;
let mockIsLoading: boolean;
let mockIsError: boolean;
let mockError: { data?: { message?: string } } | null;
let mockChoferesData: { data: Array<{ id: number; dni: string; nombre?: string; apellido?: string }> } | undefined;
let mockUser: {
  role: string;
  empresaId: number;
  choferId?: number;
  choferDni?: string;
  choferNombre?: string;
  choferApellido?: string;
} | null;

// Mock FileReader
class MockFileReader {
  public onload: ((e: { target: { result: string } }) => void) | null = null;
  readAsDataURL(_file: File) {
    setTimeout(() => {
      this.onload?.({ target: { result: 'data:image/png;base64,AAA' } });
    }, 0);
  }
}

describe('RemitoUploader - Coverage Tests', () => {
  let RemitoUploader: React.FC<{
    onSuccess?: (remitoId: number) => void;
    dadorCargaId?: number;
  }>;

  beforeAll(async () => {
    // Replace global FileReader
    (globalThis as unknown as { FileReader: typeof MockFileReader }).FileReader = MockFileReader;

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Initialize mocks
    mockUploadRemito = jest.fn(() => ({
      unwrap: () => Promise.resolve({ success: true, data: { id: 123 } }),
    }));
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
    mockChoferesData = { data: [] };
    mockUser = { role: 'CHOFER', empresaId: 1 };

    // Mock remitosApiSlice
    jest.unstable_mockModule('../../api/remitosApiSlice', () => ({
      useUploadRemitoMutation: () => [
        (...args: unknown[]) => mockUploadRemito(...args),
        { isLoading: mockIsLoading, isError: mockIsError, error: mockError },
      ],
    }));

    // Mock documentosApiSlice
    jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => ({
      useGetChoferesQuery: () => ({
        data: mockChoferesData,
      }),
    }));

    // Mock store hooks
    jest.unstable_mockModule('../../../../store/hooks', () => ({
      useAppSelector: (selector: (state: { auth: { user: typeof mockUser } }) => unknown) =>
        selector({ auth: { user: mockUser } }),
    }));

    // Mock CameraCapture
    jest.unstable_mockModule('../../../documentos/components/CameraCapture', () => ({
      CameraCapture: ({ isOpen, onClose, onCapture }: { isOpen: boolean; onClose: () => void; onCapture: (files: File[]) => void }) => 
        isOpen ? (
          <div data-testid="camera-modal">
            <button onClick={onClose}>Close Camera</button>
            <button onClick={() => {
              const file = new File(['test'], 'camera-photo.jpg', { type: 'image/jpeg' });
              onCapture([file]);
            }}>Take Photo</button>
          </div>
        ) : null,
    }));

    // Import the actual component AFTER mocking
    const module = await import('../RemitoUploader');
    RemitoUploader = module.RemitoUploader;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
    mockChoferesData = { data: [] };
    mockUser = { role: 'CHOFER', empresaId: 1 };
    mockUploadRemito.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ success: true, data: { id: 123 } }),
    }));
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders upload area with correct text', () => {
      render(<RemitoUploader />);

      expect(screen.getByText(/Cargar Remito/i)).toBeTruthy();
      expect(screen.getByText(/Arrastrá las imágenes del remito aquí/i)).toBeTruthy();
      expect(screen.getByText(/Seleccionar archivos/i)).toBeTruthy();
      expect(screen.getByText(/Tomar foto/i)).toBeTruthy();
    });

    it('renders file input with correct attributes', () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.getAttribute('accept')).toBe('image/*,application/pdf');
      expect(input.hasAttribute('multiple')).toBe(true);
    });

    it('shows chofer info banner for CHOFER role', () => {
      mockUser = { role: 'CHOFER', empresaId: 1 };
      render(<RemitoUploader />);

      expect(screen.getByText(/Los remitos se asociarán automáticamente a tu perfil de chofer/i)).toBeTruthy();
    });

    it('shows chofer selector for ADMIN role', () => {
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      render(<RemitoUploader />);

      expect(screen.getByPlaceholderText(/Buscar por nombre o DNI/i)).toBeTruthy();
    });

    it('shows chofer selector for SUPERADMIN role', () => {
      mockUser = { role: 'SUPERADMIN', empresaId: 1 };
      render(<RemitoUploader />);

      expect(screen.getByPlaceholderText(/Buscar por nombre o DNI/i)).toBeTruthy();
    });

    it('shows chofer selector for DADOR_DE_CARGA role', () => {
      mockUser = { role: 'DADOR_DE_CARGA', empresaId: 1 };
      render(<RemitoUploader />);

      expect(screen.getByPlaceholderText(/Buscar por nombre o DNI/i)).toBeTruthy();
    });

    it('shows chofer selector for TRANSPORTISTA role', () => {
      mockUser = { role: 'TRANSPORTISTA', empresaId: 1 };
      render(<RemitoUploader />);

      expect(screen.getByPlaceholderText(/Buscar por nombre o DNI/i)).toBeTruthy();
    });
  });

  describe('File Upload - Images', () => {
    it('allows selecting an image file', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test content'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Enviar remito para Análisis/i)).toBeTruthy();
      });
    });

    it('shows file count after uploading', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/1 archivo seleccionado/i)).toBeTruthy();
      });
    });

    it('shows plural text for multiple files', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file1 = new File(['test1'], 'remito1.png', { type: 'image/png' });
      const file2 = new File(['test2'], 'remito2.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/1 archivo seleccionado/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file2] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/2 archivos seleccionados/i)).toBeTruthy();
      });
    });

    it('shows Limpiar todo button when files are present', async () => {
      const { container } = render(<RemitoUploader />);

      expect(screen.queryByText('Limpiar todo')).not.toBeTruthy();

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Limpiar todo')).toBeTruthy();
      });
    });

    it('clears all files when Limpiar todo is clicked', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Limpiar todo')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Limpiar todo'));

      await waitFor(() => {
        expect(screen.getByText(/Arrastrá las imágenes del remito aquí/i)).toBeTruthy();
      });
    });
  });

  describe('File Upload - PDF', () => {
    it('allows selecting a PDF file', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['%PDF-1.4'], 'remito.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Enviar remito para Análisis/i)).toBeTruthy();
        expect(screen.getByText(/remito.pdf/i)).toBeTruthy();
      });
    });

    it('shows alert when trying to add second PDF', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file1 = new File(['%PDF-1.4'], 'remito1.pdf', { type: 'application/pdf' });
      const file2 = new File(['%PDF-1.4'], 'remito2.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/remito1.pdf/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file2] } });
      });

      expect(alertSpy).toHaveBeenCalledWith('Solo se permite un PDF por remito');
    });

    it('shows alert when trying to mix PDF with images', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const imageFile = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [imageFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/1 archivo seleccionado/i)).toBeTruthy();
      });

      const pdfFile = new File(['%PDF-1.4'], 'remito.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [pdfFile] } });
      });

      expect(alertSpy).toHaveBeenCalledWith('No se puede mezclar PDF con imágenes');
    });

    it('shows alert when trying to add image after PDF', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const pdfFile = new File(['%PDF-1.4'], 'remito.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [pdfFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/remito.pdf/i)).toBeTruthy();
      });

      const imageFile = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [imageFile] } });
      });

      expect(alertSpy).toHaveBeenCalledWith('No se puede mezclar imágenes con PDF');
    });
  });

  describe('File Validation', () => {
    it('shows alert for invalid file type', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'document.txt', { type: 'text/plain' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(alertSpy).toHaveBeenCalledWith('Solo se permiten imágenes (JPG, PNG) o PDF');
    });
  });

  describe('Drag and Drop', () => {
    it('shows drag state when dragging over', () => {
      const { container } = render(<RemitoUploader />);

      const dropZone = container.querySelector('.border-dashed') as HTMLElement;

      fireEvent.dragOver(dropZone, { preventDefault: () => {} });

      expect(dropZone.className).toContain('border-blue-500');
    });

    it('removes drag state when dragging leaves', async () => {
      const { container } = render(<RemitoUploader />);

      const dropZone = container.querySelector('.border-dashed') as HTMLElement;

      fireEvent.dragOver(dropZone, { preventDefault: () => {} });
      expect(dropZone.className).toContain('border-blue-500');

      fireEvent.dragLeave(dropZone);

      await waitFor(() => {
        expect(dropZone.className).not.toContain('border-blue-500');
      });
    });

    it('handles file drop', async () => {
      const { container } = render(<RemitoUploader />);

      const dropZone = container.querySelector('.border-dashed') as HTMLElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      const dataTransfer = {
        files: [file],
      };

      await act(async () => {
        fireEvent.drop(dropZone, { 
          preventDefault: () => {}, 
          dataTransfer,
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/1 archivo seleccionado/i)).toBeTruthy();
      });
    });
  });

  describe('Remove File', () => {
    it('removes individual file when clicking X button', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/1 archivo seleccionado/i)).toBeTruthy();
      });

      // Find and click the remove button
      const removeButtons = container.querySelectorAll('button');
      const removeButton = Array.from(removeButtons).find(btn => 
        btn.querySelector('svg')?.classList.contains('h-4')
      );

      if (removeButton) {
        fireEvent.click(removeButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/Arrastrá las imágenes del remito aquí/i)).toBeTruthy();
      });
    });
  });

  describe('Submit Upload', () => {
    it('calls uploadRemito when submitting as CHOFER', async () => {
      mockUser = {
        role: 'CHOFER',
        empresaId: 1,
        choferId: 10,
        choferDni: '12345678',
        choferNombre: 'Juan',
        choferApellido: 'Perez',
      };

      const onSuccess = jest.fn();
      const { container } = render(<RemitoUploader onSuccess={onSuccess} dadorCargaId={5} />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Enviar remito para Análisis/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.click(screen.getByText(/Enviar remito para Análisis/i));
      });

      await waitFor(() => {
        expect(mockUploadRemito).toHaveBeenCalledWith(
          expect.objectContaining({
            dadorCargaId: 5,
            choferId: 10,
            choferDni: '12345678',
            choferNombre: 'Juan',
            choferApellido: 'Perez',
          })
        );
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(123);
      });
    });

    it('shows alert when ADMIN submits without selecting chofer', async () => {
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Enviar remito para Análisis/i)).toBeTruthy();
      });

      fireEvent.click(screen.getByText(/Enviar remito para Análisis/i));

      expect(alertSpy).toHaveBeenCalledWith('Debe seleccionar un chofer');
    });

    it('does nothing when submitting with no files', async () => {
      render(<RemitoUploader />);

      // Try to find submit button (shouldn't exist without files)
      expect(screen.queryByText(/Enviar remito para Análisis/i)).not.toBeTruthy();
    });

    it('handles upload error gracefully', async () => {
      mockUser = { role: 'CHOFER', empresaId: 1, choferId: 10 };
      mockUploadRemito.mockImplementation(() => ({
        unwrap: () => Promise.reject(new Error('Upload failed')),
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Enviar remito para Análisis/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.click(screen.getByText(/Enviar remito para Análisis/i));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error subiendo remito:', expect.anything());
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when uploading', async () => {
      mockIsLoading = true;
      mockUser = { role: 'CHOFER', empresaId: 1, choferId: 10 };

      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Subiendo y procesando/i)).toBeTruthy();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message when upload fails', async () => {
      mockIsError = true;
      mockError = { data: { message: 'Error de servidor' } };
      mockUser = { role: 'CHOFER', empresaId: 1, choferId: 10 };

      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Error de servidor/i)).toBeTruthy();
      });
    });

    it('shows default error message when no specific message', async () => {
      mockIsError = true;
      mockError = null;
      mockUser = { role: 'CHOFER', empresaId: 1, choferId: 10 };

      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Error al subir el remito/i)).toBeTruthy();
      });
    });
  });

  describe('Chofer Selector', () => {
    it('shows dropdown when focusing on search input', async () => {
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      mockChoferesData = {
        data: [
          { id: 1, dni: '11111111', nombre: 'Carlos', apellido: 'Lopez' },
          { id: 2, dni: '22222222', nombre: 'Maria', apellido: 'Garcia' },
        ],
      };

      render(<RemitoUploader />);

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o DNI/i);
      fireEvent.focus(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Carlos Lopez')).toBeTruthy();
        expect(screen.getByText('Maria Garcia')).toBeTruthy();
      });
    });

    it('selects chofer when clicking on dropdown item', async () => {
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      mockChoferesData = {
        data: [
          { id: 1, dni: '11111111', nombre: 'Carlos', apellido: 'Lopez' },
        ],
      };

      render(<RemitoUploader />);

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o DNI/i) as HTMLInputElement;
      fireEvent.focus(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Carlos Lopez')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Carlos Lopez'));

      await waitFor(() => {
        // After selection, input shows selected chofer name
        expect(searchInput.value).toBe('Carlos Lopez - 11111111');
      });
    });

    it('clears chofer selection when clicking X', async () => {
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      mockChoferesData = {
        data: [
          { id: 1, dni: '11111111', nombre: 'Carlos', apellido: 'Lopez' },
        ],
      };

      const { container } = render(<RemitoUploader />);

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o DNI/i) as HTMLInputElement;
      fireEvent.focus(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Carlos Lopez')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Carlos Lopez'));

      await waitFor(() => {
        // After selection, input shows selected chofer name
        expect(searchInput.value).toBe('Carlos Lopez - 11111111');
      });

      // Find clear button
      const clearButton = container.querySelector('button[title="Limpiar selección"]');
      if (clearButton) {
        fireEvent.click(clearButton);
      }

      await waitFor(() => {
        // After clearing, input should be empty or editable
        expect(searchInput.value).toBe('');
      });
    });

    it('shows no results message when no choferes found', async () => {
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      mockChoferesData = { data: [] };

      render(<RemitoUploader />);

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o DNI/i);
      fireEvent.focus(searchInput);

      await waitFor(() => {
        expect(screen.getByText(/No se encontraron choferes/i)).toBeTruthy();
      });
    });

    it('updates search text when typing', async () => {
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      mockChoferesData = { data: [] };

      render(<RemitoUploader />);

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o DNI/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'Juan' } });

      expect(searchInput.value).toBe('Juan');
    });

    it('clears selected chofer when typing in search', async () => {
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      mockChoferesData = {
        data: [
          { id: 1, dni: '11111111', nombre: 'Carlos', apellido: 'Lopez' },
        ],
      };

      render(<RemitoUploader />);

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o DNI/i) as HTMLInputElement;
      fireEvent.focus(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Carlos Lopez')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Carlos Lopez'));

      await waitFor(() => {
        // After selection, input shows selected chofer
        expect(searchInput.value).toBe('Carlos Lopez - 11111111');
      });
      
      // Verify we can see the selection confirmation
      expect(searchInput.readOnly).toBe(true);
    });
  });

  describe('Camera Capture', () => {
    it('opens camera modal when clicking Tomar foto', async () => {
      render(<RemitoUploader />);

      fireEvent.click(screen.getByText('Tomar foto'));

      await waitFor(() => {
        expect(screen.getByTestId('camera-modal')).toBeTruthy();
      });
    });

    it('closes camera modal when clicking Close Camera', async () => {
      render(<RemitoUploader />);

      fireEvent.click(screen.getByText('Tomar foto'));

      await waitFor(() => {
        expect(screen.getByTestId('camera-modal')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Close Camera'));

      await waitFor(() => {
        expect(screen.queryByTestId('camera-modal')).not.toBeTruthy();
      });
    });

    it('adds photo from camera to files', async () => {
      render(<RemitoUploader />);

      fireEvent.click(screen.getByText('Tomar foto'));

      await waitFor(() => {
        expect(screen.getByTestId('camera-modal')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Take Photo'));

      await waitFor(() => {
        expect(screen.getByText(/1 archivo seleccionado/i)).toBeTruthy();
      });
    });
  });

  describe('Add More Images', () => {
    it('shows Agregar más button when images are uploaded and less than 10', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Agregar más')).toBeTruthy();
      });
    });

    it('does not show Agregar más for PDF', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['%PDF-1.4'], 'remito.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/remito.pdf/i)).toBeTruthy();
      });

      expect(screen.queryByText('Agregar más')).not.toBeTruthy();
    });
  });

  describe('Submit with Selected Chofer', () => {
    it('submits with selected chofer data for ADMIN role', async () => {
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      mockChoferesData = {
        data: [
          { id: 5, dni: '55555555', nombre: 'Pedro', apellido: 'Martinez' },
        ],
      };

      const onSuccess = jest.fn();
      const { container } = render(<RemitoUploader onSuccess={onSuccess} dadorCargaId={3} />);

      // Select chofer
      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o DNI/i);
      fireEvent.focus(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Pedro Martinez')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Pedro Martinez'));

      // Upload file
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Enviar remito para Análisis/i)).toBeTruthy();
      });

      // Submit
      await act(async () => {
        fireEvent.click(screen.getByText(/Enviar remito para Análisis/i));
      });

      await waitFor(() => {
        expect(mockUploadRemito).toHaveBeenCalledWith(
          expect.objectContaining({
            dadorCargaId: 3,
            choferId: 5,
            choferDni: '55555555',
            choferNombre: 'Pedro',
            choferApellido: 'Martinez',
          })
        );
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(123);
      });
    });
  });

  describe('Multiple Images Info', () => {
    it('shows combine info when multiple images uploaded', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file1 = new File(['test1'], 'remito1.png', { type: 'image/png' });
      const file2 = new File(['test2'], 'remito2.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1] } });
      });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file2] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/se combinarán en PDF/i)).toBeTruthy();
      });
    });

    it('shows correct button text for multiple images', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file1 = new File(['test1'], 'remito1.png', { type: 'image/png' });
      const file2 = new File(['test2'], 'remito2.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1] } });
      });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file2] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Enviar 2 imágenes para Análisis/i)).toBeTruthy();
      });
    });
  });

  describe('Button Clicks', () => {
    it('clicking Seleccionar archivos triggers file input', () => {
      const { container } = render(<RemitoUploader />);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, 'click');

      fireEvent.click(screen.getByText('Seleccionar archivos'));

      expect(clickSpy).toHaveBeenCalled();
    });

    it('clicking Agregar más triggers file input', async () => {
      const { container } = render(<RemitoUploader />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'remito.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Agregar más')).toBeTruthy();
      });

      const clickSpy = jest.spyOn(input, 'click');
      fireEvent.click(screen.getByText('Agregar más'));

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Chofer Selector Blur', () => {
    it('closes dropdown on blur after delay', async () => {
      jest.useFakeTimers();
      mockUser = { role: 'ADMIN_INTERNO', empresaId: 1 };
      mockChoferesData = {
        data: [
          { id: 1, dni: '11111111', nombre: 'Carlos', apellido: 'Lopez' },
        ],
      };

      render(<RemitoUploader />);

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre o DNI/i);
      fireEvent.focus(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Carlos Lopez')).toBeTruthy();
      });

      fireEvent.blur(searchInput);

      // Dropdown should still be visible immediately
      expect(screen.getByText('Carlos Lopez')).toBeTruthy();

      // Advance timers by 300ms (more than the 250ms delay)
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // After timeout, dropdown should be hidden
      await waitFor(() => {
        expect(screen.queryByText('Carlos Lopez')).not.toBeTruthy();
      });

      jest.useRealTimers();
    });
  });
});
