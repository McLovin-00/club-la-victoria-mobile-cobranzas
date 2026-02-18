/**
 * Proposito: utilidades de datos mock para tests E2E de remitos.
 */

export interface MockRemito {
  id: number;
  createdAt: string;
  updatedAt: string;
  numeroRemito: string | null;
  fechaOperacion: string | null;
  emisorNombre: string | null;
  emisorDetalle: string | null;
  clienteNombre: string | null;
  producto: string | null;
  transportistaNombre: string | null;
  choferNombre: string | null;
  choferDni: string | null;
  patenteChasis: string | null;
  patenteAcoplado: string | null;
  pesoOrigenBruto: number | null;
  pesoOrigenTara: number | null;
  pesoOrigenNeto: number | null;
  pesoDestinoBruto: number | null;
  pesoDestinoTara: number | null;
  pesoDestinoNeto: number | null;
  tieneTicketDestino: boolean;
  equipoId: number | null;
  choferId: number | null;
  dadorCargaId: number;
  tenantEmpresaId: number;
  choferCargadorDni: string | null;
  choferCargadorNombre: string | null;
  choferCargadorApellido: string | null;
  estado: RemitoEstado;
  cargadoPorUserId: number;
  cargadoPorRol: string;
  aprobadoPorUserId: number | null;
  aprobadoAt: string | null;
  rechazadoPorUserId: number | null;
  rechazadoAt: string | null;
  motivoRechazo: string | null;
  confianzaIA: number | null;
  camposDetectados: string[];
  erroresAnalisis: string[];
  analizadoAt: string | null;
  imagenes: Array<{
    id: number;
    remitoId: number;
    bucketName: string;
    objectKey: string;
    fileName: string;
    mimeType: string;
    size: number;
    tipo: 'REMITO_PRINCIPAL';
    orden: number;
    procesadoPorIA: boolean;
    createdAt: string;
    url?: string;
  }>;
}

export function createMockRemito(overrides: Partial<MockRemito> = {}): MockRemito {
  const now = new Date().toISOString();
  const id = overrides.id ?? 9_001;

  return {
    id,
    createdAt: now,
    updatedAt: now,
    numeroRemito: `REM-${id}`,
    fechaOperacion: now,
    emisorNombre: 'Emisor QA',
    emisorDetalle: 'Detalle QA',
    clienteNombre: 'Cliente QA',
    producto: 'Producto QA',
    transportistaNombre: 'Transportista QA',
    choferNombre: 'Chofer QA',
    choferDni: '12345678',
    patenteChasis: 'AA123BB',
    patenteAcoplado: 'AC456DD',
    pesoOrigenBruto: 30_000,
    pesoOrigenTara: 10_000,
    pesoOrigenNeto: 20_000,
    pesoDestinoBruto: 29_500,
    pesoDestinoTara: 10_000,
    pesoDestinoNeto: 19_500,
    tieneTicketDestino: true,
    equipoId: null,
    choferId: null,
    dadorCargaId: 1,
    tenantEmpresaId: 1,
    choferCargadorDni: '12345678',
    choferCargadorNombre: 'Chofer',
    choferCargadorApellido: 'QA',
    estado: 'PENDIENTE_APROBACION',
    cargadoPorUserId: 1,
    cargadoPorRol: 'DADOR_DE_CARGA',
    aprobadoPorUserId: null,
    aprobadoAt: null,
    rechazadoPorUserId: null,
    rechazadoAt: null,
    motivoRechazo: null,
    confianzaIA: 92,
    camposDetectados: ['numeroRemito', 'fechaOperacion'],
    erroresAnalisis: [],
    analizadoAt: now,
    imagenes: [
      {
        id: id * 10,
        remitoId: id,
        bucketName: 'mock',
        objectKey: 'mock/remito.jpg',
        fileName: 'remito.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        tipo: 'REMITO_PRINCIPAL',
        orden: 0,
        procesadoPorIA: true,
        createdAt: now,
        url: 'https://example.com/remito.jpg',
      },
    ],
    ...overrides,
  };
}

export type RemitoEstado =
  | 'PENDIENTE_ANALISIS'
  | 'EN_ANALISIS'
  | 'PENDIENTE_APROBACION'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'ERROR_ANALISIS';

export function createRemitosResponse(remitos: MockRemito[]) {
  const pendientes = remitos.filter((r) => r.estado === 'PENDIENTE_APROBACION').length;
  const aprobados = remitos.filter((r) => r.estado === 'APROBADO').length;
  const rechazados = remitos.filter((r) => r.estado === 'RECHAZADO').length;

  return {
    success: true,
    data: remitos,
    pagination: {
      page: 1,
      limit: 20,
      total: remitos.length,
      pages: 1,
    },
    stats: {
      total: remitos.length,
      pendientes,
      aprobados,
      rechazados,
    },
  };
}
