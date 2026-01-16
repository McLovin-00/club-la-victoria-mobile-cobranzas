/**
 * Tests para types/index.ts - verificar exportaciones de tipos y constantes
 */

import { describe, it, expect } from '@jest/globals';
import { FLOWISE_REMITO_EXPECTED_FORMAT } from '../../src/types';
import type { AuthUser, AuthRequest, FlowiseRemitoResponse, RemitoAnalysisJobData } from '../../src/types';

describe('types exports', () => {
  describe('FLOWISE_REMITO_EXPECTED_FORMAT', () => {
    it('está definida y es un string', () => {
      expect(FLOWISE_REMITO_EXPECTED_FORMAT).toBeDefined();
      expect(typeof FLOWISE_REMITO_EXPECTED_FORMAT).toBe('string');
    });

    it('contiene instrucciones para análisis de remitos', () => {
      expect(FLOWISE_REMITO_EXPECTED_FORMAT).toContain('Analiza la imagen del remito');
      expect(FLOWISE_REMITO_EXPECTED_FORMAT).toContain('numeroRemito');
      expect(FLOWISE_REMITO_EXPECTED_FORMAT).toContain('fechaOperacion');
      expect(FLOWISE_REMITO_EXPECTED_FORMAT).toContain('emisor');
      expect(FLOWISE_REMITO_EXPECTED_FORMAT).toContain('cliente');
      expect(FLOWISE_REMITO_EXPECTED_FORMAT).toContain('pesosOrigen');
      expect(FLOWISE_REMITO_EXPECTED_FORMAT).toContain('confianza');
    });

    it('menciona formato de patentes argentinas', () => {
      expect(FLOWISE_REMITO_EXPECTED_FORMAT).toContain('argentino');
    });
  });

  describe('type definitions', () => {
    it('AuthUser tiene estructura correcta', () => {
      const user: AuthUser = {
        userId: 1,
        email: 'test@test.com',
        role: 'ADMIN',
        empresaId: 1,
        dadorId: 1,
        tenantId: 1,
      };
      expect(user.userId).toBe(1);
      expect(user.role).toBe('ADMIN');
    });

    it('FlowiseRemitoResponse tiene estructura correcta', () => {
      const response: FlowiseRemitoResponse = {
        numeroRemito: '001-001',
        fechaOperacion: '15/05/2025',
        emisor: { nombre: 'Test', detalle: null },
        cliente: 'Cliente',
        producto: 'Arena',
        transportista: 'Transportes SA',
        chofer: { nombre: 'Juan', dni: '12345678' },
        patentes: { chasis: 'ABC123', acoplado: 'DEF456' },
        pesosOrigen: { bruto: 50000, tara: 15000, neto: 35000 },
        pesosDestino: null,
        confianza: 85,
        camposDetectados: ['numeroRemito'],
        errores: [],
      };
      expect(response.confianza).toBe(85);
    });

    it('RemitoAnalysisJobData tiene estructura correcta', () => {
      const jobData: RemitoAnalysisJobData = {
        remitoId: 1,
        imagenId: 1,
        tenantEmpresaId: 1,
        bucketName: 'bucket',
        objectKey: 'key',
        originalInputsCount: 2,
      };
      expect(jobData.remitoId).toBe(1);
    });
  });
});

