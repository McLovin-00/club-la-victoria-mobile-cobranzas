/**
 * @jest-environment node
 */

const mockPrisma = {
  document: { findUnique: jest.fn() },
  chofer: { findUnique: jest.fn() },
  camion: { findUnique: jest.fn() },
  acoplado: { findUnique: jest.fn() },
  empresaTransportista: { findUnique: jest.fn() },
};

jest.mock('../src/config/database', () => ({
  db: { getClient: () => mockPrisma },
  prisma: mockPrisma,
}));
jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../src/services/equipo-evaluation.service', () => ({
  EquipoEvaluationService: {
    buscarEquiposPorEntidad: jest.fn().mockResolvedValue([]),
    evaluarEquipos: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('../src/services/internal-notification.service', () => ({
  InternalNotificationService: { create: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../src/services/user-notification-resolver.service', () => ({
  UserNotificationResolverService: {
    resolveFromEntity: jest.fn().mockResolvedValue([]),
    resolveFromEquipo: jest.fn().mockResolvedValue([]),
  },
}));

import { DocumentEventHandlers } from '../src/services/document-event-handlers.service';
import { EquipoEvaluationService } from '../src/services/equipo-evaluation.service';
import { InternalNotificationService } from '../src/services/internal-notification.service';
import { UserNotificationResolverService } from '../src/services/user-notification-resolver.service';
import { AppLogger } from '../src/config/logger';

const mockResolveFromEntity = UserNotificationResolverService.resolveFromEntity as jest.Mock;
const mockResolveFromEquipo = UserNotificationResolverService.resolveFromEquipo as jest.Mock;
const mockBuscarEquipos = EquipoEvaluationService.buscarEquiposPorEntidad as jest.Mock;
const mockEvaluarEquipos = EquipoEvaluationService.evaluarEquipos as jest.Mock;
const mockNotifCreate = InternalNotificationService.create as jest.Mock;

function makeRecipient(overrides: Record<string, unknown> = {}) {
  return {
    userId: 10,
    email: 'user@test.com',
    role: 'chofer',
    nombre: 'Juan',
    apellido: 'Perez',
    reason: 'direct' as const,
    ...overrides,
  };
}

function makeDocRow(overrides: Record<string, unknown> = {}) {
  return {
    tenantEmpresaId: 1,
    dadorCargaId: 2,
    entityType: 'CHOFER',
    entityId: 100,
    template: { name: 'DNI' },
    ...overrides,
  };
}

function setupDocFound(docOverrides: Record<string, unknown> = {}, entityData?: unknown) {
  const doc = makeDocRow(docOverrides);
  mockPrisma.document.findUnique.mockResolvedValue(doc);

  if (doc.entityType === 'CHOFER') {
    mockPrisma.chofer.findUnique.mockResolvedValue(
      entityData ?? { dniNorm: '12345678', nombre: 'Juan', apellido: 'Perez' },
    );
  } else if (doc.entityType === 'CAMION') {
    mockPrisma.camion.findUnique.mockResolvedValue(entityData ?? { patenteNorm: 'AB123CD' });
  } else if (doc.entityType === 'ACOPLADO') {
    mockPrisma.acoplado.findUnique.mockResolvedValue(entityData ?? { patenteNorm: 'XY999ZZ' });
  } else if (doc.entityType === 'EMPRESA_TRANSPORTISTA') {
    mockPrisma.empresaTransportista.findUnique.mockResolvedValue(
      entityData ?? { razonSocial: 'Acme SA', cuit: '20-12345678-9' },
    );
  }
}

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// obtenerEntityIdentifier (module-level helper, tested indirectly)
// ---------------------------------------------------------------------------
describe('obtenerEntityIdentifier (via obtenerInfoDocumento)', () => {
  it('returns formatted name for CHOFER found', async () => {
    setupDocFound({ entityType: 'CHOFER', entityId: 1 });
    mockResolveFromEntity.mockResolvedValue([]);
    await DocumentEventHandlers.onDocumentApproved(1);
    expect(mockPrisma.chofer.findUnique).toHaveBeenCalled();
  });

  it('returns fallback when CHOFER not found', async () => {
    const doc = makeDocRow({ entityType: 'CHOFER' });
    mockPrisma.document.findUnique.mockResolvedValue(doc);
    mockPrisma.chofer.findUnique.mockResolvedValue(null);
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Chofer #100') }),
    );
  });

  it('returns patente for CAMION found', async () => {
    setupDocFound({ entityType: 'CAMION', entityId: 5 }, { patenteNorm: 'AB123CD' });
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('AB123CD') }),
    );
  });

  it('returns fallback when CAMION not found', async () => {
    const doc = makeDocRow({ entityType: 'CAMION', entityId: 5 });
    mockPrisma.document.findUnique.mockResolvedValue(doc);
    mockPrisma.camion.findUnique.mockResolvedValue(null);
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Camión #5') }),
    );
  });

  it('returns patente for ACOPLADO found', async () => {
    setupDocFound({ entityType: 'ACOPLADO', entityId: 8 }, { patenteNorm: 'XY999ZZ' });
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('XY999ZZ') }),
    );
  });

  it('returns fallback when ACOPLADO not found', async () => {
    const doc = makeDocRow({ entityType: 'ACOPLADO', entityId: 8 });
    mockPrisma.document.findUnique.mockResolvedValue(doc);
    mockPrisma.acoplado.findUnique.mockResolvedValue(null);
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Acoplado #8') }),
    );
  });

  it('returns razonSocial for EMPRESA_TRANSPORTISTA found', async () => {
    setupDocFound(
      { entityType: 'EMPRESA_TRANSPORTISTA', entityId: 3 },
      { razonSocial: 'Trans SA', cuit: '30-99999999-1' },
    );
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Trans SA (30-99999999-1)') }),
    );
  });

  it('returns fallback when EMPRESA_TRANSPORTISTA not found', async () => {
    const doc = makeDocRow({ entityType: 'EMPRESA_TRANSPORTISTA', entityId: 3 });
    mockPrisma.document.findUnique.mockResolvedValue(doc);
    mockPrisma.empresaTransportista.findUnique.mockResolvedValue(null);
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Empresa #3') }),
    );
  });

  it('returns generic fallback for unknown entityType', async () => {
    const doc = makeDocRow({ entityType: 'UNKNOWN_TYPE', entityId: 42 });
    mockPrisma.document.findUnique.mockResolvedValue(doc);
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Entidad #42') }),
    );
  });
});

// ---------------------------------------------------------------------------
// obtenerInfoDocumento
// ---------------------------------------------------------------------------
describe('obtenerInfoDocumento', () => {
  it('returns null when document not found (tested via early return)', async () => {
    mockPrisma.document.findUnique.mockResolvedValue(null);

    await DocumentEventHandlers.onDocumentApproved(999);

    expect(AppLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no encontrado'),
      expect.objectContaining({ documentId: 999 }),
    );
    expect(mockResolveFromEntity).not.toHaveBeenCalled();
  });

  it('uses template name when present', async () => {
    setupDocFound({ entityType: 'CHOFER' });
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('DNI') }),
    );
  });

  it('falls back to "Documento" when template is null', async () => {
    const doc = makeDocRow({ template: null });
    mockPrisma.document.findUnique.mockResolvedValue(doc);
    mockPrisma.chofer.findUnique.mockResolvedValue({ dniNorm: '1', nombre: 'A', apellido: 'B' });
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Documento') }),
    );
  });
});

// ---------------------------------------------------------------------------
// getTituloContextualizado (tested indirectly via notification title)
// ---------------------------------------------------------------------------
describe('getTituloContextualizado', () => {
  beforeEach(() => {
    setupDocFound({ entityType: 'CHOFER' });
  });

  it('reason=direct returns base title unchanged', async () => {
    mockResolveFromEntity.mockResolvedValue([makeRecipient({ reason: 'direct' })]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Documento aprobado' }),
    );
  });

  it('reason=transportista_of_chofer appends "(de tu chofer)"', async () => {
    mockResolveFromEntity.mockResolvedValue([
      makeRecipient({ reason: 'transportista_of_chofer' }),
    ]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Documento aprobado (de tu chofer)' }),
    );
  });

  it('reason=dador_of_transportista appends entityLabel for CHOFER', async () => {
    mockResolveFromEntity.mockResolvedValue([
      makeRecipient({ reason: 'dador_of_transportista' }),
    ]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Documento aprobado (de tu chofer)' }),
    );
  });

  it('reason=dador_of_transportista uses correct entityLabel for CAMION', async () => {
    setupDocFound({ entityType: 'CAMION', entityId: 5 }, { patenteNorm: 'AA111BB' });
    mockResolveFromEntity.mockResolvedValue([
      makeRecipient({ reason: 'dador_of_transportista' }),
    ]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Documento aprobado (de un camión de tu flota)' }),
    );
  });

  it('reason=dador_of_transportista uses correct entityLabel for ACOPLADO', async () => {
    setupDocFound({ entityType: 'ACOPLADO', entityId: 8 }, { patenteNorm: 'CC222DD' });
    mockResolveFromEntity.mockResolvedValue([
      makeRecipient({ reason: 'dador_of_transportista' }),
    ]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Documento aprobado (de un acoplado de tu flota)' }),
    );
  });

  it('reason=dador_of_transportista uses correct entityLabel for EMPRESA_TRANSPORTISTA', async () => {
    setupDocFound(
      { entityType: 'EMPRESA_TRANSPORTISTA', entityId: 3 },
      { razonSocial: 'X SA', cuit: '20-1-1' },
    );
    mockResolveFromEntity.mockResolvedValue([
      makeRecipient({ reason: 'dador_of_transportista' }),
    ]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Documento aprobado (de tu empresa transportista)',
      }),
    );
  });

  it('reason=dador_of_transportista uses "una entidad" for unknown entityType', async () => {
    const doc = makeDocRow({ entityType: 'OTRO', entityId: 9 });
    mockPrisma.document.findUnique.mockResolvedValue(doc);
    mockResolveFromEntity.mockResolvedValue([
      makeRecipient({ reason: 'dador_of_transportista' }),
    ]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Documento aprobado (de una entidad)' }),
    );
  });

  it('reason=dador_of_chofer appends entity label', async () => {
    mockResolveFromEntity.mockResolvedValue([makeRecipient({ reason: 'dador_of_chofer' })]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Documento aprobado (de tu chofer)' }),
    );
  });

  it('reason=admin_interno prepends [Admin]', async () => {
    mockResolveFromEntity.mockResolvedValue([makeRecipient({ reason: 'admin_interno' })]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: '[Admin] Documento aprobado' }),
    );
  });

  it('unknown reason returns base title', async () => {
    mockResolveFromEntity.mockResolvedValue([
      makeRecipient({ reason: 'some_other_reason' }),
    ]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Documento aprobado' }),
    );
  });
});

// ---------------------------------------------------------------------------
// onDocumentApproved
// ---------------------------------------------------------------------------
describe('onDocumentApproved', () => {
  it('returns early when document not found', async () => {
    mockPrisma.document.findUnique.mockResolvedValue(null);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockResolveFromEntity).not.toHaveBeenCalled();
  });

  it('skips notification creation when no recipients', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).not.toHaveBeenCalled();
  });

  it('creates DOCUMENT_APPROVED notification per recipient', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([
      makeRecipient({ userId: 10 }),
      makeRecipient({ userId: 20, reason: 'admin_interno' }),
    ]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledTimes(2);
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DOCUMENT_APPROVED', userId: 10 }),
    );
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DOCUMENT_APPROVED', userId: 20 }),
    );
  });

  it('re-evaluates equipos and notifies COMPLETO', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 50 }, { id: 51 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 50, estadoNuevo: 'COMPLETO', cambio: true },
      { equipoId: 51, estadoNuevo: 'COMPLETO', cambio: false },
    ]);
    mockResolveFromEquipo.mockResolvedValue([makeRecipient({ userId: 30 })]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockEvaluarEquipos).toHaveBeenCalledWith([50, 51]);
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EQUIPO_COMPLETE', equipoId: 50 }),
    );
    expect(mockNotifCreate).toHaveBeenCalledTimes(1);
  });

  it('does not notify when equipo state is not COMPLETO', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 50 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 50, estadoNuevo: 'DOCUMENTACION_INCOMPLETA', cambio: true },
    ]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).not.toHaveBeenCalled();
  });

  it('catches and logs errors', async () => {
    mockPrisma.document.findUnique.mockRejectedValue(new Error('db fail'));

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(AppLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error procesando evento de documento aprobado'),
      expect.any(Error),
    );
  });
});

// ---------------------------------------------------------------------------
// onDocumentRejected
// ---------------------------------------------------------------------------
describe('onDocumentRejected', () => {
  it('returns early when document not found', async () => {
    mockPrisma.document.findUnique.mockResolvedValue(null);

    await DocumentEventHandlers.onDocumentRejected(1, 'bad quality');

    expect(mockResolveFromEntity).not.toHaveBeenCalled();
  });

  it('creates rejection notification with reason', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentRejected(1, 'Imagen borrosa');

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DOCUMENT_REJECTED',
        message: expect.stringContaining('Imagen borrosa'),
        priority: 'high',
      }),
    );
  });

  it('creates rejection notification without reason', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentRejected(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DOCUMENT_REJECTED',
        message: expect.not.stringContaining(':'),
      }),
    );
  });

  it('evaluates equipos and notifies DOCUMENTACION_INCOMPLETA', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 60 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 60, estadoNuevo: 'DOCUMENTACION_INCOMPLETA', cambio: true },
    ]);
    mockResolveFromEquipo.mockResolvedValue([makeRecipient({ userId: 40 })]);

    await DocumentEventHandlers.onDocumentRejected(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EQUIPO_INCOMPLETE', equipoId: 60 }),
    );
  });

  it('skips equipo notification when no equipos affected', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([]);

    await DocumentEventHandlers.onDocumentRejected(1);

    expect(mockEvaluarEquipos).not.toHaveBeenCalled();
  });

  it('skips equipo notification when no state change', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 60 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 60, estadoNuevo: 'DOCUMENTACION_INCOMPLETA', cambio: false },
    ]);

    await DocumentEventHandlers.onDocumentRejected(1);

    expect(mockResolveFromEquipo).not.toHaveBeenCalled();
  });

  it('catches and logs errors', async () => {
    mockPrisma.document.findUnique.mockRejectedValue(new Error('db fail'));

    await DocumentEventHandlers.onDocumentRejected(1);

    expect(AppLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error procesando evento de documento rechazado'),
      expect.any(Error),
    );
  });
});

// ---------------------------------------------------------------------------
// onDocumentExpired
// ---------------------------------------------------------------------------
describe('onDocumentExpired', () => {
  it('returns early when document not found', async () => {
    mockPrisma.document.findUnique.mockResolvedValue(null);

    await DocumentEventHandlers.onDocumentExpired(1);

    expect(mockResolveFromEntity).not.toHaveBeenCalled();
  });

  it('creates DOCUMENT_EXPIRED notifications with urgent priority', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentExpired(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DOCUMENT_EXPIRED',
        priority: 'urgent',
      }),
    );
  });

  it('evaluates equipos and notifies DOCUMENTACION_VENCIDA', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 70 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 70, estadoNuevo: 'DOCUMENTACION_VENCIDA', cambio: true },
    ]);
    mockResolveFromEquipo.mockResolvedValue([makeRecipient({ userId: 50 })]);

    await DocumentEventHandlers.onDocumentExpired(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EQUIPO_BLOQUEADO',
        priority: 'urgent',
        equipoId: 70,
      }),
    );
  });

  it('does not notify equipo when estado is not DOCUMENTACION_VENCIDA', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 70 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 70, estadoNuevo: 'COMPLETO', cambio: true },
    ]);

    await DocumentEventHandlers.onDocumentExpired(1);

    expect(mockResolveFromEquipo).not.toHaveBeenCalled();
  });

  it('does not notify equipo when cambio is false', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 70 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 70, estadoNuevo: 'DOCUMENTACION_VENCIDA', cambio: false },
    ]);

    await DocumentEventHandlers.onDocumentExpired(1);

    expect(mockResolveFromEquipo).not.toHaveBeenCalled();
  });

  it('skips equipo evaluation when no equipos found', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([]);

    await DocumentEventHandlers.onDocumentExpired(1);

    expect(mockEvaluarEquipos).not.toHaveBeenCalled();
  });

  it('catches and logs errors', async () => {
    mockPrisma.document.findUnique.mockRejectedValue(new Error('db fail'));

    await DocumentEventHandlers.onDocumentExpired(1);

    expect(AppLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error procesando evento de documento vencido'),
      expect.any(Error),
    );
  });
});

// ---------------------------------------------------------------------------
// onDocumentExpiringSoon
// ---------------------------------------------------------------------------
describe('onDocumentExpiringSoon', () => {
  it('returns early when document not found', async () => {
    mockPrisma.document.findUnique.mockResolvedValue(null);

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 5);

    expect(mockResolveFromEntity).not.toHaveBeenCalled();
  });

  it('sends urgent notification when daysUntilExpiry <= 3', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 2);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DOCUMENT_EXPIRING_URGENT',
        priority: 'urgent',
        title: expect.stringContaining('🔴'),
      }),
    );
  });

  it('sends normal notification when daysUntilExpiry > 7', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 14);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DOCUMENT_EXPIRING',
        priority: 'normal',
        title: expect.stringContaining('🟠'),
      }),
    );
  });

  it('sends high priority when daysUntilExpiry is 4-7', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 5);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DOCUMENT_EXPIRING',
        priority: 'high',
      }),
    );
  });

  it('sends exactly 3 days as urgent', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 3);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DOCUMENT_EXPIRING_URGENT',
        priority: 'urgent',
      }),
    );
  });

  it('message uses singular "día" when daysUntilExpiry is 1', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('vence en 1 día'),
      }),
    );
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.not.stringContaining('días'),
      }),
    );
  });

  it('message uses plural "días" when daysUntilExpiry > 1', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 10);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('vence en 10 días'),
      }),
    );
  });

  it('re-evaluates equipos when affected', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 80 }]);
    mockEvaluarEquipos.mockResolvedValue([]);

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 5);

    expect(mockEvaluarEquipos).toHaveBeenCalledWith([80]);
  });

  it('skips equipo evaluation when no equipos', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([]);

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 5);

    expect(mockEvaluarEquipos).not.toHaveBeenCalled();
  });

  it('catches and logs errors', async () => {
    mockPrisma.document.findUnique.mockRejectedValue(new Error('db fail'));

    await DocumentEventHandlers.onDocumentExpiringSoon(1, 5);

    expect(AppLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error procesando evento de documento por vencer'),
      expect.any(Error),
    );
  });
});

// ---------------------------------------------------------------------------
// onDocumentStatusChange
// ---------------------------------------------------------------------------
describe('onDocumentStatusChange', () => {
  beforeEach(() => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
  });

  it('delegates to onDocumentApproved for APROBADO', async () => {
    const spy = jest.spyOn(DocumentEventHandlers, 'onDocumentApproved');

    await DocumentEventHandlers.onDocumentStatusChange(1, 'PENDIENTE' as any, 'APROBADO' as any);

    expect(spy).toHaveBeenCalledWith(1);
    spy.mockRestore();
  });

  it('delegates to onDocumentRejected for RECHAZADO with reason', async () => {
    const spy = jest.spyOn(DocumentEventHandlers, 'onDocumentRejected');

    await DocumentEventHandlers.onDocumentStatusChange(
      1, 'PENDIENTE' as any, 'RECHAZADO' as any, 'bad quality',
    );

    expect(spy).toHaveBeenCalledWith(1, 'bad quality');
    spy.mockRestore();
  });

  it('delegates to onDocumentExpired for VENCIDO', async () => {
    const spy = jest.spyOn(DocumentEventHandlers, 'onDocumentExpired');

    await DocumentEventHandlers.onDocumentStatusChange(1, 'APROBADO' as any, 'VENCIDO' as any);

    expect(spy).toHaveBeenCalledWith(1);
    spy.mockRestore();
  });

  it('does nothing for unknown status', async () => {
    const spyApproved = jest.spyOn(DocumentEventHandlers, 'onDocumentApproved');
    const spyRejected = jest.spyOn(DocumentEventHandlers, 'onDocumentRejected');
    const spyExpired = jest.spyOn(DocumentEventHandlers, 'onDocumentExpired');

    await DocumentEventHandlers.onDocumentStatusChange(
      1, 'PENDIENTE' as any, 'PENDIENTE' as any,
    );

    expect(spyApproved).not.toHaveBeenCalled();
    expect(spyRejected).not.toHaveBeenCalled();
    expect(spyExpired).not.toHaveBeenCalled();

    spyApproved.mockRestore();
    spyRejected.mockRestore();
    spyExpired.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// getPriorityByDays (private, tested indirectly via onDocumentExpiringSoon)
// ---------------------------------------------------------------------------
describe('getPriorityByDays', () => {
  beforeEach(() => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);
  });

  it('returns urgent when isUrgent is true (days <= 3)', async () => {
    await DocumentEventHandlers.onDocumentExpiringSoon(1, 1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'urgent' }),
    );
  });

  it('returns high when days <= 7 and not urgent', async () => {
    await DocumentEventHandlers.onDocumentExpiringSoon(1, 7);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'high' }),
    );
  });

  it('returns normal when days > 7', async () => {
    await DocumentEventHandlers.onDocumentExpiringSoon(1, 8);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'normal' }),
    );
  });
});

// ---------------------------------------------------------------------------
// CHOFER name edge cases
// ---------------------------------------------------------------------------
describe('CHOFER name formatting edge cases', () => {
  it('handles chofer with null nombre and apellido', async () => {
    setupDocFound({ entityType: 'CHOFER', entityId: 1 }, { dniNorm: '99999', nombre: null, apellido: null });
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('(99999)') }),
    );
  });

  it('handles chofer with empty strings for nombre/apellido', async () => {
    setupDocFound({ entityType: 'CHOFER', entityId: 1 }, { dniNorm: '88888', nombre: '', apellido: '' });
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('(88888)') }),
    );
  });
});

// ---------------------------------------------------------------------------
// Metadata and link verification
// ---------------------------------------------------------------------------
describe('notification metadata and links', () => {
  it('approved notification includes correct metadata and link', async () => {
    setupDocFound();
    const recipient = makeRecipient({ role: 'transportista', reason: 'transportista_of_chofer' });
    mockResolveFromEntity.mockResolvedValue([recipient]);

    await DocumentEventHandlers.onDocumentApproved(42);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        link: '/documentos/documentos/42',
        documentId: 42,
        metadata: expect.objectContaining({
          entityType: 'CHOFER',
          entityId: 100,
          recipientRole: 'transportista',
          reason: 'transportista_of_chofer',
        }),
      }),
    );
  });

  it('rejected notification includes reason in metadata', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentRejected(10, 'foto ilegible');

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'foto ilegible' }),
      }),
    );
  });

  it('expiring notification includes daysUntilExpiry in metadata', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentExpiringSoon(10, 5);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ daysUntilExpiry: 5 }),
      }),
    );
  });

  it('equipo complete notification links to equipo page', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 99 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 99, estadoNuevo: 'COMPLETO', cambio: true },
    ]);
    mockResolveFromEquipo.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentApproved(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        link: '/documentos/equipos/99',
        equipoId: 99,
      }),
    );
  });

  it('equipo incompleto notification links to equipo page', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 77 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 77, estadoNuevo: 'DOCUMENTACION_INCOMPLETA', cambio: true },
    ]);
    mockResolveFromEquipo.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentRejected(1);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        link: '/documentos/equipos/77',
        equipoId: 77,
      }),
    );
  });

  it('equipo bloqueado notification includes documentId in metadata', async () => {
    setupDocFound();
    mockResolveFromEntity.mockResolvedValue([]);
    mockBuscarEquipos.mockResolvedValue([{ id: 88 }]);
    mockEvaluarEquipos.mockResolvedValue([
      { equipoId: 88, estadoNuevo: 'DOCUMENTACION_VENCIDA', cambio: true },
    ]);
    mockResolveFromEquipo.mockResolvedValue([makeRecipient()]);

    await DocumentEventHandlers.onDocumentExpired(5);

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ equipoId: 88, documentId: 5 }),
      }),
    );
  });
});
