/**
 * @jest-environment node
 */

process.env.REMITOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

jest.mock('../src/config/database', () => ({
  db: {
    getClient: jest.fn().mockReturnValue({
      remito: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      remitoImagen: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      remitoHistory: {
        create: jest.fn(),
      },
    }),
  },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: {
    uploadRemitoImage: jest.fn().mockResolvedValue({ bucketName: 'test', objectKey: 'test.pdf' }),
    getObject: jest.fn(),
  },
}));

jest.mock('../src/services/queue.service', () => ({
  queueService: {
    addAnalysisJob: jest.fn().mockResolvedValue('job-1'),
  },
}));

import { RemitoService } from '../src/services/remito.service';
import { db } from '../src/config/database';
import { minioService } from '../src/services/minio.service';

const prisma = (db.getClient as jest.Mock)();

function makeRemito(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    tenantEmpresaId: 1,
    dadorCargaId: 1,
    cargadoPorUserId: 10,
    cargadoPorRol: 'CHOFER',
    estado: 'PENDIENTE_APROBACION',
    confianzaIA: 80,
    pesoDestinoBruto: null,
    pesoDestinoTara: null,
    pesoDestinoNeto: null,
    imagenes: [],
    historial: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// create
// ============================================================================
describe('RemitoService.create', () => {
  const baseInput = {
    tenantEmpresaId: 1,
    dadorCargaId: 2,
    cargadoPorUserId: 10,
    cargadoPorRol: 'CHOFER',
    choferId: 5,
    choferCargadorDni: '12345678',
    choferCargadorNombre: 'Juan',
    choferCargadorApellido: 'Perez',
  };

  const singleFile = {
    pdfBuffer: Buffer.from('pdf'),
    originalInputs: [{ buffer: Buffer.from('img'), mimeType: 'image/jpeg', fileName: 'foto.jpg' }],
    fileName: 'remito.pdf',
  };

  it('creates remito with single image', async () => {
    const createdRemito = makeRemito({ id: 1 });
    const createdImagen = { id: 100, remitoId: 1, bucketName: 'test', objectKey: 'test.pdf' };

    prisma.remito.create.mockResolvedValue(createdRemito);
    prisma.remitoImagen.create.mockResolvedValue(createdImagen);
    prisma.remitoHistory.create.mockResolvedValue({});

    const result = await RemitoService.create(baseInput, singleFile);

    expect(result.remito).toEqual(createdRemito);
    expect(result.imagenes).toHaveLength(1);
    expect(prisma.remitoImagen.create).toHaveBeenCalledTimes(1);
  });

  it('creates remito with multiple originalInputs (uploads additional images)', async () => {
    const createdRemito = makeRemito({ id: 2 });
    const imgPrincipal = { id: 100, remitoId: 2, bucketName: 'test', objectKey: 'test.pdf' };
    const imgAdicional = { id: 101, remitoId: 2, bucketName: 'test', objectKey: 'orig.jpg' };

    prisma.remito.create.mockResolvedValue(createdRemito);
    prisma.remitoImagen.create
      .mockResolvedValueOnce(imgPrincipal)
      .mockResolvedValueOnce(imgAdicional);
    prisma.remitoHistory.create.mockResolvedValue({});

    const multiFile = {
      pdfBuffer: Buffer.from('pdf'),
      originalInputs: [
        { buffer: Buffer.from('img1'), mimeType: 'image/jpeg', fileName: 'foto1.jpg' },
        { buffer: Buffer.from('img2'), mimeType: 'image/png', fileName: 'foto2.png' },
      ],
      fileName: 'remito.pdf',
    };

    const result = await RemitoService.create(baseInput, multiFile);
    expect(result.imagenes).toHaveLength(2);
    expect(minioService.uploadRemitoImage).toHaveBeenCalledTimes(2);
  });

  it('creates remito with optional chofer fields as null when absent', async () => {
    const inputNoChofer = {
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      cargadoPorUserId: 10,
      cargadoPorRol: 'ADMIN_INTERNO',
    };
    const createdRemito = makeRemito({ id: 3 });
    prisma.remito.create.mockResolvedValue(createdRemito);
    prisma.remitoImagen.create.mockResolvedValue({ id: 200 });
    prisma.remitoHistory.create.mockResolvedValue({});

    await RemitoService.create(inputNoChofer, singleFile);

    const createCall = prisma.remito.create.mock.calls[0][0];
    expect(createCall.data.choferCargadorDni).toBeNull();
    expect(createCall.data.choferCargadorNombre).toBeNull();
    expect(createCall.data.choferCargadorApellido).toBeNull();
  });
});

// ============================================================================
// list
// ============================================================================
describe('RemitoService.list', () => {
  it('returns paginated items with stats (default page/limit)', async () => {
    prisma.remito.findMany.mockResolvedValue([makeRemito()]);
    prisma.remito.count.mockResolvedValue(1);
    prisma.remito.groupBy.mockResolvedValue([
      { estado: 'PENDIENTE_APROBACION', _count: { id: 1 } },
    ]);

    const result = await RemitoService.list({ tenantEmpresaId: 1 });

    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
    expect(result.stats.pendientes).toBe(1);
  });

  it('applies all filters including estado, fecha range, and numeroRemito', async () => {
    prisma.remito.findMany.mockResolvedValue([]);
    prisma.remito.count.mockResolvedValue(0);
    prisma.remito.groupBy.mockResolvedValue([]);

    await RemitoService.list({
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      estado: 'APROBADO',
      fechaDesde: new Date('2025-01-01'),
      fechaHasta: new Date('2025-12-31'),
      numeroRemito: '0012',
      page: 2,
      limit: 5,
    });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.estado).toBe('APROBADO');
    expect(findCall.where.dadorCargaId).toBe(2);
    expect(findCall.where.createdAt.gte).toEqual(new Date('2025-01-01'));
    expect(findCall.where.numeroRemito).toEqual({ contains: '0012', mode: 'insensitive' });
    expect(findCall.skip).toBe(5);
    expect(findCall.take).toBe(5);
  });

  it('caps limit at 100', async () => {
    prisma.remito.findMany.mockResolvedValue([]);
    prisma.remito.count.mockResolvedValue(0);
    prisma.remito.groupBy.mockResolvedValue([]);

    await RemitoService.list({ tenantEmpresaId: 1, limit: 500 });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.take).toBe(100);
  });

  it('restricts non-admin roles to own remitos via buildBaseWhere', async () => {
    prisma.remito.findMany.mockResolvedValue([]);
    prisma.remito.count.mockResolvedValue(0);
    prisma.remito.groupBy.mockResolvedValue([]);

    await RemitoService.list({ tenantEmpresaId: 1, userId: 99, userRole: 'CHOFER' });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.cargadoPorUserId).toBe(99);
  });

  it('does not restrict SUPERADMIN role', async () => {
    prisma.remito.findMany.mockResolvedValue([]);
    prisma.remito.count.mockResolvedValue(0);
    prisma.remito.groupBy.mockResolvedValue([]);

    await RemitoService.list({ tenantEmpresaId: 1, userId: 1, userRole: 'SUPERADMIN' });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.cargadoPorUserId).toBeUndefined();
  });

  it('does not restrict ADMIN_INTERNO role', async () => {
    prisma.remito.findMany.mockResolvedValue([]);
    prisma.remito.count.mockResolvedValue(0);
    prisma.remito.groupBy.mockResolvedValue([]);

    await RemitoService.list({ tenantEmpresaId: 1, userId: 1, userRole: 'ADMIN_INTERNO' });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.cargadoPorUserId).toBeUndefined();
  });

  it('calculateStatsFromGroup aggregates multiple states', async () => {
    prisma.remito.findMany.mockResolvedValue([]);
    prisma.remito.count.mockResolvedValue(0);
    prisma.remito.groupBy.mockResolvedValue([
      { estado: 'PENDIENTE_APROBACION', _count: { id: 10 } },
      { estado: 'APROBADO', _count: { id: 20 } },
      { estado: 'RECHAZADO', _count: { id: 5 } },
      { estado: 'EN_ANALISIS', _count: { id: 3 } },
    ]);

    const result = await RemitoService.list({ tenantEmpresaId: 1 });

    expect(result.stats.total).toBe(38);
    expect(result.stats.pendientes).toBe(10);
    expect(result.stats.aprobados).toBe(20);
    expect(result.stats.rechazados).toBe(5);
  });

  it('builds where with only fechaDesde', async () => {
    prisma.remito.findMany.mockResolvedValue([]);
    prisma.remito.count.mockResolvedValue(0);
    prisma.remito.groupBy.mockResolvedValue([]);

    await RemitoService.list({ tenantEmpresaId: 1, fechaDesde: new Date('2025-06-01') });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.createdAt.gte).toEqual(new Date('2025-06-01'));
    expect(findCall.where.createdAt.lte).toBeUndefined();
  });

  it('builds where with only fechaHasta', async () => {
    prisma.remito.findMany.mockResolvedValue([]);
    prisma.remito.count.mockResolvedValue(0);
    prisma.remito.groupBy.mockResolvedValue([]);

    await RemitoService.list({ tenantEmpresaId: 1, fechaHasta: new Date('2025-12-31') });

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.createdAt.lte).toEqual(new Date('2025-12-31'));
    expect(findCall.where.createdAt.gte).toBeUndefined();
  });
});

// ============================================================================
// getById
// ============================================================================
describe('RemitoService.getById', () => {
  it('returns null when remito not found', async () => {
    prisma.remito.findUnique.mockResolvedValue(null);
    const result = await RemitoService.getById(999);
    expect(result).toBeNull();
  });

  it('returns remito for SUPERADMIN regardless of owner', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ cargadoPorUserId: 50 }));
    const result = await RemitoService.getById(1, 1, 'SUPERADMIN');
    expect(result).not.toBeNull();
  });

  it('returns remito for ADMIN_INTERNO regardless of owner', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ cargadoPorUserId: 50 }));
    const result = await RemitoService.getById(1, 1, 'ADMIN_INTERNO');
    expect(result).not.toBeNull();
  });

  it('returns null for non-admin user who is not the owner', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ cargadoPorUserId: 50 }));
    const result = await RemitoService.getById(1, 99, 'CHOFER');
    expect(result).toBeNull();
  });

  it('returns remito for non-admin user who is the owner', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ cargadoPorUserId: 99 }));
    const result = await RemitoService.getById(1, 99, 'CHOFER');
    expect(result).not.toBeNull();
  });

  it('returns remito when no userRole is provided', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito());
    const result = await RemitoService.getById(1);
    expect(result).not.toBeNull();
  });
});

// ============================================================================
// updateFromAnalysis
// ============================================================================
describe('RemitoService.updateFromAnalysis', () => {
  it('updates remito with full analysis data', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: '0012-00026443',
      fechaOperacion: '17/05/2025',
      emisor: { nombre: 'RAIMUNDO', detalle: 'Cantera' },
      cliente: 'PROSIL',
      producto: 'ARENA',
      transportista: 'QUEBRACHO',
      chofer: { nombre: 'Juan', dni: '12345678' },
      patentes: { chasis: 'AG-492-LP', acoplado: 'AG-413-RI' },
      pesosOrigen: { bruto: 52300, tara: 16360, neto: 35940 },
      pesosDestino: { bruto: 51360, tara: 16540, neto: 34820 },
      confianza: 85,
      camposDetectados: ['numeroRemito'],
      errores: [],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.numeroRemito).toBe('0012-00026443');
    expect(updateCall.data.fechaOperacion).toBeInstanceOf(Date);
    expect(updateCall.data.emisorNombre).toBe('RAIMUNDO');
    expect(updateCall.data.emisorDetalle).toBe('Cantera');
    expect(updateCall.data.tieneTicketDestino).toBe(true);
    expect(updateCall.data.estado).toBe('PENDIENTE_APROBACION');
  });

  it('handles null pesosDestino (tieneTicketDestino = false)', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: null,
      fechaOperacion: null,
      emisor: { nombre: null, detalle: null },
      cliente: null,
      producto: null,
      transportista: null,
      chofer: { nombre: null, dni: null },
      patentes: { chasis: null, acoplado: null },
      pesosOrigen: { bruto: null, tara: null, neto: null },
      pesosDestino: null,
      confianza: 0,
      camposDetectados: [],
      errores: ['ilegible'],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.tieneTicketDestino).toBe(false);
    expect(updateCall.data.fechaOperacion).toBeNull();
  });

  it('parses ISO date format in fechaOperacion', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: null,
      fechaOperacion: '2025-05-17',
      emisor: { nombre: null, detalle: null },
      cliente: null,
      producto: null,
      transportista: null,
      chofer: { nombre: null, dni: null },
      patentes: { chasis: null, acoplado: null },
      pesosOrigen: { bruto: null, tara: null, neto: null },
      pesosDestino: null,
      confianza: 50,
      camposDetectados: [],
      errores: [],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.fechaOperacion).toBeInstanceOf(Date);
  });

  it('returns null for invalid date string', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: null,
      fechaOperacion: 'not-a-date',
      emisor: { nombre: null, detalle: null },
      cliente: null,
      producto: null,
      transportista: null,
      chofer: { nombre: null, dni: null },
      patentes: { chasis: null, acoplado: null },
      pesosOrigen: { bruto: null, tara: null, neto: null },
      pesosDestino: null,
      confianza: 0,
      camposDetectados: [],
      errores: [],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.fechaOperacion).toBeNull();
  });

  it('extractString handles object with nombre', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: null,
      fechaOperacion: null,
      emisor: { nombre: null, detalle: null },
      cliente: { nombre: 'ClienteCo' } as any,
      producto: { descripcion: 'Arena fina' } as any,
      transportista: { detalle: 'TransCo' } as any,
      chofer: { nombre: null, dni: null },
      patentes: { chasis: null, acoplado: null },
      pesosOrigen: { bruto: null, tara: null, neto: null },
      pesosDestino: null,
      confianza: 0,
      camposDetectados: [],
      errores: [],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.clienteNombre).toBe('ClienteCo');
    expect(updateCall.data.producto).toBe('Arena fina');
    expect(updateCall.data.transportistaNombre).toBe('TransCo');
  });

  it('extractString handles numeric value', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: null,
      fechaOperacion: null,
      emisor: { nombre: null, detalle: null },
      cliente: 12345 as any,
      producto: null,
      transportista: null,
      chofer: { nombre: null, dni: null },
      patentes: { chasis: null, acoplado: null },
      pesosOrigen: { bruto: null, tara: null, neto: null },
      pesosDestino: null,
      confianza: 0,
      camposDetectados: [],
      errores: [],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.clienteNombre).toBe('12345');
  });

  it('extractString handles object with no matching keys (falls back to first string value)', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: null,
      fechaOperacion: null,
      emisor: { nombre: null, detalle: null },
      cliente: { code: 123, label: 'FallbackString' } as any,
      producto: null,
      transportista: null,
      chofer: { nombre: null, dni: null },
      patentes: { chasis: null, acoplado: null },
      pesosOrigen: { bruto: null, tara: null, neto: null },
      pesosDestino: null,
      confianza: 0,
      camposDetectados: [],
      errores: [],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.clienteNombre).toBe('FallbackString');
  });

  it('extractString handles object with no string values at all', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: null,
      fechaOperacion: null,
      emisor: { nombre: null, detalle: null },
      cliente: { x: 1, y: 2 } as any,
      producto: null,
      transportista: null,
      chofer: { nombre: null, dni: null },
      patentes: { chasis: null, acoplado: null },
      pesosOrigen: { bruto: null, tara: null, neto: null },
      pesosDestino: null,
      confianza: 0,
      camposDetectados: [],
      errores: [],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.clienteNombre).toBeNull();
  });

  it('uses emisor as extractString fallback when emisor.nombre is missing', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: null,
      fechaOperacion: null,
      emisor: 'EmisorString' as any,
      cliente: null,
      producto: null,
      transportista: null,
      chofer: { nombre: null, dni: null },
      patentes: { chasis: null, acoplado: null },
      pesosOrigen: { bruto: null, tara: null, neto: null },
      pesosDestino: null,
      confianza: 0,
      camposDetectados: [],
      errores: [],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.emisorNombre).toBe('EmisorString');
  });

  it('uses chofer extractString fallback when chofer.nombre is missing', async () => {
    prisma.remito.update.mockResolvedValue(makeRemito());

    await RemitoService.updateFromAnalysis(1, {
      numeroRemito: null,
      fechaOperacion: null,
      emisor: { nombre: null, detalle: null },
      cliente: null,
      producto: null,
      transportista: null,
      chofer: 'ChoferString' as any,
      patentes: { chasis: null, acoplado: null },
      pesosOrigen: { bruto: null, tara: null, neto: null },
      pesosDestino: null,
      confianza: 0,
      camposDetectados: [],
      errores: [],
    });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.choferNombre).toBe('ChoferString');
  });
});

// ============================================================================
// updateManual
// ============================================================================
describe('RemitoService.updateManual', () => {
  it('throws when remito not found', async () => {
    prisma.remito.findUnique.mockResolvedValue(null);
    await expect(RemitoService.updateManual(999, 1, {})).rejects.toThrow('Remito no encontrado');
  });

  it('throws when remito is already approved', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'APROBADO' }));
    await expect(RemitoService.updateManual(1, 1, {})).rejects.toThrow('No se puede editar un remito aprobado');
  });

  it('updates with partial data (only some fields provided)', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION' }));
    prisma.remito.update.mockResolvedValue(makeRemito());
    prisma.remitoHistory.create.mockResolvedValue({});

    await RemitoService.updateManual(1, 10, { numeroRemito: 'REM-001' });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.numeroRemito).toBe('REM-001');
    expect(updateCall.data.confianzaIA).toBe(100);
  });

  it('parses DD/MM/YYYY date in fechaOperacion', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION' }));
    prisma.remito.update.mockResolvedValue(makeRemito());
    prisma.remitoHistory.create.mockResolvedValue({});

    await RemitoService.updateManual(1, 10, { fechaOperacion: '15/06/2025' });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.fechaOperacion).toBeInstanceOf(Date);
  });

  it('sets fechaOperacion to null when provided as null', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION' }));
    prisma.remito.update.mockResolvedValue(makeRemito());
    prisma.remitoHistory.create.mockResolvedValue({});

    await RemitoService.updateManual(1, 10, { fechaOperacion: null });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.fechaOperacion).toBeNull();
  });

  it('does not include fechaOperacion when not provided (undefined)', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION' }));
    prisma.remito.update.mockResolvedValue(makeRemito());
    prisma.remitoHistory.create.mockResolvedValue({});

    await RemitoService.updateManual(1, 10, { numeroRemito: 'X' });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('fechaOperacion');
  });

  it('sets tieneTicketDestino=true when any destino peso is non-null', async () => {
    prisma.remito.findUnique.mockResolvedValue(
      makeRemito({ estado: 'PENDIENTE_APROBACION', pesoDestinoBruto: null, pesoDestinoTara: null, pesoDestinoNeto: null })
    );
    prisma.remito.update.mockResolvedValue(makeRemito());
    prisma.remitoHistory.create.mockResolvedValue({});

    await RemitoService.updateManual(1, 10, { pesoDestinoBruto: 50000 });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.tieneTicketDestino).toBe(true);
  });

  it('sets tieneTicketDestino=false when all destino pesos are null', async () => {
    prisma.remito.findUnique.mockResolvedValue(
      makeRemito({ estado: 'PENDIENTE_APROBACION', pesoDestinoBruto: 100, pesoDestinoTara: null, pesoDestinoNeto: null })
    );
    prisma.remito.update.mockResolvedValue(makeRemito());
    prisma.remitoHistory.create.mockResolvedValue({});

    await RemitoService.updateManual(1, 10, { pesoDestinoBruto: null, pesoDestinoTara: null, pesoDestinoNeto: null });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.tieneTicketDestino).toBe(false);
  });

  it('does not set tieneTicketDestino when no destino pesos are provided', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION' }));
    prisma.remito.update.mockResolvedValue(makeRemito());
    prisma.remitoHistory.create.mockResolvedValue({});

    await RemitoService.updateManual(1, 10, { numeroRemito: 'ABC' });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.tieneTicketDestino).toBeUndefined();
  });

  it('uses existing destino values from DB when partially updating pesos', async () => {
    prisma.remito.findUnique.mockResolvedValue(
      makeRemito({ estado: 'PENDIENTE_APROBACION', pesoDestinoBruto: 50000, pesoDestinoTara: null, pesoDestinoNeto: null })
    );
    prisma.remito.update.mockResolvedValue(makeRemito());
    prisma.remitoHistory.create.mockResolvedValue({});

    await RemitoService.updateManual(1, 10, { pesoDestinoTara: 15000 });

    const updateCall = prisma.remito.update.mock.calls[0][0];
    expect(updateCall.data.tieneTicketDestino).toBe(true);
  });
});

// ============================================================================
// approve
// ============================================================================
describe('RemitoService.approve', () => {
  it('throws when remito not found', async () => {
    prisma.remito.findUnique.mockResolvedValue(null);
    await expect(RemitoService.approve(999, 1)).rejects.toThrow('Remito no encontrado');
  });

  it('throws when remito is not in PENDIENTE_APROBACION state', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_ANALISIS' }));
    await expect(RemitoService.approve(1, 1)).rejects.toThrow('No se puede aprobar un remito en estado PENDIENTE_ANALISIS');
  });

  it('throws when confianzaIA is below 30', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION', confianzaIA: 10 }));
    await expect(RemitoService.approve(1, 1)).rejects.toThrow('confianza IA');
  });

  it('allows approval when confianzaIA is null', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION', confianzaIA: null }));
    prisma.remito.update.mockResolvedValue(makeRemito({ estado: 'APROBADO' }));
    prisma.remitoHistory.create.mockResolvedValue({});

    const result = await RemitoService.approve(1, 10);
    expect(result.estado).toBe('APROBADO');
  });

  it('allows approval when confianzaIA >= 30', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION', confianzaIA: 30 }));
    prisma.remito.update.mockResolvedValue(makeRemito({ estado: 'APROBADO' }));
    prisma.remitoHistory.create.mockResolvedValue({});

    const result = await RemitoService.approve(1, 10);
    expect(result.estado).toBe('APROBADO');
  });

  it('allows approval when confianzaIA is high', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION', confianzaIA: 95 }));
    prisma.remito.update.mockResolvedValue(makeRemito({ estado: 'APROBADO' }));
    prisma.remitoHistory.create.mockResolvedValue({});

    const result = await RemitoService.approve(1, 10);
    expect(result.estado).toBe('APROBADO');
  });
});

// ============================================================================
// reject
// ============================================================================
describe('RemitoService.reject', () => {
  it('throws when remito not found', async () => {
    prisma.remito.findUnique.mockResolvedValue(null);
    await expect(RemitoService.reject(999, 1, 'motivo')).rejects.toThrow('Remito no encontrado');
  });

  it('throws when remito is in non-rejectable state (APROBADO)', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'APROBADO' }));
    await expect(RemitoService.reject(1, 1, 'motivo')).rejects.toThrow('No se puede rechazar un remito en estado APROBADO');
  });

  it('rejects remito in PENDIENTE_APROBACION state', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_APROBACION' }));
    prisma.remito.update.mockResolvedValue(makeRemito({ estado: 'RECHAZADO' }));
    prisma.remitoHistory.create.mockResolvedValue({});

    const result = await RemitoService.reject(1, 10, 'datos incorrectos');
    expect(result.estado).toBe('RECHAZADO');
  });

  it('rejects remito in EN_ANALISIS state', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'EN_ANALISIS' }));
    prisma.remito.update.mockResolvedValue(makeRemito({ estado: 'RECHAZADO' }));
    prisma.remitoHistory.create.mockResolvedValue({});

    const result = await RemitoService.reject(1, 10, 'no legible');
    expect(result.estado).toBe('RECHAZADO');
  });

  it('rejects remito in ERROR_ANALISIS state', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'ERROR_ANALISIS' }));
    prisma.remito.update.mockResolvedValue(makeRemito({ estado: 'RECHAZADO' }));
    prisma.remitoHistory.create.mockResolvedValue({});

    const result = await RemitoService.reject(1, 10, 'error');
    expect(result.estado).toBe('RECHAZADO');
  });
});

// ============================================================================
// getStats
// ============================================================================
describe('RemitoService.getStats', () => {
  it('returns stats without dadorCargaId', async () => {
    prisma.remito.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(10);

    const stats = await RemitoService.getStats(1);

    expect(stats).toEqual({ total: 100, pendientes: 40, aprobados: 50, rechazados: 10 });
    const firstCall = prisma.remito.count.mock.calls[0][0];
    expect(firstCall.where.dadorCargaId).toBeUndefined();
  });

  it('returns stats with dadorCargaId filter', async () => {
    prisma.remito.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5);

    const stats = await RemitoService.getStats(1, 7);

    expect(stats).toEqual({ total: 20, pendientes: 5, aprobados: 10, rechazados: 5 });
    const firstCall = prisma.remito.count.mock.calls[0][0];
    expect(firstCall.where.dadorCargaId).toBe(7);
  });
});

// ============================================================================
// reprocess
// ============================================================================
describe('RemitoService.reprocess', () => {
  it('throws when remito not found', async () => {
    prisma.remito.findUnique.mockResolvedValue(null);
    await expect(RemitoService.reprocess(999, 1)).rejects.toThrow('Remito no encontrado');
  });

  it('throws when remito is already approved', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'APROBADO', imagenes: [{ id: 1 }] }));
    await expect(RemitoService.reprocess(1, 1)).rejects.toThrow('No se puede reprocesar un remito aprobado');
  });

  it('throws when remito has no image', async () => {
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'ERROR_ANALISIS', imagenes: [] }));
    await expect(RemitoService.reprocess(1, 1)).rejects.toThrow('No se encontró imagen del remito');
  });

  it('reprocesses successfully', async () => {
    const imagen = { id: 100, bucketName: 'b', objectKey: 'k' };
    prisma.remito.findUnique.mockResolvedValue(makeRemito({ estado: 'ERROR_ANALISIS', imagenes: [imagen] }));
    prisma.remito.update.mockResolvedValue(makeRemito({ estado: 'PENDIENTE_ANALISIS' }));
    prisma.remitoHistory.create.mockResolvedValue({});

    const result = await RemitoService.reprocess(1, 10);

    expect(result.estado).toBe('PENDIENTE_ANALISIS');
    expect(result.jobId).toBe('job-1');
  });
});

// ============================================================================
// getSuggestions
// ============================================================================
describe('RemitoService.getSuggestions', () => {
  it('returns empty for short query (< 2 chars)', async () => {
    const result = await RemitoService.getSuggestions(1, 'cliente', 'a');
    expect(result).toEqual([]);
    expect(prisma.remito.findMany).not.toHaveBeenCalled();
  });

  it('returns empty for empty query', async () => {
    const result = await RemitoService.getSuggestions(1, 'cliente', '');
    expect(result).toEqual([]);
  });

  it('returns empty for whitespace-only query that trims to < 2 chars', async () => {
    const result = await RemitoService.getSuggestions(1, 'cliente', '  ');
    expect(result).toEqual([]);
  });

  it('returns empty for invalid field', async () => {
    const result = await RemitoService.getSuggestions(1, 'invalidField' as any, 'query');
    expect(result).toEqual([]);
  });

  it('returns suggestions for cliente field', async () => {
    prisma.remito.findMany.mockResolvedValue([
      { clienteNombre: 'PROSIL' },
      { clienteNombre: 'Pronto' },
    ]);

    const result = await RemitoService.getSuggestions(1, 'cliente', 'PRO');

    expect(result).toEqual(['PROSIL', 'Pronto']);
    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.where.clienteNombre.contains).toBe('PRO');
  });

  it('returns suggestions for transportista field', async () => {
    prisma.remito.findMany.mockResolvedValue([
      { transportistaNombre: 'Quebracho Blanco' },
    ]);

    const result = await RemitoService.getSuggestions(1, 'transportista', 'Queb');
    expect(result).toEqual(['Quebracho Blanco']);
  });

  it('returns suggestions for patente field', async () => {
    prisma.remito.findMany.mockResolvedValue([
      { patenteChasis: 'AG-492-LP' },
    ]);

    const result = await RemitoService.getSuggestions(1, 'patente', 'AG-4');
    expect(result).toEqual(['AG-492-LP']);
  });

  it('filters out null/empty values from suggestions', async () => {
    prisma.remito.findMany.mockResolvedValue([
      { clienteNombre: 'PROSIL' },
      { clienteNombre: null },
      { clienteNombre: '' },
    ]);

    const result = await RemitoService.getSuggestions(1, 'cliente', 'PRO');
    expect(result).toEqual(['PROSIL']);
  });

  it('respects custom limit', async () => {
    prisma.remito.findMany.mockResolvedValue([{ clienteNombre: 'A' }]);

    await RemitoService.getSuggestions(1, 'cliente', 'test', 5);

    const findCall = prisma.remito.findMany.mock.calls[0][0];
    expect(findCall.take).toBe(5);
  });
});
