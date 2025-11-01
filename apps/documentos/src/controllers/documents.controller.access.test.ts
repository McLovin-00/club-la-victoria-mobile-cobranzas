/**
 * @jest-environment node
 */

import { DocumentsController } from './documents.controller';

// Mocks
jest.mock('../config/database', () => {
  const findUniqueMock = jest.fn();
  return {
    db: {
      getClient: () => ({
        document: { findUnique: findUniqueMock },
      }),
    },
  };
});

jest.mock('../services/minio.service', () => ({
  minioService: {
    ensureBucketExists: jest.fn().mockResolvedValue(undefined),
  },
}));

function createRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.jsonPayload = undefined as any;
  res.json = (payload: any) => {
    res.jsonPayload = payload;
    return res;
  };
  res.get = (_: string) => 'localhost:4800';
  res.setHeader = (_k: string, _v: string) => {};
  return res;
}

describe('DocumentsController access (preview)', () => {
  const { db } = jest.requireMock('../config/database');
  const findUnique = db.getClient().document.findUnique as jest.Mock;

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('allows ADMIN when tenant matches document.tenantEmpresaId', async () => {
    // Given
    findUnique.mockResolvedValue({ id: 123, tenantEmpresaId: 10, dadorCargaId: 77, filePath: 'bucket/path', fileName: 'x.pdf', mimeType: 'application/pdf', template: { name: 'T' } });
    const req: any = { params: { id: '123' }, protocol: 'http', get: () => 'localhost:4800', user: { role: 'ADMIN', empresaId: 10 } };
    const res: any = createRes();

    // When
    await DocumentsController.getDocumentPreview(req, res);

    // Then
    expect(res.statusCode).toBe(200);
    expect(res.jsonPayload?.success).toBe(true);
  });

  it('denies ADMIN when tenant differs', async () => {
    // Given
    findUnique.mockResolvedValue({ id: 123, tenantEmpresaId: 20, dadorCargaId: 77, filePath: 'bucket/path', fileName: 'x.pdf', mimeType: 'application/pdf', template: { name: 'T' } });
    const req: any = { params: { id: '123' }, protocol: 'http', get: () => 'localhost:4800', user: { role: 'ADMIN', empresaId: 10 } };
    const res: any = createRes();

    // When
    await DocumentsController.getDocumentPreview(req, res);

    // Then
    expect(res.statusCode).toBe(403);
    expect(res.jsonPayload?.code).toBe('DOCUMENT_ACCESS_DENIED');
  });
});


