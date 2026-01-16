import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Document } from '../../api/documentosApiSlice';

interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  blob: () => Promise<Blob>;
}

const createFetchResponse = (options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: unknown;
  text?: string;
  blob?: Blob;
}): FetchResponse => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  statusText: options.statusText ?? 'OK',
  json: async () => options.json ?? {},
  text: async () => options.text ?? '',
  blob: async () => options.blob ?? new Blob(['mock'], { type: 'application/pdf' }),
});

type PreviewDocument = Document & {
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  entityId: string;
  entityType: Document['entityType'];
  status: Document['status'];
};

const baseDocument = (): PreviewDocument => ({
  id: 1,
  templateId: 10,
  dadorCargaId: 99,
  entityType: 'CHOFER',
  entityId: '123',
  status: 'APROBADO',
  uploadedAt: '2025-01-01T00:00:00.000Z',
  files: [],
  fileName: 'archivo.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
});

const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value,
    configurable: true,
  });
};

describe('DocumentPreview - coverage', () => {
  let DocumentPreview: React.FC<{ isOpen: boolean; onClose: () => void; document: PreviewDocument | null }>;
  let mockGetRuntimeEnv: jest.Mock;
  let fetchMock: jest.MockedFunction<(
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<FetchResponse>>;

  beforeAll(async () => {
    mockGetRuntimeEnv = jest.fn().mockReturnValue('http://backend.local');

    const actualApi = await import('../../api/documentosApiSlice');

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      ...actualApi,
      useGetDadoresQuery: () => ({
        data: [{ id: 1, razonSocial: 'Empresa Uno' }],
      }),
    }));

    await jest.unstable_mockModule('../../../../utils/formatters', () => ({
      formatFileSize: () => '1 KB',
    }));

    await jest.unstable_mockModule('../../../../lib/runtimeEnv', () => ({
      getRuntimeEnv: (...args: unknown[]) => mockGetRuntimeEnv(...args),
    }));

    const module = await import('../DocumentPreview');
    DocumentPreview = module.DocumentPreview;
  });

  beforeEach(() => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    jest.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:preview');
    jest.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('no renderiza si isOpen=false o document es null', () => {
    const { container, rerender } = render(
      <DocumentPreview isOpen={false} onClose={() => undefined} document={baseDocument()} />
    );
    expect(container.firstChild).toBeNull();

    rerender(<DocumentPreview isOpen={true} onClose={() => undefined} document={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra error si falta runtime env', async () => {
    mockGetRuntimeEnv.mockReturnValueOnce('');
    fetchMock.mockResolvedValue(createFetchResponse({ ok: true }));

    render(<DocumentPreview isOpen onClose={() => undefined} document={baseDocument()} />);

    expect(await screen.findByText(/VITE_DOCUMENTOS_API_URL no configurada/i)).toBeTruthy();
  });

  it('renderiza iframe para PDF en desktop', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/preview')) {
        return createFetchResponse({
          json: { previewUrl: 'http://backend.local/file.pdf' },
        });
      }
      return createFetchResponse({
        ok: true,
        blob: new Blob(['pdf'], { type: 'application/pdf' }),
      });
    });

    render(<DocumentPreview isOpen onClose={() => undefined} document={baseDocument()} />);

    expect(await screen.findByTitle('Preview de archivo.pdf')).toBeTruthy();
  });

  it('usa fallback de download para URLs MinIO', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/preview')) {
        return createFetchResponse({
          json: { previewUrl: 'http://minio:9000/bucket/file.pdf' },
        });
      }
      return createFetchResponse({ ok: true });
    });

    render(<DocumentPreview isOpen onClose={() => undefined} document={baseDocument()} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/download?inline=1'),
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });
  });

  it('renderiza UI mobile para PDF en Android', async () => {
    setUserAgent('Android');

    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/preview')) {
        return createFetchResponse({
          json: { previewUrl: 'http://backend.local/file.pdf' },
        });
      }
      return createFetchResponse({ ok: true });
    });

    render(<DocumentPreview isOpen onClose={() => undefined} document={baseDocument()} />);

    expect(await screen.findByText('Descargar PDF')).toBeTruthy();
    expect(screen.getByText(/Dispositivo móvil/i)).toBeTruthy();
  });

  it('renderiza preview de imagen', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/preview')) {
        return createFetchResponse({
          json: { previewUrl: 'http://backend.local/file.png' },
        });
      }
      return createFetchResponse({
        ok: true,
        blob: new Blob(['img'], { type: 'image/png' }),
      });
    });

    const document = { ...baseDocument(), mimeType: 'image/png', fileName: 'foto.png' };

    render(<DocumentPreview isOpen onClose={() => undefined} document={document} />);

    expect(await screen.findByAltText('foto.png')).toBeTruthy();
  });

  it('muestra error al descargar si falla la API', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/preview')) {
        return createFetchResponse({
          json: { previewUrl: 'http://backend.local/file.pdf' },
        });
      }
      if (String(url).includes('/download')) {
        return createFetchResponse({ ok: false, status: 500, statusText: 'Error' });
      }
      return createFetchResponse({ ok: true });
    });

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);

    render(<DocumentPreview isOpen onClose={() => undefined} document={baseDocument()} />);

    await screen.findByTitle('Preview de archivo.pdf');

    fireEvent.click(screen.getByText('Descargar'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it('renderiza fallback para tipo Word', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/preview')) {
        return createFetchResponse({
          json: { previewUrl: 'http://backend.local/file.docx' },
        });
      }
      return createFetchResponse({ ok: true });
    });

    const document = {
      ...baseDocument(),
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: 'doc.docx',
    };

    render(<DocumentPreview isOpen onClose={() => undefined} document={document} />);

    expect(await screen.findByText('Documento Microsoft Word')).toBeTruthy();
  });
});
