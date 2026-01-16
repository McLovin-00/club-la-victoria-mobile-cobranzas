import type { Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

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

import { PortalTransportistaController } from '../../src/controllers/portal-transportista.controller';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';


const makeUser = (role: string, extra?: Partial<AuthRequest['user']>): AuthRequest['user'] => {
  return { userId: 1, role, ...extra } as unknown as AuthRequest['user'];
};

function createRes(): Response & { json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as unknown as Response & { json: jest.Mock; status: jest.Mock };
}


describe('PortalTransportistaController (more)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('getMisEntidades', () => {
    it('admin: ve empresas del tenant y carga entidades + contadores', async () => {
      prismaMock.empresaTransportista.findMany.mockResolvedValueOnce([
        { id: 5, razonSocial: 'ET', cuit: '30', dadorCargaId: 9 },
      ]);
      prismaMock.chofer.findMany.mockResolvedValueOnce([{ id: 1, dni: '1', apellido: 'A' }]);
      prismaMock.camion.findMany.mockResolvedValueOnce([{ id: 2, patente: 'AA' }]);
      prismaMock.acoplado.findMany.mockResolvedValueOnce([{ id: 3, patente: 'BB' }]);
      prismaMock.document.count
        .mockResolvedValueOnce(2) // pendientes
        .mockResolvedValueOnce(1) // rechazados
        .mockResolvedValueOnce(3); // por vencer

      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('ADMIN') };
      const res = createRes();

      await PortalTransportistaController.getMisEntidades(req as AuthRequest, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            empresas: expect.any(Array),
            choferes: expect.any(Array),
            camiones: expect.any(Array),
            acoplados: expect.any(Array),
            contadores: { pendientes: 2, rechazados: 1, porVencer: 3 },
          }),
        })
      );
    });

    it('transportista sin empresaTransportistaId => respuesta vacía reutilizable', async () => {
      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('TRANSPORTISTA') };
      const res = createRes();

      await PortalTransportistaController.getMisEntidades(req as AuthRequest, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ empresas: [], choferes: [], camiones: [], acoplados: [] }),
        })
      );
    });

    it('sin empresas => respuesta vacía', async () => {
      prismaMock.empresaTransportista.findMany.mockResolvedValueOnce([]);
      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('DADOR_DE_CARGA', { dadorCargaId: 9 }) };
      const res = createRes();

      await PortalTransportistaController.getMisEntidades(req as AuthRequest, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ empresas: [], choferes: [], camiones: [], acoplados: [] }),
        })
      );
    });

    it('maneja errores con 500', async () => {
      prismaMock.empresaTransportista.findMany.mockRejectedValueOnce(new Error('boom'));
      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('ADMIN') };
      const res = createRes();

      await PortalTransportistaController.getMisEntidades(req as AuthRequest, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMisEquipos', () => {
    it('transportista sin empresaTransportistaId => data []', async () => {
      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('TRANSPORTISTA') };
      const res = createRes();

      await PortalTransportistaController.getMisEquipos(req as AuthRequest, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('dador filtra por dadorCargaId y arma datos', async () => {
      prismaMock.equipo.findMany.mockResolvedValueOnce([
        {
          id: 1,
          driverId: 11,
          truckId: 22,
          trailerId: null,
          empresaTransportista: { id: 5 },
          dador: { id: 9 },
          clientes: [{ cliente: { id: 1, razonSocial: 'C1' } }],
          estado: 'ACTIVO',
        },
      ] as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dni: '1', nombre: 'N', apellido: 'A' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 22, patente: 'AA', marca: 'M', modelo: 'X' } as any);

      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('DADOR_DE_CARGA', { dadorCargaId: 9 }) };
      const res = createRes();

      await PortalTransportistaController.getMisEquipos(req as AuthRequest, res);

      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data[0]).toMatchObject({
        id: 1,
        chofer: expect.any(Object),
        camion: expect.any(Object),
        clientes: [{ id: 1, nombre: 'C1' }],
      });
    });

    it('maneja error con 500', async () => {
      prismaMock.equipo.findMany.mockRejectedValueOnce(new Error('boom'));
      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('ADMIN') };
      const res = createRes();

      await PortalTransportistaController.getMisEquipos(req as AuthRequest, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDocumentosRechazados', () => {
    it('transportista sin dador => []', async () => {
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce(null);
      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('TRANSPORTISTA', { empresaTransportistaId: 5 }) };
      const res = createRes();

      await PortalTransportistaController.getDocumentosRechazados(req as AuthRequest, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('enriquece con entityName por tipo', async () => {
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({ dadorCargaId: 9 });

      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, templateId: 10, template: { name: 'DNI' }, entityType: 'CHOFER', entityId: 11, reviewedAt: new Date('2025-01-01'), rejectionReason: 'x', reviewNotes: 'n' },
        { id: 2, templateId: 20, template: { name: 'Seg' }, entityType: 'CAMION', entityId: 22, reviewedAt: new Date('2025-01-02'), rejectionReason: null, reviewNotes: null },
        { id: 3, templateId: 30, template: { name: 'RTO' }, entityType: 'ACOPLADO', entityId: 33, reviewedAt: new Date('2025-01-03'), rejectionReason: 'y', reviewNotes: null },
        { id: 4, templateId: 40, template: { name: 'ARCA' }, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 44, reviewedAt: new Date('2025-01-04'), rejectionReason: 'z', reviewNotes: null },
      ] as any);
      prismaMock.chofer.findUnique.mockResolvedValueOnce({ nombre: 'Juan', apellido: 'Perez', dni: '1' } as any);
      prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: 'AA' } as any);
      prismaMock.acoplado.findUnique.mockResolvedValueOnce({ patente: 'BB' } as any);
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({ razonSocial: 'ET' } as any);

      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('TRANSPORTISTA', { empresaTransportistaId: 5 }) };
      const res = createRes();

      await PortalTransportistaController.getDocumentosRechazados(req as AuthRequest, res);

      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data).toHaveLength(4);
      expect(payload.data[0].entityName).toContain('('); // chofer
    });

    it('maneja error con 500', async () => {
      prismaMock.document.findMany.mockRejectedValueOnce(new Error('boom'));
      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('ADMIN') };
      const res = createRes();
      await PortalTransportistaController.getDocumentosRechazados(req as AuthRequest, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDocumentosPendientes', () => {
    it('transportista con empresaTransportistaId: usa dador de empresa y retorna [] si no existe', async () => {
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce(null);
      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('TRANSPORTISTA', { empresaTransportistaId: 5 }) };
      const res = createRes();

      await PortalTransportistaController.getDocumentosPendientes(req as AuthRequest, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('dador: filtra por dadorCargaId y lista docs', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, template: { name: 'DNI' }, entityType: 'CHOFER', entityId: 1, uploadedAt: new Date('2025-01-01'), fileName: 'a.pdf' },
      ] as any);

      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('DADOR_DE_CARGA', { dadorCargaId: 9 }) };
      const res = createRes();

      await PortalTransportistaController.getDocumentosPendientes(req as AuthRequest, res);

      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data[0]).toMatchObject({ id: 1, templateName: 'DNI', fileName: 'a.pdf' });
    });

    it('maneja error con 500', async () => {
      prismaMock.document.findMany.mockRejectedValueOnce(new Error('boom'));
      const req: Partial<AuthRequest> = { tenantId: 1, user: makeUser('ADMIN') };
      const res = createRes();
      await PortalTransportistaController.getDocumentosPendientes(req as AuthRequest, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});


