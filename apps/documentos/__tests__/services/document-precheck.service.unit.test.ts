/**
 * Tests unitarios para DocumentPreCheckService
 * Cubre todos los métodos públicos con casos exitosos, errores y casos borde
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mocks del sistema
jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { DocumentPreCheckService } from '../../src/services/document-precheck.service';
import { AppLogger } from '../../src/config/logger';

describe('DocumentPreCheckService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Tests para preCheck - Entidad no existente
  // ============================================================================
  describe('preCheck - Entidad no existente', () => {
    it('debe retornar entidad no existente con documentación nueva requerida', async () => {
      // Arrange: Entidad que no existe
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      // Mock: Entidad no encontrada
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
      
      // Mock: Templates requeridos para CHOFER
      const templatesRequeridos = [
        { id: 1, name: 'Cédula de Identidad' },
        { id: 2, name: 'Certificado de Manejo' },
        { id: 3, name: 'Examen Médico' },
      ];
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce(templatesRequeridos as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      expect(resultado.entidades).toHaveLength(1);
      const entidad = resultado.entidades[0];
      expect(entidad.existe).toBe(false);
      expect(entidad.entityId).toBeNull();
      expect(entidad.documentos).toEqual([]);
      expect(entidad.resumen.total).toBe(3);
      expect(entidad.resumen.faltantes).toBe(3);
      expect(entidad.resumen.completo).toBe(false);
      expect(entidad.perteneceSolicitante).toBe(true);
      expect(entidad.requiereTransferencia).toBe(false);
      expect(resultado.hayEntidadesDeOtroDador).toBe(false);
    });

    it('debe normalizar identificador cuando entidad no existe', async () => {
      // Arrange: Identificador sin normalizar
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '1.234.567-8' }, // Con puntos y guión
        ],
      });

      // Assert - Debe estar normalizado (sin puntos, sin guiones, mayúscula)
      expect(resultado.entidades[0].identificador).toBe('12345678');
      
      // Verificar que se llamó con identificador normalizado
      expect(prismaMock.chofer.findFirst).toHaveBeenCalledWith({
        where: { tenantEmpresaId, dniNorm: '12345678' },
        select: expect.any(Object),
      });
    });
  });

  // ============================================================================
  // Tests para preCheck - Entidad existente (del solicitante)
  // ============================================================================
  describe('preCheck - Entidad existente del solicitante', () => {
    it('debe retornar entidad existente con documentos vigentes', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const entityId = 50;

      // Mock: Entidad encontrada (del solicitante)
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: entityId,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      // Mock: Dador nombre
      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador Carga',
      });

      // Mock: No está asignado a ningún equipo
      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      // Mock: Documentos vigentes
      const ahora = new Date();
      const fechaVence = new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 días
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: fechaVence,
          uploadedAt: new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000),
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Cédula de Identidad' },
        },
        {
          id: 101,
          templateId: 2,
          status: 'APROBADO',
          expiresAt: null, // Sin vencimiento
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Certificado de Manejo' },
        },
      ]);

      // Mock: Templates requeridos
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula de Identidad' },
        { id: 2, name: 'Certificado de Manejo' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      expect(resultado.entidades).toHaveLength(1);
      const entidad = resultado.entidades[0];
      expect(entidad.existe).toBe(true);
      expect(entidad.entityId).toBe(entityId);
      expect(entidad.nombre).toBe('Juan Pérez');
      expect(entidad.perteneceSolicitante).toBe(true);
      expect(entidad.requiereTransferencia).toBe(false);
      expect(entidad.documentos).toHaveLength(2);
      expect(entidad.documentos[0].estado).toBe('VIGENTE');
      expect(entidad.documentos[1].estado).toBe('VIGENTE');
      expect(entidad.resumen.vigentes).toBe(2);
      expect(entidad.resumen.completo).toBe(true);
      expect(resultado.hayEntidadesDeOtroDador).toBe(false);
    });

    it('debe retornar entidad existente asignada a equipo', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const entityId = 50;

      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: entityId,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      // Mock: Equipo asignado
      prismaMock.equipo.findFirst.mockResolvedValueOnce({
        id: 200,
        driverId: entityId,
        truckId: 60,
        trailerId: null,
      });

      // Mock: Datos del equipo
      prismaMock.chofer.findUnique.mockResolvedValueOnce({
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.camion.findUnique.mockResolvedValueOnce({
        patente: 'ABC123',
      });

      prismaMock.document.findMany.mockResolvedValueOnce([]);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      const entidad = resultado.entidades[0];
      expect(entidad.asignadaAOtroEquipo).toBe(true);
      expect(entidad.equipoActual).toBeDefined();
      expect(entidad.equipoActual?.id).toBe(200);
      expect(entidad.equipoActual?.choferNombre).toBe('Juan Pérez');
      expect(entidad.equipoActual?.camionPatente).toBe('ABC123');
    });

    it('debe retornar documentos con estado POR_VENCER para documentos que vencen en 30 días', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      // Vence en 15 días (dentro de los 30 días)
      const fechaVence = new Date(ahora.getTime() + 15 * 24 * 60 * 60 * 1000);
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: fechaVence,
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Cédula' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      const doc = resultado.entidades[0].documentos[0];
      expect(doc.estado).toBe('POR_VENCER');
      expect(doc.diasParaVencer).toBeLessThanOrEqual(30);
      expect(doc.diasParaVencer).toBeGreaterThan(0);
      expect(resultado.entidades[0].resumen.porVencer).toBe(1);
      // completo=true si NO hay faltantes, vencidos ni rechazados (por vencer está OK)
      expect(resultado.entidades[0].resumen.completo).toBe(true);
    });

    it('debe retornar documentos con estado VENCIDO cuando fecha ha pasado', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      const fechaVencida = new Date(ahora.getTime() - 10 * 24 * 60 * 60 * 1000); // Vencido hace 10 días
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: fechaVencida,
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Cédula' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      const doc = resultado.entidades[0].documentos[0];
      expect(doc.estado).toBe('VENCIDO');
      expect(resultado.entidades[0].resumen.vencidos).toBe(1);
      expect(resultado.entidades[0].resumen.completo).toBe(false);
    });

    it('debe retornar documentos con estado VENCIDO cuando status=VENCIDO', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      const fechaFutura = new Date(ahora.getTime() + 100 * 24 * 60 * 60 * 1000);
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'VENCIDO', // Status explícito de vencido
          expiresAt: fechaFutura, // Aunque tenga fecha futura
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Cédula' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      const doc = resultado.entidades[0].documentos[0];
      expect(doc.estado).toBe('VENCIDO');
    });

    it('debe retornar documentos con estado PENDIENTE', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'PENDIENTE',
          expiresAt: null,
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Documento' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Documento' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      expect(resultado.entidades[0].documentos[0].estado).toBe('PENDIENTE');
      expect(resultado.entidades[0].resumen.pendientes).toBe(1);
    });

    it('debe reconocer PENDIENTE_APROBACION como estado pendiente', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'PENDIENTE_APROBACION',
          expiresAt: null,
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Documento' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Documento' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      expect(resultado.entidades[0].documentos[0].estado).toBe('PENDIENTE');
      expect(resultado.entidades[0].resumen.pendientes).toBe(1);
    });

    it('debe reconocer VALIDANDO como estado pendiente', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'VALIDANDO',
          expiresAt: null,
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Documento' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Documento' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      expect(resultado.entidades[0].documentos[0].estado).toBe('PENDIENTE');
      expect(resultado.entidades[0].resumen.pendientes).toBe(1);
    });

    it('debe reconocer CLASIFICANDO como estado pendiente', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'CLASIFICANDO',
          expiresAt: null,
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Documento' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Documento' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      expect(resultado.entidades[0].documentos[0].estado).toBe('PENDIENTE');
      expect(resultado.entidades[0].resumen.pendientes).toBe(1);
    });

    it('debe retornar documentos con estado RECHAZADO', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'RECHAZADO',
          expiresAt: null,
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Cédula' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      const doc = resultado.entidades[0].documentos[0];
      expect(doc.estado).toBe('RECHAZADO');
      expect(resultado.entidades[0].resumen.rechazados).toBe(1);
      expect(resultado.entidades[0].resumen.completo).toBe(false);
    });
  });

  // ============================================================================
  // Tests para preCheck - Entidad existente de otro dador (requiere transferencia)
  // ============================================================================
  describe('preCheck - Entidad existente de otro dador', () => {
    it('debe retornar entidad de otro dador marcada para transferencia', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const dadorActualId = 20; // Otro dador

      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorActualId,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      // Mock: Dador actual (diferente del solicitante)
      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador Actual' });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      const fechaVence = new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000);
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: fechaVence,
          uploadedAt: ahora,
          dadorCargaId: dadorActualId, // De otro dador
          template: { name: 'Cédula' },
        },
      ]);

      // Mock: Obtener nombre del otro dador para el documento
      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador Cargador' });

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      expect(resultado.hayEntidadesDeOtroDador).toBe(true);
      expect(resultado.requiereTransferencia).toBe(true);
      expect(resultado.dadorActualIds).toContain(dadorActualId);
      
      const entidad = resultado.entidades[0];
      expect(entidad.perteneceSolicitante).toBe(false);
      expect(entidad.requiereTransferencia).toBe(true);
      expect(entidad.dadorCargaActualId).toBe(dadorActualId);
      expect(entidad.documentos[0].requiereTransferencia).toBe(true);
      expect(entidad.documentos[0].dadorCargaNombre).toBe('Dador Cargador');
    });

    it('debe marcar documentos de otro dador como reutilizables pero requiriendo transferencia', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const dadorActualId = 20;

      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorActualId,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador Actual' });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();
      const fechaVence = new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000);
      
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: fechaVence,
          uploadedAt: ahora,
          dadorCargaId: dadorActualId,
          template: { name: 'Cédula' },
        },
      ]);

      prismaMock.dadorCarga.findUnique
        .mockResolvedValueOnce({ razonSocial: 'Dador Cargador' });

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      const doc = resultado.entidades[0].documentos[0];
      expect(doc.reutilizable).toBe(true); // VIGENTE es reutilizable
      expect(doc.requiereTransferencia).toBe(true); // Pero de otro dador
    });
  });

  // ============================================================================
  // Tests para preCheck - Múltiples entidades
  // ============================================================================
  describe('preCheck - Múltiples entidades', () => {
    it('debe procesar múltiples entidades de diferentes tipos', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      // CHOFER: existe
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      // CAMION: existe
      prismaMock.camion.findFirst.mockResolvedValueOnce({
        id: 60,
        dadorCargaId: dadorCargaIdSolicitante,
        marca: 'Volvo',
        modelo: 'FH16',
      });

      // ACOPLADO: no existe
      prismaMock.acoplado.findFirst.mockResolvedValueOnce(null);

      // EMPRESA_TRANSPORTISTA: existe
      prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({
        id: 80,
        dadorCargaId: dadorCargaIdSolicitante,
        razonSocial: 'Mi Empresa',
      });

      // Mocks de dador
      prismaMock.dadorCarga.findUnique.mockResolvedValue({
        razonSocial: 'Mi Dador',
      });

      // No hay equipos asignados
      prismaMock.equipo.findFirst.mockResolvedValue(null);

      // Documentos vacíos
      prismaMock.document.findMany.mockResolvedValue([]);

      // Templates
      prismaMock.documentTemplate.findMany.mockResolvedValue([
        { id: 1, name: 'Documento 1' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
          { entityType: 'CAMION', identificador: 'ABC-123' },
          { entityType: 'ACOPLADO', identificador: 'DEF-456' },
          { entityType: 'EMPRESA_TRANSPORTISTA', identificador: '12345678901' },
        ],
      });

      // Assert
      expect(resultado.entidades).toHaveLength(4);
      expect(resultado.entidades[0].existe).toBe(true); // CHOFER
      expect(resultado.entidades[1].existe).toBe(true); // CAMION
      expect(resultado.entidades[2].existe).toBe(false); // ACOPLADO
      expect(resultado.entidades[3].existe).toBe(true); // EMPRESA
      expect(resultado.hayEntidadesDeOtroDador).toBe(false);
      
      // Verificar que se llamó a buscarEntidad para cada una
      expect(prismaMock.chofer.findFirst).toHaveBeenCalled();
      expect(prismaMock.camion.findFirst).toHaveBeenCalled();
      expect(prismaMock.acoplado.findFirst).toHaveBeenCalled();
      expect(prismaMock.empresaTransportista.findFirst).toHaveBeenCalled();
    });

    it('debe procesar múltiples entidades con algunos de otro dador', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const dadorOtro = 20;

      // CHOFER del solicitante
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      // CAMION de otro dador
      prismaMock.camion.findFirst.mockResolvedValueOnce({
        id: 60,
        dadorCargaId: dadorOtro,
        marca: 'Volvo',
        modelo: 'FH16',
      });

      // ACOPLADO de otro dador
      prismaMock.acoplado.findFirst.mockResolvedValueOnce({
        id: 70,
        dadorCargaId: dadorOtro,
        tipo: 'Caja',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValue({
        razonSocial: 'Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValue(null);
      prismaMock.document.findMany.mockResolvedValue([]);
      prismaMock.documentTemplate.findMany.mockResolvedValue([]);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
          { entityType: 'CAMION', identificador: 'ABC-123' },
          { entityType: 'ACOPLADO', identificador: 'DEF-456' },
        ],
      });

      // Assert
      expect(resultado.hayEntidadesDeOtroDador).toBe(true);
      expect(resultado.requiereTransferencia).toBe(true);
      expect(resultado.dadorActualIds.length).toBeGreaterThan(0);
      expect(resultado.dadorActualIds).toContain(dadorOtro);
      expect(resultado.entidades[0].perteneceSolicitante).toBe(true);
      expect(resultado.entidades[1].perteneceSolicitante).toBe(false);
      expect(resultado.entidades[2].perteneceSolicitante).toBe(false);
    });
  });

  // ============================================================================
  // Tests para preCheck - Con clienteId (requisitos específicos)
  // ============================================================================
  describe('preCheck - Con requisitos por cliente', () => {
    it('debe obtener templates específicos del cliente si se proporciona clienteId', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const clienteId = 100;

      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      // Mock: Requisitos específicos del cliente
      const clienteRequisitosMock = [
        {
          templateId: 1,
          obligatorio: true,
          template: { name: 'Cédula' },
        },
        {
          templateId: 2,
          obligatorio: false, // Opcional para este cliente
          template: { name: 'Certificado' },
        },
      ];
      prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce(clienteRequisitosMock as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
        clienteId,
      });

      // Assert
      // Debe llamar a clienteDocumentRequirement cuando se proporciona clienteId
      expect(prismaMock.clienteDocumentRequirement.findMany).toHaveBeenCalledWith({
        where: { tenantEmpresaId, clienteId, entityType: 'CHOFER' },
        select: expect.any(Object),
      });

      expect(resultado.entidades[0].resumen.total).toBe(2);
      expect(resultado.entidades[0].resumen.faltantes).toBe(1); // Solo el obligatorio
    });
  });

  // ============================================================================
  // Tests para preCheck - Casos borde
  // ============================================================================
  describe('preCheck - Casos borde', () => {
    it('debe manejar array vacío de entidades', async () => {
      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId: 1,
        dadorCargaIdSolicitante: 10,
        entidades: [],
      });

      // Assert
      expect(resultado.entidades).toHaveLength(0);
      expect(resultado.hayEntidadesDeOtroDador).toBe(false);
      expect(resultado.requiereTransferencia).toBe(false);
      expect(resultado.dadorActualIds).toHaveLength(0);
    });

    it('debe manejar identificador muy largo (>32 caracteres) truncándolo', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const identificadorLargo = 'A'.repeat(100); // 100 caracteres

      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: identificadorLargo },
        ],
      });

      // Assert
      // Debe estar truncado a 32 caracteres máximo
      expect(resultado.entidades[0].identificador.length).toBeLessThanOrEqual(32);
      expect(resultado.entidades[0].identificador).toBe('A'.repeat(32));
    });

    it('debe manejar identificador con caracteres especiales normalizándolos', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12.345-678!@#$%' },
        ],
      });

      // Assert
      // Debe remover puntos, guiones, caracteres especiales
      expect(resultado.entidades[0].identificador).toBe('12345678');
    });

    it('debe retornar estado VIGENTE para documento sin fecha de vencimiento', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: null, // Sin fecha de vencimiento = vigente indefinidamente
          uploadedAt: new Date(),
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Licencia Permanente' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Licencia Permanente' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      const doc = resultado.entidades[0].documentos[0];
      expect(doc.estado).toBe('VIGENTE');
      expect(doc.diasParaVencer).toBeNull();
    });

    it('debe retornar estado FALTANTE para documentos con estado no reconocido (DEPRECADO, etc)', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 100,
          templateId: 1,
          status: 'DEPRECADO', // Estado no reconocido
          expiresAt: null,
          uploadedAt: new Date(),
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Documento Antiguo' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Documento Antiguo' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      const doc = resultado.entidades[0].documentos[0];
      expect(doc.estado).toBe('FALTANTE');
    });

    it('debe agrupar múltiples documentos de la misma plantilla tomando el más reciente', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();

      // Múltiples versiones de la misma plantilla (templateId=1)
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 101,
          templateId: 1, // Más reciente (uploaded más recientemente)
          status: 'APROBADO',
          expiresAt: new Date(ahora.getTime() + 100 * 24 * 60 * 60 * 1000),
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Cédula' },
        },
        {
          id: 100,
          templateId: 1, // Más antigua
          status: 'APROBADO',
          expiresAt: new Date(ahora.getTime() + 50 * 24 * 60 * 60 * 1000),
          uploadedAt: new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000),
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Cédula' },
        },
      ]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      // Debe retornar solo 1 documento (el más reciente)
      expect(resultado.entidades[0].documentos).toHaveLength(1);
      expect(resultado.entidades[0].documentos[0].id).toBe(101);
    });

    it('debe calcular resumen correctamente con mezcla de estados', async () => {
      // Arrange: Entidad con documentos en múltiples estados
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      const ahora = new Date();

      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 101,
          templateId: 1,
          status: 'APROBADO',
          expiresAt: new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000),
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Cédula' },
        },
        {
          id: 102,
          templateId: 2,
          status: 'APROBADO',
          expiresAt: new Date(ahora.getTime() + 15 * 24 * 60 * 60 * 1000),
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Certificado' },
        },
        {
          id: 103,
          templateId: 3,
          status: 'VENCIDO',
          expiresAt: new Date(ahora.getTime() - 10 * 24 * 60 * 60 * 1000),
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Licencia' },
        },
        {
          id: 104,
          templateId: 4,
          status: 'PENDIENTE',
          expiresAt: null,
          uploadedAt: ahora,
          dadorCargaId: dadorCargaIdSolicitante,
          template: { name: 'Documento Extra' },
        },
      ]);

      // 5 templates requeridos, 4 documentos
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula' },
        { id: 2, name: 'Certificado' },
        { id: 3, name: 'Licencia' },
        { id: 4, name: 'Documento Extra' },
        { id: 5, name: 'Documento Faltante' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [
          { entityType: 'CHOFER', identificador: '12345678' },
        ],
      });

      // Assert
      const resumen = resultado.entidades[0].resumen;
      expect(resumen.total).toBe(5);
      expect(resumen.vigentes).toBe(1);
      expect(resumen.porVencer).toBe(1);
      expect(resumen.vencidos).toBe(1);
      expect(resumen.pendientes).toBe(1);
      expect(resumen.rechazados).toBe(0);
      expect(resumen.faltantes).toBe(1); // El 5to template
      expect(resumen.completo).toBe(false); // Hay faltantes y vencidos
    });
  });

  // ============================================================================
  // Tests para preCheckEntidad (método simplificado)
  // ============================================================================
  describe('preCheckEntidad', () => {
    it('debe retornar resultado de una sola entidad', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: 50,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);

      prismaMock.document.findMany.mockResolvedValueOnce([]);

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Cédula' },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheckEntidad(
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        'CHOFER',
        '12345678'
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.entityType).toBe('CHOFER');
      expect(resultado.existe).toBe(true);
      expect(resultado.entityId).toBe(50);
    });

    it('debe pasar clienteId si se proporciona', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const clienteId = 100;

      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
        {
          templateId: 1,
          obligatorio: true,
          template: { name: 'Cédula' },
        },
      ] as any);

      // Act
      const resultado = await DocumentPreCheckService.preCheckEntidad(
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        'CHOFER',
        '12345678',
        clienteId
      );

      // Assert
      // Debe haber llamado a preCheck con el clienteId
      expect(prismaMock.clienteDocumentRequirement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clienteId }),
        })
      );
      expect(resultado.entityType).toBe('CHOFER');
    });
  });

  // ============================================================================
  // Tests para todos los tipos de entidades
  // ============================================================================
  describe('preCheck - Todos los tipos de entidades', () => {
    it('debe buscar CHOFER por DNI normalizado', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'CHOFER', identificador: '12.345.678' }],
      });

      expect(prismaMock.chofer.findFirst).toHaveBeenCalledWith({
        where: { tenantEmpresaId, dniNorm: '12345678' },
        select: { id: true, dadorCargaId: true, nombre: true, apellido: true },
      });
    });

    it('debe buscar CAMION por patente normalizada', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.camion.findFirst.mockResolvedValueOnce(null);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'CAMION', identificador: 'ABC-123' }],
      });

      expect(prismaMock.camion.findFirst).toHaveBeenCalledWith({
        where: { tenantEmpresaId, patenteNorm: 'ABC123' },
        select: { id: true, dadorCargaId: true, marca: true, modelo: true },
      });
    });

    it('debe buscar ACOPLADO por patente normalizada', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.acoplado.findFirst.mockResolvedValueOnce(null);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'ACOPLADO', identificador: 'DEF-456' }],
      });

      expect(prismaMock.acoplado.findFirst).toHaveBeenCalledWith({
        where: { tenantEmpresaId, patenteNorm: 'DEF456' },
        select: { id: true, dadorCargaId: true, tipo: true },
      });
    });

    it('debe buscar EMPRESA_TRANSPORTISTA por CUIT normalizado', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce(null);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'EMPRESA_TRANSPORTISTA', identificador: '12.345.678.901' }],
      });

      expect(prismaMock.empresaTransportista.findFirst).toHaveBeenCalledWith({
        where: { tenantEmpresaId, cuit: '12345678901' },
        select: { id: true, dadorCargaId: true, razonSocial: true },
      });
    });

    it('debe retornar null para DADOR (no se transfieren)', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      const resultado = await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'DADOR', identificador: '12345' }],
      });

      // DADOR no existe en el sistema (búsqueda retorna null)
      expect(resultado.entidades[0].existe).toBe(false);
    });
  });

  // ============================================================================
  // Tests para equipos asignados
  // ============================================================================
  describe('preCheck - Equipos asignados', () => {
    it('no debe buscar equipos para EMPRESA_TRANSPORTISTA (no es entidad exclusiva)', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({
        id: 80,
        dadorCargaId: dadorCargaIdSolicitante,
        razonSocial: 'Mi Empresa',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.document.findMany.mockResolvedValueOnce([]);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'EMPRESA_TRANSPORTISTA', identificador: '12345' }],
      });

      // No debe llamar a equipo.findFirst para EMPRESA
      expect(prismaMock.equipo.findFirst).not.toHaveBeenCalled();
    });

    it('no debe buscar equipos para DADOR', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'DADOR', identificador: '12345' }],
      });

      // No debe llamar a equipo.findFirst para DADOR
      expect(prismaMock.equipo.findFirst).not.toHaveBeenCalled();
    });

    it('debe buscar equipo para CHOFER', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const entityId = 50;

      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        id: entityId,
        dadorCargaId: dadorCargaIdSolicitante,
        nombre: 'Juan',
        apellido: 'Pérez',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);
      prismaMock.document.findMany.mockResolvedValueOnce([]);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'CHOFER', identificador: '12345678' }],
      });

      expect(prismaMock.equipo.findFirst).toHaveBeenCalledWith({
        where: { driverId: entityId, activo: true },
        select: expect.any(Object),
      });
    });

    it('debe buscar equipo para CAMION', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const entityId = 60;

      prismaMock.camion.findFirst.mockResolvedValueOnce({
        id: entityId,
        dadorCargaId: dadorCargaIdSolicitante,
        marca: 'Volvo',
        modelo: 'FH16',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);
      prismaMock.document.findMany.mockResolvedValueOnce([]);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'CAMION', identificador: 'ABC123' }],
      });

      expect(prismaMock.equipo.findFirst).toHaveBeenCalledWith({
        where: { truckId: entityId, activo: true },
        select: expect.any(Object),
      });
    });

    it('debe buscar equipo para ACOPLADO', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;
      const entityId = 70;

      prismaMock.acoplado.findFirst.mockResolvedValueOnce({
        id: entityId,
        dadorCargaId: dadorCargaIdSolicitante,
        tipo: 'Caja',
      });

      prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({
        razonSocial: 'Mi Dador',
      });

      prismaMock.equipo.findFirst.mockResolvedValueOnce(null);
      prismaMock.document.findMany.mockResolvedValueOnce([]);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'ACOPLADO', identificador: 'DEF456' }],
      });

      expect(prismaMock.equipo.findFirst).toHaveBeenCalledWith({
        where: { trailerId: entityId, activo: true },
        select: expect.any(Object),
      });
    });
  });

  // ============================================================================
  // Tests para logging
  // ============================================================================
  describe('preCheck - Logging', () => {
    it('debe registrar inicio y fin del pre-check', async () => {
      const tenantEmpresaId = 1;
      const dadorCargaIdSolicitante = 10;

      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

      await DocumentPreCheckService.preCheck({
        tenantEmpresaId,
        dadorCargaIdSolicitante,
        entidades: [{ entityType: 'CHOFER', identificador: '12345678' }],
      });

      // Debe registrar inicio
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('iniciado'),
        expect.any(Object)
      );

      // Debe registrar fin
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('completado'),
        expect.any(Object)
      );
    });
  });
});
