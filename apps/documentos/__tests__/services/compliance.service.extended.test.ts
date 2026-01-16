/**
 * Extended tests for compliance.service.ts
 * Focused on branch coverage for helper functions and edge cases
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
    prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
    AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { ComplianceService } from '../../src/services/compliance.service';

describe('ComplianceService - Extended Branch Coverage', () => {
    beforeEach(() => {
        resetPrismaMock();
        jest.clearAllMocks();
    });

    // ============================================================================
    // evaluateEquipoCliente (legado) tests
    // ============================================================================
    describe('evaluateEquipoCliente (legacy)', () => {
        it('should return empty array when equipo not found', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
            const result = await ComplianceService.evaluateEquipoCliente(999, 1);
            expect(result).toEqual([]);
        });

        it('should map detailed states to simple states correctly', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce({
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: 30, empresaTransportistaId: null
            } as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
                { templateId: 2, entityType: 'CAMION', obligatorio: false, diasAnticipacion: 10 },
            ] as never);

            // VIGENTE doc for CHOFER
            prismaMock.document.findFirst
                .mockResolvedValueOnce({
                    id: 1, status: 'APROBADO',
                    expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000) // 90 days ahead
                } as never)
                // VENCIDO doc for CAMION
                .mockResolvedValueOnce({
                    id: 2, status: 'APROBADO',
                    expiresAt: new Date(Date.now() - 24 * 3600 * 1000) // expired yesterday
                } as never);

            const result = await ComplianceService.evaluateEquipoCliente(1, 2);

            expect(result[0].state).toBe('OK'); // VIGENTE -> OK
            expect(result[1].state).toBe('FALTANTE'); // VENCIDO -> FALTANTE
        });

        it('should map PROXIMO state correctly', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce({
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            } as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 15 },
            ] as never);

            prismaMock.document.findFirst.mockResolvedValueOnce({
                id: 1, status: 'APROBADO',
                expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000) // 5 days ahead, within 15 day window
            } as never);

            const result = await ComplianceService.evaluateEquipoCliente(1, 2);
            expect(result[0].state).toBe('PROXIMO');
        });

        it('should map PENDIENTE and RECHAZADO to FALTANTE', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce({
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            } as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
                { templateId: 2, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            prismaMock.document.findFirst
                .mockResolvedValueOnce({ id: 1, status: 'PENDIENTE', expiresAt: null } as never)
                .mockResolvedValueOnce({ id: 2, status: 'RECHAZADO', expiresAt: null } as never);

            const result = await ComplianceService.evaluateEquipoCliente(1, 2);
            expect(result[0].state).toBe('FALTANTE'); // PENDIENTE -> FALTANTE
            expect(result[1].state).toBe('FALTANTE'); // RECHAZADO -> FALTANTE
        });
    });

    // ============================================================================
    // evaluateEquipoClienteDetailed tests for all document states
    // ============================================================================
    describe('evaluateEquipoClienteDetailed document states', () => {
        it('should return VIGENTE for approved doc with no expiration', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce({
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            } as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            prismaMock.document.findFirst.mockResolvedValueOnce({
                id: 1, status: 'APROBADO', expiresAt: null
            } as never);

            const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 2);
            expect(result[0].state).toBe('VIGENTE');
        });

        it('should return VENCIDO for document with status VENCIDO', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce({
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            } as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            prismaMock.document.findFirst.mockResolvedValueOnce({
                id: 1, status: 'VENCIDO', expiresAt: null
            } as never);

            const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 2);
            expect(result[0].state).toBe('VENCIDO');
        });

        it('should return PENDIENTE for documents in pending states', async () => {
            const pendingStatuses = ['PENDIENTE', 'VALIDANDO', 'CLASIFICANDO', 'PENDIENTE_APROBACION'];

            for (const status of pendingStatuses) {
                resetPrismaMock();

                prismaMock.equipo.findUnique.mockResolvedValueOnce({
                    id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                    driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
                } as never);

                prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                    { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
                ] as never);

                prismaMock.document.findFirst.mockResolvedValueOnce({
                    id: 1, status, expiresAt: null
                } as never);

                const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 2);
                expect(result[0].state).toBe('PENDIENTE');
            }
        });

        it('should return PENDIENTE for unknown status (fallback)', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce({
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            } as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            prismaMock.document.findFirst.mockResolvedValueOnce({
                id: 1, status: 'UNKNOWN_STATUS', expiresAt: null
            } as never);

            const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 2);
            expect(result[0].state).toBe('PENDIENTE');
        });
    });

    // ============================================================================
    // getEntityIdFromEquipo tests (via evaluateEquipoClienteDetailed)
    // ============================================================================
    describe('entity type resolution', () => {
        it('should handle EMPRESA_TRANSPORTISTA entity type', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce({
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: 50
            } as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { templateId: 1, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            prismaMock.document.findFirst.mockResolvedValueOnce({
                id: 1, status: 'APROBADO', expiresAt: null
            } as never);

            const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 2);
            expect(result[0].state).toBe('VIGENTE');
            expect(prismaMock.document.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ entityId: 50 })
            }));
        });

        it('should return FALTANTE for null empresaTransportistaId', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce({
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            } as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { templateId: 1, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 2);
            expect(result[0].state).toBe('FALTANTE');
        });

        it('should handle DADOR entity type (returns null -> FALTANTE)', async () => {
            prismaMock.equipo.findUnique.mockResolvedValueOnce({
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            } as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { templateId: 1, entityType: 'DADOR', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            const result = await ComplianceService.evaluateEquipoClienteDetailed(1, 2);
            expect(result[0].state).toBe('FALTANTE');
        });
    });

    // ============================================================================
    // evaluateBatchEquiposCliente tests
    // ============================================================================
    describe('evaluateBatchEquiposCliente', () => {
        it('should evaluate with specific clienteId parameter', async () => {
            // No need to mock equipoCliente since clienteId is provided
            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { clienteId: 5, templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10 },
            ] as never);

            prismaMock.document.findMany.mockResolvedValueOnce([
                {
                    id: 1, templateId: 1, entityType: 'CHOFER', entityId: 10,
                    tenantEmpresaId: 1, dadorCargaId: 2, status: 'APROBADO',
                    expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000)
                },
            ] as never);

            const equipos = [{
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            }];

            const result = await ComplianceService.evaluateBatchEquiposCliente(equipos as never, 5);
            const equipoResult = result.get(1);

            expect(equipoResult?.tieneVencidos).toBe(false);
            expect(equipoResult?.tieneFaltantes).toBe(false);
            expect(equipoResult?.tieneProximos).toBe(false);
            expect(equipoResult?.requirements[0].state).toBe('VIGENTE');
        });

        it('should consolidate requirements when multiple clientes have same template', async () => {
            prismaMock.equipoCliente.findMany.mockResolvedValueOnce([
                { equipoId: 1, clienteId: 10 },
                { equipoId: 1, clienteId: 20 },
            ] as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                // Same template, cliente 10 says optional, cliente 20 says obligatorio
                { clienteId: 10, templateId: 1, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5 },
                { clienteId: 20, templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 15 },
            ] as never);

            prismaMock.document.findMany.mockResolvedValueOnce([
                {
                    id: 1, templateId: 1, entityType: 'CHOFER', entityId: 10,
                    tenantEmpresaId: 1, dadorCargaId: 2, status: 'APROBADO',
                    expiresAt: new Date(Date.now() + 10 * 24 * 3600 * 1000) // 10 days
                },
            ] as never);

            const equipos = [{
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            }];

            const result = await ComplianceService.evaluateBatchEquiposCliente(equipos as never);
            const equipoResult = result.get(1);

            // Should use obligatorio=true and diasAnticipacion=15 (consolidated)
            expect(equipoResult?.requirements[0].obligatorio).toBe(true);
            expect(equipoResult?.requirements[0].diasAnticipacion).toBe(15);
            expect(equipoResult?.requirements[0].state).toBe('PROXIMO'); // 10 days left, 15 day window
        });

        it('should set tieneVencidos flag correctly', async () => {
            prismaMock.equipoCliente.findMany.mockResolvedValueOnce([
                { equipoId: 1, clienteId: 10 },
            ] as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { clienteId: 10, templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            prismaMock.document.findMany.mockResolvedValueOnce([
                {
                    id: 1, templateId: 1, entityType: 'CHOFER', entityId: 10,
                    tenantEmpresaId: 1, dadorCargaId: 2, status: 'APROBADO',
                    expiresAt: new Date(Date.now() - 24 * 3600 * 1000) // Expired yesterday
                },
            ] as never);

            const equipos = [{
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            }];

            const result = await ComplianceService.evaluateBatchEquiposCliente(equipos as never);
            const equipoResult = result.get(1);

            expect(equipoResult?.tieneVencidos).toBe(true);
            expect(equipoResult?.requirements[0].state).toBe('VENCIDO');
        });

        it('should set tieneFaltantes flag for RECHAZADO documents', async () => {
            prismaMock.equipoCliente.findMany.mockResolvedValueOnce([
                { equipoId: 1, clienteId: 10 },
            ] as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { clienteId: 10, templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            prismaMock.document.findMany.mockResolvedValueOnce([
                {
                    id: 1, templateId: 1, entityType: 'CHOFER', entityId: 10,
                    tenantEmpresaId: 1, dadorCargaId: 2, status: 'RECHAZADO',
                    expiresAt: null
                },
            ] as never);

            const equipos = [{
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            }];

            const result = await ComplianceService.evaluateBatchEquiposCliente(equipos as never);
            const equipoResult = result.get(1);

            expect(equipoResult?.tieneFaltantes).toBe(true);
            expect(equipoResult?.requirements[0].state).toBe('RECHAZADO');
        });

        it('should handle equipos without any cliente assignments', async () => {
            prismaMock.equipoCliente.findMany.mockResolvedValueOnce([] as never);
            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([] as never);

            const equipos = [{
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null
            }];

            const result = await ComplianceService.evaluateBatchEquiposCliente(equipos as never);
            const equipoResult = result.get(1);

            expect(equipoResult?.requirements).toEqual([]);
            expect(equipoResult?.tieneVencidos).toBe(false);
        });

        it('should collect all entity types from equipos', async () => {
            prismaMock.equipoCliente.findMany.mockResolvedValueOnce([
                { equipoId: 1, clienteId: 10 },
            ] as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { clienteId: 10, templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
                { clienteId: 10, templateId: 2, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5 },
                { clienteId: 10, templateId: 3, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 5 },
                { clienteId: 10, templateId: 4, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            prismaMock.document.findMany.mockResolvedValueOnce([
                { id: 1, templateId: 1, entityType: 'CHOFER', entityId: 10, tenantEmpresaId: 1, dadorCargaId: 2, status: 'APROBADO', expiresAt: null },
                { id: 2, templateId: 2, entityType: 'CAMION', entityId: 20, tenantEmpresaId: 1, dadorCargaId: 2, status: 'APROBADO', expiresAt: null },
                { id: 3, templateId: 3, entityType: 'ACOPLADO', entityId: 30, tenantEmpresaId: 1, dadorCargaId: 2, status: 'APROBADO', expiresAt: null },
                { id: 4, templateId: 4, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 40, tenantEmpresaId: 1, dadorCargaId: 2, status: 'APROBADO', expiresAt: null },
            ] as never);

            const equipos = [{
                id: 1, tenantEmpresaId: 1, dadorCargaId: 2,
                driverId: 10, truckId: 20, trailerId: 30, empresaTransportistaId: 40
            }];

            const result = await ComplianceService.evaluateBatchEquiposCliente(equipos as never);
            const equipoResult = result.get(1);

            expect(equipoResult?.requirements).toHaveLength(4);
            expect(equipoResult?.requirements.every(r => r.state === 'VIGENTE')).toBe(true);
        });

        it('should handle multiple equipos in batch', async () => {
            prismaMock.equipoCliente.findMany.mockResolvedValueOnce([
                { equipoId: 1, clienteId: 10 },
                { equipoId: 2, clienteId: 10 },
            ] as never);

            prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
                { clienteId: 10, templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5 },
            ] as never);

            prismaMock.document.findMany.mockResolvedValueOnce([
                { id: 1, templateId: 1, entityType: 'CHOFER', entityId: 10, tenantEmpresaId: 1, dadorCargaId: 2, status: 'APROBADO', expiresAt: null },
                // No document for driver 11
            ] as never);

            const equipos = [
                { id: 1, tenantEmpresaId: 1, dadorCargaId: 2, driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null },
                { id: 2, tenantEmpresaId: 1, dadorCargaId: 2, driverId: 11, truckId: 21, trailerId: null, empresaTransportistaId: null },
            ];

            const result = await ComplianceService.evaluateBatchEquiposCliente(equipos as never);

            expect(result.get(1)?.requirements[0].state).toBe('VIGENTE');
            expect(result.get(2)?.requirements[0].state).toBe('FALTANTE'); // No doc for driver 11
        });
    });
});
