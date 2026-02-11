import { db } from '../config/database';
import { minioService } from './minio.service';
import { queueService } from './queue.service';
import { AppLogger } from '../config/logger';
import type { DocumentStatus } from '.prisma/documentos';
import { DocumentEventHandlers } from './document-event-handlers.service';

/**
 * DocumentService - Lógica de Negocio Central
 * Simplicidad es la sofisticación definitiva
 */
export class DocumentService {

  /**
   * Procesar documento después de upload (usando Workers)
   */
  static async processDocument(documentId: number): Promise<void> {
    try {
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          filePath: true,
          entityType: true,
          template: {
            select: { name: true },
          },
        },
      });

      if (!document) {
        throw new Error(`Documento ${documentId} no encontrado`);
      }

      // Agregar a cola de validación asíncrona
      await queueService.addDocumentValidation({
        documentId,
        filePath: document.filePath,
        templateName: document.template.name,
        entityType: document.entityType,
      });

      AppLogger.info(`📋 Documento ${documentId} agregado a cola de validación asíncrona`);
      
    } catch (error) {
      AppLogger.error('Error procesando documento:', error);
      await this.markDocumentAsRejected(documentId);
    }
  }

  /**
   * Marcar documento como aprobado
   */
  static async markDocumentAsApproved(documentId: number): Promise<void> {
    try {
      await db.getClient().document.update({
        where: { id: documentId },
        data: { 
          status: 'APROBADO' as DocumentStatus,
          validatedAt: new Date(),
        },
      });
      
      AppLogger.info(`✅ Documento ${documentId} aprobado`);
    } catch (error) {
      AppLogger.error('Error aprobando documento:', error);
    }
  }

  /**
   * Marcar documento como rechazado
   */
  static async markDocumentAsRejected(documentId: number): Promise<void> {
    try {
      await db.getClient().document.update({
        where: { id: documentId },
        data: { 
          status: 'RECHAZADO' as DocumentStatus,
          validatedAt: new Date(),
        },
      });
      
      AppLogger.warn(`❌ Documento ${documentId} rechazado`);
    } catch (error) {
      AppLogger.error('Error rechazando documento:', error);
    }
  }

  /**
   * Verificar documentos vencidos.
   * Busca documentos cuya fecha de vencimiento ya pasó, los marca como VENCIDO
   * y dispara event handlers individuales (notificaciones, re-evaluación de equipos).
   */
  static async checkExpiredDocuments(): Promise<number> {
    try {
      const now = new Date();

      // 1. Identificar documentos que deben vencer (no usar updateMany para poder disparar eventos)
      const expiring = await db.getClient().document.findMany({
        where: {
          expiresAt: { lte: now },
          status: { not: 'VENCIDO' as DocumentStatus },
          archived: false,
        },
        select: { id: true },
      });

      if (expiring.length === 0) return 0;

      // 2. Marcar como vencidos en bulk (eficiente para DB)
      await db.getClient().document.updateMany({
        where: { id: { in: expiring.map(d => d.id) } },
        data: { status: 'VENCIDO' as DocumentStatus },
      });

      AppLogger.warn(`⏰ ${expiring.length} documentos marcados como vencidos`);

      // 3. Disparar event handlers individuales para notificaciones y re-evaluación
      //    Procesar en batches de 20 con pausa para no saturar el sistema
      const BATCH_SIZE = 20;
      const BATCH_DELAY_MS = 1000;
      for (let i = 0; i < expiring.length; i += BATCH_SIZE) {
        const batch = expiring.slice(i, i + BATCH_SIZE);
        for (const doc of batch) {
          try {
            await DocumentEventHandlers.onDocumentExpired(doc.id);
          } catch (handlerError) {
            AppLogger.error(`Error en event handler para documento vencido ${doc.id}:`, handlerError);
          }
        }
        // Pausa entre batches para dar tiempo al debounce y no saturar
        if (i + BATCH_SIZE < expiring.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      return expiring.length;
    } catch (error) {
      AppLogger.error('Error verificando documentos vencidos:', error);
      return 0;
    }
  }

  /**
   * Obtener estadísticas de documentos por dador
   */
  static async getDocumentStats(tenantEmpresaId: number, empresaId: number): Promise<{
    total: number;
    pendiente: number;
    validando: number;
    aprobado: number;
    rechazado: number;
    vencido: number;
  }> {
    try {
      const stats = await db.getClient().document.groupBy({
        by: ['status'],
        where: { tenantEmpresaId, dadorCargaId: empresaId },
        _count: { status: true },
      });

      const result = {
        total: 0,
        pendiente: 0,
        validando: 0,
        aprobado: 0,
        rechazado: 0,
        vencido: 0,
      };

      stats.forEach(stat => {
        const count = stat._count.status;
        result.total += count;
        
        switch (stat.status) {
          case 'PENDIENTE':
            result.pendiente = count;
            break;
          case 'VALIDANDO':
            result.validando = count;
            break;
          case 'APROBADO':
            result.aprobado = count;
            break;
          case 'RECHAZADO':
            result.rechazado = count;
            break;
          case 'VENCIDO':
            result.vencido = count;
            break;
        }
      });

      return result;
    } catch (error) {
      AppLogger.error('Error obteniendo estadísticas:', error);
      return {
        total: 0,
        pendiente: 0,
        validando: 0,
        aprobado: 0,
        rechazado: 0,
        vencido: 0,
      };
    }
  }

  /**
   * Eliminar documento completo (MinIO + DB)
   */
  static async deleteDocument(documentId: number): Promise<boolean> {
    try {
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
        select: { 
          id: true,
          fileName: true,
          filePath: true,
        },
      });

      if (!document) {
        return false;
      }

      // Eliminar archivo de MinIO
      const [bucketName, ...pathParts] = document.filePath.split('/');
      const objectPath = pathParts.join('/');
      await minioService.deleteDocument(bucketName, objectPath);

      // Eliminar registro de DB (cascade eliminará files)
      await db.getClient().document.delete({
        where: { id: documentId },
      });

      AppLogger.info(`🗑️ Documento ${documentId} eliminado completamente`);
      return true;
    } catch (error) {
      AppLogger.error('Error eliminando documento:', error);
      return false;
    }
  }

  /**
   * Renovar documento: crea una nueva versión basada en el documento existente.
   * - Copia metadata y archivo para permitir revisión/aprobación independiente.
   * - Marca el nuevo como PENDIENTE_APROBACION y depreca el anterior.
   * - Guarda traza mínima en validationData (renewOf, renewedAt).
   */
  static async renew(documentId: number, opts: { expiresAt?: Date; requestedBy?: number } = {}): Promise<any> {
    const existing = await db.getClient().document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        tenantEmpresaId: true,
        dadorCargaId: true,
        templateId: true,
        entityType: true,
        entityId: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        mimeType: true,
      },
    });
    if (!existing) throw new Error('Documento no encontrado');

    const now = new Date();
    // Crear nueva versión con misma referencia de archivo (opción simple); el flujo de upload puede reemplazar el archivo luego
    const created = await db.getClient().document.create({
      data: {
        tenantEmpresaId: existing.tenantEmpresaId,
        dadorCargaId: existing.dadorCargaId,
        templateId: existing.templateId,
        entityType: existing.entityType,
        entityId: existing.entityId,
        status: 'PENDIENTE_APROBACION',
        uploadedAt: now,
        fileName: existing.fileName,
        filePath: existing.filePath,
        fileSize: existing.fileSize,
        mimeType: existing.mimeType,
        expiresAt: opts.expiresAt || null,
        validationData: {
          ...((existing as any).validationData || {}), // NOSONAR - cast needed for JSON type
          renewOf: existing.id,
          renewedAt: now.toISOString(),
          requestedBy: opts.requestedBy ?? null,
        },
      },
      include: { template: true },
    });

    // Marcar el anterior como DEPRECADO (mantener retención de acuerdo a políticas, se puede limpiar luego)
    await db.getClient().document.update({
      where: { id: existing.id },
      data: {
        status: 'DEPRECADO',
        validationData: {
          ...((existing as any).validationData || {}), // NOSONAR - cast needed for JSON type
          replacedBy: created.id,
          replacedAt: now.toISOString(),
        },
      },
    });

    AppLogger.info(`♻️ Renovación creada para documento ${documentId} -> nueva versión ${created.id}`);
    return created;
  }

  /**
   * Obtener historial de versiones del documento (por entidad + template)
   */
  static async getHistory(documentId: number): Promise<any[]> {
    const base = await db.getClient().document.findUnique({
      where: { id: documentId },
      select: { tenantEmpresaId: true, entityType: true, entityId: true, templateId: true },
    });
    if (!base) throw new Error('Documento no encontrado');
    return db.getClient().document.findMany({
      where: {
        tenantEmpresaId: base.tenantEmpresaId,
        entityType: base.entityType,
        entityId: base.entityId,
        templateId: base.templateId,
      },
      select: {
        id: true,
        status: true,
        uploadedAt: true,
        validatedAt: true,
        expiresAt: true,
        fileName: true,
        validationData: true,
      },
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
    });
  }
}