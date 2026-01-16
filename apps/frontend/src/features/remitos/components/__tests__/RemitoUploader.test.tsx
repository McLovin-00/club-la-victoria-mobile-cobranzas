import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react';

describe('RemitoUploader', () => {
  it('sube un remito como CHOFER (usa datos del user)', async () => {
    const uploadUnwrap = jest.fn(async () => ({ success: true, data: { id: 99 } }));
    const uploadRemito = jest.fn(() => ({ unwrap: uploadUnwrap }));

    // Mock FileReader para imágenes
    class MockFileReader {
      public onload: ((e: any) => void) | null = null;
      readAsDataURL(_file: File) {
        this.onload?.({ target: { result: 'data:image/png;base64,AAA' } });
      }
    }
    (globalThis as any).FileReader = MockFileReader as any;

    jest.spyOn(window, 'alert').mockImplementation(() => undefined);

    await jest.unstable_mockModule('../../api/remitosApiSlice', () => ({
      useUploadRemitoMutation: () => [uploadRemito, { isLoading: false, isError: false, error: null }],
    }));

    await jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => ({
      useGetChoferesQuery: () => ({ data: { data: [] } }),
    }));

    await jest.unstable_mockModule('../../../../store/hooks', () => ({
      useAppSelector: (sel: any) =>
        sel({
          auth: {
            user: {
              role: 'CHOFER',
              empresaId: 1,
              choferId: 10,
              choferDni: '20123456',
              choferNombre: 'Juan',
              choferApellido: 'Perez',
            },
          },
        }),
    }));

    await jest.unstable_mockModule('../../../documentos/components/CameraCapture', () => ({
      CameraCapture: () => null,
    }));

    const onSuccess = jest.fn();
    const { RemitoUploader } = await import('../RemitoUploader');

    const { container, getByText } = render(<RemitoUploader onSuccess={onSuccess} dadorCargaId={1} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const file = new File([new Uint8Array([1, 2, 3])], 'remito.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    // Esperar a que se agregue el preview (FileReader.onload)
    await waitFor(() => {
      expect(getByText(/Enviar remito para Análisis/i)).toBeTruthy();
    });

    fireEvent.click(getByText(/Enviar remito para Análisis/i));

    await waitFor(() =>
      expect(uploadRemito).toHaveBeenCalledWith(
        expect.objectContaining({
          dadorCargaId: 1,
          choferId: 10,
          choferDni: '20123456',
          choferNombre: 'Juan',
          choferApellido: 'Perez',
          files: [file],
        })
      )
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(99));
  });
});


