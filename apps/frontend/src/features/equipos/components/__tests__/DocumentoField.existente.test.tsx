/**
 * Tests para DocumentoField - Documentos Existentes y Reemplazo
 * 
 * Cubre el flujo de documentos existentes reutilizables:
 * - Mostrar documento existente VIGENTE
 * - Mostrar documento existente POR_VENCER
 * - Botón "Reemplazar"
 * - Estados visuales por tipo de documento
 * - Fechas de vencimiento y días restantes
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentoField } from '../DocumentoField';
import type { DocumentoFieldProps } from '../DocumentoField';
import type { DocumentoExistente } from '../../hooks/useEntityVerification';

describe('DocumentoField - Documentos Existentes', () => {
  const mockUploadMutation = jest.fn();
  const mockOnUploadSuccess = jest.fn();

  const defaultProps: DocumentoFieldProps = {
    templateId: 1,
    templateName: 'Licencia de Conducir',
    entityType: 'CHOFER' as const,
    entityId: '12345678',
    dadorCargaId: 100,
    requiresExpiry: true,
    onUploadSuccess: mockOnUploadSuccess,
    uploadMutation: mockUploadMutation,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadMutation.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  describe('Documento VIGENTE reutilizable', () => {
    it('muestra documento existente VIGENTE sin botón de upload', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      expect(screen.getByText('Licencia de Conducir')).toBeInTheDocument();
      expect(screen.getByText(/✓ vigente/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /subir/i })).not.toBeInTheDocument();
    });

    it('muestra fecha de vencimiento del documento existente', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      expect(screen.getByText(/vence:/i)).toBeInTheDocument();
      expect(screen.getByText(/31\/12\/2026/i)).toBeInTheDocument();
    });

    it('muestra botón "Reemplazar" en documento existente', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      expect(screen.getByRole('button', { name: /reemplazar/i })).toBeInTheDocument();
    });

    it('cambia a modo edición al hacer click en "Reemplazar"', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      const reemplazarButton = screen.getByRole('button', { name: /reemplazar/i });
      fireEvent.click(reemplazarButton);

      // Ahora debe mostrar el formulario de upload
      expect(screen.queryByText(/✓ vigente/i)).not.toBeInTheDocument();
      expect(screen.getByText(/reemplazando/i)).toBeInTheDocument();
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('muestra badge "Reemplazando" en modo reemplazo', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      const reemplazarButton = screen.getByRole('button', { name: /reemplazar/i });
      fireEvent.click(reemplazarButton);

      expect(screen.getByText(/reemplazando/i)).toBeInTheDocument();
    });

    it('muestra botón "Cancelar" en modo reemplazo', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      const reemplazarButton = screen.getByRole('button', { name: /reemplazar/i });
      fireEvent.click(reemplazarButton);

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('vuelve a mostrar documento existente al cancelar reemplazo', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Activar modo reemplazo
      const reemplazarButton = screen.getByRole('button', { name: /reemplazar/i });
      fireEvent.click(reemplazarButton);

      // Cancelar
      const cancelarButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelarButton);

      // Debe volver a mostrar el documento existente
      expect(screen.getByText(/✓ vigente/i)).toBeInTheDocument();
      expect(screen.queryByText(/reemplazando/i)).not.toBeInTheDocument();
    });

    it('limpia archivo seleccionado al cancelar reemplazo', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Activar modo reemplazo
      const reemplazarButton = screen.getByRole('button', { name: /reemplazar/i });
      fireEvent.click(reemplazarButton);

      // Seleccionar archivo
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'nuevo.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Cancelar
      const cancelarButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelarButton);

      // Verificar que volvió al estado original
      expect(screen.getByText(/✓ vigente/i)).toBeInTheDocument();
    });

    it('aplica estilos verdes para documento VIGENTE', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      const { container } = render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      const wrapper = container.querySelector('.bg-green-50.border-green-300');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Documento POR_VENCER reutilizable', () => {
    it('muestra documento POR_VENCER con advertencia', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'POR_VENCER',
        reutilizable: true,
        expiresAt: '2026-03-15T23:59:59.999Z',
        diasParaVencer: 25,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      expect(screen.getByText(/✓ por vencer/i)).toBeInTheDocument();
    });

    it('muestra días restantes cuando es <= 30 días', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'POR_VENCER',
        reutilizable: true,
        expiresAt: '2026-03-15T23:59:59.999Z',
        diasParaVencer: 25,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      expect(screen.getByText(/\(25 días\)/i)).toBeInTheDocument();
    });

    it('no muestra días restantes cuando es > 30 días', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'POR_VENCER',
        reutilizable: true,
        expiresAt: '2026-06-15T23:59:59.999Z',
        diasParaVencer: 120,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      expect(screen.queryByText(/\(\d+ días\)/i)).not.toBeInTheDocument();
    });

    it('aplica estilos amarillos para documento POR_VENCER', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'POR_VENCER',
        reutilizable: true,
        expiresAt: '2026-03-15T23:59:59.999Z',
        diasParaVencer: 25,
      };

      const { container } = render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      const wrapper = container.querySelector('.bg-yellow-50.border-yellow-300');
      expect(wrapper).toBeInTheDocument();
    });

    it('permite reemplazar documento POR_VENCER', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'POR_VENCER',
        reutilizable: true,
        expiresAt: '2026-03-15T23:59:59.999Z',
        diasParaVencer: 25,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      const reemplazarButton = screen.getByRole('button', { name: /reemplazar/i });
      expect(reemplazarButton).toBeInTheDocument();
    });
  });

  describe('Documentos NO reutilizables', () => {
    it('no muestra vista de existente si no es reutilizable', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: false,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Debe mostrar formulario de upload, no el estado existente
      expect(screen.queryByText(/✓ vigente/i)).not.toBeInTheDocument();
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('no muestra vista de existente si estado es VENCIDO', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VENCIDO',
        reutilizable: true,
        expiresAt: '2024-12-31T23:59:59.999Z',
        diasParaVencer: -30,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Debe mostrar formulario de upload
      expect(screen.queryByText(/✓ vencido/i)).not.toBeInTheDocument();
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('no muestra vista de existente si estado es PENDIENTE', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'PENDIENTE',
        reutilizable: true,
        expiresAt: null,
        diasParaVencer: null,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Debe mostrar formulario de upload
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('no muestra vista de existente si estado es RECHAZADO', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'RECHAZADO',
        reutilizable: true,
        expiresAt: null,
        diasParaVencer: null,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Debe mostrar formulario de upload
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('no muestra vista de existente si estado es FALTANTE', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'FALTANTE',
        reutilizable: false,
        expiresAt: null,
        diasParaVencer: null,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Debe mostrar formulario de upload
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });
  });

  describe('Documento sin fecha de vencimiento', () => {
    it('no muestra fecha cuando expiresAt es null', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: null,
        diasParaVencer: null,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      expect(screen.queryByText(/vence:/i)).not.toBeInTheDocument();
    });
  });

  describe('Upload después de reemplazo', () => {
    it('puede subir archivo después de activar modo reemplazo', async () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Activar modo reemplazo
      const reemplazarButton = screen.getByRole('button', { name: /reemplazar/i });
      fireEvent.click(reemplazarButton);

      // Seleccionar archivo
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'nuevo.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Agregar fecha de vencimiento
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2027-12-31' } });

      // Subir
      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockUploadMutation).toHaveBeenCalled();
        expect(mockOnUploadSuccess).toHaveBeenCalledWith(1, '2027-12-31');
      });
    });

    it('oculta vista de existente después de upload exitoso', async () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Activar modo reemplazo
      const reemplazarButton = screen.getByRole('button', { name: /reemplazar/i });
      fireEvent.click(reemplazarButton);

      // Seleccionar y subir archivo
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'nuevo.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2027-12-31' } });

      const uploadButton = screen.getByRole('button', { name: /subir/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/✓ subido/i)).toBeInTheDocument();
        expect(screen.queryByText(/✓ vigente/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Iconos por estado', () => {
    it('muestra icono correcto para VIGENTE', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'VIGENTE',
        reutilizable: true,
        expiresAt: '2026-12-31T23:59:59.999Z',
        diasParaVencer: 350,
      };

      const { container } = render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Verificar que se renderiza el ícono (heroicon)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('muestra icono correcto para POR_VENCER', () => {
      const documentoExistente: DocumentoExistente = {
        estado: 'POR_VENCER',
        reutilizable: true,
        expiresAt: '2026-03-15T23:59:59.999Z',
        diasParaVencer: 25,
      };

      const { container } = render(<DocumentoField {...defaultProps} documentoExistente={documentoExistente} />);

      // Verificar que se renderiza el ícono (heroicon)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
