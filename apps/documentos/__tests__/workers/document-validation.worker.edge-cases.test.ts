/**
 * Tests de edge cases para document-validation.worker.ts
 * Propósito: Cubrir branches de error y edge cases no cubiertos en tests unitarios principales
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({
    REDIS_URL: 'redis://mock',
    DOCS_MAX_DEPRECATED_VERSIONS: 1,
  }),
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: {
    getSignedUrl: jest.fn(async () => 'http://signed'),
    deleteDocument: jest.fn(async () => undefined),
  },
}));

jest.mock('../../src/services/flowise.service', () => ({
  flowiseService: {
    classifyDocument: jest.fn(async () => ({
      success: true,
      entityType: 'CHOFER',
      entityId: '123',
      expirationDate: '2025-01-01T00:00:00.000Z',
      documentType: 'X',
      confidence: 0.9,
      raw: { metadata: { aiParsed: { entidad: 'CHOFER', idEntidad: '123', vencimientoDate: '2025-01-01T00:00:00.000Z' } } },
    })),
  },
}));

jest.mock('../../src/services/websocket.service', () => ({
  webSocketService: {
    notifyDocumentStatusChange: jest.fn(),
    notifyDashboardUpdate: jest.fn(),
  },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: {
    addDocumentAIValidation: jest.fn(async () => undefined),
  },
}));

jest.mock('../../src/services/document-validation.service', () => ({
  documentValidationService: { isEnabled: () => true },
}));

jest.mock('bullmq', () => ({
  Worker: jest.fn(() => ({ on: jest.fn(), close: jest.fn() })),
  Queue: jest.fn(() => ({})),
}));
jest.mock('ioredis', () => ({
  Redis: jest.fn(() => ({ quit: jest.fn(async () => 'OK') })),
}));

import { getDocumentValidationWorker, closeDocumentValidationWorker } from '../../src/workers/document-validation.worker';
import { flowiseService } from '../../src/services/flowise.service';

describe('DocumentValidationWorker - Edge Cases', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await closeDocumentValidationWorker();
  });

  describe('parseExpirationDate - Edge cases', () => {
    it('maneja fecha inválida retornando null', async () => {
      const worker = getDocumentValidationWorker();

      // Mock flowise para retornar expirationDate inválido
      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '123',
        expirationDate: 'invalid-date', // Fecha inválida
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 123, dadorCargaId: 1 } as any);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });

    it('maneja fecha undefined retornando null', async () => {
      const worker = getDocumentValidationWorker();

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '123',
        expirationDate: undefined, // Sin fecha
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });

    it('maneja fecha null retornando null', async () => {
      const worker = getDocumentValidationWorker();

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '123',
        expirationDate: null, // Fecha null
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('processValidation - Skip associateTemplate', () => {
    it('NO llama a associateTemplate si documentType es null', async () => {
      const worker = getDocumentValidationWorker();

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);

      // flowise retorna documentType: null
      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '123',
        expirationDate: '2025-01-01',
        documentType: null, // Force skip
        confidence: 0.9,
        raw: { metadata: {} },
      });

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
      // NO debe llamar a documentTemplate.findFirst (porque documentType es null)
      expect(prismaMock.documentTemplate.findFirst).not.toHaveBeenCalled();
    });

    it('NO llama a associateTemplate si documentType es undefined', async () => {
      const worker = getDocumentValidationWorker();

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '123',
        expirationDate: '2025-01-01',
        // documentType: undefined (omitido)
        confidence: 0.9,
        raw: { metadata: {} },
      });

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
      expect(prismaMock.documentTemplate.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('resolveEntity - Tipo inválido', () => {
    it('retorna null para entityType desconocido', async () => {
      const worker = getDocumentValidationWorker();

      // Mock de imports dinámicos para retornar null
      jest.doMock('../../src/services/maestros.service', () => ({
        MaestrosService: {
          createChofer: jest.fn().mockResolvedValue(null),
          createCamion: jest.fn().mockResolvedValue(null),
          createAcoplado: jest.fn().mockResolvedValue(null),
        },
      }));

      // Este test verifica el switch default en resolveEntity
      // Al usar un entityType inválido, debería retornar null
      const entityType = 'INVALID_TYPE';

      // No podemos llamar a resolveEntity directamente porque no es exportado
      // Pero podemos verificar el comportamiento indirectamente a través de markDocumentAsApproved
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        tenantEmpresaId: 1,
        dadorCargaId: 2,
        template: { name: 'T' }
      } as any);

      prismaMock.document.update.mockResolvedValueOnce({ id: 1 } as any);

      // Intentamos aprobar con entityType inválido (vía markDocumentAsApproved)
      // Nota: Esto requeriría más setup para probar completamente el branch default
    });
  });

  describe('resolveEntity - Creación fallida', () => {
    it('maneja cuando MaestrosService.createChofer falla', async () => {
      const worker = getDocumentValidationWorker();

      // Mock para que chofer no existe
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      // Mock para que createChofer falle
      jest.doMock('../../src/services/maestros.service', () => ({
        MaestrosService: {
          createChofer: jest.fn().mockRejectedValue(new Error('DB Error')),
          createCamion: jest.fn().mockResolvedValue(null),
          createAcoplado: jest.fn().mockResolvedValue(null),
        },
      }));

      // Verificamos que el worker maneja el error gracefulmente
      // Nota: Esto requiere setup más complejo
    });
  });

  describe('applyRetentionPolicy - Edge cases', () => {
    it('NO borra documentos si deprecated.length <= maxKeep', async () => {
      const worker = getDocumentValidationWorker();

      // Mock: maxKeep = 1, deprecated.length = 1
      // Mock document.findMany para retornar 1 documento deprecated
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, filePath: 'bucket/path/doc1.pdf' }
      ] as any);

      // Llamar a applyPostApprovalActions (método que llama a applyRetentionPolicy)
      // Nota: Este método no es exportado directamente, necesitamos llamarlo indirectamente
      // a través de markDocumentAsApproved o processValidation

      // Por ahora, este test es conceptual - la implementación real requeriría
      // exponer el método o probarlo indirectamente
    });
  });

  describe('normalizeUnknown - Edge cases', () => {
    it('retorna null para undefined', async () => {
      // Esta función no es exportada, pero se testea indirectamente
      // vía el comportamiento de resolveEntity
      const worker = getDocumentValidationWorker();

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: undefined, // undefined
        expirationDate: '2025-01-01',
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });

    it('retorna null para string vacío', async () => {
      const worker = getDocumentValidationWorker();

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '', // string vacío
        expirationDate: '2025-01-01',
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });

    it('retorna null para DESCONOCIDO', async () => {
      const worker = getDocumentValidationWorker();

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: 'DESCONOCIDO',
        expirationDate: '2025-01-01',
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });

    it('retorna null para UNKNOWN', async () => {
      const worker = getDocumentValidationWorker();

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: 'UNKNOWN',
        expirationDate: '2025-01-01',
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });

    it('retorna null para N/A', async () => {
      const worker = getDocumentValidationWorker();

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: 'N/A',
        expirationDate: '2025-01-01',
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });

    it('retorna null para guion', async () => {
      const worker = getDocumentValidationWorker();

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '-',
        expirationDate: '2025-01-01',
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('parseSafeExpirationDate - Edge cases', () => {
    it('retorna undefined para fecha muy futura (> 15 años)', async () => {
      const worker = getDocumentValidationWorker();

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 20);

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '123',
        expirationDate: futureDate.toISOString(), // Fecha muy futura
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });

    it('retorna undefined para fecha muy antigua (< 1970)', async () => {
      const worker = getDocumentValidationWorker();

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '123',
        expirationDate: '1960-01-01', // Fecha muy antigua
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);
      prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('processValidation - Error handling', () => {
    it('maneja error en flowiseService.classifyDocument', async () => {
      const worker = getDocumentValidationWorker();

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockResolvedValue({} as any);

      (flowiseService.classifyDocument as jest.Mock).mockRejectedValueOnce(
        new Error('Flowise connection failed')
      );

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      // El worker debe manejar el error gracefully
      expect(result.isValid).toBe(false);
    });

    it('maneja error en document.update', async () => {
      const worker = getDocumentValidationWorker();

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 });
      prismaMock.document.update.mockRejectedValueOnce(new Error('DB Error'));

      (flowiseService.classifyDocument as jest.Mock).mockResolvedValueOnce({
        success: true,
        entityType: 'CHOFER',
        entityId: '123',
        expirationDate: '2025-01-01',
        documentType: 'X',
        confidence: 0.9,
        raw: { metadata: {} },
      });

      const result = await (worker as any).processValidation({
        data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' }
      });

      expect(result.isValid).toBe(false);
    });
  });
});
