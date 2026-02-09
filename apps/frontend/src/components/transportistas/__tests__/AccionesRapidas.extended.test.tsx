/**
 * Tests extendidos para AccionesRapidas refactorizados para coincidir con el componente real y ESM
 * Incrementa coverage cubriendo todas las acciones
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mocks estables
const mockLoggerDebug = jest.fn();

// Mock de logger - Path desde src/components/transportistas/__tests__ hasta src/utils/logger
jest.unstable_mockModule('../../../utils/logger', () => ({
  logger: {
    debug: mockLoggerDebug,
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock de TouchFeedback - Path desde src/components/transportistas/__tests__ hasta src/components/mobile/TouchFeedback
jest.unstable_mockModule('../../mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => (
    <div onClick={onPress} data-testid="touch-feedback">{children}</div>
  ),
}));

// Mock de FloatingActionButton - Path desde src/components/transportistas/__tests__ hasta src/components/mobile/FloatingActionButton
jest.unstable_mockModule('../../mobile/FloatingActionButton', () => ({
  FloatingActionButton: ({ actions }: { actions: any[] }) => (
    <div data-testid="fab">
      {actions.map(action => (
        <button key={action.id} onClick={action.onClick}>{action.label}</button>
      ))}
    </div>
  ),
}));

// Import dinámico del componente
const { AccionesRapidas } = await import('../AccionesRapidas');

describe('AccionesRapidas (extended)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('acciones rápidas (grid)', () => {
    it('debe mostrar la acción Registrar Equipo', () => {
      render(<AccionesRapidas />);
      expect(screen.getByText('Registrar Equipo')).toBeInTheDocument();
    });

    it('debe mostrar la acción Calendario', () => {
      render(<AccionesRapidas />);
      expect(screen.getByText('Calendario')).toBeInTheDocument();
    });

    it('debe mostrar la acción Configuración', () => {
      render(<AccionesRapidas />);
      expect(screen.getByText('Configuración')).toBeInTheDocument();
    });

    it('debe llamar logger.debug al hacer clic en Registrar Equipo', () => {
      render(<AccionesRapidas />);
      fireEvent.click(screen.getByText('Registrar Equipo'));
      expect(mockLoggerDebug).toHaveBeenCalledWith('Register equipo');
    });

    it('debe llamar logger.debug al hacer clic en Calendario', () => {
      render(<AccionesRapidas />);
      fireEvent.click(screen.getByText('Calendario'));
      expect(mockLoggerDebug).toHaveBeenCalledWith('Open calendar');
    });

    it('debe llamar logger.debug al hacer clic en Configuración', () => {
      render(<AccionesRapidas />);
      fireEvent.click(screen.getByText('Configuración'));
      expect(mockLoggerDebug).toHaveBeenCalledWith('Open settings');
    });
  });

  describe('floating action button (FAB)', () => {
    it('debe mostrar acciones del FAB', () => {
      render(<AccionesRapidas />);
      expect(screen.getByText('Tomar Foto')).toBeInTheDocument();
      expect(screen.getByText('Subir Archivo')).toBeInTheDocument();
    });

    it('debe llamar logger.debug al hacer clic en Tomar Foto', () => {
      render(<AccionesRapidas />);
      fireEvent.click(screen.getByText('Tomar Foto'));
      expect(mockLoggerDebug).toHaveBeenCalledWith('Opening camera');
    });

    it('debe llamar logger.debug al hacer clic en Subir Archivo', () => {
      render(<AccionesRapidas />);
      fireEvent.click(screen.getByText('Subir Archivo'));
      expect(mockLoggerDebug).toHaveBeenCalledWith('Opening file picker');
    });
  });

  describe('estructura y diseño', () => {
    it('debe renderizar el título correcto', () => {
      render(<AccionesRapidas />);
      expect(screen.getByText('Acciones Rápidas')).toBeInTheDocument();
    });

    it('debe mostrar el tip del día', () => {
      render(<AccionesRapidas />);
      expect(screen.getByText('Tip del día')).toBeInTheDocument();
      expect(screen.getByText(/Usa el botón flotante para subir documentos/i)).toBeInTheDocument();
    });

    it('debe tener grid de 3 columnas', () => {
      const { container } = render(<AccionesRapidas />);
      expect(container.querySelector('.grid-cols-3')).toBeInTheDocument();
    });
  });
});
