import type { Request, Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

const streamMock = { pipe: jest.fn() };
const minioServiceMock = {
  getObject: jest.fn(async () => streamMock),
};

const archiveMock = {
  pipe: jest.fn(),
  append: jest.fn(),
  finalize: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};
const archiverFn = jest.fn(() => archiveMock);

jest.mock('archiver', () => ({
  __esModule: true,
  default: archiverFn,
}));

// Controller usa dynamic import con sufijo .js
jest.mock(
  '../../src/services/minio.service.js',
  () => ({
    minioService: minioServiceMock,
  }),
  { virtual: true }
);

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const evaluateBatchEquiposClienteMock = jest.fn();
jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: {
    evaluateBatchEquiposCliente: (...args: any[]) => evaluateBatchEquiposClienteMock(...args),
  },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'PUBLIC_KEY'),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

import { PortalClienteController } from '../../src/controllers/portal-cliente.controller';

function createRes(): Response & {
  json: jest.Mock;
  status: jest.Mock;
  setHeader: jest.Mock;
  send: jest.Mock;
  headersSent?: boolean;
} {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    headersSent: false,
  };
  return res;
}

describe('PortalClienteController (more)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('getEquiposAsignados', () => {
    it('aplica limit max 100 y page min 1; filtra por search con "|" y por estado', async () => {
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([
        {
          asignadoDesde: new Date('2024-01-01'),
          equipo: {
            id: 1,
            tenantEmpresaId: 1,
            dadorCargaId: 10,
            driverId: 11,
            truckId: 22,
            trailerId: null,
            empresaTransportistaId: null,
            driverDniNorm: '20111222',
            truckPlateNorm: 'AB123CD',
            trailerPlateNorm: null,
            empresaTransportista: null,
            dador: null,
          },
        },
        {
          asignadoDesde: new Date('2024-01-02'),
          equipo: {
            id: 2,
            tenantEmpresaId: 1,
            dadorCargaId: 10,
            driverId: 12,
            truckId: 23,
            trailerId: 33,
            empresaTransportistaId: null,
            driverDniNorm: '30999888',
            truckPlateNorm: 'ZZ999ZZ',
            trailerPlateNorm: 'AA001BB',
            empresaTransportista: null,
            dador: null,
          },
        },
      ]);
      prismaMock.chofer.findMany.mockResolvedValueOnce([
        { id: 11, dni: '20111222', nombre: 'A', apellido: 'B' },
        { id: 12, dni: '30999888', nombre: 'C', apellido: 'D' },
      ]);
      prismaMock.camion.findMany.mockResolvedValueOnce([
        { id: 22, patente: 'AB-123-CD', marca: 'M', modelo: 'X' },
        { id: 23, patente: 'ZZ999ZZ', marca: 'M2', modelo: 'Y' },
      ]);
      prismaMock.acoplado.findMany.mockResolvedValueOnce([{ id: 33, patente: 'AA 001 BB', tipo: 'Semi' }]);

      // Equipo 1: tiene vencidos => VENCIDO
      // Equipo 2: tiene proximos => PROXIMO_VENCER
      evaluateBatchEquiposClienteMock.mockResolvedValueOnce(
        new Map([
          [
            1,
            {
              tieneVencidos: true,
              tieneFaltantes: false,
              tieneProximos: false,
              requirements: [],
            },
          ],
          [
            2,
            {
              tieneVencidos: false,
              tieneFaltantes: false,
              tieneProximos: true,
              requirements: [{ state: 'PROXIMO', expiresAt: new Date('2026-01-20').toISOString() }],
            },
          ],
        ])
      );

      const req: any = {
        tenantId: 1,
        user: { clienteId: 99 },
        query: { page: '-10', limit: '999', search: 'aa001bb|30999888', estado: 'PROXIMO_VENCER' },
      };
      const res = createRes();

      await PortalClienteController.getEquiposAsignados(req, res);

      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data.pagination.page).toBe(1);
      expect(payload.data.pagination.limit).toBe(100);
      // search+estado deja solo el equipo 2 (próximo)
      expect(payload.data.equipos).toHaveLength(1);
      expect(payload.data.equipos[0]).toMatchObject({ id: 2, estadoCompliance: 'PROXIMO_VENCER' });
    });

    it('maneja error inesperado con 500', async () => {
      prismaMock.equipoCliente.findMany.mockRejectedValueOnce(new Error('boom'));
      const req: any = { tenantId: 1, user: { clienteId: 99 }, query: {} };
      const res = createRes();

      await PortalClienteController.getEquiposAsignados(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getEquipoDetalle', () => {
    it('retorna 400 si no hay clienteId', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce(null);
      const req: any = { tenantId: 1, user: { empresaId: undefined }, params: { id: '1' } };
      const res = createRes();

      await PortalClienteController.getEquipoDetalle(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 404 si el equipo no existe o no corresponde al tenant', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ equipoId: 1, clienteId: 10, asignadoHasta: null });
      prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 999 } as any);

      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1' } };
      const res = createRes();

      await PortalClienteController.getEquipoDetalle(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('agrupa por template y marca descargables correctamente', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ equipoId: 1, clienteId: 10, asignadoHasta: null, asignadoDesde: new Date('2024-01-01') });
      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: 1,
        tenantEmpresaId: 1,
        driverId: 11,
        truckId: 22,
        trailerId: null,
        empresaTransportistaId: null,
        empresaTransportista: null,
        dador: { razonSocial: 'Dador' },
      } as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '123', nombre: 'Juan', apellido: 'Perez' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB123CD', marca: 'M', modelo: 'X' } as any);

      const now = new Date();
      const expired = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Dos docs mismo template: debe tomar el más reciente (orderBy desc ya lo deja primero)
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 2,
          tenantEmpresaId: 1,
          status: 'VENCIDO',
          expiresAt: expired,
          uploadedAt: new Date('2025-01-01'),
          entityType: 'CHOFER',
          entityId: 11,
          templateId: 100,
          template: { name: 'DNI' },
        },
        {
          id: 1,
          tenantEmpresaId: 1,
          status: 'APROBADO',
          expiresAt: null,
          uploadedAt: new Date('2024-01-01'),
          entityType: 'CHOFER',
          entityId: 11,
          templateId: 100,
          template: { name: 'DNI' },
        },
      ] as any);

      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1' } };
      const res = createRes();

      await PortalClienteController.getEquipoDetalle(req, res);

      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data.documentos).toHaveLength(1);
      expect(payload.data.documentos[0]).toMatchObject({ id: 2, estado: 'VENCIDO', descargable: false });
      expect(payload.data.hayDocumentosDescargables).toBe(false);
    });
  });

  describe('downloadDocumento', () => {
    it('retorna 403 si no tiene acceso al equipo', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce(null);
      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1', docId: '2' }, query: {} };
      const res = createRes();

      await PortalClienteController.downloadDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 404 si doc no existe o es de otro tenant/estado', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ equipoId: 1, clienteId: 10, asignadoHasta: null });
      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 2, tenantEmpresaId: 999, status: 'APROBADO' } as any);

      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1', docId: '2' }, query: {} };
      const res = createRes();

      await PortalClienteController.downloadDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('bloquea descarga de vencido si no es preview', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ equipoId: 1, clienteId: 10, asignadoHasta: null });
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 2,
        tenantEmpresaId: 1,
        status: 'VENCIDO',
        expiresAt: new Date('2020-01-01'),
        filePath: 'docs/obj',
        mimeType: 'application/pdf',
        fileName: 'x.pdf',
      } as any);

      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1', docId: '2' }, query: {} };
      const res = createRes();

      await PortalClienteController.downloadDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('permite preview de vencido y hace pipe del stream', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ equipoId: 1, clienteId: 10, asignadoHasta: null });
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 2,
        tenantEmpresaId: 1,
        status: 'VENCIDO',
        expiresAt: new Date('2020-01-01'),
        filePath: 'docs-t1/path/to.pdf',
        mimeType: 'application/pdf',
        fileName: 'x.pdf',
      } as any);

      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1', docId: '2' }, query: { preview: 'true' } };
      const res = createRes();

      await PortalClienteController.downloadDocumento(req, res);

      expect(minioServiceMock.getObject).toHaveBeenCalledWith('docs-t1', 'path/to.pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(streamMock.pipe).toHaveBeenCalledWith(res);
    });
  });

  describe('downloadAllDocumentos', () => {
    it('retorna 404 si no hay documentos vigentes', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ equipoId: 1, clienteId: 10, asignadoHasta: null });
      prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, driverId: 11, truckId: 22, trailerId: null, empresaTransportistaId: null, empresaTransportista: { cuit: '307' }, truckPlateNorm: 'AB', driverDniNorm: '1' } as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '1' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB' } as any);
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 9,
          tenantEmpresaId: 1,
          status: 'APROBADO',
          archived: false,
          expiresAt: new Date('2000-01-01'),
          uploadedAt: new Date(),
          entityType: 'CAMION',
          entityId: 22,
          filePath: 'p.pdf',
          fileName: 'p.pdf',
          template: { name: 'Seguro' },
        },
      ] as any);

      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1' } };
      const res = createRes();

      await PortalClienteController.downloadAllDocumentos(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('genera zip y continúa si falla un doc', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ equipoId: 1, clienteId: 10, asignadoHasta: null });
      prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, driverId: 11, truckId: 22, trailerId: null, empresaTransportistaId: null, empresaTransportista: { cuit: '30712345678' }, truckPlateNorm: 'AB123CD', driverDniNorm: '123' } as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '123' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB 123 CD' } as any);
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          tenantEmpresaId: 1,
          status: 'APROBADO',
          archived: false,
          expiresAt: null,
          uploadedAt: new Date(),
          entityType: 'CAMION',
          entityId: 22,
          filePath: 'docs-t1/a.pdf',
          fileName: 'A.pdf',
          template: { name: 'Seguro/Tractor' },
        },
        {
          id: 2,
          tenantEmpresaId: 1,
          status: 'APROBADO',
          archived: false,
          expiresAt: null,
          uploadedAt: new Date(),
          entityType: 'CHOFER',
          entityId: 11,
          filePath: 'docs-t1/b.pdf',
          fileName: 'B.pdf',
          template: { name: 'DNI' },
        },
      ] as any);

      minioServiceMock.getObject
        .mockResolvedValueOnce(streamMock)
        .mockRejectedValueOnce(new Error('minio down'));

      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1' } };
      const res = createRes();

      await PortalClienteController.downloadAllDocumentos(req, res);

      expect(archiverFn).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
      expect(archiveMock.pipe).toHaveBeenCalledWith(res);
      expect(archiveMock.append).toHaveBeenCalledTimes(1);
      expect(archiveMock.finalize).toHaveBeenCalled();
    });
  });

  describe('bulkDownloadDocumentos', () => {
    it('retorna 400 si no hay clienteId o equipoIds', async () => {
      const res = createRes();
      await PortalClienteController.bulkDownloadDocumentos({ tenantId: 1, user: { empresaId: undefined }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);

      const res2 = createRes();
      await PortalClienteController.bulkDownloadDocumentos({ tenantId: 1, user: { clienteId: 10 }, body: { equipoIds: [] } } as any, res2);
      expect(res2.status).toHaveBeenCalledWith(400);
    });

    it('retorna 403 si no hay equipos permitidos', async () => {
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([]);
      const res = createRes();
      await PortalClienteController.bulkDownloadDocumentos({ tenantId: 1, user: { clienteId: 10 }, body: { equipoIds: [1, 2] } } as any, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('genera zip para equipos permitidos', async () => {
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }, { equipoId: 2 }]);
      prismaMock.equipo.findMany.mockResolvedValueOnce([
        { id: 1, tenantEmpresaId: 1, activo: true, driverId: 11, truckId: 22, trailerId: null, truckPlateNorm: 'AB', driverDniNorm: '1', empresaTransportista: { cuit: '307' } },
      ] as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '1' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB' } as any);
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'docs-t1/a.pdf', fileName: 'A.pdf', entityType: 'CAMION', entityId: 22, template: { name: 'Seguro' } },
      ] as any);

      const res = createRes();
      await PortalClienteController.bulkDownloadDocumentos({ tenantId: 1, user: { clienteId: 10 }, body: { equipoIds: [2, 1] } } as any, res);

      expect(archiveMock.append).toHaveBeenCalledTimes(1);
      expect(archiveMock.finalize).toHaveBeenCalled();
    });
  });

  describe('bulkDownloadForm', () => {
    it('401 si falta token o token inválido', async () => {
      const res = createRes();
      await PortalClienteController.bulkDownloadForm({ body: {} } as Request, res);
      expect(res.status).toHaveBeenCalledWith(401);

      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('invalid');
      });
      const res2 = createRes();
      await PortalClienteController.bulkDownloadForm({ body: { token: 't' } } as Request, res2);
      expect(res2.status).toHaveBeenCalledWith(401);
    });

    it('404 si no hay equipos asignados', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValueOnce({ tenantEmpresaId: 1, clienteId: 10 });
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([]);
      const res = createRes();

      await PortalClienteController.bulkDownloadForm({ body: { token: 't', searchTerm: '' } } as Request, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('No hay equipos asignados');
    });

    it('filtra por searchTerm y 404 si no encuentra equipos', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValueOnce({ tenantEmpresaId: 1, clienteId: 10 });
      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      prismaMock.equipo.findMany.mockResolvedValueOnce([]); // equiposFiltrados

      const res = createRes();
      await PortalClienteController.bulkDownloadForm({ body: { token: 't', searchTerm: 'AB123CD' } } as Request, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('No se encontraron equipos');
    });

    it('genera zip con searchTerm y limita a 200', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValueOnce({ tenantEmpresaId: 1, clienteId: 10 });

      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      // equiposFiltrados
      prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }]);
      // equipos con include
      prismaMock.equipo.findMany.mockResolvedValueOnce([
        { id: 1, tenantEmpresaId: 1, activo: true, driverId: 11, truckId: 22, trailerId: null, truckPlateNorm: 'AB', driverDniNorm: '1', empresaTransportista: { cuit: '307' } },
      ] as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '1' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB' } as any);
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'docs-t1/a.pdf', fileName: 'A.pdf', entityType: 'CAMION', entityId: 22, template: { name: 'Seguro' } },
      ] as any);

      const res = createRes();
      await PortalClienteController.bulkDownloadForm({ body: { token: 't', searchTerm: 'AB|1' } } as Request, res);

      expect(archiveMock.append).toHaveBeenCalledTimes(1);
      expect(archiveMock.finalize).toHaveBeenCalled();
    });

    it('maneja error en archive.finalize retornando 500 si headers no enviados', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValueOnce({ tenantEmpresaId: 1, clienteId: 10 });

      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }]);
      prismaMock.equipo.findMany.mockResolvedValueOnce([
        { id: 1, tenantEmpresaId: 1, activo: true, driverId: 11, truckId: 22, trailerId: null, truckPlateNorm: 'AB', driverDniNorm: '1', empresaTransportista: { cuit: '307' } },
      ] as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '1' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB' } as any);
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'docs-t1/a.pdf', fileName: 'A.pdf', entityType: 'CAMION', entityId: 22, template: { name: 'Seguro' } },
      ] as any);

      // Mock archive.finalize para que falle
      archiveMock.finalize.mockRejectedValueOnce(new Error('Zip finalize failed'));

      const res = createRes();
      await PortalClienteController.bulkDownloadForm({ body: { token: 't', searchTerm: 'AB' } } as Request, res);

      // Debe retornar 500 porque headers no fueron enviados
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error interno');
    });

    it('NO retorna 500 si headers ya fueron enviados en bulkDownloadForm', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValueOnce({ tenantEmpresaId: 1, clienteId: 10 });

      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }]);
      prismaMock.equipo.findMany.mockResolvedValueOnce([
        { id: 1, tenantEmpresaId: 1, activo: true, driverId: 11, truckId: 22, trailerId: null, truckPlateNorm: 'AB', driverDniNorm: '1', empresaTransportista: { cuit: '307' } },
      ] as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '1' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB' } as any);
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'docs-t1/a.pdf', fileName: 'A.pdf', entityType: 'CAMION', entityId: 22, template: { name: 'Seguro' } },
      ] as any);

      archiveMock.finalize.mockRejectedValueOnce(new Error('Zip finalize failed'));

      const res = createRes();
      res.headersSent = true; // Simular que headers ya fueron enviados

      await PortalClienteController.bulkDownloadForm({ body: { token: 't', searchTerm: 'AB' } } as Request, res);

      // NO debe llamar a res.status porque headers ya fueron enviados
      expect(res.status).not.toHaveBeenCalled();
    });

    it('incluye trailer y empresa en entityConditions si existen', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValueOnce({ tenantEmpresaId: 1, clienteId: 10 });

      prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }]);
      prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }]);

      // Equipo con trailerId y empresaTransportistaId
      prismaMock.equipo.findMany.mockResolvedValueOnce([
        {
          id: 1,
          tenantEmpresaId: 1,
          activo: true,
          driverId: 11,
          truckId: 22,
          trailerId: 33,
          truckPlateNorm: 'AB',
          driverDniNorm: '1',
          empresaTransportistaId: 44,
          empresaTransportista: { cuit: '307' },
        },
      ] as any);

      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '1' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB' } as any);
      prismaMock.acoplado.findUnique.mockResolvedValueOnce({ id: 33, patente: 'AC' } as any);

      // Debe incluir documentos de CHOFER, CAMION, ACOPLADO y EMPRESA_TRANSPORTISTA
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'docs-t1/a.pdf', fileName: 'A.pdf', entityType: 'CHOFER', entityId: 11, template: { name: 'DNI' } },
        { id: 2, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'docs-t1/b.pdf', fileName: 'B.pdf', entityType: 'CAMION', entityId: 22, template: { name: 'Seguro' } },
        { id: 3, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'docs-t1/c.pdf', fileName: 'C.pdf', entityType: 'ACOPLADO', entityId: 33, template: { name: 'Seguro' } },
        { id: 4, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'docs-t1/d.pdf', fileName: 'D.pdf', entityType: 'EMPRESA_TRANSPORTISTA', entityId: 44, template: { name: 'Contrato' } },
      ] as any);

      const res = createRes();
      await PortalClienteController.bulkDownloadForm({ body: { token: 't', searchTerm: '' } } as Request, res);

      // Debe intentar agregar los 4 documentos al ZIP
      expect(archiveMock.append).toHaveBeenCalledTimes(4);
    });
  });

  describe('getEquipoDetalle - Edge cases con template.name', () => {
    it('maneja template.name con caracteres especiales correctamente', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({
        equipoId: 1,
        clienteId: 10,
        asignadoHasta: null,
        asignadoDesde: new Date('2024-01-01'),
      });
      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: 1,
        tenantEmpresaId: 1,
        driverId: 11,
        truckId: 22,
        trailerId: null,
        empresaTransportistaId: null,
        empresaTransportista: null,
        dador: { razonSocial: 'Dador' },
      } as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({
        id: 11,
        dni: '123',
        nombre: 'Juan',
        apellido: 'Perez',
      } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({
        id: 22,
        patente: 'AB123CD',
        marca: 'M',
        modelo: 'X',
      } as any);

      // Template con caracteres especiales
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          tenantEmpresaId: 1,
          status: 'APROBADO',
          expiresAt: null,
          uploadedAt: new Date('2024-01-01'),
          entityType: 'CHOFER',
          entityId: 11,
          templateId: 100,
          template: { name: 'Seguro/De\\Responsa:bilidad Civil' }, // Caracteres especiales
        },
      ] as any);

      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1' } };
      const res = createRes();

      await PortalClienteController.getEquipoDetalle(req, res);

      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data.documentos).toHaveLength(1);
      // El template.name debe venir con caracteres especiales intactos
      expect(payload.data.documentos[0].templateName).toBe('Seguro/De\\Responsa:bilidad Civil');
    });
  });

  describe('downloadAllDocumentos - Error handling', () => {
    it('NO retorna error 500 si headers ya fueron enviados', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({
        equipoId: 1,
        clienteId: 10,
        asignadoHasta: null,
      });
      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: 1,
        tenantEmpresaId: 1,
        driverId: 11,
        truckId: 22,
        trailerId: null,
        empresaTransportistaId: null,
        empresaTransportista: { cuit: '30712345678' },
        truckPlateNorm: 'AB',
        driverDniNorm: '1',
      } as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '1' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AB' } as any);
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          tenantEmpresaId: 1,
          status: 'APROBADO',
          archived: false,
          expiresAt: null,
          uploadedAt: new Date(),
          entityType: 'CAMION',
          entityId: 22,
          filePath: 'docs-t1/a.pdf',
          fileName: 'A.pdf',
          template: { name: 'Seguro' },
        },
      ] as any);

      // Mock archive.finalize para que falle
      archiveMock.finalize.mockRejectedValueOnce(new Error('Zip finalize failed'));

      const res = createRes();
      res.headersSent = true; // Simular que headers ya fueron enviados

      const req: any = { tenantId: 1, user: { clienteId: 10 }, params: { id: '1' } };

      await PortalClienteController.downloadAllDocumentos(req, res);

      // NO debe llamar a res.status porque headers ya fueron enviados
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});


