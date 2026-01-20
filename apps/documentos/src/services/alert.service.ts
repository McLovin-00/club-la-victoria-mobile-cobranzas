import { db } from '../config/database';
import { StatusService } from './status.service';
import { AppLogger } from '../config/logger';
import type { DocumentStatus } from '.prisma/documentos';

/**
 * Alert Service - Sistema de Alertas Automáticas
 */

interface AlertConfig {
  empresaId: number;
  alertEmail?: string;
  alertPhone?: string;
  enabled: boolean;
}

interface AlertData {
  type: 'document_rejected' | 'document_expired' | 'entity_red_status';
  entityType: string;
  entityId: number;
  empresaId: number;
  message: string;
  priority: 'low' | 'medium' | 'high';
  data: any;
}

export class AlertService {
  private static instance: AlertService;

  private constructor() {
    AppLogger.info('🚨 Alert Service inicializado');
  }

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  /**
   * Procesar alerta de documento rechazado
   */
  public async processDocumentRejected(documentId: number): Promise<void> {
    try {
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          dadorCargaId: true,
          validationData: true,
          template: {
            select: { name: true },
          },
        },
      });

      if (!document) {
        AppLogger.warn(`⚠️ Documento ${documentId} no encontrado para alerta`);
        return;
      }

      const alertData: AlertData = {
        type: 'document_rejected',
        entityType: document.entityType,
        entityId: document.entityId,
          empresaId: document.dadorCargaId,
        message: `Documento ${document.template.name} rechazado para ${document.entityType} ${document.entityId}`,
        priority: 'high',
        data: {
          documentId,
          templateName: document.template.name,
          errors: Array.isArray((document.validationData as any)?.errors) ? (document.validationData as any).errors : [], // NOSONAR - cast needed for JSON type
          rejectedAt: new Date().toISOString(),
        },
      };

      await this.sendAlert(alertData);
    } catch (error) {
      AppLogger.error('💥 Error procesando alerta de documento rechazado:', error);
    }
  }

  /**
   * Verificar y procesar documentos vencidos
   */
  public async processExpiredDocuments(): Promise<void> {
    try {
      const expiredDocuments = await db.getClient().document.findMany({
        where: {
          expiresAt: { lte: new Date() },
          status: { not: 'VENCIDO' as DocumentStatus },
        },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          dadorCargaId: true,
          expiresAt: true,
          template: {
            select: { name: true },
          },
        },
      });

      for (const document of expiredDocuments) {
        // Marcar como vencido
        await db.getClient().document.update({
          where: { id: document.id },
          data: { status: 'VENCIDO' as DocumentStatus },
        });

        // Generar alerta
        const alertData: AlertData = {
          type: 'document_expired',
          entityType: document.entityType,
          entityId: document.entityId,
          empresaId: document.dadorCargaId,
          message: `Documento ${document.template.name} vencido para ${document.entityType} ${document.entityId}`,
          priority: 'high',
          data: {
            documentId: document.id,
            templateName: document.template.name,
            expiredAt: document.expiresAt,
            processedAt: new Date().toISOString(),
          },
        };

        await this.sendAlert(alertData);
      }

      if (expiredDocuments.length > 0) {
        AppLogger.warn(`⏰ ${expiredDocuments.length} documentos marcados como vencidos`);
      }
    } catch (error) {
      AppLogger.error('💥 Error procesando documentos vencidos:', error);
    }
  }

  /**
   * Verificar entidades con estado rojo
   */
  public async processRedStatusEntities(): Promise<void> {
    try {
      // Obtener todas las empresas con documentos
      const empresasWithDocs = await db.getClient().document.findMany({
        select: { dadorCargaId: true },
        distinct: ['dadorCargaId'],
      });

      for (const empresa of empresasWithDocs) {
        const entitiesWithAlarms = await StatusService.getEntitiesWithAlarms(empresa.dadorCargaId);
        
        for (const entity of entitiesWithAlarms) {
          const alertData: AlertData = {
            type: 'entity_red_status',
            entityType: entity.entityType,
            entityId: entity.entityId,
            empresaId: empresa.dadorCargaId,
            message: `${entity.entityType} ${entity.entityId} requiere atención inmediata`,
            priority: 'medium',
            data: {
              entityStatus: entity.status,
              documentCount: entity.documentCount,
              processedAt: new Date().toISOString(),
            },
          };

          await this.sendAlert(alertData);
        }
      }
    } catch (error) {
      AppLogger.error('💥 Error procesando entidades con estado rojo:', error);
    }
  }

  /**
   * Enviar alerta (placeholder para integración real)
   */
  private async sendAlert(alertData: AlertData): Promise<void> {
    try {
      // Obtener configuración de alertas de la empresa
      const alertConfig = await this.getAlertConfig(alertData.empresaId);
      
      if (!alertConfig.enabled) {
        AppLogger.debug(`🔇 Alertas deshabilitadas para empresa ${alertData.empresaId}`);
        return;
      }

      AppLogger.info(`🚨 ALERTA: ${alertData.message}`, {
        type: alertData.type,
        priority: alertData.priority,
        entityType: alertData.entityType,
        entityId: alertData.entityId,
        empresaId: alertData.empresaId,
      });

      // Envío real de alertas pendiente de integración con:
      // - Email: SendGrid
      // - SMS: Twilio
      // - Push notifications
      // - Webhooks externos
      // Por ahora se registra en log
      await this.logAlert(alertData);
      
    } catch (error) {
      AppLogger.error('💥 Error enviando alerta:', error);
    }
  }

  /**
   * Obtener configuración de alertas de empresa
   */
  private async getAlertConfig(empresaId: number): Promise<AlertConfig> {
    try {
      // empresaDocumentConfig deprecado. Devolvemos config por defecto.
      return {
        empresaId,
        enabled: false,
      };
    } catch (error) {
      AppLogger.error('💥 Error obteniendo configuración de alertas:', error);
      return {
        empresaId,
        enabled: false,
      };
    }
  }

  /**
   * Registrar alerta en logs (para auditoría)
   */
  private async logAlert(alertData: AlertData): Promise<void> {
    try {
      // En una implementación real, esto podría guardarse en una tabla de alertas
      AppLogger.info('📝 Alerta registrada', {
        timestamp: new Date().toISOString(),
        ...alertData,
      });
    } catch (error) {
      AppLogger.error('💥 Error registrando alerta:', error);
    }
  }

  /**
   * Ejecutar verificaciones programadas
   */
  public async runScheduledChecks(): Promise<void> {
    AppLogger.info('🔍 Ejecutando verificaciones programadas de alertas');
    
    try {
      await Promise.all([
        this.processExpiredDocuments(),
        this.processRedStatusEntities(),
      ]);
      
      AppLogger.info('✅ Verificaciones programadas completadas');
    } catch (error) {
      AppLogger.error('💥 Error en verificaciones programadas:', error);
    }
  }
}

// Exportar instancia singleton
export const alertService = AlertService.getInstance();