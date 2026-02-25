/**
 * Coverage tests for portal-cliente.controller.ts
 * Covers all helpers (parseQueryParams, determineComplianceState, normalizarPatente,
 * equipoMatchesSearch, filterByEstado, calcularEstadoDocumento, getEntityName,
 * validateAndDecodeToken, parseFilePath, buildEntityConditions, buildFolderNames,
 * buildFolderContext, paginate, mapEquipoConEstado, calcularResumenEquipos,
 * formatearDocumentosPortal, calcularResumenDocs, loadRelatedEntities,
 * loadEquipoEntities, getDocumentosAprobados, appendDocumentsToArchive,
 * verificarAccesoEquipo, prepareZipResponse, appendEquipoDocumentsToArchive,
 * getEquiposClienteParaDescarga) and all controller methods
 * (getEquiposAsignados, getEquipoDetalle, downloadDocumento, downloadAllDocumentos,
 * bulkDownloadDocumentos, bulkDownloadForm).
 *
 * @jest-environment node
 */

// ── Prisma mock ─────────────────────────────────────────────────────────────
const mockPrisma = {
  equipoCliente: { findMany: jest.fn(), findFirst: jest.fn() },
  equipo: { findUnique: jest.fn(), findMany: jest.fn() },
  chofer: { findUnique: jest.fn(), findMany: jest.fn() },
  camion: { findUnique: jest.fn(), findMany: jest.fn() },
  acoplado: { findUnique: jest.fn(), findMany: jest.fn() },
  document: { findUnique: jest.fn(), findMany: jest.fn() },
};

jest.mock('../src/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/services/compliance.service', () => ({
  ComplianceService: {
    evaluateBatchEquiposCliente: jest.fn(),
  },
}));

const mockMinioGetObject = jest.fn();
jest.mock('../src/services/minio.service.js', () => ({
  minioService: { getObject: mockMinioGetObject },
}), { virtual: true });

const mockArchiverAppend = jest.fn();
const mockArchiverFinalize = jest.fn();
const mockArchiverPipe = jest.fn();
const mockArchiver = jest.fn(() => ({
  append: mockArchiverAppend,
  finalize: mockArchiverFinalize,
  pipe: mockArchiverPipe,
}));
jest.mock('archiver', () => ({
  __esModule: true,
  default: mockArchiver,
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn().mockReturnValue('FAKE_PUBLIC_KEY'),
}));

import { PortalClienteController } from '../src/controllers/portal-cliente.controller';
import { ComplianceService } from '../src/services/compliance.service';

// ── Helpers ─────────────────────────────────────────────────────────────────
function mockReq(overrides: Record<string, any> = {}): any {
  return {
    user: { userId: 1, role: 'CLIENTE', empresaId: 10, clienteId: 5 },
    tenantId: 1,
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    headersSent: false,
  };
  return res;
}

function baseEquipo(overrides: Record<string, any> = {}) {
  return {
    id: 100,
    tenantEmpresaId: 1,
    dadorCargaId: 1,
    driverId: 10,
    truckId: 20,
    trailerId: 30,
    empresaTransportistaId: 40,
    truckPlateNorm: 'AAA111',
    trailerPlateNorm: 'BBB222',
    driverDniNorm: '12345678',
    activo: true,
    empresaTransportista: { id: 40, razonSocial: 'TransCo', cuit: '20-111-0' },
    dador: { id: 1, nombre: 'Dador' },
    ...overrides,
  };
}

function baseChofer(overrides: Record<string, any> = {}) {
  return { id: 10, nombre: 'Juan', apellido: 'Perez', dni: '12345678', ...overrides };
}

function baseCamion(overrides: Record<string, any> = {}) {
  return { id: 20, patente: 'AAA111', marca: 'Scania', modelo: 'R500', ...overrides };
}

function baseAcoplado(overrides: Record<string, any> = {}) {
  return { id: 30, patente: 'BBB222', tipo: 'Semi', ...overrides };
}

function baseAsignacion(overrides: Record<string, any> = {}) {
  return {
    equipoId: 100,
    clienteId: 5,
    asignadoDesde: new Date('2024-01-01'),
    asignadoHasta: null,
    equipo: baseEquipo(),
    ...overrides,
  };
}

function setupHappyPathMocks() {
  mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion()]);
  mockPrisma.chofer.findMany.mockResolvedValue([baseChofer()]);
  mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
  mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado()]);
  (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());
}

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// getEquiposAsignados
// ============================================================================
describe('PortalClienteController.getEquiposAsignados', () => {
  it('returns 400 when clienteId is missing', async () => {
    const req = mockReq({ user: { userId: 1, role: 'CLIENTE' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('returns 400 when user has no clienteId nor empresaId', async () => {
    const req = mockReq({ user: { userId: 1, role: 'CLIENTE', clienteId: undefined, empresaId: undefined } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns paginated equipos with resumen (happy path)', async () => {
    const eq = baseEquipo();
    const asig = baseAsignacion({ equipo: eq });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([asig]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer()]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado()]);

    const complianceMap = new Map();
    complianceMap.set(100, {
      equipoId: 100,
      tieneVencidos: false,
      tieneFaltantes: false,
      tieneProximos: false,
      requirements: [],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(complianceMap);

    const req = mockReq({ query: { page: '1', limit: '10' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          equipos: expect.any(Array),
          resumen: expect.objectContaining({ total: 1, vigentes: 1 }),
          pagination: expect.objectContaining({ page: 1, limit: 10 }),
        }),
      })
    );
  });

  it('uses empresaId as fallback when clienteId is undefined', async () => {
    const eq = baseEquipo();
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer()]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado()]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ user: { userId: 1, role: 'CLIENTE', empresaId: 99 } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    expect(res.json).toHaveBeenCalled();
    expect(mockPrisma.equipoCliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clienteId: 99 }) })
    );
  });

  it('handles compliance with tieneVencidos=true', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      equipoId: 100,
      tieneVencidos: true,
      tieneFaltantes: false,
      tieneProximos: false,
      requirements: [],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.resumen.vencidos).toBe(1);
    expect(data.equipos[0].estadoCompliance).toBe('VENCIDO');
  });

  it('handles compliance with tieneFaltantes=true (INCOMPLETO)', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      equipoId: 100,
      tieneVencidos: false,
      tieneFaltantes: true,
      tieneProximos: false,
      requirements: [],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.resumen.incompletos).toBe(1);
  });

  it('handles compliance with tieneProximos=true and requirements with expiresAt', async () => {
    setupHappyPathMocks();
    const futureDate = new Date('2030-06-15');
    const compMap = new Map();
    compMap.set(100, {
      equipoId: 100,
      tieneVencidos: false,
      tieneFaltantes: false,
      tieneProximos: true,
      requirements: [
        { state: 'PROXIMO', expiresAt: futureDate },
        { state: 'PROXIMO', expiresAt: new Date('2030-07-01') },
      ],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.resumen.proximosVencer).toBe(1);
    expect(data.equipos[0].proximoVencimiento).toBe(futureDate.toISOString());
  });

  it('handles tieneProximos=true but no requirements with expiresAt', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: false,
      tieneFaltantes: false,
      tieneProximos: true,
      requirements: [{ state: 'PROXIMO' }],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].proximoVencimiento).toBeNull();
  });

  it('handles tieneProximos=true with empty proximos array after filter', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: false,
      tieneFaltantes: false,
      tieneProximos: true,
      requirements: [{ state: 'OK', expiresAt: new Date() }],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].estadoCompliance).toBe('PROXIMO_VENCER');
    expect(data.equipos[0].proximoVencimiento).toBeNull();
  });

  it('handles undefined compliance for an equipo (defaults to INCOMPLETO)', async () => {
    setupHappyPathMocks();
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].estadoCompliance).toBe('INCOMPLETO');
    expect(data.equipos[0]._tieneFaltantes).toBe(true);
    expect(data.equipos[0]._tieneVencidos).toBe(false);
    expect(data.equipos[0]._tieneProximos).toBe(false);
  });

  it('applies pipe-delimited search filter', async () => {
    const eq1 = baseEquipo({ id: 101, driverId: 11, truckId: 21 });
    const eq2 = baseEquipo({ id: 102, driverId: 12, truckId: 22 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([
      baseAsignacion({ equipo: eq1, equipoId: 101 }),
      baseAsignacion({ equipo: eq2, equipoId: 102 }),
    ]);
    mockPrisma.chofer.findMany.mockResolvedValue([
      baseChofer({ id: 11, nombre: 'Alpha', apellido: 'One', dni: '111' }),
      baseChofer({ id: 12, nombre: 'Beta', apellido: 'Two', dni: '222' }),
    ]);
    mockPrisma.camion.findMany.mockResolvedValue([
      baseCamion({ id: 21, patente: 'CCC333' }),
      baseCamion({ id: 22, patente: 'DDD444' }),
    ]);
    mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado()]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { search: 'alpha|nonexistent' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('applies simple search filter (no pipe)', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { search: 'aaa111' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('filters by estado VENCIDO', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { estado: 'VENCIDO' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(0);
  });

  it('filters by estado TODOS (no filtering)', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { estado: 'TODOS' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('filters by estado PROXIMO_VENCER', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: false,
      tieneFaltantes: false,
      tieneProximos: true,
      requirements: [],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq({ query: { estado: 'PROXIMO_VENCER' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('filters by estado INCOMPLETO', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: false,
      tieneFaltantes: true,
      tieneProximos: false,
      requirements: [],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq({ query: { estado: 'INCOMPLETO' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('filters by estado VIGENTE', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { estado: 'VIGENTE' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    // default compliance is INCOMPLETO (no matching compliance entry), so VIGENTE filter should exclude it
    expect(data.pagination.total).toBe(0);
  });

  it('filters by unknown estado (default branch)', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { estado: 'CUSTOM_STATE' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(0);
  });

  it('filters by estado empty string (no filtering applied)', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { estado: '' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('handles equipo without trailerId (null acoplado)', async () => {
    const eq = baseEquipo({ trailerId: null });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer()]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].acoplado).toBeNull();
  });

  it('handles equipo without empresaTransportista', async () => {
    const eq = baseEquipo({ empresaTransportista: null, empresaTransportistaId: null });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer()]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado()]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].empresaTransportista).toBeNull();
  });

  it('paginates correctly (page 2)', async () => {
    const asignaciones = Array.from({ length: 15 }, (_, i) => {
      const eq = baseEquipo({ id: 100 + i, driverId: 10 + i, truckId: 20 + i, trailerId: null });
      return baseAsignacion({ equipo: eq, equipoId: 100 + i });
    });
    mockPrisma.equipoCliente.findMany.mockResolvedValue(asignaciones);
    const choferes = asignaciones.map(a => baseChofer({ id: a.equipo.driverId }));
    const camiones = asignaciones.map(a => baseCamion({ id: a.equipo.truckId }));
    mockPrisma.chofer.findMany.mockResolvedValue(choferes);
    mockPrisma.camion.findMany.mockResolvedValue(camiones);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { page: '2', limit: '10' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.hasNext).toBe(false);
    expect(data.pagination.hasPrev).toBe(true);
    expect(data.equipos).toHaveLength(5);
  });

  it('clamps page and limit to valid ranges', async () => {
    mockPrisma.equipoCliente.findMany.mockResolvedValue([]);
    mockPrisma.chofer.findMany.mockResolvedValue([]);
    mockPrisma.camion.findMany.mockResolvedValue([]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { page: '-5', limit: '999' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(100);
  });

  it('clamps limit to minimum 1 when given 0', async () => {
    mockPrisma.equipoCliente.findMany.mockResolvedValue([]);
    mockPrisma.chofer.findMany.mockResolvedValue([]);
    mockPrisma.camion.findMany.mockResolvedValue([]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { page: '1', limit: '0' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.limit).toBe(1);
  });

  it('returns 500 on database error', async () => {
    mockPrisma.equipoCliente.findMany.mockRejectedValue(new Error('DB fail'));

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('handles search matching by chofer dni and empresaTransportista cuit', async () => {
    const eq = baseEquipo();
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer({ dni: '99887766' })]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado()]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { search: '20-111-0' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('search with no matching term returns empty', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { search: 'zzz_notexist' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(0);
  });

  it('search matching by chofer nombre, apellido', async () => {
    const eq = baseEquipo();
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer({ nombre: 'MarcoTest', apellido: 'ZZZ' })]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado()]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { search: 'marcotest' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('search matching by chofer apellido specifically', async () => {
    const eq = baseEquipo();
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer({ nombre: 'X', apellido: 'UniqueLastName' })]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado()]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { search: 'uniquelastname' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('search matching by empresaTransportista razonSocial', async () => {
    const eq = baseEquipo({ empresaTransportista: { razonSocial: 'UniqueTransport', cuit: '30-99-1' } });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer()]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado()]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { search: 'uniquetransport' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('search matching by acoplado patente', async () => {
    const eq = baseEquipo();
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer()]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([baseAcoplado({ patente: 'ZZZ999' })]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { search: 'zzz999' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('handles equipo with null chofer/camion/acoplado fields in search', async () => {
    const eq = baseEquipo({
      empresaTransportista: null,
      empresaTransportistaId: null,
      trailerId: null,
    });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([{ id: 10, nombre: null, apellido: null, dni: null }]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion()]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { search: 'aaa111' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it('handles missing chofer/camion in map (uses truckPlateNorm/driverDniNorm)', async () => {
    const eq = baseEquipo({ driverId: 999, truckId: 888, trailerId: null });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([]);
    mockPrisma.camion.findMany.mockResolvedValue([]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].identificador).toContain('AAA111');
    expect(data.equipos[0].chofer).toBeNull();
    expect(data.equipos[0].camion).toBeNull();
  });

  it('handles query.search as empty string after trim (no filtering)', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { search: '  ' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('handles default query params (undefined page/limit/search/estado)', async () => {
    mockPrisma.equipoCliente.findMany.mockResolvedValue([]);
    mockPrisma.chofer.findMany.mockResolvedValue([]);
    mockPrisma.camion.findMany.mockResolvedValue([]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: {} });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
  });

  it('search query.search as undefined produces no filtering', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { search: undefined } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('search pipe-delimited with empty segments after split (e.g., "alpha||")', async () => {
    setupHappyPathMocks();
    const req = mockReq({ query: { search: 'aaa111||' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('compliance with all flags false (VIGENTE state)', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: false,
      tieneFaltantes: false,
      tieneProximos: false,
      requirements: [],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].estadoCompliance).toBe('VIGENTE');
    expect(data.equipos[0]._tieneVencidos).toBe(false);
    expect(data.equipos[0]._tieneFaltantes).toBe(false);
    expect(data.equipos[0]._tieneProximos).toBe(false);
  });

  it('compliance with tieneProximos and single requirement with expiresAt', async () => {
    setupHappyPathMocks();
    const singleDate = new Date('2031-01-01');
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: false,
      tieneFaltantes: false,
      tieneProximos: true,
      requirements: [{ state: 'PROXIMO', expiresAt: singleDate }],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].proximoVencimiento).toBe(singleDate.toISOString());
  });

  it('compliance tieneVencidos takes priority over tieneFaltantes and tieneProximos', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: true,
      tieneFaltantes: true,
      tieneProximos: true,
      requirements: [{ state: 'PROXIMO', expiresAt: new Date() }],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].estadoCompliance).toBe('VENCIDO');
  });

  it('compliance tieneFaltantes takes priority over tieneProximos', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: false,
      tieneFaltantes: true,
      tieneProximos: true,
      requirements: [],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].estadoCompliance).toBe('INCOMPLETO');
  });

  it('builds identificador with truckPlateNorm and driverDniNorm when entities not in map', async () => {
    const eq = baseEquipo({ driverId: 999, truckId: 888, trailerId: null, truckPlateNorm: 'XYZ789', driverDniNorm: '55555555' });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq })]);
    mockPrisma.chofer.findMany.mockResolvedValue([]);
    mockPrisma.camion.findMany.mockResolvedValue([]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].identificador).toBe('XYZ789-55555555');
  });

  it('VIGENTE estado filter includes only equipos with no vencidos, no faltantes, no proximos', async () => {
    const eq1 = baseEquipo({ id: 101, driverId: 11, truckId: 21, trailerId: null });
    const eq2 = baseEquipo({ id: 102, driverId: 12, truckId: 22, trailerId: null });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([
      baseAsignacion({ equipo: eq1, equipoId: 101 }),
      baseAsignacion({ equipo: eq2, equipoId: 102 }),
    ]);
    mockPrisma.chofer.findMany.mockResolvedValue([
      baseChofer({ id: 11 }),
      baseChofer({ id: 12 }),
    ]);
    mockPrisma.camion.findMany.mockResolvedValue([
      baseCamion({ id: 21 }),
      baseCamion({ id: 22 }),
    ]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);

    const compMap = new Map();
    compMap.set(101, { tieneVencidos: false, tieneFaltantes: false, tieneProximos: false, requirements: [] });
    compMap.set(102, { tieneVencidos: true, tieneFaltantes: false, tieneProximos: false, requirements: [] });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq({ query: { estado: 'VIGENTE' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('filterByEstado VENCIDO includes only equipos with _tieneVencidos=true', async () => {
    const eq1 = baseEquipo({ id: 101, driverId: 11, truckId: 21, trailerId: null });
    const eq2 = baseEquipo({ id: 102, driverId: 12, truckId: 22, trailerId: null });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([
      baseAsignacion({ equipo: eq1, equipoId: 101 }),
      baseAsignacion({ equipo: eq2, equipoId: 102 }),
    ]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer({ id: 11 }), baseChofer({ id: 12 })]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion({ id: 21 }), baseCamion({ id: 22 })]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);

    const compMap = new Map();
    compMap.set(101, { tieneVencidos: true, tieneFaltantes: false, tieneProximos: false, requirements: [] });
    compMap.set(102, { tieneVencidos: false, tieneFaltantes: false, tieneProximos: false, requirements: [] });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq({ query: { estado: 'VENCIDO' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('filterByEstado INCOMPLETO includes only equipos with _tieneFaltantes=true', async () => {
    const eq1 = baseEquipo({ id: 101, driverId: 11, truckId: 21, trailerId: null });
    const eq2 = baseEquipo({ id: 102, driverId: 12, truckId: 22, trailerId: null });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([
      baseAsignacion({ equipo: eq1, equipoId: 101 }),
      baseAsignacion({ equipo: eq2, equipoId: 102 }),
    ]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer({ id: 11 }), baseChofer({ id: 12 })]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion({ id: 21 }), baseCamion({ id: 22 })]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);

    const compMap = new Map();
    compMap.set(101, { tieneVencidos: false, tieneFaltantes: true, tieneProximos: false, requirements: [] });
    compMap.set(102, { tieneVencidos: false, tieneFaltantes: false, tieneProximos: false, requirements: [] });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq({ query: { estado: 'INCOMPLETO' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(1);
  });

  it('filterByEstado with unknown estado falls through to default (matches estadoCompliance)', async () => {
    const eq = baseEquipo({ id: 101, driverId: 11, truckId: 21, trailerId: null });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([baseAsignacion({ equipo: eq, equipoId: 101 })]);
    mockPrisma.chofer.findMany.mockResolvedValue([baseChofer({ id: 11 })]);
    mockPrisma.camion.findMany.mockResolvedValue([baseCamion({ id: 21 })]);
    mockPrisma.acoplado.findMany.mockResolvedValue([]);
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(new Map());

    const req = mockReq({ query: { estado: 'CUSTOM_STATE' } });
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.pagination.total).toBe(0);
  });

  it('determineComplianceState: tieneFaltantes=true (not tieneVencidos) yields INCOMPLETO', async () => {
    setupHappyPathMocks();
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: false,
      tieneFaltantes: true,
      tieneProximos: false,
      requirements: [],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].estadoCompliance).toBe('INCOMPLETO');
    expect(data.equipos[0]._tieneFaltantes).toBe(true);
  });

  it('determineComplianceState: tieneProximos=true with valid expiry dates', async () => {
    setupHappyPathMocks();
    const futureDate1 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const futureDate2 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const compMap = new Map();
    compMap.set(100, {
      tieneVencidos: false,
      tieneFaltantes: false,
      tieneProximos: true,
      requirements: [
        { state: 'PROXIMO', expiresAt: futureDate1 },
        { state: 'PROXIMO', expiresAt: futureDate2 },
      ],
    });
    (ComplianceService.evaluateBatchEquiposCliente as jest.Mock).mockResolvedValue(compMap);

    const req = mockReq();
    const res = mockRes();
    await PortalClienteController.getEquiposAsignados(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipos[0].estadoCompliance).toBe('PROXIMO_VENCER');
    expect(data.equipos[0].proximoVencimiento).toBeDefined();
    expect(new Date(data.equipos[0].proximoVencimiento).getTime()).toBe(futureDate2.getTime());
  });
});

// ============================================================================
// getEquipoDetalle
// ============================================================================
describe('PortalClienteController.getEquipoDetalle', () => {
  it('returns 400 when clienteId is missing', async () => {
    const req = mockReq({ user: { userId: 1, role: 'CLIENTE' }, params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when equipo not assigned to client', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 when equipo not found', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(null);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when equipo belongs to different tenant', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({ tenantEmpresaId: 999 }));

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns equipo detail with documentos (happy path)', async () => {
    const asigDate = new Date('2024-01-01');
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: asigDate });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1,
        entityType: 'CHOFER',
        entityId: 10,
        templateId: 1,
        status: 'APROBADO',
        expiresAt: futureDate,
        uploadedAt: new Date(),
        fileName: 'doc.pdf',
        filePath: 'bucket/path.pdf',
        template: { name: 'Carnet' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          equipo: expect.objectContaining({ id: 100 }),
          documentos: expect.any(Array),
          resumenDocs: expect.any(Object),
          hayDocumentosDescargables: true,
        }),
      })
    );
  });

  it('handles equipo without trailerId', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({ trailerId: null }));
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipo.acoplado).toBeNull();
  });

  it('handles equipo without empresaTransportista', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({ empresaTransportista: null, empresaTransportistaId: null }));
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipo.empresaTransportista).toBeNull();
  });

  it('handles null chofer/camion/acoplado', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({ trailerId: null }));
    mockPrisma.chofer.findUnique.mockResolvedValue(null);
    mockPrisma.camion.findUnique.mockResolvedValue(null);
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.equipo.chofer).toBeNull();
    expect(data.equipo.camion).toBeNull();
  });

  it('formats VENCIDO document correctly (not descargable)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 2,
        entityType: 'CAMION',
        entityId: 20,
        templateId: 2,
        status: 'VENCIDO',
        expiresAt: new Date('2020-01-01'),
        uploadedAt: new Date(),
        fileName: 'vtv.pdf',
        template: { name: 'VTV' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].estado).toBe('VENCIDO');
    expect(data.documentos[0].descargable).toBe(false);
    expect(data.hayDocumentosDescargables).toBe(false);
  });

  it('formats PROXIMO_VENCER document (within 30 days)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const soon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 3,
        entityType: 'ACOPLADO',
        entityId: 30,
        templateId: 3,
        status: 'APROBADO',
        expiresAt: soon,
        uploadedAt: new Date(),
        fileName: 'rto.pdf',
        template: { name: 'RTO' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].estado).toBe('PROXIMO_VENCER');
    expect(data.documentos[0].descargable).toBe(true);
  });

  it('formats VIGENTE document (no expiresAt)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 4,
        entityType: 'EMPRESA_TRANSPORTISTA',
        entityId: 40,
        templateId: 4,
        status: 'APROBADO',
        expiresAt: null,
        uploadedAt: new Date(),
        fileName: 'seguro.pdf',
        template: { name: 'Seguro' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].estado).toBe('VIGENTE');
    expect(data.documentos[0].descargable).toBe(true);
    expect(data.documentos[0].entityName).toContain('TransCo');
  });

  it('formats expired-by-date document as VENCIDO (status APROBADO but past expiresAt)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 5,
        entityType: 'CAMION',
        entityId: 20,
        templateId: 5,
        status: 'APROBADO',
        expiresAt: new Date('2020-01-01'),
        uploadedAt: new Date(),
        fileName: 'old.pdf',
        template: { name: 'OldDoc' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].estado).toBe('VENCIDO');
    expect(data.documentos[0].descargable).toBe(false);
  });

  it('deduplicates documents by template (keeps first / most recent)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const futDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 10, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: futDate, uploadedAt: new Date(),
        fileName: 'a.pdf', template: { name: 'Carnet' },
      },
      {
        id: 11, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: futDate, uploadedAt: new Date(Date.now() - 86400000),
        fileName: 'b.pdf', template: { name: 'Carnet' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos).toHaveLength(1);
    expect(data.documentos[0].id).toBe(10);
  });

  it('uses empresaId as fallback for clienteId', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({
      user: { userId: 1, role: 'CLIENTE', empresaId: 77 },
      params: { id: '100' },
    });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    expect(mockPrisma.equipoCliente.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clienteId: 77 }) })
    );
  });

  it('handles getEntityName for unknown entity type', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(null);
    mockPrisma.camion.findUnique.mockResolvedValue(null);
    mockPrisma.acoplado.findUnique.mockResolvedValue(null);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 99, entityType: 'UNKNOWN_TYPE', entityId: 999, templateId: 99,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'x.pdf', template: { name: 'Custom' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toBe('UNKNOWN_TYPE 999');
  });

  it('handles getEntityName for CHOFER without data (fallback)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(null);
    mockPrisma.camion.findUnique.mockResolvedValue(null);
    mockPrisma.acoplado.findUnique.mockResolvedValue(null);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 55, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'c.pdf', template: { name: 'Carnet' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toBe('Chofer 10');
  });

  it('handles getEntityName for CHOFER with empty nombre/apellido', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer({ nombre: '', apellido: '' }));
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 60, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'c.pdf', template: { name: 'Carnet' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toContain('12345678');
  });

  it('handles getEntityName for CHOFER with null nombre/apellido', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer({ nombre: null, apellido: null }));
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 61, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'c.pdf', template: { name: 'Carnet' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toContain('(12345678)');
  });

  it('handles getEntityName for CAMION without data (fallback)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(null);
    mockPrisma.camion.findUnique.mockResolvedValue(null);
    mockPrisma.acoplado.findUnique.mockResolvedValue(null);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 56, entityType: 'CAMION', entityId: 20, templateId: 2,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'c.pdf', template: { name: 'VTV' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toBe('Camión 20');
  });

  it('handles getEntityName for CAMION with data (uses patente)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion({ patente: 'XYZ999' }));
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 70, entityType: 'CAMION', entityId: 20, templateId: 2,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'vtv.pdf', template: { name: 'VTV' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toBe('XYZ999');
  });

  it('handles getEntityName for ACOPLADO without data (fallback)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(null);
    mockPrisma.camion.findUnique.mockResolvedValue(null);
    mockPrisma.acoplado.findUnique.mockResolvedValue(null);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 57, entityType: 'ACOPLADO', entityId: 30, templateId: 3,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'c.pdf', template: { name: 'RTO' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toBe('Acoplado 30');
  });

  it('handles getEntityName for ACOPLADO with data (uses patente)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado({ patente: 'ABC999' }));
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 71, entityType: 'ACOPLADO', entityId: 30, templateId: 3,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'rto.pdf', template: { name: 'RTO' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toBe('ABC999');
  });

  it('handles getEntityName for EMPRESA_TRANSPORTISTA without data (fallback)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({ empresaTransportista: null }));
    mockPrisma.chofer.findUnique.mockResolvedValue(null);
    mockPrisma.camion.findUnique.mockResolvedValue(null);
    mockPrisma.acoplado.findUnique.mockResolvedValue(null);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 58, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 40, templateId: 4,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'c.pdf', template: { name: 'Constancia' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toBe('Empresa 40');
  });

  it('handles getEntityName for EMPRESA_TRANSPORTISTA with razonSocial null', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({ empresaTransportista: { razonSocial: null, cuit: '30-1-0' } }));
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 72, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 40, templateId: 4,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'c.pdf', template: { name: 'Constancia' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].entityName).toBe('Empresa 40');
  });

  it('returns 500 on error', async () => {
    mockPrisma.equipoCliente.findFirst.mockRejectedValue(new Error('DB fail'));

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('resumenDocs counts vigentes/proximosVencer/vencidos correctly', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const soon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const far = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: far, uploadedAt: new Date(),
        fileName: 'a.pdf', template: { name: 'Vigente' },
      },
      {
        id: 2, entityType: 'CAMION', entityId: 20, templateId: 2,
        status: 'APROBADO', expiresAt: soon, uploadedAt: new Date(),
        fileName: 'b.pdf', template: { name: 'Proximo' },
      },
      {
        id: 3, entityType: 'ACOPLADO', entityId: 30, templateId: 3,
        status: 'VENCIDO', expiresAt: new Date('2020-01-01'), uploadedAt: new Date(),
        fileName: 'c.pdf', template: { name: 'Vencido' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.resumenDocs.total).toBe(3);
    expect(data.resumenDocs.vigentes).toBe(1);
    expect(data.resumenDocs.proximosVencer).toBe(1);
    expect(data.resumenDocs.vencidos).toBe(1);
  });

  it('hayDocumentosDescargables false when all docs are vencidos', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'VENCIDO', expiresAt: new Date('2020-01-01'), uploadedAt: new Date(),
        fileName: 'x.pdf', template: { name: 'Doc' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.hayDocumentosDescargables).toBe(false);
  });

  it('handles empty documentos array', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos).toHaveLength(0);
    expect(data.resumenDocs.total).toBe(0);
    expect(data.hayDocumentosDescargables).toBe(false);
  });

  it('formats expiresAt as ISO string when present', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const futDate = new Date('2030-06-15T00:00:00.000Z');
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 80, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: futDate, uploadedAt: new Date('2024-01-01'),
        fileName: 'x.pdf', template: { name: 'Doc' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].expiresAt).toBe(futDate.toISOString());
    expect(data.documentos[0].uploadedAt).toBeDefined();
  });

  it('formats expiresAt as null when not present', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 81, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        fileName: 'x.pdf', template: { name: 'Doc' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].expiresAt).toBeNull();
  });

  it('builds entity conditions with trailerId and empresaTransportistaId', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);

    const docQuery = mockPrisma.document.findMany.mock.calls[0][0];
    const orConditions = docQuery.where.OR;
    expect(orConditions).toHaveLength(4);
    expect(orConditions).toEqual(expect.arrayContaining([
      { entityType: 'CHOFER', entityId: 10 },
      { entityType: 'CAMION', entityId: 20 },
      { entityType: 'ACOPLADO', entityId: 30 },
      { entityType: 'EMPRESA_TRANSPORTISTA', entityId: 40 },
    ]));
  });

  it('builds entity conditions without trailerId and empresaTransportistaId', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({ trailerId: null, empresaTransportistaId: null }));
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);

    const docQuery = mockPrisma.document.findMany.mock.calls[0][0];
    const orConditions = docQuery.where.OR;
    expect(orConditions).toHaveLength(2);
    expect(orConditions).toEqual([
      { entityType: 'CHOFER', entityId: 10 },
      { entityType: 'CAMION', entityId: 20 },
    ]);
  });

  it('returns 500 on DB error and does not leak stack trace', async () => {
    mockPrisma.equipoCliente.findFirst.mockImplementation(() => {
      throw new Error('Unexpected DB failure');
    });

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error interno' });
  });

  it('calcularEstadoDocumento: doc with expiresAt in far future returns VIGENTE+descargable', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 80, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: farFuture, uploadedAt: new Date(),
        fileName: 'a.pdf', template: { name: 'FarFuture' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].estado).toBe('VIGENTE');
    expect(data.documentos[0].descargable).toBe(true);
  });

  it('calcularEstadoDocumento: doc expiring within 30 days returns PROXIMO_VENCER', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const soon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 81, entityType: 'CAMION', entityId: 20, templateId: 2,
        status: 'APROBADO', expiresAt: soon, uploadedAt: new Date(),
        fileName: 'b.pdf', template: { name: 'Soon' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].estado).toBe('PROXIMO_VENCER');
    expect(data.documentos[0].descargable).toBe(true);
  });

  it('calcularEstadoDocumento: APROBADO doc with past expiresAt returns VENCIDO+no descargable', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100, asignadoDesde: new Date() });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const pastDate = new Date('2020-06-15');
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 82, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: pastDate, uploadedAt: new Date(),
        fileName: 'c.pdf', template: { name: 'Expired' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.getEquipoDetalle(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.documentos[0].estado).toBe('VENCIDO');
    expect(data.documentos[0].descargable).toBe(false);
  });
});

// ============================================================================
// downloadDocumento
// ============================================================================
describe('PortalClienteController.downloadDocumento', () => {
  it('returns 403 when equipo not assigned', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);

    const req = mockReq({ params: { id: '100', docId: '1' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 when document not found', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue(null);

    const req = mockReq({ params: { id: '100', docId: '1' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when doc belongs to different tenant', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 999, status: 'APROBADO', filePath: 'test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const req = mockReq({ params: { id: '100', docId: '1' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when doc status is PENDIENTE (not APROBADO/VENCIDO)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'PENDIENTE', filePath: 'test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const req = mockReq({ params: { id: '100', docId: '1' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when doc status is RECHAZADO', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'RECHAZADO', filePath: 'test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const req = mockReq({ params: { id: '100', docId: '1' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 for VENCIDO doc without preview flag', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'VENCIDO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const req = mockReq({ params: { id: '100', docId: '1' }, query: {} });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows VENCIDO doc download when preview=true', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'VENCIDO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100', docId: '1' }, query: { preview: 'true' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(fakeStream.pipe).toHaveBeenCalledWith(res);
  });

  it('returns 403 for doc with past expiresAt and status APROBADO (not preview)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: new Date('2020-01-01'),
    });

    const req = mockReq({ params: { id: '100', docId: '1' }, query: {} });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows APROBADO doc with null expiresAt (not vencido)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100', docId: '1' }, query: {} });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(fakeStream.pipe).toHaveBeenCalledWith(res);
  });

  it('downloads APROBADO doc with filePath containing slash', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'my-bucket/path/to/file.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100', docId: '1' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);

    expect(mockMinioGetObject).toHaveBeenCalledWith('my-bucket', 'path/to/file.pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(fakeStream.pipe).toHaveBeenCalledWith(res);
  });

  it('downloads doc with filePath without slash (uses default bucket)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'simple-file.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100', docId: '1' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);

    expect(mockMinioGetObject).toHaveBeenCalledWith('docs-t1', 'simple-file.pdf');
  });

  it('uses empresaId as fallback clienteId', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({
      user: { userId: 1, role: 'CLIENTE', empresaId: 88 },
      params: { id: '100', docId: '1' },
    });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(mockPrisma.equipoCliente.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clienteId: 88 }) })
    );
  });

  it('returns 500 on error', async () => {
    mockPrisma.equipoCliente.findFirst.mockRejectedValue(new Error('DB fail'));

    const req = mockReq({ params: { id: '100', docId: '1' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('handles APROBADO doc with future expiresAt (not vencido)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: futureDate,
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100', docId: '1' }, query: {} });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(fakeStream.pipe).toHaveBeenCalledWith(res);
  });

  it('sets Content-Disposition header with fileName', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'bucket/test.pdf',
      fileName: 'my-document.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100', docId: '1' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="my-document.pdf"');
  });

  it('allows APROBADO doc with past expiresAt when preview=true', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: new Date('2020-01-01'),
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100', docId: '1' }, query: { preview: 'true' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(fakeStream.pipe).toHaveBeenCalledWith(res);
  });

  it('preview=false does not bypass vencido check', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'VENCIDO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const req = mockReq({ params: { id: '100', docId: '1' }, query: { preview: 'false' } });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('VENCIDO status with future expiresAt is still vencido', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'VENCIDO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: futureDate,
    });

    const req = mockReq({ params: { id: '100', docId: '1' }, query: {} });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('uses docs-t{tenantId} bucket when filePath has no slash', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'simple-file.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100', docId: '1' }, query: {} });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(mockMinioGetObject).toHaveBeenCalledWith('docs-t1', 'simple-file.pdf');
    expect(fakeStream.pipe).toHaveBeenCalledWith(res);
  });

  it('returns 500 when minio getObject throws (catch block)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });
    mockMinioGetObject.mockRejectedValue(new Error('MinIO connection failed'));

    const req = mockReq({ params: { id: '100', docId: '1' }, query: {} });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error interno' });
  });

  it('APROBADO doc with null expiresAt and no preview is not vencido', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 1, tenantEmpresaId: 1, status: 'APROBADO', filePath: 'bucket/test.pdf',
      fileName: 'test.pdf', mimeType: 'application/pdf', expiresAt: null,
    });

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100', docId: '1' }, query: {} });
    const res = mockRes();
    await PortalClienteController.downloadDocumento(req, res);
    expect(fakeStream.pipe).toHaveBeenCalledWith(res);
  });
});

// ============================================================================
// downloadAllDocumentos
// ============================================================================
describe('PortalClienteController.downloadAllDocumentos', () => {
  it('returns 403 when equipo not assigned', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 when equipo not found', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(null);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when equipo belongs to different tenant', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({ tenantEmpresaId: 999 }));

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when no vigente documents', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('generates ZIP with vigente docs (happy path)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: futureDate, uploadedAt: new Date(),
        filePath: 'bucket/chofer.pdf', fileName: 'chofer.pdf', template: { name: 'Carnet' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
    expect(mockArchiverAppend).toHaveBeenCalled();
    expect(mockArchiverFinalize).toHaveBeenCalled();
  });

  it('filters out expired documents from ZIP', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: new Date('2020-01-01'), uploadedAt: new Date(),
        filePath: 'bucket/old.pdf', fileName: 'old.pdf', template: { name: 'OldDoc' },
      },
    ]);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('includes docs without expiresAt (no expiration)', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CAMION', entityId: 20, templateId: 2,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/vtv.pdf', fileName: 'vtv.pdf', template: { name: 'VTV' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(mockArchiverAppend).toHaveBeenCalled();
  });

  it('handles equipo without trailerId and empresaTransportistaId in buildEntityConditions', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({ trailerId: null, empresaTransportistaId: null, empresaTransportista: null }));
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/x.pdf', fileName: 'x.pdf', template: { name: 'Test' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(mockArchiverAppend).toHaveBeenCalled();
  });

  it('warns but continues if a doc fails to append to ZIP', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: futureDate, uploadedAt: new Date(),
        filePath: 'bucket/fail.pdf', fileName: 'fail.pdf', template: { name: 'FailDoc' },
      },
      {
        id: 2, entityType: 'CAMION', entityId: 20, templateId: 2,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/ok.pdf', fileName: 'ok.pdf', template: { name: 'OkDoc' },
      },
    ]);

    mockMinioGetObject
      .mockRejectedValueOnce(new Error('MinIO error'))
      .mockResolvedValueOnce({ pipe: jest.fn() });

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(mockArchiverFinalize).toHaveBeenCalled();
  });

  it('returns 500 on error and does not send if headers already sent', async () => {
    mockPrisma.equipoCliente.findFirst.mockRejectedValue(new Error('DB fail'));

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    res.headersSent = true;
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 500 on error when headers not sent', async () => {
    mockPrisma.equipoCliente.findFirst.mockRejectedValue(new Error('DB fail'));

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('builds folder names correctly with null fallbacks', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo({
      truckPlateNorm: null,
      trailerPlateNorm: null,
      empresaTransportista: { cuit: null, razonSocial: 'X' },
    }));
    mockPrisma.chofer.findUnique.mockResolvedValue({ id: 10, dni: null, nombre: null, apellido: null });
    mockPrisma.camion.findUnique.mockResolvedValue(null);
    mockPrisma.acoplado.findUnique.mockResolvedValue(null);
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/x.pdf', fileName: 'x.pdf', template: { name: 'Test' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(mockArchiverAppend).toHaveBeenCalled();
  });

  it('uses "otros" subfolder for unknown entityType in ZIP', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'UNKNOWN_ENTITY', entityId: 999, templateId: 99,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/unknown.pdf', fileName: 'unknown.pdf', template: { name: 'UnknownDoc' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    const appendCall = mockArchiverAppend.mock.calls[0];
    expect(appendCall[1].name).toContain('otros');
  });

  it('builds ZIP filename with patenteCamion', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion({ patente: 'XYZ-999' }));
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CAMION', entityId: 20, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/x.pdf', fileName: 'x.pdf', template: { name: 'Doc' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('XYZ_999')
    );
  });

  it('uses empresaId as fallback for clienteId in downloadAll', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue(null);

    const req = mockReq({
      user: { userId: 1, role: 'CLIENTE', empresaId: 77 },
      params: { id: '100' },
    });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);
    expect(mockPrisma.equipoCliente.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clienteId: 77 }) })
    );
  });

  it('generates correct ZIP path with CHOFER subfolder', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/chofer.pdf', fileName: 'chofer.pdf', template: { name: 'Carnet de Conducir' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);

    const appendCall = mockArchiverAppend.mock.calls[0];
    const path = appendCall[1].name;
    expect(path).toContain('2_Chofer_12345678');
    expect(path).toContain('Carnet de Conducir.pdf');
  });

  it('generates correct extension from fileName', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CAMION', entityId: 20, templateId: 2,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/vtv.jpg', fileName: 'photo.jpg', template: { name: 'VTV' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);

    const appendCall = mockArchiverAppend.mock.calls[0];
    expect(appendCall[1].name).toContain('VTV.jpg');
  });

  it('uses pdf as default extension when fileName has no extension', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CAMION', entityId: 20, templateId: 2,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/vtv', fileName: 'noext', template: { name: 'VTV' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);

    const appendCall = mockArchiverAppend.mock.calls[0];
    expect(appendCall[1].name).toMatch(/\.noext$/);
  });

  it('sanitizes template name with special characters', async () => {
    mockPrisma.equipoCliente.findFirst.mockResolvedValue({ equipoId: 100 });
    mockPrisma.equipo.findUnique.mockResolvedValue(baseEquipo());
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());

    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/doc.pdf', fileName: 'doc.pdf', template: { name: 'Carnet (Tipo A) / B' },
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ params: { id: '100' } });
    const res = mockRes();
    await PortalClienteController.downloadAllDocumentos(req, res);

    const appendCall = mockArchiverAppend.mock.calls[0];
    expect(appendCall[1].name).not.toContain('(');
    expect(appendCall[1].name).not.toContain('/');
  });
});

// ============================================================================
// bulkDownloadDocumentos
// ============================================================================
describe('PortalClienteController.bulkDownloadDocumentos', () => {
  it('returns 400 when clienteId is missing', async () => {
    const req = mockReq({ user: { userId: 1, role: 'CLIENTE' }, body: { equipoIds: [1] } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when equipoIds is empty', async () => {
    const req = mockReq({ body: { equipoIds: [] } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when equipoIds is not provided', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await PortalClienteController.bulkDownloadDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when no equipos are permitted', async () => {
    mockPrisma.equipoCliente.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { equipoIds: [100, 200] } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('generates ZIP for permitted equipos (happy path)', async () => {
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([baseEquipo()]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([
      {
        id: 1, entityType: 'CHOFER', entityId: 10, templateId: 1,
        status: 'APROBADO', expiresAt: null, uploadedAt: new Date(),
        filePath: 'bucket/doc.pdf', fileName: 'doc.pdf', template: { name: 'Carnet' },
        tenantEmpresaId: 1, archived: false,
      },
    ]);

    const fakeStream = { pipe: jest.fn() };
    mockMinioGetObject.mockResolvedValue(fakeStream);

    const req = mockReq({ body: { equipoIds: [100] } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadDocumentos(req, res);
    expect(mockArchiverFinalize).toHaveBeenCalled();
  });

  it('returns 500 on error, skips if headers sent', async () => {
    mockPrisma.equipoCliente.findMany.mockRejectedValue(new Error('DB fail'));

    const req = mockReq({ body: { equipoIds: [100] } });
    const res = mockRes();
    res.headersSent = true;
    await PortalClienteController.bulkDownloadDocumentos(req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 500 on error when headers not sent', async () => {
    mockPrisma.equipoCliente.findMany.mockRejectedValue(new Error('DB fail'));

    const req = mockReq({ body: { equipoIds: [100] } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadDocumentos(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('uses empresaId as fallback for clienteId', async () => {
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([baseEquipo()]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({
      user: { userId: 1, role: 'CLIENTE', empresaId: 55 },
      body: { equipoIds: [100] },
    });
    const res = mockRes();
    await PortalClienteController.bulkDownloadDocumentos(req, res);
    expect(mockPrisma.equipoCliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clienteId: 55 }) })
    );
  });

  it('sorts permitted equipo IDs', async () => {
    mockPrisma.equipoCliente.findMany.mockResolvedValue([
      { equipoId: 300 },
      { equipoId: 100 },
      { equipoId: 200 },
    ]);
    mockPrisma.equipo.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { equipoIds: [300, 100, 200] } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadDocumentos(req, res);

    const findManyCall = mockPrisma.equipo.findMany.mock.calls[0][0];
    expect(findManyCall.where.id.in).toEqual([100, 200, 300]);
  });

  it('processes multiple equipos in the ZIP', async () => {
    const eq1 = baseEquipo({ id: 100, driverId: 10, truckId: 20 });
    const eq2 = baseEquipo({ id: 200, driverId: 11, truckId: 21, trailerId: null, empresaTransportistaId: null, empresaTransportista: null });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }, { equipoId: 200 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([eq1, eq2]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { equipoIds: [100, 200] } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadDocumentos(req, res);
    expect(mockArchiverFinalize).toHaveBeenCalled();
  });
});

// ============================================================================
// bulkDownloadForm
// ============================================================================
describe('PortalClienteController.bulkDownloadForm', () => {
  const jwt = require('jsonwebtoken');

  it('returns 401 when token is missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Token requerido');
  });

  it('returns 401 when token is invalid', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid'); });

    const req = mockReq({ body: { token: 'bad-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Token inválido');
  });

  it('returns 400 when clienteId cannot be determined', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1 });

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Cliente no identificado');
  });

  it('returns 404 when no equipos found', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('No se encontraron equipos');
  });

  it('generates ZIP successfully (happy path, no search)', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([baseEquipo()]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(mockArchiverFinalize).toHaveBeenCalled();
  });

  it('uses empresaId fallback for tenantId', async () => {
    jwt.verify.mockReturnValue({ empresaId: 7, clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([baseEquipo({ tenantEmpresaId: 7 })]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(mockArchiverFinalize).toHaveBeenCalled();
  });

  it('uses default tenantId=1 when neither tenantEmpresaId nor empresaId exist', async () => {
    jwt.verify.mockReturnValue({ clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([baseEquipo()]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(mockArchiverFinalize).toHaveBeenCalled();
  });

  it('uses empresaId as fallback for clienteId in decoded token', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, empresaId: 15 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([baseEquipo()]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(mockPrisma.equipoCliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clienteId: 15 }) })
    );
  });

  it('applies searchTerm filter when provided', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }, { equipoId: 200 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([baseEquipo()]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token', searchTerm: 'AAA111' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(mockPrisma.equipo.findMany).toHaveBeenCalled();
  });

  it('returns 500 on error, skips response if headers sent', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('crash'); });

    const req = mockReq({ body: { token: 'some-token' } });
    const res = mockRes();
    res.headersSent = true;
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected error when headers not sent', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockRejectedValue(new Error('DB fail'));

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Error interno');
  });

  it('limits equipos to 200', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5 });
    const manyAsignaciones = Array.from({ length: 250 }, (_, i) => ({ equipoId: i + 1 }));
    mockPrisma.equipoCliente.findMany.mockResolvedValue(manyAsignaciones);
    mockPrisma.equipo.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    const equipoFindCall = mockPrisma.equipo.findMany.mock.calls[0][0];
    expect(equipoFindCall.where.id.in).toHaveLength(200);
  });

  it('handles searchTerm with pipe-separated values', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany
      .mockResolvedValueOnce([baseEquipo()])
      .mockResolvedValueOnce([baseEquipo()]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token', searchTerm: 'AAA111|BBB222' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(mockPrisma.equipo.findMany).toHaveBeenCalled();
  });

  it('returns 404 when search yields no results', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token', searchTerm: 'NONEXISTENT' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('handles empty token string', async () => {
    const req = mockReq({ body: { token: '' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('handles decoded token with both clienteId and empresaId (clienteId takes priority)', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5, empresaId: 99 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([baseEquipo()]);
    mockPrisma.chofer.findUnique.mockResolvedValue(baseChofer());
    mockPrisma.camion.findUnique.mockResolvedValue(baseCamion());
    mockPrisma.acoplado.findUnique.mockResolvedValue(baseAcoplado());
    mockPrisma.document.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(mockPrisma.equipoCliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clienteId: 5 }) })
    );
  });

  it('searchTerm with only empty segments after split (all blank)', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([{ equipoId: 100 }]);
    mockPrisma.equipo.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token', searchTerm: '|||' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('sorts equipo IDs from getEquiposClienteParaDescarga without searchTerm', async () => {
    jwt.verify.mockReturnValue({ tenantEmpresaId: 1, clienteId: 5 });
    mockPrisma.equipoCliente.findMany.mockResolvedValue([
      { equipoId: 300 },
      { equipoId: 100 },
      { equipoId: 200 },
    ]);
    mockPrisma.equipo.findMany.mockResolvedValue([]);

    const req = mockReq({ body: { token: 'valid-token' } });
    const res = mockRes();
    await PortalClienteController.bulkDownloadForm(req, res);
    const equipoFindCall = mockPrisma.equipo.findMany.mock.calls[0][0];
    expect(equipoFindCall.where.id.in).toEqual([100, 200, 300]);
  });
});
