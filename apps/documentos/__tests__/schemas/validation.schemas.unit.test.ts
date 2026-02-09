import { z } from 'zod';

import * as schemas from '../../src/schemas/validation.schemas';
import { auditLogsQuerySchema } from '../../src/schemas/audit.schemas';

describe('schemas smoke + transformations', () => {
  it('auditLogsQuerySchema: should preprocess numbers + apply defaults', () => {
    const parsed = auditLogsQuerySchema.parse({
      query: { page: '2', limit: '10', userId: '5', statusCode: '200', method: 'GET', entityId: '9' },
    });
    expect(parsed.query.page).toBe(2);
    expect(parsed.query.limit).toBe(10);
    expect(parsed.query.userId).toBe(5);
    expect(parsed.query.statusCode).toBe(200);
    expect(parsed.query.method).toBe('GET');
    expect(parsed.query.entityId).toBe(9);
  });

  it('updateTemplateSchema: should transform param id to number', () => {
    const parsed = schemas.updateTemplateSchema.parse({
      params: { id: '123' },
      body: { name: ' DNI ', active: true },
    });
    expect(parsed.params.id).toBe(123);
    expect(parsed.body.name).toBe('DNI');
    expect(parsed.body.active).toBe(true);
  });

  it('getTemplatesSchema: should transform active query string to boolean', () => {
    const parsed = schemas.getTemplatesSchema.parse({
      query: { active: 'true', entityType: 'CHOFER' },
    });
    expect(parsed.query.active).toBe(true);
    expect(parsed.query.entityType).toBe('CHOFER');
  });

  it('getTemplateByIdSchema / updateEmpresaConfigSchema / getEmpresaConfigSchema transforms ids', () => {
    expect(schemas.getTemplateByIdSchema.parse({ params: { id: '7' } }).params.id).toBe(7);
    expect(
      schemas.updateEmpresaConfigSchema.parse({ params: { empresaId: '9' }, body: { enabled: true, templateIds: [1] } }).params.empresaId
    ).toBe(9);
    expect(schemas.getEmpresaConfigSchema.parse({ params: { empresaId: '11' } }).params.empresaId).toBe(11);
  });

  it('uploadDocumentSchema: should coerce numeric fields + parse planilla JSON when string', () => {
    const parsed = schemas.uploadDocumentSchema.parse({
      body: {
        templateId: '1',
        entityType: 'CHOFER',
        entityId: '2',
        dadorCargaId: 3,
        confirmNewVersion: 'true',
        planilla: JSON.stringify({ foo: 'bar' }),
      },
    });
    expect(parsed.body.templateId).toBe(1);
    expect(parsed.body.entityId).toBe(2);
    expect(parsed.body.dadorCargaId).toBe(3);
    expect(parsed.body.confirmNewVersion).toBe(true);
    expect((parsed.body as any).planilla).toEqual(expect.objectContaining({ foo: 'bar' }));
  });

  it('uploadDocumentSchema: should swallow invalid planilla JSON and return {}', () => {
    const parsed = schemas.uploadDocumentSchema.parse({
      body: {
        templateId: '1',
        entityType: 'CHOFER',
        entityId: '2',
        dadorCargaId: 3,
        planilla: '{not-json',
      },
    });
    expect((parsed.body as any).planilla).toEqual({});
  });

  it('schemas export should compile (sanity)', () => {
    // Touch a few exports to ensure they are loaded/initialized.
    expect(schemas.createTemplateSchema).toBeInstanceOf(z.ZodType);
    expect(schemas.uploadDocumentSchema).toBeInstanceOf(z.ZodType);
  });

  it('should parse a broad set of request shapes (coverage for transforms/defaults)', () => {
    expect(
      schemas.getDocumentStatusSchema.parse({
        query: { dadorCargaId: '1', entityType: 'CHOFER', entityId: '2', status: 'APROBADO', page: '2', limit: '200' },
      }).query
    ).toEqual(expect.objectContaining({ dadorCargaId: 1, entityId: 2, page: 2, limit: 100 }));

    expect(
      schemas.getDocumentsByDadorSchema.parse({
        params: { dadorId: '10' },
        query: { status: 'PENDIENTE_APROBACION', page: '3', limit: '150' },
      }).params.dadorId
    ).toBe(10);

    expect(
      schemas.healthCheckSchema.parse({ query: { detailed: 'true' } }).query.detailed
    ).toBe(true);

    expect(
      schemas.updateClienteSchema.parse({ params: { id: '5' }, body: { razonSocial: 'XX' } }).params.id
    ).toBe(5);

    expect(
      schemas.updateDadorSchema.parse({ params: { id: '6' }, body: { razonSocial: 'XX' } }).params.id
    ).toBe(6);

    expect(
      schemas.updateDadorNotificationsSchema.parse({ params: { id: '7' }, body: { notificationsEnabled: true } }).params.id
    ).toBe(7);

    expect(
      schemas.updateEmpresaDocSchema.parse({ params: { id: '8' }, body: { templateIds: [1, 2], enabled: true } }).params.id
    ).toBe(8);

    expect(
      schemas.updateChoferSchema.parse({ params: { id: '9' }, body: { dni: '12.345.678' } }).params.id
    ).toBe(9);

    expect(
      schemas.updateCamionSchema.parse({ params: { id: '10' }, body: { patente: 'AA-123-BB' } }).params.id
    ).toBe(10);

    expect(
      schemas.updateAcopladoSchema.parse({ params: { id: '11' }, body: { patente: 'BB-999' } }).params.id
    ).toBe(11);

    expect(
      schemas.equipoAttachSchema.parse({ params: { id: '12' }, body: { driverId: 1 } }).params.id
    ).toBe(12);

    expect(
      schemas.equipoDetachSchema.parse({ params: { id: '13' }, body: { driver: true } }).params.id
    ).toBe(13);

    expect(
      schemas.equipoHistoryQuerySchema.parse({ params: { id: '1' }, query: { limit: '500' } }).query.limit
    ).toBe(100);

    expect(
      schemas.approveDocumentSchema.parse({
        params: { id: '1' },
        body: {
          confirmedEntityType: 'CHOFER',
          confirmedEntityId: '12345678',
          confirmedExpiration: new Date().toISOString(),
          confirmedTemplateId: 1,
        },
      }).params.id
    ).toBe(1);

    expect(
      schemas.rejectDocumentSchema.parse({ params: { id: '2' }, body: { reason: 'X' } }).params.id
    ).toBe(2);

    expect(
      schemas.pendingDocumentsQuerySchema.parse({ query: { page: '2', limit: '500' } }).query.limit
    ).toBe(100);

    expect(
      schemas.empresaTransportistaListQuerySchema.parse({ query: { page: '2', limit: '200', activo: 'true' } }).query.limit
    ).toBe(100);
  });

  it('covers list query transforms + refine error paths', () => {
    // empresaDocListQuerySchema: limit capped to 100
    expect(schemas.empresaDocListQuerySchema.parse({ query: { page: '2', limit: '999', q: 'x' } }).query.limit).toBe(100);

    // chofer/camion/acoplado list: numeric transforms and caps
    expect(schemas.choferListQuerySchema.parse({ query: { dadorCargaId: '2', page: '3', limit: '999' } }).query.limit).toBe(100);
    expect(schemas.camionListQuerySchema.parse({ query: { dadorCargaId: '2', page: '3', limit: '999' } }).query.limit).toBe(100);
    expect(schemas.acopladoListQuerySchema.parse({ query: { dadorCargaId: '2', page: '3', limit: '999' } }).query.limit).toBe(100);

    // pendingDocumentsQuerySchema: refine 0..1 boundaries
    expect(() => schemas.pendingDocumentsQuerySchema.parse({ query: { minConfidence: '2' } })).toThrow();
    expect(schemas.pendingDocumentsQuerySchema.parse({ query: { minConfidence: '0.5', maxConfidence: '1' } }).query.minConfidence).toBe(0.5);

    // equipoAttachSchema: refine must include at least one component
    expect(() => schemas.equipoAttachSchema.parse({ params: { id: '1' }, body: {} })).toThrow();
    // equipoDetachSchema: refine must include at least one flag
    expect(() => schemas.equipoDetachSchema.parse({ params: { id: '1' }, body: {} })).toThrow();
  });

  it('covers createEquipoSchema preprocess defaults and equipoListQuerySchema transform', () => {
    // trailerId/empresaTransportistaId preprocess can yield null which is invalid for z.number()
    expect(() =>
      schemas.createEquipoSchema.parse({
        body: {
          dadorCargaId: '1',
          driverId: '',
          truckId: null,
          trailerId: '',
          empresaTransportistaId: '',
          driverDni: '123456',
          truckPlate: 'AA123BB',
          validFrom: new Date().toISOString(),
        },
      })
    ).toThrow();

    const parsed = schemas.createEquipoSchema.parse({
      body: {
        dadorCargaId: '1',
        driverId: '',
        truckId: null,
        driverDni: '123456',
        truckPlate: 'AA123BB',
        validFrom: new Date().toISOString(),
      },
    });
    expect((parsed.body as any).driverId).toBe(0);
    expect((parsed.body as any).truckId).toBe(0);

    // equipoListQuerySchema: dadorCargaId from empresaId fallback, page/limit defaults
    const q = schemas.equipoListQuerySchema.parse({ query: { empresaId: '9' } }).query as any;
    expect(q.dadorCargaId).toBe(9);
    expect(q.page).toBe(1);
    expect(q.limit).toBe(20);
  });
});


