/**
 * Tests de cobertura para SeccionDocumentos
 *
 * Cubre todas las ramas sin cubrir para alcanzar ≥90%:
 * - Línea 47: cálculo de uploadedCount
 * - Líneas 58-61: warning cuando !entityId || entityId === '0'
 * - Líneas 64-87: renderizado de templates
 * - Líneas 66-68: cálculo de requiresExpiry
 * - Líneas 70-84: propagación de props a DocumentoField
 *
 * NOTA: La línea 67 (template.name.includes(keyword)) no puede cubrirse sin modificar
 * el código fuente porque TEMPLATES_WITHOUT_EXPIRY es un array vacío.
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SeccionDocumentos, type Template } from '../SeccionDocumentos';
import type { SeccionDocumentosProps } from '../SeccionDocumentos';

describe('SeccionDocumentos - Coverage', () => {
  const mockUploadMutation = jest.fn();
  const mockOnUploadSuccess = jest.fn();
  const mockOnFileSelect = jest.fn();

  const defaultProps: SeccionDocumentosProps = {
    titulo: 'Documentos del Chofer',
    templates: [
      { id: 1, name: 'DNI Frente', entityType: 'CHOFER' },
      { id: 2, name: 'DNI Dorso', entityType: 'CHOFER' },
      { id: 3, name: 'Licencia de Conducir', entityType: 'CHOFER' },
    ] as Template[],
    entityType: 'CHOFER',
    entityId: '12345',
    dadorCargaId: 100,
    onUploadSuccess: mockOnUploadSuccess,
    uploadMutation: mockUploadMutation,
    uploadedTemplateIds: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadMutation.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  describe('Renderizado de título y contador (líneas 52-55)', () => {
    it('renderiza el título de la sección', () => {
      render(<SeccionDocumentos {...defaultProps} />);

      expect(screen.getByText('Documentos del Chofer')).toBeInTheDocument();
    });

    it('muestra contador 0/3 cuando no hay documentos subidos', () => {
      render(<SeccionDocumentos {...defaultProps} uploadedTemplateIds={[]} />);

      expect(screen.getByText('0/3 documentos')).toBeInTheDocument();
    });

    it('muestra contador 1/3 cuando hay un documento subido', () => {
      render(<SeccionDocumentos {...defaultProps} uploadedTemplateIds={[1]} />);

      expect(screen.getByText('1/3 documentos')).toBeInTheDocument();
    });

    it('muestra contador 3/3 cuando todos están subidos', () => {
      render(<SeccionDocumentos {...defaultProps} uploadedTemplateIds={[1, 2, 3]} />);

      expect(screen.getByText('3/3 documentos')).toBeInTheDocument();
    });

    it('calcula correctamente uploadedCount con IDs parcialmente subidos', () => {
      render(<SeccionDocumentos {...defaultProps} uploadedTemplateIds={[2, 3]} />);

      expect(screen.getByText('2/3 documentos')).toBeInTheDocument();
    });

    it('calcula correctamente uploadedCount cuando solo algunos IDs coinciden', () => {
      const props = {
        ...defaultProps,
        templates: [
          { id: 1, name: 'DNI', entityType: 'CHOFER' },
          { id: 5, name: 'Licencia', entityType: 'CHOFER' },
          { id: 9, name: 'Cedula', entityType: 'CHOFER' },
        ] as Template[],
        uploadedTemplateIds: [1, 2, 5], // Solo 1 y 5 coinciden
      };

      render(<SeccionDocumentos {...props} />);

      expect(screen.getByText('2/3 documentos')).toBeInTheDocument();
    });
  });

  describe('Warning cuando !entityId || entityId === "0" (líneas 58-61)', () => {
    it('muestra warning cuando entityId es vacío', () => {
      render(<SeccionDocumentos {...defaultProps} entityId="" />);

      expect(screen.getByText(/Completá primero los datos básicos para habilitar esta sección/)).toBeInTheDocument();
    });

    it('muestra warning cuando entityId es "0"', () => {
      render(<SeccionDocumentos {...defaultProps} entityId="0" />);

      expect(screen.getByText(/Completá primero los datos básicos para habilitar esta sección/)).toBeInTheDocument();
    });

    it('muestra warning cuando entityId es undefined', () => {
      render(<SeccionDocumentos {...defaultProps} entityId={undefined as unknown as string} />);

      expect(screen.getByText(/Completá primero los datos básicos para habilitar esta sección/)).toBeInTheDocument();
    });

    it('no muestra warning cuando entityId tiene valor válido', () => {
      render(<SeccionDocumentos {...defaultProps} entityId="123" />);

      expect(screen.queryByText(/Completá primero los datos básicos/)).not.toBeInTheDocument();
    });

    it('no muestra warning cuando entityId es número como string', () => {
      render(<SeccionDocumentos {...defaultProps} entityId="456" />);

      expect(screen.queryByText(/Completá primero los datos básicos/)).not.toBeInTheDocument();
    });
  });

  describe('Renderizado de lista de templates (líneas 64-87)', () => {
    it('renderiza lista vacía cuando no hay templates', () => {
      render(<SeccionDocumentos {...defaultProps} templates={[]} />);

      expect(screen.getByText('0/0 documentos')).toBeInTheDocument();
    });

    it('renderiza un template en la lista', () => {
      const props = {
        ...defaultProps,
        templates: [{ id: 1, name: 'DNI', entityType: 'CHOFER' }] as Template[],
      };

      render(<SeccionDocumentos {...props} />);

      expect(screen.getByText('DNI')).toBeInTheDocument();
    });

    it('renderiza múltiples templates en la lista', () => {
      render(<SeccionDocumentos {...defaultProps} />);

      expect(screen.getByText('DNI Frente')).toBeInTheDocument();
      expect(screen.getByText('DNI Dorso')).toBeInTheDocument();
      expect(screen.getByText('Licencia de Conducir')).toBeInTheDocument();
    });

    it('no renderiza templates cuando entityId es "0"', () => {
      render(<SeccionDocumentos {...defaultProps} entityId="0" />);

      expect(screen.queryByText('DNI Frente')).not.toBeInTheDocument();
    });

    it('renderiza templates en orden correcto', () => {
      render(<SeccionDocumentos {...defaultProps} />);

      const labels = screen.getAllByText(/DNI/);
      expect(labels[0]).toHaveTextContent('DNI Frente');
      expect(labels[1]).toHaveTextContent('DNI Dorso');
    });
  });

  describe('Cálculo de requiresExpiry (líneas 66-68)', () => {
    it('establece requiresExpiry=true para template sin keyword especial', () => {
      const { container } = render(<SeccionDocumentos {...defaultProps} entityId="123" />);

      // Verificar que el campo de fecha se muestra (requiereExpiry=true)
      const dateLabels = container.querySelectorAll('label');
      const vencimientoLabels = Array.from(dateLabels).filter(el => el.textContent?.includes('Vencimiento'));

      // Debería haber 3 campos de vencimiento porque requiresExpiry=true para todos
      expect(vencimientoLabels.length).toBe(3);
    });

    it('pasa requiresExpiry=true por defecto (sin keywords en TEMPLATES_WITHOUT_EXPIRY)', () => {
      const { container } = render(<SeccionDocumentos {...defaultProps} entityId="123" />);

      // Todos los templates deben tener requiresExpiry=true porque
      // TEMPLATES_WITHOUT_EXPIRY está vacío
      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(3);
    });

    it('calcula requiresExpiry correctamente para cada template individualmente', () => {
      const props = {
        ...defaultProps,
        templates: [
          { id: 1, name: 'DNI Frente', entityType: 'CHOFER' },
          { id: 2, name: 'Licencia de Conducir', entityType: 'CHOFER' },
        ] as Template[],
      };

      const { container } = render(<SeccionDocumentos {...props} entityId="123" />);

      // Ambos templates deben tener requiresExpiry=true
      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
    });
  });

  describe('Propagación de props a DocumentoField (líneas 70-84)', () => {
    it('pasa templateName correctamente', () => {
      render(<SeccionDocumentos {...defaultProps} entityId="123" />);

      expect(screen.getByText('DNI Frente')).toBeInTheDocument();
      expect(screen.getByText('DNI Dorso')).toBeInTheDocument();
    });

    it('pasa disabled=false por defecto - inputs están habilitados', () => {
      const { container } = render(<SeccionDocumentos {...defaultProps} entityId="123" />);

      const fileInputs = container.querySelectorAll('input[type="file"]');
      expect(fileInputs.length).toBeGreaterThan(0);
      expect(fileInputs[0]).not.toBeDisabled();
    });

    it('pasa disabled=true cuando se especifica - inputs están deshabilitados', () => {
      const { container } = render(<SeccionDocumentos {...defaultProps} disabled={true} entityId="123" />);

      const fileInputs = container.querySelectorAll('input[type="file"]');
      expect(fileInputs.length).toBeGreaterThan(0);
      expect(fileInputs[0]).toBeDisabled();
    });

    it('pasa selectOnlyMode=true - no muestra botones de subir', () => {
      const { container } = render(<SeccionDocumentos {...defaultProps} selectOnlyMode={true} onFileSelect={mockOnFileSelect} entityId="123" />);

      const uploadButtons = container.querySelectorAll('button');
      const submitButtons = Array.from(uploadButtons).filter(btn =>
        btn.textContent?.includes('Subir') && !btn.textContent?.includes('Subiendo')
      );
      expect(submitButtons.length).toBe(0);
    });

    it('pasa selectOnlyMode=false - muestra botones de subir', () => {
      const { container } = render(<SeccionDocumentos {...defaultProps} entityId="123" />);

      const uploadButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.textContent?.includes('Subir') && !btn.textContent?.includes('Subiendo')
      );
      expect(uploadButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Diferentes entityTypes', () => {
    it('maneja entityType EMPRESA_TRANSPORTISTA', () => {
      const props = {
        ...defaultProps,
        entityType: 'EMPRESA_TRANSPORTISTA' as const,
        templates: [{ id: 1, name: 'Seguro', entityType: 'EMPRESA_TRANSPORTISTA' }] as Template[],
      };

      render(<SeccionDocumentos {...props} entityId="123" />);

      expect(screen.getByText('Seguro')).toBeInTheDocument();
    });

    it('maneja entityType CHOFER', () => {
      const props = {
        ...defaultProps,
        entityType: 'CHOFER' as const,
        templates: [{ id: 1, name: 'DNI', entityType: 'CHOFER' }] as Template[],
      };

      render(<SeccionDocumentos {...props} entityId="123" />);

      expect(screen.getByText('DNI')).toBeInTheDocument();
    });

    it('maneja entityType CAMION', () => {
      const props = {
        ...defaultProps,
        entityType: 'CAMION' as const,
        templates: [{ id: 1, name: 'VTV', entityType: 'CAMION' }] as Template[],
      };

      render(<SeccionDocumentos {...props} entityId="123" />);

      expect(screen.getByText('VTV')).toBeInTheDocument();
    });

    it('maneja entityType ACOPLADO', () => {
      const props = {
        ...defaultProps,
        entityType: 'ACOPLADO' as const,
        templates: [{ id: 1, name: 'Seguro', entityType: 'ACOPLADO' }] as Template[],
      };

      render(<SeccionDocumentos {...props} entityId="123" />);

      expect(screen.getByText('Seguro')).toBeInTheDocument();
    });
  });

  describe('Contenedor y estilos', () => {
    it('renderiza contenedor con clases correctas', () => {
      const { container } = render(<SeccionDocumentos {...defaultProps} />);

      const wrapper = container.querySelector('.border-gray-300');
      expect(wrapper).toBeInTheDocument();
    });

    it('renderiza con clases de background cuando hay entityId válido', () => {
      const { container } = render(<SeccionDocumentos {...defaultProps} entityId="123" />);

      const grayBg = container.querySelector('.bg-gray-50');
      expect(grayBg).toBeInTheDocument();
    });
  });

  describe('Casos edge', () => {
    it('maneja uploadedTemplateIds vacío', () => {
      render(<SeccionDocumentos {...defaultProps} uploadedTemplateIds={[]} entityId="123" />);

      expect(screen.getByText('0/3 documentos')).toBeInTheDocument();
    });

    it('maneja uploadedTemplateIds con IDs que no existen en templates', () => {
      render(<SeccionDocumentos {...defaultProps} uploadedTemplateIds={[99, 100]} entityId="123" />);

      expect(screen.getByText('0/3 documentos')).toBeInTheDocument();
    });

    it('maneja templates con nombres especiales', () => {
      const props = {
        ...defaultProps,
        templates: [
          { id: 1, name: 'Documento con Ñandú', entityType: 'CHOFER' },
          { id: 2, name: 'Licencia "Profesional"', entityType: 'CHOFER' },
        ] as Template[],
      };

      render(<SeccionDocumentos {...props} entityId="123" />);

      expect(screen.getByText('Documento con Ñandú')).toBeInTheDocument();
      expect(screen.getByText('Licencia "Profesional"')).toBeInTheDocument();
    });

    it('maneja entityId con caracteres especiales', () => {
      render(<SeccionDocumentos {...defaultProps} entityId="id-with-special-chars_123" />);

      expect(screen.queryByText(/Completá primero los datos básicos/)).not.toBeInTheDocument();
    });

    it('maneja cantidad grande de templates', () => {
      const manyTemplates = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Documento ${i + 1}`,
        entityType: 'CHOFER' as const,
      })) as Template[];

      render(<SeccionDocumentos {...defaultProps} templates={manyTemplates} entityId="123" />);

      expect(screen.getByText('0/10 documentos')).toBeInTheDocument();

      // Verificar que al menos algunos templates se renderizaron
      expect(screen.getByText('Documento 1')).toBeInTheDocument();
      expect(screen.getByText('Documento 10')).toBeInTheDocument();
    });

    it('calcula uploadedCount correctamente con uploadedTemplateIds', () => {
      const manyTemplates = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Documento ${i + 1}`,
        entityType: 'CHOFER' as const,
      })) as Template[];

      render(<SeccionDocumentos {...defaultProps} templates={manyTemplates} uploadedTemplateIds={[1, 3, 5]} entityId="123" />);

      expect(screen.getByText('3/5 documentos')).toBeInTheDocument();
    });
  });

  describe('Interacción con DocumentoField - requiresExpiry', () => {
    it('muestra campos de vencimiento para todos los templates cuando requiresExpiry es true', () => {
      const props = {
        ...defaultProps,
        templates: [
          { id: 1, name: 'DNI', entityType: 'CHOFER' },
          { id: 2, name: 'Licencia', entityType: 'CHOFER' },
        ] as Template[],
      };

      const { container } = render(<SeccionDocumentos {...props} entityId="123" />);

      // Debería haber 2 inputs de fecha (uno por template)
      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
    });

    it('renderiza inputs de archivo para cada template', () => {
      const { container } = render(<SeccionDocumentos {...defaultProps} entityId="123" />);

      const fileInputs = container.querySelectorAll('input[type="file"]');
      expect(fileInputs.length).toBe(3);
    });
  });
});
