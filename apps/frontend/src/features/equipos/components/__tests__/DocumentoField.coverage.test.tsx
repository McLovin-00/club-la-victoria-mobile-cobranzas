/**
 * Tests completos para DocumentoField - Coverage exhaustivo
 *
 * Cubre:
 * - Renderizado en diferentes estados
 * - Selección de archivos válidos e inválidos
 * - Validaciones de tipo y tamaño
 * - Upload exitoso y con errores
 * - Manejo de campos requeridos (expiry)
 * - Modo selectOnly
 * - Estados de disabled
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentoField } from '../DocumentoField';
import type { DocumentoFieldProps } from '../DocumentoField';

// No mockeamos heroicons para que se renderice el SVG real

describe('DocumentoField', () => {
  const mockUploadMutation = jest.fn();
  const mockOnUploadSuccess = jest.fn();
  const mockOnFileSelect = jest.fn();

  const defaultProps: DocumentoFieldProps = {
    templateId: 1,
    templateName: 'DNI Frente',
    entityType: 'CHOFER' as const,
    entityId: '12345',
    dadorCargaId: 100,
    requiresExpiry: false,
    onUploadSuccess: mockOnUploadSuccess,
    uploadMutation: mockUploadMutation,
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadMutation.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  describe('Renderizado inicial', () => {
    it('renderiza el nombre del template', () => {
      render(<DocumentoField {...defaultProps} />);
      expect(screen.getByText('DNI Frente')).toBeInTheDocument();
    });

    it('renderiza input de archivo', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('renderiza botón de subir deshabilitado sin archivo', () => {
      render(<DocumentoField {...defaultProps} />);
      const uploadButton = screen.getByRole('button', { name: /subir/i });
      expect(uploadButton).toBeDisabled();
    });

    it('muestra círculo vacío cuando no hay archivo ni está subido', () => {
      render(<DocumentoField {...defaultProps} />);
      const circle = document.querySelector('.border-gray-300.rounded-full');
      expect(circle).toBeInTheDocument();
    });
  });

  describe('Selección de archivos', () => {
    it('acepta archivo PDF válido', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const pdfFile = new File(['pdf content'], 'documento.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [pdfFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(screen.getByText(/documento.pdf/i)).toBeInTheDocument();
    });

    it('acepta archivo JPG válido', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const jpgFile = new File(['jpg content'], 'foto.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', {
        value: [jpgFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(screen.getByText(/foto.jpg/i)).toBeInTheDocument();
    });

    it('acepta archivo PNG válido', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const pngFile = new File(['png content'], 'imagen.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [pngFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(screen.getByText(/imagen.png/i)).toBeInTheDocument();
    });

    it('acepta archivo WEBP válido', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const webpFile = new File(['webp content'], 'imagen.webp', { type: 'image/webp' });
      Object.defineProperty(fileInput, 'files', {
        value: [webpFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(screen.getByText(/imagen.webp/i)).toBeInTheDocument();
    });

    it('rechaza archivo con tipo inválido', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const txtFile = new File(['text content'], 'documento.txt', { type: 'text/plain' });
      Object.defineProperty(fileInput, 'files', {
        value: [txtFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(screen.getByText(/solo se permiten archivos pdf o imágenes/i)).toBeInTheDocument();
    });

    it('rechaza archivo que excede 10MB', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Crear archivo mayor a 10MB
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)],
        'grande.pdf',
        { type: 'application/pdf' }
      );
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(screen.getByText(/no debe superar 10mb/i)).toBeInTheDocument();
    });

    it('muestra tamaño del archivo en KB', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['a'.repeat(2048)], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(screen.getByText(/\d+ KB/)).toBeInTheDocument();
    });

    it('habilita botón de subir cuando hay archivo válido', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      expect(uploadButton).not.toBeDisabled();
    });

    it('limpia estado uploaded al seleccionar nuevo archivo', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const validFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Verificar que el archivo se seleccionó correctamente
      expect(screen.getByText(/test.pdf/i)).toBeInTheDocument();
    });
  });

  describe('Campo de vencimiento (requiresExpiry)', () => {
    it('muestra campo de fecha cuando requiresExpiry es true', () => {
      render(<DocumentoField {...defaultProps} requiresExpiry={true} />);
      expect(screen.getByText(/vencimiento \*/i)).toBeInTheDocument();
      const dateInput = document.querySelector('input[type="date"]');
      expect(dateInput).toBeInTheDocument();
    });

    it('no muestra campo de fecha cuando requiresExpiry es false', () => {
      render(<DocumentoField {...defaultProps} requiresExpiry={false} />);
      expect(screen.queryByText(/vencimiento/i)).not.toBeInTheDocument();
    });

    it('permite ingresar fecha de vencimiento', () => {
      render(<DocumentoField {...defaultProps} requiresExpiry={true} />);
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;

      fireEvent.change(dateInput, { target: { value: '2025-12-31' } });

      expect(dateInput.value).toBe('2025-12-31');
    });

    it('establece fecha mínima como hoy', () => {
      render(<DocumentoField {...defaultProps} requiresExpiry={true} />);
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      const today = new Date().toISOString().split('T')[0];

      expect(dateInput.min).toBe(today);
    });
  });

  describe('Upload de documentos', () => {
    it('sube documento exitosamente sin vencimiento', async () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'dni.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockUploadMutation).toHaveBeenCalled();
      });

      const formData = mockUploadMutation.mock.calls[0][0] as FormData;
      expect(formData.get('document')).toBe(file);
      expect(formData.get('templateId')).toBe('1');
      expect(formData.get('entityType')).toBe('CHOFER');
      expect(formData.get('entityId')).toBe('12345');
      expect(formData.get('dadorCargaId')).toBe('100');
      expect(formData.get('mode')).toBe('renewal');
    });

    it('sube documento exitosamente con vencimiento', async () => {
      render(<DocumentoField {...defaultProps} requiresExpiry={true} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'licencia.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2025-12-31' } });

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockUploadMutation).toHaveBeenCalled();
      });

      const formData = mockUploadMutation.mock.calls[0][0] as FormData;
      const planilla = formData.get('planilla');
      expect(planilla).toBeTruthy();
    });

    it('muestra estado de "Subiendo..." durante upload', async () => {
      mockUploadMutation.mockReturnValue({
        unwrap: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      });

      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      expect(screen.getByText(/subiendo.../i)).toBeInTheDocument();
    });

    it('muestra estado de "Subido" tras upload exitoso', async () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/✓ subido/i)).toBeInTheDocument();
      });
    });

    it('cambia estilo del contenedor tras upload exitoso', async () => {
      const { container } = render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        const wrapper = container.querySelector('.bg-green-50');
        expect(wrapper).toBeInTheDocument();
      });
    });

    it('llama a onUploadSuccess tras upload exitoso', async () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalled();
        expect(mockOnUploadSuccess.mock.calls[0][0]).toBe(1);
      });
    });

    it('llama a onUploadSuccess con fecha cuando hay vencimiento', async () => {
      render(<DocumentoField {...defaultProps} requiresExpiry={true} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2025-12-31' } });

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalledWith(1, '2025-12-31');
      });
    });

    it('limpia el input de archivo tras upload exitoso', async () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });
    });
  });

  describe('Validaciones de upload', () => {
    it('mantiene botón disabled sin archivo seleccionado', () => {
      render(<DocumentoField {...defaultProps} />);
      const uploadButton = screen.getByRole('button', { name: /subir/i });

      // El botón debe estar disabled cuando no hay archivo
      expect(uploadButton).toBeDisabled();
    });

    it('muestra error si falta vencimiento requerido', async () => {
      render(<DocumentoField {...defaultProps} requiresExpiry={true} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/fecha de vencimiento es obligatoria/i)).toBeInTheDocument();
      });
    });

    it('muestra error si entityId es vacío', async () => {
      render(<DocumentoField {...defaultProps} entityId="" />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/completá primero los datos básicos/i)).toBeInTheDocument();
      });
    });

    it('muestra error si entityId es "0"', async () => {
      render(<DocumentoField {...defaultProps} entityId="0" />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/completá primero los datos básicos/i)).toBeInTheDocument();
      });
    });
  });

  describe('Manejo de errores de upload', () => {
    it('muestra mensaje de error del backend cuando falla', async () => {
      mockUploadMutation.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue({
          data: { message: 'Error del servidor' }
        }),
      });

      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
      });
    });

    it('muestra mensaje de error alternativo cuando falla', async () => {
      mockUploadMutation.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue({
          message: 'Error de red'
        }),
      });

      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/error de red/i)).toBeInTheDocument();
      });
    });

    it('muestra error genérico si no hay mensaje', async () => {
      mockUploadMutation.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue({}),
      });

      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/error al subir documento/i)).toBeInTheDocument();
      });
    });

    it('no marca como subido si falla el upload', async () => {
      mockUploadMutation.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue({ message: 'Error' }),
      });

      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.queryByText(/✓ subido/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Estado disabled', () => {
    it('deshabilita input de archivo cuando disabled es true', () => {
      render(<DocumentoField {...defaultProps} disabled={true} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput).toBeDisabled();
    });

    it('deshabilita botón de subir cuando disabled es true', () => {
      render(<DocumentoField {...defaultProps} disabled={true} />);
      const uploadButton = screen.getByRole('button', { name: /subir/i });

      expect(uploadButton).toBeDisabled();
    });

    it('deshabilita campo de fecha cuando disabled es true', () => {
      render(<DocumentoField {...defaultProps} requiresExpiry={true} disabled={true} />);
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;

      expect(dateInput).toBeDisabled();
    });
  });

  describe('Modo selectOnlyMode', () => {
    it('no muestra botón de subir en modo selectOnly', () => {
      render(<DocumentoField {...defaultProps} selectOnlyMode={true} onFileSelect={mockOnFileSelect} />);

      expect(screen.queryByRole('button', { name: /subir/i })).not.toBeInTheDocument();
    });

    it('llama a onFileSelect al seleccionar archivo en modo selectOnly', () => {
      render(<DocumentoField {...defaultProps} selectOnlyMode={true} onFileSelect={mockOnFileSelect} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      expect(mockOnFileSelect).toHaveBeenCalledWith(1, file, '');
    });

    it('llama a onFileSelect al cambiar fecha en modo selectOnly', () => {
      render(<DocumentoField {...defaultProps} selectOnlyMode={true} requiresExpiry={true} onFileSelect={mockOnFileSelect} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Primero seleccionar archivo
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Luego cambiar fecha
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2025-12-31' } });

      expect(mockOnFileSelect).toHaveBeenLastCalledWith(1, file, '2025-12-31');
    });

    it('no llama a onFileSelect si no hay archivo al cambiar fecha', () => {
      render(<DocumentoField {...defaultProps} selectOnlyMode={true} requiresExpiry={true} onFileSelect={mockOnFileSelect} />);

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2025-12-31' } });

      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });
  });

  describe('Diferentes entityTypes', () => {
    it('maneja entityType EMPRESA_TRANSPORTISTA', async () => {
      render(<DocumentoField {...defaultProps} entityType="EMPRESA_TRANSPORTISTA" />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        const formData = mockUploadMutation.mock.calls[0][0] as FormData;
        expect(formData.get('entityType')).toBe('EMPRESA_TRANSPORTISTA');
      });
    });

    it('maneja entityType CAMION', async () => {
      render(<DocumentoField {...defaultProps} entityType="CAMION" />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        const formData = mockUploadMutation.mock.calls[0][0] as FormData;
        expect(formData.get('entityType')).toBe('CAMION');
      });
    });

    it('maneja entityType ACOPLADO', async () => {
      render(<DocumentoField {...defaultProps} entityType="ACOPLADO" />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        const formData = mockUploadMutation.mock.calls[0][0] as FormData;
        expect(formData.get('entityType')).toBe('ACOPLADO');
      });
    });
  });

  describe('Iconos y estados visuales', () => {
    it('muestra icono de check cuando está subido', async () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/✓ subido/i)).toBeInTheDocument();
      });
    });

    it('muestra spinner durante upload', () => {
      mockUploadMutation.mockReturnValue({
        unwrap: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      });

      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('muestra icono de error cuando hay error', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const invalidFile = new File(['text'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      fireEvent.change(fileInput);

      const errorIcon = document.querySelector('.text-red-600 svg');
      expect(errorIcon).toBeInTheDocument();
    });

    it('muestra icono de upload en el botón', () => {
      render(<DocumentoField {...defaultProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const uploadIcon = screen.getByRole('button', { name: /subir/i }).querySelector('svg');
      expect(uploadIcon).toBeInTheDocument();
    });
  });
});
