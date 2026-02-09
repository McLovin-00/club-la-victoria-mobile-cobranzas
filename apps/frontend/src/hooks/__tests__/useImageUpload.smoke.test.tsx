/**
 * Propósito: Smoke tests de `useImageUpload` para subir coverage.
 */

import { renderHook, act } from '@testing-library/react';
import { useImageUpload } from '../useImageUpload';

describe('useImageUpload (smoke)', () => {
  it('rechaza tipos no permitidos en uploadImage', async () => {
    const { result } = renderHook(() => useImageUpload());

    const badFile = new File(['x'], 'x.txt', { type: 'text/plain' });

    await act(async () => {
      await expect(result.current.uploadImage(badFile)).rejects.toBeDefined();
    });

    expect(result.current.error).toMatch(/Tipo de archivo no permitido/i);
  });
});


