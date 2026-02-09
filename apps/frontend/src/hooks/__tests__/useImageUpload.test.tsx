// Tests de `useImageUpload`: validación de tipo/tamaño, success path (preview + dimensiones) y fallback de cámara.
import React, { useState } from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useImageUpload } from '../useImageUpload';

const TestComp = ({ file, options }: { file: File; options?: any }) => {
  const hook = useImageUpload();
  const [status, setStatus] = useState<string>('idle');
  const [preview, setPreview] = useState<string>('');
  const [dims, setDims] = useState<string>('');

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="error">{hook.error || ''}</div>
      <div data-testid="preview">{preview}</div>
      <div data-testid="dims">{dims}</div>
      <button
        onClick={() =>
          hook
            .uploadImage(file, options)
            .then((r) => {
              setPreview(r.preview);
              setDims(`${r.width}x${r.height}`);
              setStatus('ok');
            })
            .catch(() => setStatus('err'))
        }
      >
        upload
      </button>
      <button
        onClick={() =>
          hook
            .captureFromCamera()
            .then(() => setStatus('camera-ok'))
            .catch(() => setStatus('camera-err'))
        }
      >
        camera
      </button>
    </div>
  );
};

describe('useImageUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // URL.createObjectURL no existe en jsdom por defecto.
    Object.defineProperty(URL, 'createObjectURL', { value: jest.fn(() => 'blob:test'), writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: jest.fn(() => undefined), writable: true });

    // Mock FileReader para createPreview
    (globalThis as any).FileReader = class MockFileReader {
      public result: any = null;
      public onload: any = null;
      public onerror: any = null;
      readAsDataURL(_file: File) {
        this.result = 'data:image/png;base64,AAA=';
        this.onload?.({ target: { result: this.result } });
      }
    };

    // Mock Image para getImageDimensions
    (globalThis as any).Image = class MockImage {
      public width = 640;
      public height = 480;
      public onload: any = null;
      public onerror: any = null;
      set src(_v: string) {
        this.onload?.();
      }
    };
  });

  it('rechaza tipo no permitido', async () => {
    const bad = new File(['x'], 'a.txt', { type: 'text/plain' });
    render(<TestComp file={bad} />);
    fireEvent.click(screen.getByText('upload'));

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('err');
      expect(screen.getByTestId('error').textContent).toMatch(/Tipo de archivo no permitido/i);
    });
  });

  it('rechaza tamaño excedido', async () => {
    const f = new File(['xx'], 'a.png', { type: 'image/png' }); // size=2
    render(<TestComp file={f} options={{ maxSizeBytes: 1 }} />);
    fireEvent.click(screen.getByText('upload'));

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('err');
      expect(screen.getByTestId('error').textContent).toMatch(/demasiado grande/i);
    });
  });

  it('success: devuelve preview y dimensiones', async () => {
    const f = new File(['ok'], 'a.png', { type: 'image/png' });
    render(<TestComp file={f} />);
    fireEvent.click(screen.getByText('upload'));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ok'));
    expect(screen.getByTestId('preview').textContent).toContain('data:image/png');
    expect(screen.getByTestId('dims').textContent).toBe('640x480');
  });

  it('captureFromCamera falla cuando no hay mediaDevices', async () => {
    const f = new File(['ok'], 'a.png', { type: 'image/png' });
    (navigator as any).mediaDevices = undefined;
    render(<TestComp file={f} />);
    fireEvent.click(screen.getByText('camera'));

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('camera-err');
      expect(screen.getByTestId('error').textContent).toMatch(/no soporta el acceso a la cámara/i);
    });
  });
});


