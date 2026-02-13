/**
 * Propósito: ejecutar paths reales de `DashboardController.getSemaforosView` para subir cobertura de dashboard.controller.ts
 * sin requerir Prisma/DB reales (mock de db.getClient + environment).
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ DOCS_DUE_SOON_DAYS: 30 }),
}));

// Mocks de servicios importados en el controller (no se usan en getSemaforosView pero evita side effects).
jest.mock('../../src/services/status.service', () => ({ StatusService: {} }));
jest.mock('../../src/services/document.service', () => ({ DocumentService: {} }));
jest.mock('../../src/services/queue.service', () => ({ queueService: {} }));
jest.mock('../../src/services/minio.service', () => ({
  minioService: {
    getSignedUrl: jest.fn(async () => 'https://signed-url.example/test'),
  },
}));

const prismaMock = {
  document: {
    groupBy: jest.fn(async () => []),
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
  },
  documentTemplate: {
    findMany: jest.fn(async () => []),
  },
  equipo: {
    count: jest.fn(async () => 0),
  },
  equipoCliente: {
    count: jest.fn(async () => 0),
    findMany: jest.fn(async () => []),
  },
  chofer: {
    findUnique: jest.fn(async () => ({ dni: '123', nombre: 'Juan', apellido: 'Pérez' })),
  },
  camion: {
    findUnique: jest.fn(async () => ({ patente: 'AAA111' })),
  },
  acoplado: {
    findUnique: jest.fn(async () => ({ patente: 'BBB222' })),
  },
  empresaTransportista: {
    findUnique: jest.fn(async () => ({ cuit: '20-1', razonSocial: 'Transp SA' })),
    count: jest.fn(async () => 0),
  },
  dadorCarga: {
    findUnique: jest.fn(async () => ({ razonSocial: 'Dador SA', cuit: '30-1' })),
  },
};

jest.mock('../../src/config/database', () => ({
  db: {
    getClient: () => prismaMock,
  },
}));

import { DashboardController } from '../../src/controllers/dashboard.controller';
import { minioService } from '../../src/services/minio.service';

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('DashboardController (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getSemaforosView responde success para SUPERADMIN con empresaId (sin acceder a findMany distinct)', async () => {
    const req: any = {
      tenantId: 1,
      query: { empresaId: '10' },
      user: { userId: 7, role: 'SUPERADMIN', empresaId: 999 },
    };
    const res = createRes();

    await DashboardController.getSemaforosView(req, res as any);

    expect(prismaMock.document.groupBy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        semaforos: expect.any(Array),
        userRole: 'SUPERADMIN',
      })
    );
  });

  it('getRejectedStats responde success para SUPERADMIN y arma topReasons + mapping de templates', async () => {
    // byEntityType
    prismaMock.document.groupBy
      .mockResolvedValueOnce([{ entityType: 'CHOFER', _count: { entityType: 2 } }])
      // byTemplate
      .mockResolvedValueOnce([{ templateId: 10, _count: { templateId: 3 } }]);

    prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 10, name: 'Licencia' }]);
    prismaMock.document.findMany.mockResolvedValueOnce([
      { rejectionReason: 'Falta firma' },
      { rejectionReason: 'Falta firma' },
      { rejectionReason: 'Imagen borrosa' },
      { rejectionReason: null },
    ]);
    prismaMock.document.count.mockResolvedValueOnce(1).mockResolvedValueOnce(7).mockResolvedValueOnce(10);

    const req: any = { tenantId: 1, user: { role: 'SUPERADMIN' }, query: {} };
    const res = createRes();

    await DashboardController.getRejectedStats(req, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalRejected: 10,
          rejectedToday: 1,
          rejectedLast7Days: 7,
          rejectedByReason: expect.arrayContaining([
            expect.objectContaining({ reason: 'Falta firma', count: 2 }),
          ]),
        }),
      })
    );
  });

  it('getRejectedDocuments enriquece con entityNaturalId y previewUrl', async () => {
    prismaMock.document.findMany.mockResolvedValueOnce([
      {
        id: 1,
        entityType: 'CHOFER',
        entityId: 9,
        status: 'RECHAZADO',
        filePath: 'bucket/a/b/c.png',
        fileName: 'c.png',
        rejectionReason: 'X',
        reviewNotes: null,
        rejectedAt: new Date(),
        rejectedBy: 1,
        uploadedAt: new Date(),
        updatedAt: new Date(),
        template: { id: 1, name: 'T', entityType: 'CHOFER' },
      },
    ] as any);
    prismaMock.document.count.mockResolvedValueOnce(1);

    const req: any = { tenantId: 1, user: { role: 'SUPERADMIN' }, query: { page: '1', limit: '20' } };
    const res = createRes();

    await DashboardController.getRejectedDocuments(req, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [
          expect.objectContaining({
            id: 1,
            entityNaturalId: expect.stringContaining('DNI'),
            previewUrl: expect.stringContaining('https://'),
          }),
        ],
      })
    );
  });

  it('getRejectedDocuments deja previewUrl=null si falla signedUrl y soporta entityType desconocido', async () => {
    (minioService.getSignedUrl as jest.Mock).mockRejectedValueOnce(new Error('nope'));

    prismaMock.document.findMany.mockResolvedValueOnce([
      {
        id: 2,
        entityType: 'DESCONOCIDO',
        entityId: 1,
        status: 'RECHAZADO',
        filePath: 'bucket/x/y.png',
        fileName: 'y.png',
        rejectionReason: 'X',
        reviewNotes: null,
        rejectedAt: new Date(),
        rejectedBy: 1,
        uploadedAt: new Date(),
        updatedAt: new Date(),
        template: { id: 1, name: 'T', entityType: 'CHOFER' },
      },
    ] as any);
    prismaMock.document.count.mockResolvedValueOnce(1);

    const req: any = { tenantId: 1, user: { role: 'SUPERADMIN' }, query: {} };
    const res = createRes();

    await DashboardController.getRejectedDocuments(req, res as any);

    const payload = (res.json as jest.Mock).mock.calls[0]?.[0];
    expect(payload.data[0].previewUrl).toBeNull();
    expect(payload.data[0].entityNaturalId).toBeNull();
  });

  it('getFrontendConfig responde success con flags según rol', async () => {
    const req: any = {
      user: { userId: 7, email: 'u@test.com', role: 'SUPERADMIN', empresaId: 10 },
    };
    const res = createRes();

    await DashboardController.getFrontendConfig(req, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          features: expect.objectContaining({
            canManageTemplates: true,
            canViewQueueStats: true,
          }),
        }),
      })
    );
  });

  it('getStatsPorRol (SUPERADMIN) usa stats admin y responde success', async () => {
    // getAdminStats: equipo.count + 4 document.count
    (prismaMock.equipo.count as jest.Mock).mockResolvedValueOnce(10);
    (prismaMock.document.count as jest.Mock)
      .mockResolvedValueOnce(100) // totalDocumentos
      .mockResolvedValueOnce(3) // pendientesAprobacion
      .mockResolvedValueOnce(1) // vencidosHoy
      .mockResolvedValueOnce(2); // rechazados

    const req: any = { tenantId: 1, user: { role: 'SUPERADMIN', empresaId: 10 }, query: {} };
    const res = createRes();

    await DashboardController.getStatsPorRol(req, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalEquipos: 10,
          totalDocumentos: 100,
          pendientesAprobacion: 3,
        }),
      })
    );
  });

  it('getStatsPorRol (DADOR_DE_CARGA) usa stats dador y responde success', async () => {
    (prismaMock.equipo.count as jest.Mock).mockResolvedValueOnce(5);
    (prismaMock.document.count as jest.Mock)
      .mockResolvedValueOnce(4) // pendientesAprobacion
      .mockResolvedValueOnce(2); // proximosVencer
    (prismaMock.empresaTransportista.count as jest.Mock).mockResolvedValueOnce(9);

    const req: any = { tenantId: 1, user: { role: 'DADOR_DE_CARGA', empresaId: 10 }, query: {} };
    const res = createRes();

    await DashboardController.getStatsPorRol(req, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          misEquipos: 5,
          transportistasActivos: 9,
        }),
      })
    );
  });
});

