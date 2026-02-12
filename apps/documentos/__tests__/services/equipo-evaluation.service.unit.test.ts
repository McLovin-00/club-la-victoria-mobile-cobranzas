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

import { EquipoEvaluationService } from '../../src/services/equipo-evaluation.service';

describe('EquipoEvaluationService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('evaluarEquipo', () => {
    it('retorna null si equipo no es encontrado', async () => {
      prismaMock.equipo.findUnique.mockResolvedValueOnce(null);

      const result = await EquipoEvaluationService.evaluarEquipo(999);

      expect(result).toBeNull();
    });

    it('evalúa equipo y determina estado COMPLETO cuando tiene documentos vigentes', async () => {
      const equipoId = 1;
      const now = new Date();
      const futuro = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 días

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'DOCUMENTACION_INCOMPLETA',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: 20,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: 'AA123BB',
        trailerPlateNorm: null,
      } as any);

      // Mock obtenerEntidadesEquipo
      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: 20,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: 'AA123BB',
        trailerPlateNorm: null,
      } as any);

      // Mock obtenerTemplatesRequeridos
      prismaMock.documentTemplate.findMany
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]) // para CHOFER
        .mockResolvedValueOnce([{ id: 3 }, { id: 4 }]); // para CAMION

      // Mock contarDocumentos
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: futuro,
          uploadedAt: now,
        },
        {
          id: 2,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 2,
          status: 'APROBADO',
          expiresAt: futuro,
          uploadedAt: now,
        },
        {
          id: 3,
          entityType: 'CAMION',
          entityId: 20,
          templateId: 3,
          status: 'APROBADO',
          expiresAt: futuro,
          uploadedAt: now,
        },
        {
          id: 4,
          entityType: 'CAMION',
          entityId: 20,
          templateId: 4,
          status: 'APROBADO',
          expiresAt: futuro,
          uploadedAt: now,
        },
      ] as any);

      // Mock actualización del equipo
      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result).not.toBeNull();
      expect(result?.estadoAnterior).toBe('DOCUMENTACION_INCOMPLETA');
      expect(result?.estadoNuevo).toBe('COMPLETO');
      expect(result?.cambio).toBe(true);
      expect(result?.detalles.vigentes).toBe(4);
      expect(result?.detalles.totalDocumentos).toBe(4);
    });

    it('determina estado DOCUMENTACION_VENCIDA cuando hay documentos vencidos', async () => {
      const equipoId = 1;
      const now = new Date();
      const pasado = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 días atrás

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: pasado,
          uploadedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
        },
      ] as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'DOCUMENTACION_VENCIDA',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.estadoNuevo).toBe('DOCUMENTACION_VENCIDA');
      expect(result?.detalles.vencidos).toBe(1);
    });

    it('determina estado DOCUMENTACION_INCOMPLETA cuando hay documentos rechazados', async () => {
      const equipoId = 1;
      const now = new Date();

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'RECHAZADO',
          expiresAt: null,
          uploadedAt: now,
        },
      ] as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'DOCUMENTACION_INCOMPLETA',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.estadoNuevo).toBe('DOCUMENTACION_INCOMPLETA');
      expect(result?.detalles.rechazados).toBe(1);
    });

    it('determina estado DOCUMENTACION_POR_VENCER cuando hay documentos próximos a vencer (< 30 días)', async () => {
      const equipoId = 1;
      const now = new Date();
      const proximoAVencer = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 días

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: proximoAVencer,
          uploadedAt: now,
        },
      ] as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'DOCUMENTACION_POR_VENCER',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.estadoNuevo).toBe('DOCUMENTACION_POR_VENCER');
      expect(result?.detalles.porVencer).toBe(1);
    });

    it('no actualiza si estado no cambia', async () => {
      const equipoId = 1;
      const now = new Date();
      const futuro = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO', // mismo estado
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: futuro,
          uploadedAt: now,
        },
      ] as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.cambio).toBe(false);
      // Aún debe llamarse para actualizar timestamp
      expect(prismaMock.equipo.update).toHaveBeenCalled();
    });

    it('maneja equipos con múltiples entidades (chofer, camión, acoplado, empresa)', async () => {
      const equipoId = 1;
      const now = new Date();
      const futuro = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'DOCUMENTACION_INCOMPLETA',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: 20,
        trailerId: 30,
        empresaTransportistaId: 40,
        driverDniNorm: '12345678',
        truckPlateNorm: 'AA123BB',
        trailerPlateNorm: 'CC456DD',
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: 20,
        trailerId: 30,
        empresaTransportistaId: 40,
        driverDniNorm: '12345678',
        truckPlateNorm: 'AA123BB',
        trailerPlateNorm: 'CC456DD',
      } as any);

      // Templates for each entity type
      prismaMock.documentTemplate.findMany
        .mockResolvedValueOnce([{ id: 1 }]) // CHOFER
        .mockResolvedValueOnce([{ id: 2 }]) // CAMION
        .mockResolvedValueOnce([{ id: 3 }]) // ACOPLADO
        .mockResolvedValueOnce([{ id: 4 }]); // EMPRESA_TRANSPORTISTA

      // Mock empresa transportista query
      prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({
        id: 40,
        cuit: '20123456789',
      } as any);

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: futuro,
          uploadedAt: now,
        },
        {
          id: 2,
          entityType: 'CAMION',
          entityId: 20,
          templateId: 2,
          status: 'APROBADO',
          expiresAt: futuro,
          uploadedAt: now,
        },
        {
          id: 3,
          entityType: 'ACOPLADO',
          entityId: 30,
          templateId: 3,
          status: 'APROBADO',
          expiresAt: futuro,
          uploadedAt: now,
        },
        {
          id: 4,
          entityType: 'EMPRESA_TRANSPORTISTA',
          entityId: 40,
          templateId: 4,
          status: 'APROBADO',
          expiresAt: futuro,
          uploadedAt: now,
        },
      ] as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.detalles.entidadesEvaluadas).toHaveLength(4);
      expect(result?.detalles.entidadesEvaluadas.some(e => e.entityType === 'CHOFER')).toBe(true);
      expect(result?.detalles.entidadesEvaluadas.some(e => e.entityType === 'CAMION')).toBe(true);
      expect(result?.detalles.entidadesEvaluadas.some(e => e.entityType === 'ACOPLADO')).toBe(true);
      expect(result?.detalles.entidadesEvaluadas.some(e => e.entityType === 'EMPRESA_TRANSPORTISTA')).toBe(true);
    });
  });

  describe('evaluarEquipos', () => {
    it('evalúa múltiples equipos en batch', async () => {
      const equipoIds = [1, 2, 3];
      const now = new Date();
      const futuro = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      // Para cada equipo
      for (let i = 0; i < equipoIds.length; i++) {
        prismaMock.equipo.findUnique.mockResolvedValueOnce({
          id: equipoIds[i],
          estadoDocumental: 'COMPLETO',
          dadorCargaId: 2,
          tenantEmpresaId: 1,
          driverId: 10 + i,
          truckId: null,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: `1234567${i}`,
          truckPlateNorm: null,
          trailerPlateNorm: null,
        } as any);

        prismaMock.equipo.findUnique.mockResolvedValueOnce({
          dadorCargaId: 2,
          tenantEmpresaId: 1,
          driverId: 10 + i,
          truckId: null,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: `1234567${i}`,
          truckPlateNorm: null,
          trailerPlateNorm: null,
        } as any);

        prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);
        prismaMock.document.findMany.mockResolvedValueOnce([
          {
            id: i,
            entityType: 'CHOFER',
            entityId: 10 + i,
            templateId: 1,
            status: 'APROBADO',
            expiresAt: futuro,
            uploadedAt: now,
          },
        ] as any);

        prismaMock.equipo.update.mockResolvedValueOnce({
          id: equipoIds[i],
          estadoDocumental: 'COMPLETO',
        } as any);
      }

      const results = await EquipoEvaluationService.evaluarEquipos(equipoIds);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.cambio === false)).toBe(true);
    });

    it('retorna array vacío si todos los equipos no existen', async () => {
      const equipoIds = [999, 998];

      prismaMock.equipo.findUnique.mockResolvedValue(null);

      const results = await EquipoEvaluationService.evaluarEquipos(equipoIds);

      expect(results).toHaveLength(0);
    });
  });

  describe('buscarEquiposPorEntidad', () => {
    it('busca equipos por chofer', async () => {
      prismaMock.equipo.findMany.mockResolvedValueOnce([
        { id: 1 },
        { id: 2 },
      ] as any);

      const result = await EquipoEvaluationService.buscarEquiposPorEntidad(1, 2, 'CHOFER', 10);

      expect(result).toHaveLength(2);
      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          dadorCargaId: 2,
          activo: true,
          driverId: 10,
        },
        select: { id: true },
      });
    });

    it('busca equipos por camión', async () => {
      prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 3 }] as any);

      const result = await EquipoEvaluationService.buscarEquiposPorEntidad(1, 2, 'CAMION', 20);

      expect(result).toHaveLength(1);
      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          dadorCargaId: 2,
          activo: true,
          truckId: 20,
        },
        select: { id: true },
      });
    });

    it('busca equipos por acoplado', async () => {
      prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 4 }] as any);

      const result = await EquipoEvaluationService.buscarEquiposPorEntidad(1, 2, 'ACOPLADO', 30);

      expect(result).toHaveLength(1);
      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          dadorCargaId: 2,
          activo: true,
          trailerId: 30,
        },
        select: { id: true },
      });
    });

    it('busca equipos por empresa transportista', async () => {
      prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 5 }] as any);

      const result = await EquipoEvaluationService.buscarEquiposPorEntidad(1, 2, 'EMPRESA_TRANSPORTISTA', 40);

      expect(result).toHaveLength(1);
      expect(prismaMock.equipo.findMany).toHaveBeenCalledWith({
        where: {
          tenantEmpresaId: 1,
          dadorCargaId: 2,
          activo: true,
          empresaTransportistaId: 40,
        },
        select: { id: true },
      });
    });

    it('retorna array vacío para tipo de entidad desconocido', async () => {
      const result = await EquipoEvaluationService.buscarEquiposPorEntidad(1, 2, 'UNKNOWN' as any, 99);

      expect(result).toHaveLength(0);
      expect(prismaMock.equipo.findMany).not.toHaveBeenCalled();
    });
  });

  describe('reevaluarPorDocumento', () => {
    it('re-evalúa equipos afectados por cambio en documento', async () => {
      const documentId = 1;
      const now = new Date();
      const futuro = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      // Mock obtener documento
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: documentId,
        entityType: 'CHOFER',
        entityId: 10,
        tenantEmpresaId: 1,
        dadorCargaId: 2,
      } as any);

      // Mock buscar equipos
      prismaMock.equipo.findMany.mockResolvedValueOnce([
        { id: 1 },
        { id: 2 },
      ] as any);

      // Mock evaluaciones de equipos
      for (let i = 0; i < 2; i++) {
        prismaMock.equipo.findUnique.mockResolvedValueOnce({
          id: i + 1,
          estadoDocumental: 'COMPLETO',
          dadorCargaId: 2,
          tenantEmpresaId: 1,
          driverId: 10,
          truckId: null,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: '12345678',
          truckPlateNorm: null,
          trailerPlateNorm: null,
        } as any);

        prismaMock.equipo.findUnique.mockResolvedValueOnce({
          dadorCargaId: 2,
          tenantEmpresaId: 1,
          driverId: 10,
          truckId: null,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: '12345678',
          truckPlateNorm: null,
          trailerPlateNorm: null,
        } as any);

        prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);
        prismaMock.document.findMany.mockResolvedValueOnce([
          {
            id: documentId,
            entityType: 'CHOFER',
            entityId: 10,
            templateId: 1,
            status: 'APROBADO',
            expiresAt: futuro,
            uploadedAt: now,
          },
        ] as any);

        prismaMock.equipo.update.mockResolvedValueOnce({
          id: i + 1,
          estadoDocumental: 'COMPLETO',
        } as any);
      }

      const results = await EquipoEvaluationService.reevaluarPorDocumento(documentId);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.equipoId)).toBe(true);
    });

    it('retorna array vacío si documento no existe', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);

      const result = await EquipoEvaluationService.reevaluarPorDocumento(999);

      expect(result).toHaveLength(0);
    });
  });

  describe('evaluarTodosEquipos', () => {
    it('evalúa todos los equipos de un tenant', async () => {
      const tenantId = 1;
      const now = new Date();
      const futuro = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const pasado = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      // Mock obtener todos los equipos
      prismaMock.equipo.findMany.mockResolvedValueOnce([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ] as any);

      // Mock evaluaciones de cada equipo
      for (let i = 0; i < 3; i++) {
        const hadVencido = i === 1; // Equipo 2 tendrá un documento vencido

        prismaMock.equipo.findUnique.mockResolvedValueOnce({
          id: i + 1,
          estadoDocumental: hadVencido ? 'COMPLETO' : 'COMPLETO', // Antes está completo
          dadorCargaId: 2,
          tenantEmpresaId: tenantId,
          driverId: 10 + i,
          truckId: null,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: `1234567${i}`,
          truckPlateNorm: null,
          trailerPlateNorm: null,
        } as any);

        prismaMock.equipo.findUnique.mockResolvedValueOnce({
          dadorCargaId: 2,
          tenantEmpresaId: tenantId,
          driverId: 10 + i,
          truckId: null,
          trailerId: null,
          empresaTransportistaId: null,
          driverDniNorm: `1234567${i}`,
          truckPlateNorm: null,
          trailerPlateNorm: null,
        } as any);

        prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);
        prismaMock.document.findMany.mockResolvedValueOnce([
          {
            id: i,
            entityType: 'CHOFER',
            entityId: 10 + i,
            templateId: 1,
            status: 'APROBADO',
            expiresAt: hadVencido ? pasado : futuro, // Equipo 2 tiene doc vencido
            uploadedAt: now,
          },
        ] as any);

        // Equipo 2 cambia de COMPLETO a DOCUMENTACION_VENCIDA
        const newState = hadVencido ? 'DOCUMENTACION_VENCIDA' : 'COMPLETO';
        prismaMock.equipo.update.mockResolvedValueOnce({
          id: i + 1,
          estadoDocumental: newState,
        } as any);
      }

      const result = await EquipoEvaluationService.evaluarTodosEquipos(tenantId);

      expect(result.evaluados).toBe(3);
      expect(result.actualizados).toBe(1); // Solo el equipo 2 cambió (a vencido)
    });
  });

  describe('Edge Cases', () => {
    it('maneja documentos sin expiración', async () => {
      const equipoId = 1;
      const now = new Date();

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);

      // Documento sin expiración
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: null,
          uploadedAt: now,
        },
      ] as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.detalles.vigentes).toBe(1);
      expect(result?.detalles.vencidos).toBe(0);
    });

    it('maneja estado PENDIENTE_APROBACION', async () => {
      const equipoId = 1;
      const now = new Date();

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'PENDIENTE_APROBACION',
          expiresAt: null,
          uploadedAt: now,
        },
      ] as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'PENDIENTE_VALIDACION',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.estadoNuevo).toBe('PENDIENTE_VALIDACION');
      expect(result?.detalles.pendientes).toBe(1);
    });

    it('prioriza vencidos sobre incompletos', async () => {
      const equipoId = 1;
      const now = new Date();
      const pasado = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

      // Un documento vencido y uno rechazado - debe priorizar vencido
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: pasado,
          uploadedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
        },
        {
          id: 2,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 2,
          status: 'RECHAZADO',
          expiresAt: null,
          uploadedAt: now,
        },
      ] as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'DOCUMENTACION_VENCIDA',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      // Debe retornar VENCIDA, no INCOMPLETA
      expect(result?.estadoNuevo).toBe('DOCUMENTACION_VENCIDA');
    });

    it('determina estado DOCUMENTACION_INCOMPLETA cuando solo hay faltantes sin documentos', async () => {
      const equipoId = 1;

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

      // Sin documentos - todos faltantes
      prismaMock.document.findMany.mockResolvedValueOnce([]);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'DOCUMENTACION_INCOMPLETA',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.estadoNuevo).toBe('DOCUMENTACION_INCOMPLETA');
      expect(result?.detalles.faltantes).toBe(2);
    });

    it('determina estado PENDIENTE_VALIDACION cuando hay documentos pendientes', async () => {
      const equipoId = 1;
      const now = new Date();

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'COMPLETO',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: '12345678',
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          entityType: 'CHOFER',
          entityId: 10,
          templateId: 1,
          status: 'VALIDANDO',
          expiresAt: null,
          uploadedAt: now,
        },
      ] as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'PENDIENTE_VALIDACION',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.estadoNuevo).toBe('PENDIENTE_VALIDACION');
      expect(result?.detalles.pendientes).toBe(1);
    });

    it('maneja equipo sin entidades asignadas', async () => {
      const equipoId = 1;

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'DOCUMENTACION_INCOMPLETA',
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: null,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: null,
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        dadorCargaId: 2,
        tenantEmpresaId: 1,
        driverId: null,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        driverDniNorm: null,
        truckPlateNorm: null,
        trailerPlateNorm: null,
      } as any);

      // Sin templates porque no hay entidades
      prismaMock.equipo.update.mockResolvedValueOnce({
        id: equipoId,
        estadoDocumental: 'DOCUMENTACION_INCOMPLETA',
      } as any);

      const result = await EquipoEvaluationService.evaluarEquipo(equipoId);

      expect(result?.estadoNuevo).toBe('DOCUMENTACION_INCOMPLETA');
    });
  });
});
