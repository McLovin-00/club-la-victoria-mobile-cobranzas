/**
 * Propósito: tests estables para `FloatingActionButton` sin depender de mocks de `TouchFeedback`.
 * Estrategia: assertions por estructura/clases y comportamiento visible (labels/backdrop).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { FloatingActionButton } from '../FloatingActionButton';

function getMainFabButton(container: HTMLElement) {
  return container.querySelector('.bg-gradient-to-r') as HTMLElement | null;
}

function getBackdrop() {
  return document.querySelector('.fixed.inset-0.bg-black\\/20') as HTMLElement | null;
}

describe('FloatingActionButton', () => {
  it('debe renderizar el contenedor principal', () => {
    render(<FloatingActionButton />);
    expect(document.querySelector('.fixed.z-50')).toBeInTheDocument();
  });

  it('debe expandir y mostrar acciones por defecto al hacer click en el FAB', () => {
    const { container } = render(<FloatingActionButton />);
    const button = getMainFabButton(container);
    expect(button).toBeInTheDocument();

    // `TouchFeedback` dispara `onPress` en `onMouseUp`, no en `onClick`.
    fireEvent.mouseDown(button as HTMLElement);
    fireEvent.mouseUp(button as HTMLElement);

    expect(screen.getByText('Tomar Foto')).toBeInTheDocument();
    expect(screen.getByText('Subir Archivo')).toBeInTheDocument();
    expect(getBackdrop()).toBeInTheDocument();
  });

  it('debe contraer al hacer click en el backdrop', () => {
    const { container } = render(<FloatingActionButton />);
    const button = getMainFabButton(container);
    fireEvent.mouseDown(button as HTMLElement);
    fireEvent.mouseUp(button as HTMLElement);

    const backdrop = getBackdrop();
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop as HTMLElement);

    expect(screen.queryByText('Tomar Foto')).not.toBeInTheDocument();
    expect(screen.queryByText('Subir Archivo')).not.toBeInTheDocument();
  });
});


