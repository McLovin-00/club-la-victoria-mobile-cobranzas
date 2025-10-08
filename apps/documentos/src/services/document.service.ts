import { db } from '../config/database';
import { minioService } from './minio.service';
import { queueService } from './queue.service';
import { AppLogger } from '../config/logger';
import type { DocumentStatus } from '.prisma/documentos';

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
   * Verificar documentos vencidos
   */
  static async checkExpiredDocuments(): Promise<number> {
    try {
      const now = new Date();
      
      const expiredCount = await db.getClient().document.updateMany({
        where: {
          expiresAt: { lte: now },
          status: { not: 'VENCIDO' as DocumentStatus },
        },
        data: { status: 'VENCIDO' as DocumentStatus },
      });

      if (expiredCount.count > 0) {
        AppLogger.warn(`⏰ ${expiredCount.count} documentos marcados como vencidos`);
      }

      return expiredCount.count;
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
}